const CATS = {
  recruitment: "নিয়োগ পরীক্ষা",
  verification_test: "যাচাই পরীক্ষা",
  recent: "সাম্প্রতিক প্রশ্ন"
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function el(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function showMessage(id, message, type = "normal") {
  const box = el(id);
  if (!box) return;

  box.textContent = message;

  if (type === "success") {
    box.style.color = "green";
  } else if (type === "error") {
    box.style.color = "#b00020";
  } else {
    box.style.color = "#444";
  }
}

function clearMessage(id) {
  showMessage(id, "");
}


/* =========================================================
   CATEGORY
========================================================= */

function fillCategorySelect(selectId) {

  const select = el(selectId);
  if (!select) return;

  select.innerHTML =
    '<option value="">ক্যাটাগরি নির্বাচন করুন</option>';

  Object.entries(CATS).forEach(([key, label]) => {

    const option = document.createElement("option");

    option.value = key;
    option.textContent = label;

    select.appendChild(option);
  });
}


/*
  Database-এ Category হয়তো:
  - recruitment
  - নিয়োগ পরীক্ষা

  দুটো যেকোনো একটি হতে পারে।
  তাই দুইভাবেই match করা হচ্ছে।
*/

function categoryMatches(folderCategory, selectedCategory) {

  const dbValue =
    normalizeText(folderCategory);

  const selectedKey =
    normalizeText(selectedCategory);

  const selectedLabel =
    CATS[selectedKey] || selectedKey;

  return (
    dbValue === selectedKey ||
    dbValue === selectedLabel
  );
}


/* =========================================================
   SUBJECTS
========================================================= */

async function loadSubjects() {

  const { data, error } = await db
    .from("subjects")
    .select("id, subject_name")
    .order("subject_name");

  if (error) {

    console.error(error);

    showMessage(
      "questionMsg",
      "বিষয় লোড করা যায়নি: " + error.message,
      "error"
    );

    return;
  }

  const select = el("subject");

  if (!select) return;

  select.innerHTML =
    '<option value="">বিষয় নির্বাচন করুন</option>';

  (data || []).forEach(subject => {

    const option =
      document.createElement("option");

    option.value = subject.id;
    option.textContent = subject.subject_name;

    select.appendChild(option);
  });
}


/* =========================================================
   GET ALL FOLDERS
========================================================= */

async function getAllFolders() {

  const { data, error } = await db
    .from("question_bank_folders")
    .select("id, folder_name, sub_category")
    .order("folder_name");

  if (error) {
    console.error("Folder loading error:", error);
    throw error;
  }

  return data || [];
}


/* =========================================================
   LOAD FOLDERS BY CATEGORY
========================================================= */

async function loadFoldersForCategory(
  category,
  selectId,
  keepValue = ""
) {

  const select = el(selectId);

  if (!select) return;

  select.innerHTML =
    '<option value="">Folder নির্বাচন করুন</option>';

  if (!category) return;

  try {

    const folders =
      await getAllFolders();

    const filtered =
      folders.filter(folder =>
        categoryMatches(
          folder.sub_category,
          category
        )
      );

    filtered.forEach(folder => {

      const option =
        document.createElement("option");

      option.value = folder.id;
      option.textContent = folder.folder_name;

      select.appendChild(option);
    });

    if (
      keepValue &&
      filtered.some(
        folder =>
          String(folder.id) === String(keepValue)
      )
    ) {
      select.value = keepValue;
    }

  } catch (error) {

    console.error(error);

    if (
      selectId === "folder" ||
      selectId === "setFolder"
    ) {

      showMessage(
        "folderMsg",
        "Folder লোড করা যায়নি: " +
        error.message,
        "error"
      );

    } else {

      showMessage(
        "questionMsg",
        "Folder লোড করা যায়নি: " +
        error.message,
        "error"
      );
    }
  }
}


/* =========================================================
   LOAD SETS
========================================================= */

async function loadSetsForFolder(
  folderId,
  selectId,
  keepValue = ""
) {

  const select = el(selectId);

  if (!select) return;

  select.innerHTML =
    '<option value="">Set নির্বাচন করুন</option>';

  if (!folderId) return;

  const { data, error } = await db
    .from("question_bank_sets")
    .select("id, set_name")
    .eq("folder_id", folderId)
    .order("set_name");

  if (error) {

    console.error(error);

    showMessage(
      "setMsg",
      "Set লোড করা যায়নি: " +
      error.message,
      "error"
    );

    return;
  }

  (data || []).forEach(set => {

    const option =
      document.createElement("option");

    option.value = set.id;
    option.textContent = set.set_name;

    select.appendChild(option);
  });

  if (
    keepValue &&
    (data || []).some(
      set =>
        String(set.id) === String(keepValue)
    )
  ) {
    select.value = keepValue;
  }
}


/* =========================================================
   REFRESH MANAGEMENT
========================================================= */

async function refreshManagementFolders(
  category = "",
  folderId = ""
) {

  const categorySelect =
    el("folderCategory");

  if (categorySelect) {
    categorySelect.value = category;
  }

  await loadFoldersForCategory(
    category,
    "folder",
    folderId
  );

  await loadFoldersForCategory(
    category,
    "setFolder",
    folderId
  );

  if (folderId) {

    await loadSetsForFolder(
      folderId,
      "set"
    );

  } else {

    const setSelect = el("set");

    if (setSelect) {
      setSelect.innerHTML =
        '<option value="">Set নির্বাচন করুন</option>';
    }
  }
}


/* =========================================================
   REFRESH QUESTION DESTINATION
========================================================= */

async function refreshQuestionDestination(
  category = "",
  folderId = "",
  setId = ""
) {

  const categorySelect =
    el("questionCategory");

  if (categorySelect) {
    categorySelect.value = category;
  }

  await loadFoldersForCategory(
    category,
    "questionFolder",
    folderId
  );

  await loadSetsForFolder(
    folderId,
    "questionSet",
    setId
  );
}


/* =========================================================
   INIT
========================================================= */

async function initQuestionCreate() {

  try {

    fillCategorySelect("folderCategory");
    fillCategorySelect("questionCategory");

    await loadSubjects();

    /*
      শুরুতে কোনো Category selected থাকবে না।
      Category নির্বাচন করার পর Folder আসবে।
    */

    await refreshManagementFolders();

    await refreshQuestionDestination();


    /* -----------------------------------------
       MANAGEMENT CATEGORY
    ----------------------------------------- */

    el("folderCategory").addEventListener(
      "change",
      async function () {

        clearMessage("folderMsg");

        const category =
          this.value;

        /*
          Category বদলালে পুরোনো Folder/Set
          selection পরিষ্কার হবে।
        */

        await refreshManagementFolders(
          category
        );

      }
    );


    /* -----------------------------------------
       MANAGEMENT FOLDER
    ----------------------------------------- */

    el("folder").addEventListener(
      "change",
      async function () {

        clearMessage("folderMsg");

        const folderId =
          this.value;

        /*
          Folder selection দুটো management
          dropdown-এ একই থাকবে।
        */

        el("setFolder").value =
          folderId;

        await loadSetsForFolder(
          folderId,
          "set"
        );

      }
    );


    /* -----------------------------------------
       SET MANAGEMENT FOLDER
    ----------------------------------------- */

    el("setFolder").addEventListener(
      "change",
      async function () {

        clearMessage("setMsg");

        const folderId =
          this.value;

        el("folder").value =
          folderId;

        await loadSetsForFolder(
          folderId,
          "set"
        );

      }
    );


    /* -----------------------------------------
       QUESTION CATEGORY
    ----------------------------------------- */

    el("questionCategory").addEventListener(
      "change",
      async function () {

        clearMessage("questionMsg");

        const category =
          this.value;

        await refreshQuestionDestination(
          category
        );

      }
    );


    /* -----------------------------------------
       QUESTION FOLDER
    ----------------------------------------- */

    el("questionFolder").addEventListener(
      "change",
      async function () {

        clearMessage("questionMsg");

        const folderId =
          this.value;

        await loadSetsForFolder(
          folderId,
          "questionSet"
        );

      }
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "questionMsg",
      "পেজ প্রস্তুত করতে সমস্যা হয়েছে: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
   ADD FOLDER
========================================================= */

async function addFolder() {

  clearMessage("folderMsg");

  const category =
    el("folderCategory").value;

  const name =
    normalizeText(
      el("newFolder").value
    );

  if (!category) {

    showMessage(
      "folderMsg",
      "আগে Category নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!name) {

    showMessage(
      "folderMsg",
      "নতুন Folder-এর নাম লিখুন।",
      "error"
    );

    return;
  }


  /*
    একই Category-তে একই নামের Folder আছে কি না
    যাচাই করা হচ্ছে।
  */

  const folders =
    await getAllFolders();

  const duplicate =
    folders.some(folder =>

      categoryMatches(
        folder.sub_category,
        category
      ) &&
      normalizeText(folder.folder_name)
        .toLowerCase() === name.toLowerCase()
    );

  if (duplicate) {

    showMessage(
      "folderMsg",
      "এই Category-তে একই নামে Folder আগে থেকেই আছে।",
      "error"
    );

    return;
  }


  const { error } = await db
    .from("question_bank_folders")
    .insert({
      /*
        নতুন data-তে বাংলা Category label
        রাখা হচ্ছে, যাতে existing structure-এর
        সঙ্গে সামঞ্জস্য থাকে।
      */
      sub_category: CATS[category],
      folder_name: name
    });

  if (error) {

    console.error(error);

    showMessage(
      "folderMsg",
      "Folder তৈরি হয়নি: " +
      error.message,
      "error"
    );

    return;
  }

  el("newFolder").value = "";

  await refreshManagementFolders(
    category
  );

  await refreshQuestionDestination(
    el("questionCategory").value
  );

  showMessage(
    "folderMsg",
    "Folder সফলভাবে তৈরি হয়েছে।",
    "success"
  );
}


/* =========================================================
   RENAME FOLDER
========================================================= */

async function renameFolder() {

  clearMessage("folderMsg");

  const category =
    el("folderCategory").value;

  const folderId =
    el("folder").value;

  const newName =
    normalizeText(
      el("newFolder").value
    );

  if (!category) {

    showMessage(
      "folderMsg",
      "আগে Category নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!folderId) {

    showMessage(
      "folderMsg",
      "Rename করার জন্য Folder নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!newName) {

    showMessage(
      "folderMsg",
      "নতুন Folder-এর নাম লিখুন।",
      "error"
    );

    return;
  }


  const folders =
    await getAllFolders();

  const duplicate =
    folders.some(folder =>

      String(folder.id) !==
      String(folderId) &&

      categoryMatches(
        folder.sub_category,
        category
      ) &&

      normalizeText(folder.folder_name)
        .toLowerCase() ===
      newName.toLowerCase()
    );

  if (duplicate) {

    showMessage(
      "folderMsg",
      "এই Category-তে এই নামে Folder আগে থেকেই আছে।",
      "error"
    );

    return;
  }


  const { error } = await db
    .from("question_bank_folders")
    .update({
      folder_name: newName
    })
    .eq("id", folderId);

  if (error) {

    showMessage(
      "folderMsg",
      "Folder Rename হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  el("newFolder").value = "";

  await refreshManagementFolders(
    category,
    folderId
  );

  /*
    Question destination-এ একই Folder
    থাকলে সেটিও refresh হবে।
  */

  if (
    el("questionFolder").value ===
    String(folderId)
  ) {

    await refreshQuestionDestination(
      el("questionCategory").value,
      folderId,
      el("questionSet").value
    );
  }

  showMessage(
    "folderMsg",
    "Folder সফলভাবে Rename হয়েছে।",
    "success"
  );
}


/* =========================================================
   DELETE FOLDER
========================================================= */

async function deleteFolder() {

  clearMessage("folderMsg");

  const folderId =
    el("folder").value;

  if (!folderId) {

    showMessage(
      "folderMsg",
      "Delete করার জন্য Folder নির্বাচন করুন।",
      "error"
    );

    return;
  }


  /*
    Folder-এর মধ্যে Set থাকলে Delete নয়।
  */

  const {
    data: sets,
    error: setError
  } = await db
    .from("question_bank_sets")
    .select("id")
    .eq("folder_id", folderId)
    .limit(1);

  if (setError) {

    showMessage(
      "folderMsg",
      "Folder-এর Set যাচাই করা যায়নি: " +
      setError.message,
      "error"
    );

    return;
  }

  if (sets && sets.length > 0) {

    showMessage(
      "folderMsg",
      "এই Folder-এর মধ্যে Set আছে। আগে Setগুলো সরাতে হবে।",
      "error"
    );

    return;
  }


  const ok =
    confirm(
      "আপনি কি সত্যিই এই Folder Delete করতে চান?"
    );

  if (!ok) return;


  const category =
    el("folderCategory").value;


  const { error } = await db
    .from("question_bank_folders")
    .delete()
    .eq("id", folderId);

  if (error) {

    showMessage(
      "folderMsg",
      "Folder Delete হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  await refreshManagementFolders(
    category
  );

  await refreshQuestionDestination(
    el("questionCategory").value
  );

  showMessage(
    "folderMsg",
    "Folder সফলভাবে Delete হয়েছে।",
    "success"
  );
}


/* =========================================================
   ADD SET
========================================================= */

async function addSet() {

  clearMessage("setMsg");

  const folderId =
    el("setFolder").value;

  const name =
    normalizeText(
      el("newSet").value
    );

  if (!folderId) {

    showMessage(
      "setMsg",
      "আগে Folder নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!name) {

    showMessage(
      "setMsg",
      "নতুন Set-এর নাম লিখুন।",
      "error"
    );

    return;
  }


  const {
    data: existing,
    error: checkError
  } = await db
    .from("question_bank_sets")
    .select("id")
    .eq("folder_id", folderId)
    .eq("set_name", name)
    .limit(1);

  if (checkError) {

    showMessage(
      "setMsg",
      "Set যাচাই করা যায়নি: " +
      checkError.message,
      "error"
    );

    return;
  }

  if (existing && existing.length) {

    showMessage(
      "setMsg",
      "এই Folder-এ একই নামে Set আগে থেকেই আছে।",
      "error"
    );

    return;
  }


  const { error } = await db
    .from("question_bank_sets")
    .insert({
      folder_id: folderId,
      set_name: name
    });

  if (error) {

    showMessage(
      "setMsg",
      "Set তৈরি হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  el("newSet").value = "";

  await loadSetsForFolder(
    folderId,
    "set"
  );

  if (
    el("questionFolder").value ===
    String(folderId)
  ) {

    await loadSetsForFolder(
      folderId,
      "questionSet"
    );
  }

  showMessage(
    "setMsg",
    "Set সফলভাবে তৈরি হয়েছে।",
    "success"
  );
}


/* =========================================================
   RENAME SET
========================================================= */

async function renameSet() {

  clearMessage("setMsg");

  const folderId =
    el("setFolder").value;

  const setId =
    el("set").value;

  const newName =
    normalizeText(
      el("newSet").value
    );

  if (!folderId) {

    showMessage(
      "setMsg",
      "আগে Folder নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!setId) {

    showMessage(
      "setMsg",
      "Rename করার জন্য Set নির্বাচন করুন।",
      "error"
    );

    return;
  }

  if (!newName) {

    showMessage(
      "setMsg",
      "নতুন Set-এর নাম লিখুন।",
      "error"
    );

    return;
  }


  const {
    data: existing,
    error: checkError
  } = await db
    .from("question_bank_sets")
    .select("id")
    .eq("folder_id", folderId)
    .eq("set_name", newName)
    .neq("id", setId)
    .limit(1);

  if (checkError) {

    showMessage(
      "setMsg",
      "Set যাচাই করা যায়নি: " +
      checkError.message,
      "error"
    );

    return;
  }

  if (existing && existing.length) {

    showMessage(
      "setMsg",
      "এই Folder-এ এই নামে Set আছে।",
      "error"
    );

    return;
  }


  const { error } = await db
    .from("question_bank_sets")
    .update({
      set_name: newName
    })
    .eq("id", setId);

  if (error) {

    showMessage(
      "setMsg",
      "Set Rename হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  el("newSet").value = "";

  await loadSetsForFolder(
    folderId,
    "set",
    setId
  );

  showMessage(
    "setMsg",
    "Set সফলভাবে Rename হয়েছে।",
    "success"
  );
}


/* =========================================================
   DELETE SET
========================================================= */

async function deleteSet() {

  clearMessage("setMsg");

  const setId =
    el("set").value;

  if (!setId) {

    showMessage(
      "setMsg",
      "Delete করার জন্য Set নির্বাচন করুন।",
      "error"
    );

    return;
  }


  /*
    প্রশ্ন থাকলে Set Delete হবে না।
  */

  const {
    data: questions,
    error: questionError
  } = await db
    .from("questions")
    .select("id")
    .eq("set_id", setId)
    .limit(1);

  if (questionError) {

    showMessage(
      "setMsg",
      "Set-এর প্রশ্ন যাচাই করা যায়নি: " +
      questionError.message,
      "error"
    );

    return;
  }

  if (questions && questions.length > 0) {

    showMessage(
      "setMsg",
      "এই Set-এর মধ্যে প্রশ্ন আছে। প্রশ্ন থাকা অবস্থায় Set Delete করা যাবে না।",
      "error"
    );

    return;
  }


  const ok =
    confirm(
      "আপনি কি সত্যিই এই Set Delete করতে চান?"
    );

  if (!ok) return;


  const folderId =
    el("setFolder").value;


  const { error } = await db
    .from("question_bank_sets")
    .delete()
    .eq("id", setId);

  if (error) {

    showMessage(
      "setMsg",
      "Set Delete হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  await loadSetsForFolder(
    folderId,
    "set"
  );

  if (
    el("questionFolder").value ===
    String(folderId)
  ) {

    await loadSetsForFolder(
      folderId,
      "questionSet"
    );
  }

  showMessage(
    "setMsg",
    "Set সফলভাবে Delete হয়েছে।",
    "success"
  );
}


/* =========================================================
   SAVE QUESTION
========================================================= */

async function saveQuestion() {

  clearMessage("questionMsg");

  const category =
    el("questionCategory").value;

  const folderId =
    el("questionFolder").value;

  const setId =
    el("questionSet").value;

  const subjectId =
    el("subject").value;

  const questionNumber =
    normalizeText(
      el("questionNumber").value
    );

  const question =
    normalizeText(
      el("question").value
    );

  const optionA =
    normalizeText(
      el("optionA").value
    );

  const optionB =
    normalizeText(
      el("optionB").value
    );

  const optionC =
    normalizeText(
      el("optionC").value
    );

  const optionD =
    normalizeText(
      el("optionD").value
    );

  const correctAnswer =
    normalizeText(
      el("correctAnswer").value
    );

  const explanation =
    normalizeText(
      el("explanation").value
    );


  if (!category) {
    showMessage(
      "questionMsg",
      "Category নির্বাচন করুন।",
      "error"
    );
    return;
  }

  if (!folderId) {
    showMessage(
      "questionMsg",
      "Folder নির্বাচন করুন।",
      "error"
    );
    return;
  }

  if (!setId) {
    showMessage(
      "questionMsg",
      "Set নির্বাচন করুন।",
      "error"
    );
    return;
  }

  if (!question) {
    showMessage(
      "questionMsg",
      "প্রশ্ন লিখুন।",
      "error"
    );
    return;
  }

  if (
    !optionA ||
    !optionB ||
    !optionC ||
    !optionD
  ) {

    showMessage(
      "questionMsg",
      "চারটি অপশনই পূরণ করুন।",
      "error"
    );

    return;
  }

  if (!correctAnswer) {

    showMessage(
      "questionMsg",
      "সঠিক উত্তর নির্বাচন করুন।",
      "error"
    );

    return;
  }


  const payload = {

    category: category,

    folder_id: folderId,

    set_id: setId,

    subject_id:
      subjectId || null,

    question_number:
      questionNumber || null,

    question_text:
      question,

    option_a:
      optionA,

    option_b:
      optionB,

    option_c:
      optionC,

    option_d:
      optionD,

    correct_answer:
      correctAnswer,

    explanation:
      explanation || null
  };


  const { error } = await db
    .from("questions")
    .insert(payload);

  if (error) {

    console.error(
      "Question save error:",
      error
    );

    showMessage(
      "questionMsg",
      "প্রশ্ন সংরক্ষণ হয়নি: " +
      error.message,
      "error"
    );

    return;
  }


  /*
    Destination রেখে দেওয়া হচ্ছে।
    ফলে একই Folder/Set-এ পরপর প্রশ্ন দেওয়া যাবে।
  */

  el("questionNumber").value = "";
  el("question").value = "";
  el("optionA").value = "";
  el("optionB").value = "";
  el("optionC").value = "";
  el("optionD").value = "";
  el("correctAnswer").value = "";
  el("explanation").value = "";

  showMessage(
    "questionMsg",
    "প্রশ্ন সফলভাবে সংরক্ষণ হয়েছে।",
    "success"
  );
}


/* =========================================================
   CSV / EXCEL
========================================================= */

function getImportFile() {

  const input =
    el("importFile");

  if (
    !input ||
    !input.files ||
    !input.files[0]
  ) {
    return null;
  }

  return input.files[0];
}


async function readImportRows() {

  const file =
    getImportFile();

  if (!file) {
    throw new Error(
      "আগে CSV/Excel ফাইল নির্বাচন করুন।"
    );
  }

  if (typeof XLSX === "undefined") {
    throw new Error(
      "Excel/CSV reader লোড হয়নি।"
    );
  }

  const buffer =
    await file.arrayBuffer();

  const workbook =
    XLSX.read(
      buffer,
      {
        type: "array"
      }
    );

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "ফাইলে কোনো Sheet পাওয়া যায়নি।"
    );
  }

  const sheet =
    workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(
    sheet,
    {
      defval: ""
    }
  );
}


/* =========================================================
   PREVIEW
========================================================= */

async function previewImport() {

  clearMessage("importMsg");

  try {

    const rows =
      await readImportRows();

    if (!rows.length) {

      showMessage(
        "importMsg",
        "ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।",
        "error"
      );

      return;
    }

    const preview =
      rows
        .slice(0, 10)
        .map(
          (row, index) =>
            "প্রশ্ন " +
            (index + 1) +
            ": " +
            normalizeText(row.question)
        )
        .join("\n\n");

    el("importPreview")
      .textContent = preview;

    showMessage(
      "importMsg",
      "মোট " +
      rows.length +
      "টি প্রশ্ন পাওয়া গেছে।",
      "success"
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "importMsg",
      error.message,
      "error"
    );
  }
}


/* =========================================================
   IMPORT
========================================================= */

async function importQuestions() {

  clearMessage("importMsg");

  try {

    const category =
      el("questionCategory").value;

    const folderId =
      el("questionFolder").value;

    const setId =
      el("questionSet").value;


    if (!category) {
      showMessage(
        "importMsg",
        "প্রথমে Category নির্বাচন করুন।",
        "error"
      );
      return;
    }

    if (!folderId) {
      showMessage(
        "importMsg",
        "প্রথমে Folder নির্বাচন করুন।",
        "error"
      );
      return;
    }

    if (!setId) {
      showMessage(
        "importMsg",
        "প্রথমে Set নির্বাচন করুন।",
        "error"
      );
      return;
    }


    const rows =
      await readImportRows();

    if (!rows.length) {
      showMessage(
        "importMsg",
        "Import করার মতো কোনো প্রশ্ন নেই।",
        "error"
      );
      return;
    }


    const records =
      rows.map(row => ({

        category,

        folder_id:
          folderId,

        set_id:
          setId,

        subject_id:
          normalizeText(
            row.subject_id
          ) || null,

        question_number:
          normalizeText(
            row.question_number
          ) || null,

        question_text:
          normalizeText(
            row.question
          ),

        option_a:
          normalizeText(
            row.option_a
          ),

        option_b:
          normalizeText(
            row.option_b
          ),

        option_c:
          normalizeText(
            row.option_c
          ),

        option_d:
          normalizeText(
            row.option_d
          ),

        correct_answer:
          normalizeText(
            row.correct_answer
          ),

        explanation:
          normalizeText(
            row.explanation
          ) || null

      }));


    const invalidIndex =
      records.findIndex(record =>
        !record.question_text ||
        !record.option_a ||
        !record.option_b ||
        !record.option_c ||
        !record.option_d ||
        !record.correct_answer
      );


    if (invalidIndex !== -1) {

      showMessage(
        "importMsg",
        "প্রশ্ন " +
        (invalidIndex + 1) +
        "-এর প্রয়োজনীয় তথ্য অসম্পূর্ণ।",
        "error"
      );

      return;
    }


    const { error } =
      await db
        .from("questions")
        .insert(records);


    if (error) {

      console.error(error);

      showMessage(
        "importMsg",
        "Import হয়নি: " +
        error.message,
        "error"
      );

      return;
    }


    showMessage(
      "importMsg",
      records.length +
      "টি প্রশ্ন সফলভাবে Import হয়েছে।",
      "success"
    );

    el("importPreview")
      .textContent = "";

  } catch (error) {

    console.error(error);

    showMessage(
      "importMsg",
      error.message,
      "error"
    );
  }
}


/* =========================================================
   TEMPLATE
========================================================= */

function downloadTemplate() {

  if (typeof XLSX === "undefined") {

    showMessage(
      "importMsg",
      "Excel/CSV reader লোড হয়নি।",
      "error"
    );

    return;
  }


  const rows = [

    {
      question_number: "১",
      question: "প্রশ্ন লিখুন",
      option_a: "অপশন ক",
      option_b: "অপশন খ",
      option_c: "অপশন গ",
      option_d: "অপশন ঘ",
      correct_answer: "ক",
      explanation: "ব্যাখ্যা"
    }

  ];


  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Questions"
  );

  XLSX.writeFile(
    workbook,
    "question_template.xlsx"
  );
}


/* =========================================================
   START
========================================================= */

initQuestionCreate();
