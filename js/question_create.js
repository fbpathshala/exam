const CATS = {
  recruitment: "নিয়োগ পরীক্ষা",
  verification_test: "যাচাই পরীক্ষা",
  recent: "সাম্প্রতিক প্রশ্ন"
};

let folders = [];


/* =========================================================
   BASIC HELPERS
========================================================= */

function showMessage(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}


function fillSelect(element, items, valueKey, labelKey, placeholder) {
  if (!element) return;

  element.innerHTML =
    `<option value="">${placeholder}</option>` +
    (items || [])
      .map(item => {
        return `
          <option value="${item[valueKey]}">
            ${escapeHtml(item[labelKey])}
          </option>
        `;
      })
      .join("");
}


function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}


/* =========================================================
   CATEGORY OPTIONS
========================================================= */

function getCategoryOptions() {
  return Object.entries(CATS).map(([value, label]) => ({
    value,
    label
  }));
}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function initQuestionCreate() {

  const categoryOptions = getCategoryOptions();

  const folderCategory =
    document.getElementById("folderCategory");

  const questionCategory =
    document.getElementById("questionCategory");

  if (folderCategory) {
    folderCategory.innerHTML =
      `<option value="">ক্যাটাগরি নির্বাচন করুন</option>` +
      categoryOptions
        .map(item =>
          `<option value="${item.value}">
             ${item.label}
           </option>`
        )
        .join("");
  }

  if (questionCategory) {
    questionCategory.innerHTML =
      `<option value="">ক্যাটাগরি নির্বাচন করুন</option>` +
      categoryOptions
        .map(item =>
          `<option value="${item.value}">
             ${item.label}
           </option>`
        )
        .join("");
  }


  await loadSubjects();
  await loadFolders();


  /* -----------------------------------------
     Folder category → Folder
  ----------------------------------------- */

  folderCategory?.addEventListener("change", async () => {
    await loadFolderOptions(
      "folderCategory",
      "folder"
    );
  });


  /* -----------------------------------------
     Question category → Folder
  ----------------------------------------- */

  questionCategory?.addEventListener("change", async () => {
    await loadFolderOptions(
      "questionCategory",
      "questionFolder"
    );
  });


  /* -----------------------------------------
     Folder → Set
  ----------------------------------------- */

  document
    .getElementById("setFolder")
    ?.addEventListener("change", async () => {
      await loadSetOptions(
        "setFolder",
        "set"
      );
    });


  document
    .getElementById("questionFolder")
    ?.addEventListener("change", async () => {
      await loadSetOptions(
        "questionFolder",
        "questionSet"
      );
    });


  /* -----------------------------------------
     Initial dropdowns
  ----------------------------------------- */

  await loadFolderOptions(
    "folderCategory",
    "folder"
  );

  await loadFolderOptions(
    "questionCategory",
    "questionFolder"
  );
}


/* =========================================================
   LOAD SUBJECTS
========================================================= */

async function loadSubjects() {

  const { data, error } =
    await db
      .from("subjects")
      .select("id, subject_name")
      .order("subject_name");

  if (error) {
    console.error(error);
    return;
  }

  fillSelect(
    document.getElementById("subject"),
    data || [],
    "id",
    "subject_name",
    "বিষয় নির্বাচন করুন"
  );
}


/* =========================================================
   LOAD FOLDERS
========================================================= */

async function loadFolders() {

  const { data, error } =
    await db
      .from("question_bank_folders")
      .select(
        "id, folder_name, sub_category"
      )
      .order("folder_name");

  if (error) {
    console.error(error);
    showMessage(
      "folderMsg",
      error.message
    );
    return;
  }

  folders = data || [];
}


/* =========================================================
   CATEGORY → FOLDER
========================================================= */

async function loadFolderOptions(
  categoryElementId,
  folderElementId
) {

  const categoryElement =
    document.getElementById(
      categoryElementId
    );

  const folderElement =
    document.getElementById(
      folderElementId
    );

  if (!categoryElement || !folderElement) {
    return;
  }

  const category =
    categoryElement.value;


  let filteredFolders = folders;


  if (category) {

    filteredFolders =
      folders.filter(folder =>
        folder.sub_category ===
        CATS[category]
      );

  }


  fillSelect(
    folderElement,
    filteredFolders,
    "id",
    "folder_name",
    "Folder নির্বাচন করুন"
  );


  /* -----------------------------------------
     Corresponding Set dropdown clear
  ----------------------------------------- */

  if (folderElementId === "folder") {

    fillSelect(
      document.getElementById("set"),
      [],
      "id",
      "set_name",
      "Set নির্বাচন করুন"
    );

  }


  if (
    folderElementId ===
    "questionFolder"
  ) {

    fillSelect(
      document.getElementById("questionSet"),
      [],
      "id",
      "set_name",
      "Set নির্বাচন করুন"
    );

  }
}


/* =========================================================
   FOLDER → SET
========================================================= */

async function loadSetOptions(
  folderElementId,
  setElementId
) {

  const folderId =
    document.getElementById(
      folderElementId
    )?.value;

  const setElement =
    document.getElementById(
      setElementId
    );

  if (!setElement) return;


  if (!folderId) {

    fillSelect(
      setElement,
      [],
      "id",
      "set_name",
      "Set নির্বাচন করুন"
    );

    return;
  }


  const { data, error } =
    await db
      .from("question_bank_sets")
      .select("id, set_name")
      .eq("folder_id", folderId)
      .order("set_name");


  if (error) {

    console.error(error);

    showMessage(
      "setMsg",
      error.message
    );

    return;
  }


  fillSelect(
    setElement,
    data || [],
    "id",
    "set_name",
    "Set নির্বাচন করুন"
  );
}


/* =========================================================
   ADD FOLDER
========================================================= */

async function addFolder() {

  const category =
    document.getElementById(
      "folderCategory"
    )?.value;

  const folderName =
    document.getElementById(
      "newFolder"
    )?.value.trim();


  if (!category) {

    showMessage(
      "folderMsg",
      "আগে Category নির্বাচন করুন।"
    );

    return;
  }


  if (!folderName) {

    showMessage(
      "folderMsg",
      "Folder-এর নাম লিখুন।"
    );

    return;
  }


  const { error } =
    await db
      .from("question_bank_folders")
      .insert({
        sub_category: CATS[category],
        folder_name: folderName
      });


  if (error) {

    showMessage(
      "folderMsg",
      error.message
    );

    return;
  }


  document.getElementById(
    "newFolder"
  ).value = "";


  showMessage(
    "folderMsg",
    "Folder সফলভাবে যোগ হয়েছে।"
  );


  await loadFolders();

  await loadFolderOptions(
    "folderCategory",
    "folder"
  );

  await loadFolderOptions(
    "questionCategory",
    "questionFolder"
  );
}


/* =========================================================
   RENAME FOLDER
========================================================= */

async function renameFolder() {

  const folderId =
    document.getElementById(
      "folder"
    )?.value;

  const newName =
    document.getElementById(
      "newFolder"
    )?.value.trim();


  if (!folderId) {

    showMessage(
      "folderMsg",
      "যে Folder-এর নাম পরিবর্তন করবেন সেটি নির্বাচন করুন।"
    );

    return;
  }


  if (!newName) {

    showMessage(
      "folderMsg",
      "নতুন Folder-এর নাম লিখুন।"
    );

    return;
  }


  const { error } =
    await db
      .from("question_bank_folders")
      .update({
        folder_name: newName
      })
      .eq("id", folderId);


  if (error) {

    showMessage(
      "folderMsg",
      error.message
    );

    return;
  }


  document.getElementById(
    "newFolder"
  ).value = "";


  showMessage(
    "folderMsg",
    "Folder-এর নাম সফলভাবে পরিবর্তন হয়েছে।"
  );


  await loadFolders();

  await loadFolderOptions(
    "folderCategory",
    "folder"
  );

  await loadFolderOptions(
    "questionCategory",
    "questionFolder"
  );
}


/* =========================================================
   DELETE FOLDER
========================================================= */

async function deleteFolder() {

  const folderId =
    document.getElementById(
      "folder"
    )?.value;


  if (!folderId) {

    showMessage(
      "folderMsg",
      "Delete করার জন্য Folder নির্বাচন করুন।"
    );

    return;
  }


  /*
     নিরাপত্তা:
     Folder-এর ভিতরে Set থাকলে Folder
     সরাসরি Delete করা হবে না।
  */

  const { count, error: countError } =
    await db
      .from("question_bank_sets")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq("folder_id", folderId);


  if (countError) {

    showMessage(
      "folderMsg",
      countError.message
    );

    return;
  }


  if (count > 0) {

    showMessage(
      "folderMsg",
      "এই Folder-এর ভিতরে Set আছে। আগে Set সরান। নিরাপত্তার জন্য Folder Delete করা হয়নি।"
    );

    return;
  }


  if (
    !confirm(
      "আপনি কি সত্যিই এই Folder Delete করতে চান?"
    )
  ) {
    return;
  }


  const { error } =
    await db
      .from("question_bank_folders")
      .delete()
      .eq("id", folderId);


  if (error) {

    showMessage(
      "folderMsg",
      error.message
    );

    return;
  }


  showMessage(
    "folderMsg",
    "Folder সফলভাবে Delete হয়েছে।"
  );


  await loadFolders();

  await loadFolderOptions(
    "folderCategory",
    "folder"
  );

  await loadFolderOptions(
    "questionCategory",
    "questionFolder"
  );
}


/* =========================================================
   ADD SET
========================================================= */

async function addSet() {

  const folderId =
    document.getElementById(
      "setFolder"
    )?.value;

  const setName =
    document.getElementById(
      "newSet"
    )?.value.trim();


  if (!folderId) {

    showMessage(
      "setMsg",
      "আগে Folder নির্বাচন করুন।"
    );

    return;
  }


  if (!setName) {

    showMessage(
      "setMsg",
      "Set-এর নাম লিখুন।"
    );

    return;
  }


  const { error } =
    await db
      .from("question_bank_sets")
      .insert({
        folder_id: folderId,
        set_name: setName
      });


  if (error) {

    showMessage(
      "setMsg",
      error.message
    );

    return;
  }


  document.getElementById(
    "newSet"
  ).value = "";


  showMessage(
    "setMsg",
    "Set সফলভাবে যোগ হয়েছে।"
  );


  await loadSetOptions(
    "setFolder",
    "set"
  );
}


/* =========================================================
   RENAME SET
========================================================= */

async function renameSet() {

  const setId =
    document.getElementById(
      "set"
    )?.value;

  const newName =
    document.getElementById(
      "newSet"
    )?.value.trim();


  if (!setId) {

    showMessage(
      "setMsg",
      "যে Set-এর নাম পরিবর্তন করবেন সেটি নির্বাচন করুন।"
    );

    return;
  }


  if (!newName) {

    showMessage(
      "setMsg",
      "নতুন Set-এর নাম লিখুন।"
    );

    return;
  }


  const { error } =
    await db
      .from("question_bank_sets")
      .update({
        set_name: newName
      })
      .eq("id", setId);


  if (error) {

    showMessage(
      "setMsg",
      error.message
    );

    return;
  }


  document.getElementById(
    "newSet"
  ).value = "";


  showMessage(
    "setMsg",
    "Set-এর নাম সফলভাবে পরিবর্তন হয়েছে।"
  );


  await loadSetOptions(
    "setFolder",
    "set"
  );
}


/* =========================================================
   DELETE SET
========================================================= */

async function deleteSet() {

  const setId =
    document.getElementById(
      "set"
    )?.value;


  if (!setId) {

    showMessage(
      "setMsg",
      "Delete করার জন্য Set নির্বাচন করুন।"
    );

    return;
  }


  /*
     নিরাপত্তা:
     Set-এর ভিতরে প্রশ্ন থাকলে Set Delete
     করা হবে না।
  */

  const {
    count,
    error: countError
  } =
    await db
      .from("questions")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq("set_id", setId);


  if (countError) {

    showMessage(
      "setMsg",
      countError.message
    );

    return;
  }


  if (count > 0) {

    showMessage(
      "setMsg",
      "এই Set-এর ভিতরে প্রশ্ন আছে। নিরাপত্তার জন্য Set Delete করা হয়নি।"
    );

    return;
  }


  if (
    !confirm(
      "আপনি কি সত্যিই এই Set Delete করতে চান?"
    )
  ) {
    return;
  }


  const { error } =
    await db
      .from("question_bank_sets")
      .delete()
      .eq("id", setId);


  if (error) {

    showMessage(
      "setMsg",
      error.message
    );

    return;
  }


  showMessage(
    "setMsg",
    "Set সফলভাবে Delete হয়েছে।"
  );


  await loadSetOptions(
    "setFolder",
    "set"
  );
}


/* =========================================================
   SAVE MANUAL QUESTION
========================================================= */

async function saveQuestion() {

  const category =
    document.getElementById(
      "questionCategory"
    )?.value;

  const folderId =
    document.getElementById(
      "questionFolder"
    )?.value;

  const setId =
    document.getElementById(
      "questionSet"
    )?.value;

  const subjectId =
    document.getElementById(
      "subject"
    )?.value || null;

  const questionNumber =
    document.getElementById(
      "questionNumber"
    )?.value.trim() || null;

  const questionText =
    document.getElementById(
      "question"
    )?.value.trim();

  const optionA =
    document.getElementById(
      "optionA"
    )?.value.trim();

  const optionB =
    document.getElementById(
      "optionB"
    )?.value.trim();

  const optionC =
    document.getElementById(
      "optionC"
    )?.value.trim();

  const optionD =
    document.getElementById(
      "optionD"
    )?.value.trim();

  const correctAnswer =
    document.getElementById(
      "correctAnswer"
    )?.value;

  const explanation =
    document.getElementById(
      "explanation"
    )?.value.trim() || "";


  if (!category) {

    showMessage(
      "questionMsg",
      "Category নির্বাচন করুন।"
    );

    return;
  }


  if (!folderId) {

    showMessage(
      "questionMsg",
      "Folder নির্বাচন করুন।"
    );

    return;
  }


  if (!setId) {

    showMessage(
      "questionMsg",
      "Set নির্বাচন করুন।"
    );

    return;
  }


  if (!questionText) {

    showMessage(
      "questionMsg",
      "প্রশ্ন লিখুন।"
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
      "চারটি অপশন পূরণ করুন।"
    );

    return;
  }


  if (!correctAnswer) {

    showMessage(
      "questionMsg",
      "সঠিক উত্তর নির্বাচন করুন।"
    );

    return;
  }


  const questionData = {

    category: category,

    folder_id: folderId,

    set_id: setId,

    subject_id: subjectId,

    question_number: questionNumber,

    question_text: questionText,

    option_a: optionA,

    option_b: optionB,

    option_c: optionC,

    option_d: optionD,

    correct_answer: correctAnswer,

    explanation: explanation
  };


  const { error } =
    await db
      .from("questions")
      .insert(questionData);


  if (error) {

    console.error(error);

    showMessage(
      "questionMsg",
      "প্রশ্ন সংরক্ষণ হয়নি: " +
      error.message
    );

    return;
  }


  showMessage(
    "questionMsg",
    "প্রশ্ন সফলভাবে সংরক্ষণ হয়েছে।"
  );


  /*
     Question save হওয়ার পরে
     শুধু question fields পরিষ্কার করা হবে।
     Category / Folder / Set রাখা হবে,
     যাতে একই জায়গায় পরের প্রশ্ন দ্রুত যোগ করা যায়।
  */

  document.getElementById(
    "questionNumber"
  ).value = "";

  document.getElementById(
    "question"
  ).value = "";

  document.getElementById(
    "optionA"
  ).value = "";

  document.getElementById(
    "optionB"
  ).value = "";

  document.getElementById(
    "optionC"
  ).value = "";

  document.getElementById(
    "optionD"
  ).value = "";

  document.getElementById(
    "correctAnswer"
  ).value = "";

  document.getElementById(
    "explanation"
  ).value = "";
}


/* =========================================================
   READ CSV / EXCEL
========================================================= */

async function readImportFile() {

  const file =
    document.getElementById(
      "importFile"
    )?.files?.[0];


  if (!file) {
    throw new Error(
      "আগে CSV অথবা Excel ফাইল নির্বাচন করুন।"
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


  const firstSheet =
    workbook.Sheets[
      workbook.SheetNames[0]
    ];


  return XLSX.utils.sheet_to_json(
    firstSheet,
    {
      defval: ""
    }
  );
}


/* =========================================================
   IMPORT PREVIEW
========================================================= */

async function previewImport() {

  try {

    const rows =
      await readImportFile();


    document.getElementById(
      "importPreview"
    ).textContent =
      JSON.stringify(
        rows.slice(0, 10),
        null,
        2
      );


    showMessage(
      "importMsg",
      `${rows.length}টি row পাওয়া গেছে।`
    );

  } catch (error) {

    showMessage(
      "importMsg",
      error.message
    );
  }
}


/* =========================================================
   IMPORT CSV / EXCEL
========================================================= */

async function importQuestions() {

  try {

    const category =
      document.getElementById(
        "questionCategory"
      )?.value;

    const folderId =
      document.getElementById(
        "questionFolder"
      )?.value;

    const setId =
      document.getElementById(
        "questionSet"
      )?.value;


    if (!category) {

      showMessage(
        "importMsg",
        "Category নির্বাচন করুন।"
      );

      return;
    }


    if (!folderId) {

      showMessage(
        "importMsg",
        "Folder নির্বাচন করুন।"
      );

      return;
    }


    if (!setId) {

      showMessage(
        "importMsg",
        "Set নির্বাচন করুন।"
      );

      return;
    }


    const rows =
      await readImportFile();


    if (!rows.length) {

      showMessage(
        "importMsg",
        "ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।"
      );

      return;
    }


    /*
       গুরুত্বপূর্ণ:
       CSV/Excel-এর category দিয়ে destination
       পরিবর্তন হবে না।

       উপরে নির্বাচিত Category → Folder → Set
       সব imported question-এর destination হবে।
    */

    const questionRows =
      rows.map(row => {

        return {

          category: category,

          folder_id: folderId,

          set_id: setId,

          subject_id: null,

          question_number:
            row.question_number ||
            null,

          question_text:
            row.question ||
            row.question_text ||
            "",

          option_a:
            row.option_a ||
            "",

          option_b:
            row.option_b ||
            "",

          option_c:
            row.option_c ||
            "",

          option_d:
            row.option_d ||
            "",

          correct_answer:
            row.correct_answer ||
            "",

          explanation:
            row.explanation ||
            ""
        };

      });


    const invalid =
      questionRows.findIndex(row =>
        !row.question_text ||
        !row.option_a ||
        !row.option_b ||
        !row.option_c ||
        !row.option_d ||
        !row.correct_answer
      );


    if (invalid !== -1) {

      showMessage(
        "importMsg",
        `Row ${invalid + 2}-এ প্রয়োজনীয় তথ্য অসম্পূর্ণ।`
      );

      return;
    }


    const { error } =
      await db
        .from("questions")
        .insert(questionRows);


    if (error) {

      showMessage(
        "importMsg",
        "Import হয়নি: " +
        error.message
      );

      return;
    }


    showMessage(
      "importMsg",
      `${questionRows.length}টি প্রশ্ন সফলভাবে Import হয়েছে।`
    );


    document.getElementById(
      "importPreview"
    ).textContent = "";

  } catch (error) {

    console.error(error);

    showMessage(
      "importMsg",
      error.message
    );
  }
}


/* =========================================================
   DOWNLOAD EXCEL TEMPLATE
========================================================= */

function downloadTemplate() {

  const rows = [

    {

      question_number: "১",

      question:
        "এখানে প্রশ্ন লিখুন",

      option_a:
        "অপশন ক",

      option_b:
        "অপশন খ",

      option_c:
        "অপশন গ",

      option_d:
        "অপশন ঘ",

      correct_answer:
        "ক",

      explanation:
        "এখানে ব্যাখ্যা লিখুন"

    }

  ];


  const worksheet =
    XLSX.utils.json_to_sheet(
      rows
    );


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
