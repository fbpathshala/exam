const CATS = {
  recruitment: 'নিয়োগ পরীক্ষা',
  verification_test: 'যাচাই পরীক্ষা',
  recent: 'সাম্প্রতিক প্রশ্ন'
};

let cat = 'verification_test';
let folders = [];
let sets = [];
let subjects = [];
let exams = [];
let importData = [];

const $ = id => document.getElementById(id);

const bn = n =>
  String(n ?? '').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const esc = v =>
  String(v ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&#039;',
    "'": '&#039;'
  }[m]));

function msg(id, t, err = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = t;
  el.style.color = err ? '#b91c1c' : '#166534';
}

/* =========================
   LOGIN / APP
========================= */

async function login() {
  msg('loginMsg', 'Login হচ্ছে...');

  const { error } = await db.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });

  if (error) {
    msg('loginMsg', error.message, true);
    return;
  }

  await init();
}

async function logout() {
  await db.auth.signOut();
  location.reload();
}

function showPage(p) {
  document
    .querySelectorAll('.page')
    .forEach(x => x.classList.add('hidden'));

  const page = $(p);
  if (page) page.classList.remove('hidden');

  if (p === 'bank') loadBank();
  if (p === 'exam') loadExams();
}

async function init() {
  const { data } = await db.auth.getSession();

  if (!data.session) {
    $('login').classList.remove('hidden');
    $('app').classList.add('hidden');
    return;
  }

  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');

  $('userEmail').textContent =
    data.session.user.email || '';

  /* =========================
     EVENT HANDLERS
  ========================= */

  if ($('folder')) {
    $('folder').onchange = async () => {
      await loadSets();
      updateFolderButtons();
    };
  }

  if ($('filterFolder')) {
    $('filterFolder').onchange = async () => {
      await loadFilterSets();
      await loadQuestions();
    };
  }

  if ($('filterSet')) {
    $('filterSet').onchange = async () => {
      await loadQuestions();
    };
  }

  if ($('filterSubject')) {
    $('filterSubject').onchange = async () => {
      await loadQuestions();
    };
  }

  if ($('mapFolder')) {
    $('mapFolder').onchange = async () => {
      await loadMapSets();
    };
  }

  if ($('mapSet')) {
    $('mapSet').onchange = async () => {
      if ($('mapExam')?.value) {
        await loadPool();
      }
    };
  }

  if ($('examSelect')) {
    $('examSelect').onchange = async () => {
      await loadSettings();
    };
  }

  if ($('mapExam')) {
    $('mapExam').onchange = async () => {
      await loadPool();
    };
  }

  await loadSubjects();

  await selectCategory(
    'verification_test'
  );

  await loadQuestions();
  await loadExams();

  showPage('dashboard');
}

/* =========================
   QUESTION BANK INIT
========================= */

async function loadBank() {
  await loadFolders();
  await loadFilterFolders();
  await loadQuestions();
}

/* =========================
   SUBJECTS
========================= */

async function loadSubjects() {
  const r = await db
    .from('subjects')
    .select('id,name')
    .order('id', { ascending: true });

  if (r.error) {
    msg(
      'qmsg',
      'Subject load error: ' + r.error.message,
      true
    );
    return;
  }

  subjects = r.data || [];

  if ($('subject')) {
    $('subject').innerHTML =
      '<option value="">বিষয় নির্বাচন করুন</option>' +
      subjects
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.name)}
            </option>`
        )
        .join('');
  }

  if ($('filterSubject')) {
    $('filterSubject').innerHTML =
      '<option value="">সব বিষয়</option>' +
      subjects
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.name)}
            </option>`
        )
        .join('');
  }
}

/* =========================
   CATEGORY
========================= */

async function selectCategory(c) {
  cat = c;

  document
    .querySelectorAll('.cats button')
    .forEach(b => b.classList.remove('active'));

  if ($('cat-' + c)) {
    $('cat-' + c).classList.add('active');
  }

  if ($('currentCat')) {
    $('currentCat').textContent =
      'বর্তমান Category: ' + CATS[c];
  }

  await loadFolders();
  await loadFilterFolders();
}

/* =========================
   FOLDERS
========================= */

async function loadFolders() {
  const r = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (r.error) {
    msg(
      'folderMsg',
      r.error.message,
      true
    );
    return;
  }

  folders = r.data || [];

  const options =
    '<option value="">Folder নির্বাচন করুন</option>' +
    folders
      .map(
        x =>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
      )
      .join('');

  if ($('folder')) {
    $('folder').innerHTML = options;
  }

  if ($('mapFolder')) {
    $('mapFolder').innerHTML = options;
  }

  if ($('filterFolder')) {
    $('filterFolder').innerHTML =
      '<option value="">সব Folder</option>' +
      folders
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.folder_name)}
            </option>`
        )
        .join('');
  }

  await loadSets();

  addFolderEditButtons();
}

/* =========================
   FOLDER EDIT BUTTONS
========================= */

function addFolderEditButtons() {
  const folderSelect = $('folder');

  if (!folderSelect) return;

  let box = $('folderEditBox');

  if (!box) {
    box = document.createElement('div');

    box.id = 'folderEditBox';

    box.style.marginTop = '6px';

    folderSelect.insertAdjacentElement(
      'afterend',
      box
    );
  }

  box.innerHTML = `
    <button
      type="button"
      class="secondary"
      id="editFolderBtn"
    >
      ✏️ Folder-এর নাম পরিবর্তন
    </button>

    <button
      type="button"
      class="secondary"
      id="deleteFolderBtn"
      style="margin-left:6px;"
    >
      🗑️ Folder Delete
    </button>
  `;

  $('editFolderBtn').onclick =
    editFolder;

  $('deleteFolderBtn').onclick =
    deleteFolder;

  updateFolderButtons();
}

/* =========================
   UPDATE FOLDER BUTTONS
========================= */

function updateFolderButtons() {
  const selected =
    !!$('folder')?.value;

  if ($('editFolderBtn')) {
    $('editFolderBtn').disabled =
      !selected;
  }

  if ($('deleteFolderBtn')) {
    $('deleteFolderBtn').disabled =
      !selected;
  }
}

/* =========================
   EDIT FOLDER NAME
========================= */

async function editFolder() {
  const folderId =
    $('folder')?.value;

  if (!folderId) {
    return msg(
      'folderMsg',
      'আগে একটি Folder নির্বাচন করুন',
      true
    );
  }

  const current =
    folders.find(
      x =>
        String(x.id) ===
        String(folderId)
    );

  if (!current) {
    return msg(
      'folderMsg',
      'Folder পাওয়া যায়নি',
      true
    );
  }

  const newName =
    prompt(
      'Folder-এর নতুন নাম দিন:',
      current.folder_name
    );

  if (newName === null) {
    return;
  }

  const name =
    newName.trim();

  if (!name) {
    return msg(
      'folderMsg',
      'Folder-এর নাম খালি রাখা যাবে না',
      true
    );
  }

  if (
    name ===
    current.folder_name
  ) {
    return;
  }

  const r =
    await db
      .from(
        'question_bank_folders'
      )
      .update({
        folder_name: name
      })
      .eq(
        'id',
        Number(folderId)
      );

  if (r.error) {
    return msg(
      'folderMsg',
      r.error.message,
      true
    );
  }

  await loadFolders();
  await loadFilterFolders();

  if ($('folder')) {
    $('folder').value =
      folderId;
  }

  await loadSets();

  msg(
    'folderMsg',
    '✅ Folder-এর নাম পরিবর্তন হয়েছে'
  );
}

/* =========================
   DELETE FOLDER
========================= */

async function deleteFolder() {
  const folderId =
    $('folder')?.value;

  if (!folderId) {
    return msg(
      'folderMsg',
      'আগে একটি Folder নির্বাচন করুন',
      true
    );
  }

  const current =
    folders.find(
      x =>
        String(x.id) ===
        String(folderId)
    );

  if (!current) {
    return msg(
      'folderMsg',
      'Folder পাওয়া যায়নি',
      true
    );
  }

  /* Check Sets */

  const setsCheck =
    await db
      .from(
        'question_bank_sets'
      )
      .select(
        'id',
        {
          count: 'exact',
          head: true
        }
      )
      .eq(
        'folder_id',
        Number(folderId)
      );

  if (setsCheck.error) {
    return msg(
      'folderMsg',
      setsCheck.error.message,
      true
    );
  }

  if (
    (setsCheck.count || 0) > 0
  ) {
    return msg(
      'folderMsg',
      '❌ এই Folder-এর মধ্যে Set আছে। আগে Setগুলো Delete করুন।',
      true
    );
  }

  /* Check Questions */

  const questionsCheck =
    await db
      .from('questions')
      .select(
        'id',
        {
          count: 'exact',
          head: true
        }
      )
      .eq(
        'folder_id',
        Number(folderId)
      );

  if (questionsCheck.error) {
    return msg(
      'folderMsg',
      questionsCheck.error.message,
      true
    );
  }

  if (
    (questionsCheck.count || 0) > 0
  ) {
    return msg(
      'folderMsg',
      '❌ এই Folder-এর মধ্যে প্রশ্ন আছে। আগে প্রশ্নগুলো সরান।',
      true
    );
  }

  const ok =
    confirm(
      `“${current.folder_name}” Folderটি Delete করতে চান?`
    );

  if (!ok) {
    return;
  }

  const r =
    await db
      .from(
        'question_bank_folders'
      )
      .delete()
      .eq(
        'id',
        Number(folderId)
      );

  if (r.error) {
    return msg(
      'folderMsg',
      'Folder delete error: ' +
        r.error.message,
      true
    );
  }

  await loadFolders();
  await loadFilterFolders();

  msg(
    'folderMsg',
    '✅ Folder Delete হয়েছে'
  );
}

/* =========================
   FILTER FOLDERS
========================= */

async function loadFilterFolders() {
  if (!$('filterFolder')) return;

  const r = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (r.error) {
    msg(
      'qmsg',
      r.error.message,
      true
    );
    return;
  }

  $('filterFolder').innerHTML =
    '<option value="">সব Folder</option>' +
    (r.data || [])
      .map(
        x =>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
      )
      .join('');

  await loadFilterSets();
}

/* =========================
   SETS
========================= */

async function loadSets() {
  const id =
    $('folder')?.value;

  const r =
    id
      ? await db
          .from(
            'question_bank_sets'
          )
          .select(
            'id,set_name'
          )
          .eq(
            'folder_id',
            Number(id)
          )
          .order('id')
      : {
          data: [],
          error: null
        };

  if (r.error) {
    msg(
      'folderMsg',
      r.error.message,
      true
    );
    return;
  }

  sets =
    r.data || [];

  if ($('set')) {
    $('set').innerHTML =
      '<option value="">Set নির্বাচন করুন</option>' +
      sets
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.set_name)}
            </option>`
        )
        .join('');

    addSetEditButton();
  }
}

/* =========================
   SET EDIT / DELETE BUTTONS
========================= */

function addSetEditButton() {
  const setSelect =
    $('set');

  if (!setSelect) return;

  let box =
    $('setEditBox');

  if (!box) {
    box =
      document.createElement(
        'div'
      );

    box.id =
      'setEditBox';

    box.style.marginTop =
      '6px';

    setSelect.insertAdjacentElement(
      'afterend',
      box
    );
  }

  box.innerHTML = `
    <button
      type="button"
      class="secondary"
      id="editSetBtn"
    >
      ✏️ Set-এর নাম পরিবর্তন
    </button>

    <button
      type="button"
      class="secondary"
      id="deleteSetBtn"
      style="margin-left:6px;"
    >
      🗑️ Set Delete
    </button>
  `;

  $('editSetBtn').onclick =
    editSet;

  $('deleteSetBtn').onclick =
    deleteSet;

  updateSetButtons();

  setSelect.onchange = () => {
    updateSetButtons();
  };
}

/* =========================
   UPDATE SET BUTTONS
========================= */

function updateSetButtons() {
  const selected =
    !!$('set')?.value;

  if ($('editSetBtn')) {
    $('editSetBtn').disabled =
      !selected;
  }

  if ($('deleteSetBtn')) {
    $('deleteSetBtn').disabled =
      !selected;
  }
}

/* =========================
   EDIT SET NAME
========================= */

async function editSet() {
  const setId =
    $('set')?.value;

  if (!setId) {
    return msg(
      'folderMsg',
      'আগে একটি Set নির্বাচন করুন',
      true
    );
  }

  const current =
    sets.find(
      x =>
        String(x.id) ===
        String(setId)
    );

  if (!current) {
    return msg(
      'folderMsg',
      'Set পাওয়া যায়নি',
      true
    );
  }

  const newName =
    prompt(
      'Set-এর নতুন নাম দিন:',
      current.set_name
    );

  if (newName === null) {
    return;
  }

  const name =
    newName.trim();

  if (!name) {
    return msg(
      'folderMsg',
      'Set-এর নাম খালি রাখা যাবে না',
      true
    );
  }

  if (
    name ===
    current.set_name
  ) {
    return;
  }

  const r =
    await db
      .from(
        'question_bank_sets'
      )
      .update({
        set_name: name
      })
      .eq(
        'id',
        Number(setId)
      );

  if (r.error) {
    return msg(
      'folderMsg',
      r.error.message,
      true
    );
  }

  await loadSets();

  if ($('set')) {
    $('set').value =
      setId;
  }

  updateSetButtons();

  msg(
    'folderMsg',
    '✅ Set-এর নাম পরিবর্তন হয়েছে'
  );
}

/* =========================
   DELETE SET
========================= */

async function deleteSet() {
  const setId =
    $('set')?.value;

  if (!setId) {
    return msg(
      'folderMsg',
      'আগে একটি Set নির্বাচন করুন',
      true
    );
  }

  const current =
    sets.find(
      x =>
        String(x.id) ===
        String(setId)
    );

  if (!current) {
    return msg(
      'folderMsg',
      'Set পাওয়া যায়নি',
      true
    );
  }

  /* Check Questions */

  const questionsCheck =
    await db
      .from('questions')
      .select(
        'id',
        {
          count: 'exact',
          head: true
        }
      )
      .eq(
        'set_id',
        Number(setId)
      );

  if (questionsCheck.error) {
    return msg(
      'folderMsg',
      questionsCheck.error.message,
      true
    );
  }

  if (
    (questionsCheck.count || 0) > 0
  ) {
    return msg(
      'folderMsg',
      '❌ এই Set-এর মধ্যে প্রশ্ন আছে। আগে প্রশ্নগুলো সরাতে হবে।',
      true
    );
  }

  const ok =
    confirm(
      `“${current.set_name}” Setটি Delete করতে চান?`
    );

  if (!ok) {
    return;
  }

  const r =
    await db
      .from(
        'question_bank_sets'
      )
      .delete()
      .eq(
        'id',
        Number(setId)
      );

  if (r.error) {
    return msg(
      'folderMsg',
      'Set delete error: ' +
        r.error.message,
      true
    );
  }

  await loadSets();

  msg(
    'folderMsg',
    '✅ Set Delete হয়েছে'
  );
}

/* =========================
   FILTER SETS
========================= */

async function loadFilterSets() {
  const id =
    $('filterFolder')?.value;

  const r =
    id
      ? await db
          .from(
            'question_bank_sets'
          )
          .select(
            'id,set_name'
          )
          .eq(
            'folder_id',
            Number(id)
          )
          .order('id')
      : {
          data: [],
          error: null
        };

  if (r.error) {
    msg(
      'qmsg',
      r.error.message,
      true
    );
    return;
  }

  if ($('filterSet')) {
    $('filterSet').innerHTML =
      '<option value="">সব Set</option>' +
      (r.data || [])
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.set_name)}
            </option>`
        )
        .join('');
  }
}

/* =========================
   MAP SETS
========================= */

async function loadMapSets() {
  const id =
    $('mapFolder')?.value;

  const r =
    id
      ? await db
          .from(
            'question_bank_sets'
          )
          .select(
            'id,set_name'
          )
          .eq(
            'folder_id',
            Number(id)
          )
          .order('id')
      : {
          data: [],
          error: null
        };

  if (r.error) {
    msg(
      'mapMsg',
      r.error.message,
      true
    );
    return;
  }

  if ($('mapSet')) {
    $('mapSet').innerHTML =
      '<option value="">সব Set</option>' +
      (r.data || [])
        .map(
          x =>
            `<option value="${x.id}">
              ${esc(x.set_name)}
            </option>`
        )
        .join('');
  }
}

/* =========================
   CREATE FOLDER
========================= */

async function createFolder() {
  const name =
    $('newFolder')
      .value
      .trim();

  if (!name) {
    return msg(
      'folderMsg',
      'Folder-এর নাম দিন',
      true
    );
  }

  const r =
    await db
      .from(
        'question_bank_folders'
      )
      .insert({
        sub_category:
          CATS[cat],

        folder_name:
          name
      })
      .select(
        'id,folder_name'
      )
      .single();

  if (r.error) {
    return msg(
      'folderMsg',
      r.error.message,
      true
    );
  }

  $('newFolder').value =
    '';

  await loadFolders();

  if ($('folder')) {
    $('folder').value =
      r.data.id;
  }

  await loadSets();

  updateFolderButtons();

  msg(
    'folderMsg',
    '✅ Folder তৈরি হয়েছে'
  );
}

/* =========================
   CREATE SET
========================= */

async function createSet() {
  const folderId =
    $('folder').value;

  const name =
    $('newSet')
      .value
      .trim();

  if (!folderId) {
    return msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন',
      true
    );
  }

  if (!name) {
    return msg(
      'folderMsg',
      'Set-এর নাম দিন',
      true
    );
  }

  const r =
    await db
      .from(
        'question_bank_sets'
      )
      .insert({
        folder_id:
          Number(folderId),

        set_name:
          name
      })
      .select(
        'id,set_name'
      )
      .single();

  if (r.error) {
    return msg(
      'folderMsg',
      r.error.message,
      true
    );
  }

  $('newSet').value =
    '';

  await loadSets();

  if ($('set')) {
    $('set').value =
      r.data.id;
  }

  addSetEditButton();

  updateSetButtons();

  msg(
    'folderMsg',
    '✅ Set তৈরি হয়েছে'
  );
}

/* =========================
   MANUAL QUESTION
========================= */

async function addManual() {
  const folderId =
    $('folder').value;

  const setId =
    $('set').value;

  const subjectId =
    $('subject').value;

  const text =
    $('qtext').value.trim();

  const a =
    $('a').value.trim();

  const b =
    $('b').value.trim();

  const c =
    $('c').value.trim();

  const d =
    $('d').value.trim();

  const correct =
    $('correct').value;

  if (!folderId || !setId) {
    return msg(
      'qmsg',
      'Category, Folder ও Set নির্বাচন করুন',
      true
    );
  }

  if (
    !subjectId ||
    !text ||
    !a ||
    !b ||
    !c ||
    !d ||
    !correct
  ) {
    return msg(
      'qmsg',
      'বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',
      true
    );
  }

  const payload = {
    folder_id:
      Number(folderId),

    set_id:
      Number(setId),

    subject_id:
      Number(subjectId),

    question_text:
      text,

    option_a:
      a,

    option_b:
      b,

    option_c:
      c,

    option_d:
      d,

    correct_answer:
      correct,

    explanation:
      $('explanation').value.trim() ||
      null,

    question_number:
      $('qno').value
        ? Number(
            $('qno').value
          )
        : null,

    category:
      CATS[cat],

    source_name:
      $('source').value.trim() ||
      null,

    source_type:
      cat
  };

  const r =
    await db
      .from('questions')
      .insert(payload);

  if (r.error) {
    return msg(
      'qmsg',
      r.error.message,
      true
    );
  }

  [
    'qno',
    'source',
    'qtext',
    'a',
    'b',
    'c',
    'd',
    'explanation'
  ].forEach(x => {
    if ($(x)) {
      $(x).value = '';
    }
  });

  $('correct').value =
    '';

  msg(
    'qmsg',
    '✅ প্রশ্ন Question Bank-এ যোগ হয়েছে'
  );

  await loadQuestions();
}

/* =========================
   MANUAL / IMPORT MODE
========================= */

function mode(m) {
  $('manualBox').classList.toggle(
    'hidden',
    m !== 'manual'
  );

  $('importBox').classList.toggle(
    'hidden',
    m !== 'import'
  );
}

/* =========================
   EXCEL TEMPLATE
========================= */

function template() {
  const rows = [
    [
      'category',
      'folder',
      'set',
      'subject',
      'source',
      'question_number',
      'question',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_answer',
      'explanation'
    ],
    [
      'যাচাই পরীক্ষা',
      'বাংলাদেশ',
      'সেট-১',
      'বাংলাদেশ',
      'বিসিএস',
      1,
      'বাংলাদেশের রাজধানী কোনটি?',
      'ঢাকা',
      'চট্টগ্রাম',
      'রাজশাহী',
      'খুলনা',
      'A',
      ''
    ]
  ];

  const ws =
    XLSX.utils.aoa_to_sheet(rows);

  const wb =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    'Questions'
  );

  XLSX.writeFile(
    wb,
    'question-import-template.xlsx'
  );
}

/* =========================
   IMPORT PREVIEW
========================= */

async function previewImport() {
  const f =
    $('file').files[0];

  if (!f) {
    return msg(
      'qmsg',
      'CSV/Excel file নির্বাচন করুন',
      true
    );
  }

  const data =
    XLSX.read(
      await f.arrayBuffer(),
      {
        type: 'array'
      }
    );

  const rows =
    XLSX.utils.sheet_to_json(
      data.Sheets[
        data.SheetNames[0]
      ],
      {
        defval: ''
      }
    );

  importData =
    rows;

  $('preview').innerHTML = `
    <div class="q">
      <b>
        ${bn(rows.length)}
        টি row পাওয়া গেছে
      </b>

      <pre>${esc(
        JSON.stringify(
          rows.slice(0, 5),
          null,
          2
        )
      )}</pre>
    </div>
  `;

  $('importBtn')
    .classList
    .remove('hidden');

  msg(
    'qmsg',
    'Preview প্রস্তুত হয়েছে'
  );
}

function norm(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

/* =========================
   IMPORT QUESTIONS
========================= */

async function importRows() {
  let ok = 0;

  const fail = [];

  /*
    Admin-এ বর্তমানে নির্বাচিত Folder / Set।
    Excel-এ এগুলো না থাকলে এগুলো ব্যবহার করা হবে।
  */

  const selectedFolderId =
    Number(
      $('folder')?.value || 0
    ) || null;

  const selectedSetId =
    Number(
      $('set')?.value || 0
    ) || null;

  for (
    let i = 0;
    i < importData.length;
    i++
  ) {
    const r =
      importData[i];

    /* =========================
       CATEGORY
    ========================= */

    const categoryRaw =
      String(
        r.category || ''
      ).trim();

    const categoryProvided =
      !!categoryRaw;

    /*
      Excel-এর Category সঠিক হলে সেটি ব্যবহার হবে।
      Category খালি/ভুল হলে বর্তমান Category ব্যবহার হবে।
    */

    const category =
      Object.values(CATS)
        .includes(categoryRaw)
        ? categoryRaw
        : CATS[cat];

    /* =========================
       OPTIONAL FOLDER / SET
    ========================= */

    const folderName =
      String(
        r.folder || ''
      ).trim();

    const setName =
      String(
        r.set || ''
      ).trim();

    /* =========================
       REQUIRED FIELDS
       শুধু এই ৬টি বিষয় বাধ্যতামূলক
    ========================= */

    const question =
      String(
        r.question || ''
      ).trim();

    const optionA =
      String(
        r.option_a || ''
      ).trim();

    const optionB =
      String(
        r.option_b || ''
      ).trim();

    const optionC =
      String(
        r.option_c || ''
      ).trim();

    const optionD =
      String(
        r.option_d || ''
      ).trim();

    /* =========================
       CORRECT ANSWER
    ========================= */

    let correct =
      String(
        r.correct_answer || ''
      )
        .trim()
        .toUpperCase();

    /*
      বাংলা সঠিক উত্তরকেও গ্রহণ করা হবে।
      ক = A
      খ = B
      গ = C
      ঘ = D
    */

    const correctMap = {
      'ক': 'A',
      'খ': 'B',
      'গ': 'C',
      'ঘ': 'D'
    };

    correct =
      correctMap[correct] ||
      correct;

    /* =========================
       REQUIRED VALIDATION
    ========================= */

    if (
      !question ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !['A', 'B', 'C', 'D'].includes(correct)
    ) {
      fail.push(
        `Row ${i + 2}: প্রশ্ন, চারটি অপশন এবং সঠিক উত্তর পূরণ করতে হবে`
      );

      continue;
    }

    /* =========================
       FOLDER / SET ID
    ========================= */

    /*
      Excel-এ Category দেওয়া হয়েছে এবং
      সেটি বর্তমান Category থেকে আলাদা হলে
      বর্তমান Admin Folder/Set ব্যবহার করা হবে না।
    */

    let fid =
      (
        categoryProvided &&
        categoryRaw !== CATS[cat]
      )
        ? null
        : selectedFolderId;

    let sid =
      (
        categoryProvided &&
        categoryRaw !== CATS[cat]
      )
        ? null
        : selectedSetId;

    /* =========================
       FOLDER
    ========================= */

    if (folderName) {

      const fr =
        await db
          .from(
            'question_bank_folders'
          )
          .select('id')
          .eq(
            'sub_category',
            category
          )
          .eq(
            'folder_name',
            folderName
          )
          .maybeSingle();

      if (fr.error) {
        fail.push(
          `Row ${i + 2}: ${fr.error.message}`
        );

        continue;
      }

      fid =
        fr.data?.id || null;

      /*
        Folder না থাকলে তৈরি হবে।
      */

      if (!fid) {

        const x =
          await db
            .from(
              'question_bank_folders'
            )
            .insert({
              sub_category:
                category,

              folder_name:
                folderName
            })
            .select('id')
            .single();

        if (x.error) {
          fail.push(
            `Row ${i + 2}: ${x.error.message}`
          );

          continue;
        }

        fid =
          x.data.id;
      }

      /*
        Folder দেওয়া হয়েছে কিন্তু Set দেওয়া হয়নি।
        তাই আগের selected Set ব্যবহার করা যাবে না।
      */

      if (!setName) {
        sid = null;
      }
    }

    /* =========================
       SET
    ========================= */

    if (setName) {

      /*
        Set দেওয়া আছে কিন্তু Folder নেই।
        তখন Admin-এর selected Folder থাকলে
        সেটি ব্যবহার করা হবে।
      */

      if (!fid) {
        fail.push(
          `Row ${i + 2}: Set দেওয়া হয়েছে, কিন্তু Folder পাওয়া যায়নি`
        );

        continue;
      }

      const sr =
        await db
          .from(
            'question_bank_sets'
          )
          .select('id')
          .eq(
            'folder_id',
            fid
          )
          .eq(
            'set_name',
            setName
          )
          .maybeSingle();

      if (sr.error) {
        fail.push(
          `Row ${i + 2}: ${sr.error.message}`
        );

        continue;
      }

      sid =
        sr.data?.id || null;

      /*
        Set না থাকলে তৈরি হবে।
      */

      if (!sid) {

        const x =
          await db
            .from(
              'question_bank_sets'
            )
            .insert({
              folder_id:
                fid,

              set_name:
                setName
            })
            .select('id')
            .single();

        if (x.error) {
          fail.push(
            `Row ${i + 2}: ${x.error.message}`
          );

          continue;
        }

        sid =
          x.data.id;
      }
    }

    /* =========================
       SUBJECT
       Optional
    ========================= */

    let sub =
      null;

    const subjectName =
      String(
        r.subject || ''
      ).trim();

    if (subjectName) {

      sub =
        subjects.find(
          x =>
            norm(x.name) ===
            norm(subjectName)
        ) || null;

      /*
        Subject পাওয়া না গেলেও
        Row বাদ যাবে না।
        subject_id = null থাকবে।
      */
    }

    /* =========================
       QUESTION PAYLOAD
    ========================= */

    const p = {

      folder_id:
        fid,

      set_id:
        sid,

      subject_id:
        sub?.id || null,

      category:
        category,

      /*
        Source শুধু text হিসেবে সংরক্ষিত হবে।
        source_id পাঠানো হচ্ছে না।
      */

      source_name:
        String(
          r.source || ''
        ).trim() ||
        null,

      source_type:
        cat,

      question_number:
        r.question_number !== '' &&
        r.question_number !== null &&
        r.question_number !== undefined
          ? Number(
              r.question_number
            )
          : null,

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
        correct,

      explanation:
        String(
          r.explanation || ''
        ).trim() ||
        null
    };

    /* =========================
       INSERT
    ========================= */

    const x =
      await db
        .from('questions')
        .insert(p);

    if (x.error) {

      fail.push(
        `Row ${i + 2}: ${x.error.message}`
      );

    } else {

      ok++;
    }
  }

  /* =========================
     RESULT
  ========================= */

  msg(
    'qmsg',
    `✅ ${bn(ok)}টি Import হয়েছে${
      fail.length
        ? ` | ❌ ${bn(
            fail.length
          )}টি ব্যর্থ`
        : ''
    }`,
    !!fail.length
  );

  if (fail.length) {

    $('preview').innerHTML +=
      '<div class="q">' +
      fail
        .map(esc)
        .join('<br>') +
      '</div>';
  }

  await loadQuestions();
}

/* =========================
   QUESTION FILTER
========================= */

async function loadFilter() {
  await loadFilterSets();
  await loadQuestions();
}

/* =========================
   QUESTION BANK LIST
   + QUESTION MOVE
========================= */

async function loadQuestions() {

  let q =
    db
      .from('questions')
      .select(
        'id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,category,folder_id,set_id,subject_id,subjects(name)'
      )
      .order(
        'id',
        {
          ascending: false
        }
      )
      .limit(200);

  if (
    $('filterFolder')?.value
  ) {
    q =
      q.eq(
        'folder_id',
        Number(
          $('filterFolder').value
        )
      );
  }

  if (
    $('filterSet')?.value
  ) {
    q =
      q.eq(
        'set_id',
        Number(
          $('filterSet').value
        )
      );
  }

  if (
    $('filterSubject')?.value
  ) {
    q =
      q.eq(
        'subject_id',
        Number(
          $('filterSubject').value
        )
      );
  }

  const term =
    $('search')?.value.trim() ||
    '';

  if (term) {
    q =
      q.ilike(
        'question_text',
        '%' +
          term +
          '%'
      );
  }

  const r =
    await q;

  if (r.error) {
    return msg(
      'qmsg',
      r.error.message,
      true
    );
  }

  const data =
    r.data || [];

  /*
    Current question list-এর Folder নাম
    বের করার জন্য local folders ব্যবহার করা হচ্ছে।
  */

  const folderMap =
    new Map(
      (folders || []).map(
        x => [
          Number(x.id),
          x.folder_name
        ]
      )
    );

  /*
    বর্তমানে দেখানো প্রশ্নগুলোর Set ID সংগ্রহ
  */

  const setIds =
    [
      ...new Set(
        data
          .map(
            x =>
              Number(
                x.set_id
              )
          )
          .filter(Boolean)
      )
    ];

  let setMap =
    new Map();

  if (setIds.length) {

    const sr =
      await db
        .from(
          'question_bank_sets'
        )
        .select(
          'id,set_name,folder_id'
        )
        .in(
          'id',
          setIds
        );

    if (!sr.error) {

      setMap =
        new Map(
          (sr.data || [])
            .map(
              x => [
                Number(x.id),
                x
              ]
            )
        );
    }
  }

  /*
    Move UI আগে তৈরি করা হবে।
  */

  setupQuestionMoveUI();

  /*
    Question list
  */

  $('questions').innerHTML =
    data
      .map(
        x => {

          const currentSet =
            setMap.get(
              Number(
                x.set_id
              )
            );

          const currentFolderName =
            folderMap.get(
              Number(
                x.folder_id
              )
            ) ||
            '—';

          const currentSetName =
            currentSet?.set_name ||
            '—';

          return `
            <div class="q">

              <label
                style="
                  display:block;
                  margin-bottom:8px;
                "
              >

                <input
                  type="checkbox"
                  class="bankQuestionCheck"
                  value="${x.id}"
                >

                <b>
                  ${bn(
                    x.question_number ||
                      ''
                  )}.
                  ${esc(
                    x.question_text
                  )}
                </b>

              </label>

              <div>
                ক.
                ${esc(
                  x.option_a
                )}
                <br>

                খ.
                ${esc(
                  x.option_b
                )}
                <br>

                গ.
                ${esc(
                  x.option_c
                )}
                <br>

                ঘ.
                ${esc(
                  x.option_d
                )}
              </div>

              <div class="small">

                ${esc(
                  x.category
                )}

                ·

                ${esc(
                  x.subjects?.name ||
                    ''
                )}

                ·

                Folder:
                ${esc(
                  currentFolderName
                )}

                ·

                Set:
                ${esc(
                  currentSetName
                )}

                ·

                সঠিক:
                ${esc(
                  ({
                    A: 'ক',
                    B: 'খ',
                    C: 'গ',
                    D: 'ঘ'
                  })[
                    x.correct_answer
                  ] ||
                    x.correct_answer
                )}

              </div>

            </div>
          `;
        }
      )
      .join('') ||
    'কোনো প্রশ্ন নেই';

  /*
    Question list বসানোর পর Move UI আবার নিশ্চিত করা।
  */

  setupQuestionMoveUI();
}

/* =========================
   QUESTION MOVE HELPERS
========================= */

function moveEsc(v) {
  return esc(v);
}

function moveBn(v) {
  return bn(v);
}

/* =========================
   LOAD DESTINATION SETS
========================= */

async function loadMoveSets() {

  const folderId =
    Number(
      $('moveFolder')?.value ||
      0
    );

  const setEl =
    $('moveSet');

  if (!setEl) return;

  if (!folderId) {

    setEl.innerHTML =
      '<option value="">আগে Destination Folder নির্বাচন করুন</option>';

    return;
  }

  setEl.innerHTML =
    '<option value="">Set লোড হচ্ছে...</option>';

  const r =
    await db
      .from(
        'question_bank_sets'
      )
      .select(
        'id,set_name,folder_id'
      )
      .eq(
        'folder_id',
        folderId
      )
      .order(
        'id',
        {
          ascending: true
        }
      );

  if (r.error) {

    setEl.innerHTML =
      '<option value="">Set লোড হয়নি</option>';

    const moveMsg =
      $('moveMsg');

    if (moveMsg) {
      moveMsg.textContent =
        r.error.message;

      moveMsg.style.color =
        '#b91c1c';
    }

    return;
  }

  setEl.innerHTML =
    '<option value="">Destination Set নির্বাচন করুন</option>' +

    (r.data || [])
      .map(
        x =>
          `<option value="${x.id}">
            ${moveEsc(
              x.set_name
            )}
          </option>`
      )
      .join('');
}

/* =========================
   QUESTION MOVE UI
========================= */

function setupQuestionMoveUI() {

  const questions =
    $('questions');

  if (!questions) return;

  /*
    Move box Question list-এর উপরে থাকবে।
  */

  let box =
    $('questionMoveBox');

  if (!box) {

    box =
      document.createElement(
        'div'
      );

    box.id =
      'questionMoveBox';

    box.className =
      'card';

    box.style.marginBottom =
      '12px';

    questions.parentElement.insertBefore(
      box,
      questions
    );
  }

  /*
    Current category-এর folders-ই
    Destination Folder হিসেবে দেখানো হবে।
  */

  const folderOptions =
    '<option value="">Destination Folder নির্বাচন করুন</option>' +

    (folders || [])
      .map(
        x =>
          `<option value="${x.id}">
            ${moveEsc(
              x.folder_name
            )}
          </option>`
      )
      .join('');

  box.innerHTML = `

    <h3
      style="margin-top:0;"
    >
      📦 নির্বাচিত প্রশ্ন অন্য Folder / Set-এ নিন
    </h3>

    <div class="grid">

      <select id="moveFolder">
        ${folderOptions}
      </select>

      <select id="moveSet">

        <option value="">
          আগে Destination Folder নির্বাচন করুন
        </option>

      </select>

    </div>

    <button
      type="button"
      id="moveSelectedBtn"
    >
      ➡️ নির্বাচিত প্রশ্ন Move করুন
    </button>

    <button
      type="button"
      class="secondary"
      id="selectAllQuestionsBtn"
      style="margin-left:6px;"
    >
      ☑️ সব প্রশ্ন নির্বাচন
    </button>

    <button
      type="button"
      class="secondary"
      id="clearAllQuestionsBtn"
      style="margin-left:6px;"
    >
      ☐ নির্বাচন বাতিল
    </button>

    <p
      id="moveMsg"
      class="msg"
    ></p>

  `;

  $('moveFolder').onchange =
    loadMoveSets;

  $('selectAllQuestionsBtn').onclick =
    function () {

      document
        .querySelectorAll(
          '.bankQuestionCheck'
        )
        .forEach(
          x => {
            x.checked = true;
          }
        );

      if ($('moveMsg')) {
        $('moveMsg').textContent =
          'সব দেখানো প্রশ্ন নির্বাচন করা হয়েছে';

        $('moveMsg').style.color =
          '#166534';
      }
    };

  $('clearAllQuestionsBtn').onclick =
    function () {

      document
        .querySelectorAll(
          '.bankQuestionCheck'
        )
        .forEach(
          x => {
            x.checked = false;
          }
        );

      if ($('moveMsg')) {
        $('moveMsg').textContent =
          'নির্বাচন বাতিল করা হয়েছে';

        $('moveMsg').style.color =
          '#166534';
      }
    };

  $('moveSelectedBtn').onclick =
    moveSelectedQuestions;
}

/* =========================
   MOVE SELECTED QUESTIONS
========================= */

async function moveSelectedQuestions() {

  const selected =
    Array.from(
      document.querySelectorAll(
        '.bankQuestionCheck:checked'
      )
    )
      .map(
        x =>
          Number(
            x.value
          )
      )
      .filter(Boolean);

  const folderId =
    Number(
      $('moveFolder')?.value ||
      0
    );

  const setId =
    Number(
      $('moveSet')?.value ||
      0
    );

  if (!selected.length) {

    alert(
      'আগে অন্তত একটি প্রশ্ন নির্বাচন করুন।'
    );

    return;
  }

  if (!folderId || !setId) {

    alert(
      'Destination Folder এবং Destination Set দুটোই নির্বাচন করুন।'
    );

    return;
  }

  /*
    গুরুত্বপূর্ণ নিরাপত্তা যাচাই:
    নির্বাচিত Set সত্যিই নির্বাচিত Folder-এর
    অন্তর্ভুক্ত কি না।
  */

  const check =
    await db
      .from(
        'question_bank_sets'
      )
      .select(
        'id,folder_id,set_name'
      )
      .eq(
        'id',
        setId
      )
      .maybeSingle();

  if (check.error) {

    alert(
      check.error.message
    );

    return;
  }

  if (
    !check.data ||
    Number(
      check.data.folder_id
    ) !== folderId
  ) {

    alert(
      'নির্বাচিত Set এই Folder-এর অন্তর্ভুক্ত নয়।'
    );

    return;
  }

  /*
    নিশ্চিতকরণ
  */

  const confirmed =
    confirm(
      `${moveBn(
        selected.length
      )}টি প্রশ্ন Move করা হবে।\n\n` +

      'প্রশ্নের লেখা, অপশন, সঠিক উত্তর, বিষয়, নম্বর ও অন্যান্য তথ্য পরিবর্তন হবে না।\n\n' +

      'শুধু Folder এবং Set পরিবর্তন হবে।\n\n' +

      'আপনি কি নিশ্চিত?'
    );

  if (!confirmed) {
    return;
  }

  const button =
    $('moveSelectedBtn');

  if (button) {
    button.disabled = true;
    button.textContent =
      '⏳ Move হচ্ছে...';
  }

  /*
    শুধু folder_id এবং set_id update হবে।
  */

  const r =
    await db
      .from('questions')
      .update({
        folder_id:
          folderId,

        set_id:
          setId
      })
      .in(
        'id',
        selected
      );

  if (button) {
    button.disabled = false;
    button.textContent =
      '➡️ নির্বাচিত প্রশ্ন Move করুন';
  }

  if (r.error) {

    alert(
      'Move হয়নি:\n' +
      r.error.message
    );

    return;
  }

  alert(
    `${moveBn(
      selected.length
    )}টি প্রশ্ন সফলভাবে Move হয়েছে।`
  );

  /*
    Destination selection পরিষ্কার
  */

  if ($('moveFolder')) {
    $('moveFolder').value =
      '';
  }

  if ($('moveSet')) {
    $('moveSet').innerHTML =
      '<option value="">আগে Destination Folder নির্বাচন করুন</option>';
  }

  /*
    Question Bank refresh
  */

  await loadQuestions();
}

/* =========================
   CREATE EXAM
========================= */

async function createExam() {
  const name =
    $('examName')
      .value
      .trim();

  if (!name) {
    return msg(
      'examMsg',
      'পরীক্ষার নাম দিন',
      true
    );
  }

  const r =
    await db
      .from('exams')
      .insert({
        exam_name:
          name,

        status:
          $('examStatus')
            .value,

        total_questions:
          0,

        marks_per_question:
          1,

        negative_mark:
          0,

        pass_mark:
          0
      })
      .select('id')
      .single();

  if (r.error) {
    return msg(
      'examMsg',
      r.error.message,
      true
    );
  }

  const s =
    await db
      .from('exam_settings')
      .upsert(
        {
          exam_id:
            r.data.id,

          total_questions:
            0,

          total_marks:
            0,

          pass_mark:
            0,

          duration_minutes:
            20,

          marks_per_question:
            1,

          negative_mark:
            0,

          show_answers:
            false,

          multiple_attempts:
            false,

          device_attempt_protection:
            true,

          random_questions:
            false,

          random_options:
            false
        },
        {
          onConflict:
            'exam_id'
        }
      );

  if (s.error) {
    return msg(
      'examMsg',
      s.error.message,
      true
    );
  }

  $('examName').value =
    '';

  msg(
    'examMsg',
    '✅ Exam তৈরি হয়েছে'
  );

  await loadExams();

  $('examSelect').value =
    r.data.id;

  await loadSettings();
}

/* =========================
   EXAM LIST
========================= */

async function loadExams() {
  const r =
    await db
      .from('exams')
      .select(
        'id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark'
      )
      .order(
        'id',
        {
          ascending: false
        }
      );

  if (r.error) {
    msg(
      'examMsg',
      r.error.message,
      true
    );

    return;
  }

  exams =
    r.data || [];

  if ($('sExams')) {
    $('sExams')
      .textContent =
      bn(
        exams.length
      );
  }

  if ($('sActive')) {
    $('sActive')
      .textContent =
      bn(
        exams.filter(
          x =>
            x.status ===
            'active'
        ).length
      );
  }

  const examOptions =
    '<option value="">Exam নির্বাচন করুন</option>' +
    exams
      .map(
        x =>
          `<option value="${x.id}">
            ${esc(
              x.exam_name
            )}
            (#${x.id})
          </option>`
      )
      .join('');

  if ($('examSelect')) {
    $('examSelect')
      .innerHTML =
      examOptions;
  }

  if ($('mapExam')) {
    $('mapExam')
      .innerHTML =
      examOptions;
  }

  if ($('exams')) {
    $('exams').innerHTML =
      exams
        .map(
          x => `
            <div class="examrow">

              <b>
                ${esc(
                  x.exam_name
                )}
              </b>

              ·
              ${esc(
                x.status
              )}

              ·
              ${bn(
                x.total_questions ||
                  0
              )}
              প্রশ্ন

              <br>

              <span class="link">
                ${
                  location.origin
                }${
                  location.pathname.replace(
                    /\/[^/]*$/,
                    '/../'
                  )
                }?exam=${x.id}
              </span>

              <br>

              <button
                onclick="copyLink(${x.id})"
              >
                🔗 Exam Link কপি
              </button>

              <button
                class="secondary"
                onclick="activate(
                  ${x.id},
                  '${
                    x.status ===
                    'active'
                      ? 'inactive'
                      : 'active'
                  }'
                )"
              >
                ${
                  x.status ===
                  'active'
                    ? 'Inactive'
                    : 'Active'
                }
              </button>

            </div>
          `
        )
        .join('');
  }

  const countR =
    await db
      .from('questions')
      .select(
        'id',
        {
          count:
            'exact',
          head:
            true
        }
      );

  if ($('sQuestions')) {
    $('sQuestions')
      .textContent =
      bn(
        countR.count ||
          0
      );
  }
}

/* =========================
   EXAM LINK
========================= */

async function copyLink(id) {
  const base =
    new URL(
      '../index.html',
      location.href
    ).href +
    '?exam=' +
    id;

  try {
    await navigator.clipboard
      .writeText(base);

    alert(
      'Exam Link copied'
    );
  } catch (_) {
    prompt(
      'Exam Link',
      base
    );
  }
}

/* =========================
   ACTIVATE / INACTIVE
========================= */

async function activate(
  id,
  status
) {
  const r =
    await db
      .from('exams')
      .update({
        status
      })
      .eq(
        'id',
        id
      );

  if (r.error) {
    return msg(
      'examMsg',
      r.error.message,
      true
    );
  }

  await loadExams();
}

/* =========================
   LOAD EXAM SETTINGS
========================= */

async function loadSettings() {
  const id =
    $('examSelect')
      ?.value;

  if (!id) return;

  const r =
    await db
      .from('exam_settings')
      .select('*')
      .eq(
        'exam_id',
        id
      )
      .maybeSingle();

  if (r.error) {
    return msg(
      'settingsMsg',
      r.error.message,
      true
    );
  }

  const s =
    r.data || {};

  $('totalQ').value =
    s.total_questions ??
    0;

  $('totalMarks').value =
    s.total_marks ??
    0;

  $('pass').value =
    s.pass_mark ??
    0;

  $('duration').value =
    s.duration_minutes ??
    20;

  $('marks').value =
    s.marks_per_question ??
    1;

  $('negative').value =
    s.negative_mark ??
    0;

  $('examiner').value =
    s.examiner_name ??
    '';

  $('syllabus').value =
    s.syllabus ??
    '';

  $('showAnswers').checked =
    !!s.show_answers;

  $('multiple').checked =
    !!s.multiple_attempts;

  $('device').checked =
    s.device_attempt_protection !==
    false;

  $('randomQ').checked =
    !!s.random_questions;

  $('randomO').checked =
    !!s.random_options;

  $('startDate').value =
    s.exam_date ||
    '';

  $('startTime').value =
    s.start_time ||
    '';

  $('endDate').value =
    s.end_date ||
    '';

  $('endTime').value =
    s.end_time ||
    '';
}

/* =========================
   SAVE EXAM SETTINGS
========================= */

async function saveSettings() {
  const id =
    $('examSelect')
      ?.value;

  if (!id) {
    return msg(
      'settingsMsg',
      'Exam নির্বাচন করুন',
      true
    );
  }

  const payload = {
    exam_id:
      id,

    total_questions:
      Number(
        $('totalQ').value
      ) || 0,

    total_marks:
      Number(
        $('totalMarks').value
      ) || 0,

    pass_mark:
      Number(
        $('pass').value
      ) || 0,

    duration_minutes:
      Number(
        $('duration').value
      ) || 20,

    marks_per_question:
      Number(
        $('marks').value
      ) || 1,

    negative_mark:
      Number(
        $('negative').value
      ) || 0,

    examiner_name:
      $('examiner')
        .value
        .trim() ||
      null,

    syllabus:
      $('syllabus')
        .value
        .trim() ||
      null,

    show_answers:
      $('showAnswers')
        .checked,

    multiple_attempts:
      $('multiple')
        .checked,

    device_attempt_protection:
      $('device')
        .checked,

    random_questions:
      $('randomQ')
        .checked,

    random_options:
      $('randomO')
        .checked,

    exam_date:
      $('startDate')
        .value ||
      null,

    start_time:
      $('startTime')
        .value ||
      null,

    end_date:
      $('endDate')
        .value ||
      null,

    end_time:
      $('endTime')
        .value ||
      null
  };

  /* Save Exam Settings */

  const r =
    await db
      .from('exam_settings')
      .upsert(
        payload,
        {
          onConflict:
            'exam_id'
        }
      );

  if (r.error) {
    return msg(
      'settingsMsg',
      r.error.message,
      true
    );
  }

  /* Update main Exam table */

  const e =
    await db
      .from('exams')
      .update({
        total_questions:
          payload.total_questions,

        marks_per_question:
          payload.marks_per_question,

        negative_mark:
          payload.negative_mark,

        pass_mark:
          payload.pass_mark
      })
      .eq(
        'id',
        id
      );

  if (e.error) {
    return msg(
      'settingsMsg',
      e.error.message,
      true
    );
  }

  msg(
    'settingsMsg',
    '✅ Exam Settings সংরক্ষিত হয়েছে'
  );

  await loadExams();
}

/* =========================
   QUESTION MAPPING
========================= */

async function loadPool() {
  const examId =
    $('mapExam')
      ?.value;

  if (!examId) {
    return msg(
      'mapMsg',
      'Exam নির্বাচন করুন',
      true
    );
  }

  let q =
    db
      .from('questions')
      .select(
        'id,question_text,category,folder_id,set_id,question_number'
      )
      .limit(200);

  if (
    $('mapFolder')?.value
  ) {
    q =
      q.eq(
        'folder_id',
        Number(
          $('mapFolder')
            .value
        )
      );
  }

  if (
    $('mapSet')?.value
  ) {
    q =
      q.eq(
        'set_id',
        Number(
          $('mapSet')
            .value
        )
      );
  }

  const r =
    await q;

  if (r.error) {
    return msg(
      'mapMsg',
      r.error.message,
      true
    );
  }

  const existing =
    await db
      .from(
        'exam_questions'
      )
      .select(
        'question_id'
      )
      .eq(
        'exam_id',
        examId
      );

  if (existing.error) {
    return msg(
      'mapMsg',
      existing.error.message,
      true
    );
  }

  const ids =
    new Set(
      (
        existing.data ||
        []
      ).map(
        x =>
          String(
            x.question_id
          )
      )
    );

  $('pool').innerHTML =
    (r.data || [])
      .map(
        x => `
          <label class="q">

            <input
              type="checkbox"
              class="poolq"
              value="${x.id}"
              ${
                ids.has(
                  String(
                    x.id
                  )
                )
                  ? 'checked'
                  : ''
              }
            >

            ${esc(
              x.question_text
            )}

            <span class="small">
              (
              ${esc(
                x.category ||
                  ''
              )}
              )
            </span>

          </label>
        `
      )
      .join('') +

    `
      <button
        onclick="saveMapping(${examId})"
      >
        Exam-এ নির্বাচিত প্রশ্ন Save করুন
      </button>
    `;
}

/* =========================
   SAVE QUESTION MAPPING
========================= */

async function saveMapping(
  examId
) {
  const ids =
    [
      ...document.querySelectorAll(
        '.poolq:checked'
      )
    ].map(
      x =>
        Number(
          x.value
        )
    );

  const old =
    await db
      .from(
        'exam_questions'
      )
      .delete()
      .eq(
        'exam_id',
        examId
      );

  if (old.error) {
    return msg(
      'mapMsg',
      old.error.message,
      true
    );
  }

  if (ids.length) {
    const rows =
      ids.map(
        (
          id,
          i
        ) => ({
          exam_id:
            examId,

          question_id:
            id,

          question_order:
            i + 1
        })
      );

    const r =
      await db
        .from(
          'exam_questions'
        )
        .insert(
          rows
        );

    if (r.error) {
      return msg(
        'mapMsg',
        r.error.message,
        true
      );
    }
  }

  await db
    .from('exams')
    .update({
      total_questions:
        ids.length
    })
    .eq(
      'id',
      examId
    );

  await db
    .from('exam_settings')
    .update({
      total_questions:
        ids.length
    })
    .eq(
      'exam_id',
      examId
    );

  msg(
    'mapMsg',
    `✅ ${bn(
      ids.length
    )}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`
  );

  await loadExams();
}

/* =========================
   GLOBAL FUNCTIONS
========================= */

window.login =
  login;

window.logout =
  logout;

window.showPage =
  showPage;

window.selectCategory =
  selectCategory;

window.createFolder =
  createFolder;

window.editFolder =
  editFolder;

window.deleteFolder =
  deleteFolder;

window.createSet =
  createSet;

window.editSet =
  editSet;

window.deleteSet =
  deleteSet;

window.addManual =
  addManual;

window.mode =
  mode;

window.template =
  template;

window.previewImport =
  previewImport;

window.importRows =
  importRows;

window.loadFilter =
  loadFilter;

window.loadQuestions =
  loadQuestions;

window.createExam =
  createExam;

window.loadExams =
  loadExams;

window.copyLink =
  copyLink;

window.activate =
  activate;

window.loadSettings =
  loadSettings;

window.saveSettings =
  saveSettings;

window.loadPool =
  loadPool;

window.saveMapping =
  saveMapping;

window.loadMoveSets =
  loadMoveSets;

window.moveSelectedQuestions =
  moveSelectedQuestions;

/* =========================
   START
========================= */

(async function start() {
  await init();
})();
