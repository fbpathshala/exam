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
  String(v ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])
  );

function msg(id, text, err = false) {
  const el = $(id);
  if (!el) return;

  el.textContent = text;
  el.style.color = err ? '#b91c1c' : '#166534';
}


/* =========================
   AUTH
========================= */

async function login() {
  msg('loginMsg', 'Login হচ্ছে...');

  const email = $('email')?.value.trim();
  const password = $('password')?.value || '';

  if (!email || !password) {
    return msg('loginMsg', 'Email ও Password দিন।', true);
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return msg('loginMsg', error.message, true);
  }

  await init();
}

async function logout() {
  await db.auth.signOut();
  location.reload();
}


/* =========================
   PAGE
========================= */

function showPage(page) {
  document
    .querySelectorAll('.page')
    .forEach(x => x.classList.add('hidden'));

  $(page)?.classList.remove('hidden');

  if (page === 'bank') {
    loadBank();
  }

  if (page === 'exam') {
    loadExams();
  }
}


/* =========================
   INIT
========================= */

async function init() {

  /*
    Legacy Source field থাকলে ব্যবহার করা হবে না।
    Question Create-এ Source এখন আর নেই।
  */
  const source = $('source');

  if (source) {
    source.value = '';
    source.style.display = 'none';
    source.closest('div')?.classList.add('hidden');
  }

  const { data, error } = await db.auth.getSession();

  if (error) {
    return msg('loginMsg', error.message, true);
  }

  if (!data.session) {

    $('login')?.classList.remove('hidden');
    $('app')?.classList.add('hidden');

    return;
  }

  $('login')?.classList.add('hidden');
  $('app')?.classList.remove('hidden');

  if ($('userEmail')) {
    $('userEmail').textContent =
      data.session.user.email || '';
  }

  await loadSubjects();
  await loadBank();
  await loadExams();

  showPage('dashboard');
}


/* =========================
   SUBJECTS
========================= */

async function loadSubjects() {

  const subject = $('subject');
  const filterSubject = $('filterSubject');

  /*
    Subject বা FilterSubject না থাকলেও পুরো script
    যেন বন্ধ হয়ে না যায়।
  */
  if (!subject && !filterSubject) {
    return;
  }

  const { data, error } = await db
    .from('subjects')
    .select('id,name')
    .order('id');

  if (error) {

    console.error(error);

    if (subject) {
      subject.innerHTML =
        '<option value="">বিষয় লোড হয়নি</option>';
    }

    if (filterSubject) {
      filterSubject.innerHTML =
        '<option value="">বিষয় লোড হয়নি</option>';
    }

    return msg(
      'qmsg',
      'Subject লোড হয়নি: ' + error.message,
      true
    );
  }

  subjects = data || [];

  if (subject) {
    subject.innerHTML =
      '<option value="">বিষয় নির্বাচন করুন</option>' +
      subjects
        .map(x =>
          `<option value="${x.id}">
            ${esc(x.name)}
          </option>`
        )
        .join('');
  }

  if (filterSubject) {
    filterSubject.innerHTML =
      '<option value="">সব বিষয়</option>' +
      subjects
        .map(x =>
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

  if (!CATS[c]) return;

  cat = c;

  document
    .querySelectorAll('.cats button')
    .forEach(b => b.classList.remove('active'));

  $('cat-' + c)?.classList.add('active');

  if ($('currentCat')) {
    $('currentCat').textContent =
      'বর্তমান Category: ' + CATS[c];
  }

  await loadFolders();
  await loadFilterFolders();
}


/* =========================
   BANK
========================= */

async function loadBank() {

  await loadFolders();
  await loadFilterFolders();
  await loadQuestions();
}


/* =========================
   FOLDERS
========================= */

async function loadFolders() {

  const { data, error } = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (error) {

    console.error(error);

    return msg(
      'folderMsg',
      error.message,
      true
    );
  }

  folders = data || [];

  const folderOptions =
    '<option value="">Folder নির্বাচন করুন</option>' +
    folders
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.folder_name)}
        </option>`
      )
      .join('');

  if ($('folder')) {
    $('folder').innerHTML = folderOptions;
  }

  if ($('mapFolder')) {
    $('mapFolder').innerHTML =
      '<option value="">Folder নির্বাচন করুন</option>' +
      folders
        .map(x =>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
        )
        .join('');
  }

  if ($('filterFolder')) {
    $('filterFolder').innerHTML =
      '<option value="">সব Folder</option>' +
      folders
        .map(x =>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
        )
        .join('');
  }

  await loadSets();
}


async function loadFilterFolders() {

  if (!$('filterFolder')) return;

  const { data, error } = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (error) {
    console.error(error);
    return;
  }

  $('filterFolder').innerHTML =
    '<option value="">সব Folder</option>' +
    (data || [])
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.folder_name)}
        </option>`
      )
      .join('');
}


/* =========================
   SETS
========================= */

async function loadSets() {

  if (!$('folder') || !$('set')) return;

  const folderId = $('folder').value;

  if (!folderId) {

    sets = [];

    $('set').innerHTML =
      '<option value="">Set নির্বাচন করুন</option>';

    return;
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(folderId))
    .order('id');

  if (error) {

    console.error(error);

    return msg(
      'folderMsg',
      error.message,
      true
    );
  }

  sets = data || [];

  $('set').innerHTML =
    '<option value="">Set নির্বাচন করুন</option>' +
    sets
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.set_name)}
        </option>`
      )
      .join('');
}


async function loadFilterSets() {

  if (!$('filterFolder') || !$('filterSet')) return;

  const folderId = $('filterFolder').value;

  if (!folderId) {

    $('filterSet').innerHTML =
      '<option value="">সব Set</option>';

    return;
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(folderId))
    .order('id');

  if (error) {
    return msg(
      'qmsg',
      error.message,
      true
    );
  }

  $('filterSet').innerHTML =
    '<option value="">সব Set</option>' +
    (data || [])
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.set_name)}
        </option>`
      )
      .join('');
}


async function loadMapSets() {

  if (!$('mapFolder') || !$('mapSet')) return;

  const folderId = $('mapFolder').value;

  if (!folderId) {

    $('mapSet').innerHTML =
      '<option value="">সব Set</option>';

    return;
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(folderId))
    .order('id');

  if (error) {
    return msg(
      'mapMsg',
      error.message,
      true
    );
  }

  $('mapSet').innerHTML =
    '<option value="">সব Set</option>' +
    (data || [])
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.set_name)}
        </option>`
      )
      .join('');
}


/* =========================
   CREATE FOLDER
========================= */

async function createFolder() {

  const input = $('newFolder');

  if (!input) {
    return msg(
      'folderMsg',
      'Folder input পাওয়া যাচ্ছে না।',
      true
    );
  }

  const name = input.value.trim();

  if (!name) {
    return msg(
      'folderMsg',
      'Folder-এর নাম দিন।',
      true
    );
  }

  const { data, error } = await db
    .from('question_bank_folders')
    .insert({
      sub_category: CATS[cat],
      folder_name: name
    })
    .select('id,folder_name')
    .single();

  if (error) {

    console.error(error);

    return msg(
      'folderMsg',
      'Folder তৈরি হয়নি: ' + error.message,
      true
    );
  }

  input.value = '';

  await loadFolders();

  if ($('folder')) {
    $('folder').value = data.id;
  }

  await loadSets();

  msg(
    'folderMsg',
    '✅ Folder তৈরি হয়েছে।'
  );
}


/* =========================
   CREATE SET
========================= */

async function createSet() {

  if (!$('folder') || !$('newSet')) {
    return msg(
      'folderMsg',
      'Set-এর প্রয়োজনীয় input পাওয়া যাচ্ছে না।',
      true
    );
  }

  const folderId = $('folder').value;
  const name = $('newSet').value.trim();

  if (!folderId) {
    return msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন।',
      true
    );
  }

  if (!name) {
    return msg(
      'folderMsg',
      'Set-এর নাম দিন।',
      true
    );
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .insert({
      folder_id: Number(folderId),
      set_name: name
    })
    .select('id,set_name')
    .single();

  if (error) {

    console.error(error);

    return msg(
      'folderMsg',
      'Set তৈরি হয়নি: ' + error.message,
      true
    );
  }

  $('newSet').value = '';

  await loadSets();

  if ($('set')) {
    $('set').value = data.id;
  }

  msg(
    'folderMsg',
    '✅ Set তৈরি হয়েছে।'
  );
}


/* =========================
   MANUAL QUESTION
========================= */

async function addManual() {

  if (
    !$('folder') ||
    !$('set') ||
    !$('subject') ||
    !$('qtext') ||
    !$('a') ||
    !$('b') ||
    !$('c') ||
    !$('d') ||
    !$('correct')
  ) {
    return msg(
      'qmsg',
      'Question Create-এর প্রয়োজনীয় field পাওয়া যাচ্ছে না।',
      true
    );
  }

  const folderId = $('folder').value;
  const setId = $('set').value;
  const subjectId = $('subject').value;

  const text = $('qtext').value.trim();
  const a = $('a').value.trim();
  const b = $('b').value.trim();
  const c = $('c').value.trim();
  const d = $('d').value.trim();

  const correct =
    $('correct').value.trim().toUpperCase();

  const explanation =
    $('explanation')?.value.trim() || null;

  const qnoRaw =
    $('qno')?.value.trim() || '';

  if (!folderId || !setId) {
    return msg(
      'qmsg',
      'Category, Folder ও Set নির্বাচন করুন।',
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
      'বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন।',
      true
    );
  }

  if (!['A', 'B', 'C', 'D'].includes(correct)) {
    return msg(
      'qmsg',
      'সঠিক উত্তর A, B, C অথবা D হতে হবে।',
      true
    );
  }

  let questionNumber = null;

  if (qnoRaw) {

    const n = Number(qnoRaw);

    if (
      !Number.isInteger(n) ||
      n <= 0
    ) {
      return msg(
        'qmsg',
        'প্রশ্ন নম্বর ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।',
        true
      );
    }

    questionNumber = n;
  }

  /*
    গুরুত্বপূর্ণ:
    এখানে Source নেই।
    source_name/source_type কোনোটি পাঠানো হচ্ছে না।
  */

  const payload = {

    folder_id: Number(folderId),

    set_id: Number(setId),

    subject_id: Number(subjectId),

    question_text: text,

    option_a: a,

    option_b: b,

    option_c: c,

    option_d: d,

    correct_answer: correct,

    explanation,

    question_number: questionNumber,

    category: CATS[cat]
  };

  const { error } =
    await db
      .from('questions')
      .insert(payload);

  if (error) {

    console.error(error);

    return msg(
      'qmsg',
      'প্রশ্ন যোগ হয়নি: ' + error.message,
      true
    );
  }

  [
    'qno',
    'qtext',
    'a',
    'b',
    'c',
    'd',
    'explanation'
  ].forEach(id => {

    if ($(id)) {
      $(id).value = '';
    }

  });

  if ($('correct')) {
    $('correct').value = '';
  }

  /*
    Source থাকলে পরিষ্কার করে দেওয়া।
  */
  if ($('source')) {
    $('source').value = '';
  }

  msg(
    'qmsg',
    '✅ প্রশ্ন Question Bank-এ যোগ হয়েছে।'
  );

  await loadQuestions();
}


/* =========================
   MANUAL / IMPORT MODE
========================= */

function mode(m) {

  if ($('manualBox')) {
    $('manualBox')
      .classList
      .toggle('hidden', m !== 'manual');
  }

  if ($('importBox')) {
    $('importBox')
      .classList
      .toggle('hidden', m !== 'import');
  }
}


/* =========================
   EXCEL TEMPLATE
========================= */

function template() {

  /*
    Final template:
    ঠিক ১০টি column।
    Folder / Set / Source নেই।
  */

  const rows = [

    [
      'question',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_answer',
      'question_number',
      'subject',
      'explanation',
      'category'
    ],

    [
      'বাংলাদেশের রাজধানী কোনটি?',
      'ঢাকা',
      'চট্টগ্রাম',
      'রাজশাহী',
      'খুলনা',
      'A',
      '1',
      '',
      '',
      CATS[cat]
    ]

  ];

  const ws =
    XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 22 }
  ];

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
   IMPORT HELPERS
========================= */

const IMPORT_REQUIRED_HEADERS = [
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer'
];

const IMPORT_HEADER_ALIASES = {

  category: [
    'category',
    'cat',
    'বিভাগ',
    'ক্যাটাগরি'
  ],

  subject: [
    'subject',
    'subject_name',
    'বিষয়',
    'বিষয়'
  ],

  question_number: [
    'question_number',
    'questionnumber',
    'question_no',
    'questionno',
    'qno',
    'number',
    'ক্রমিক',
    'প্রশ্ন_নম্বর',
    'প্রশ্ন_নং'
  ],

  question: [
    'question',
    'questions',
    'question_text',
    'questiontext',
    'প্রশ্ন'
  ],

  option_a: [
    'option_a',
    'optiona',
    'option_1',
    'option1',
    'a',
    'ক',
    'অপশন_ক'
  ],

  option_b: [
    'option_b',
    'optionb',
    'option_2',
    'option2',
    'b',
    'খ',
    'অপশন_খ'
  ],

  option_c: [
    'option_c',
    'optionc',
    'option_3',
    'option3',
    'c',
    'গ',
    'অপশন_গ'
  ],

  option_d: [
    'option_d',
    'optiond',
    'option_4',
    'option4',
    'd',
    'ঘ',
    'অপশন_ঘ'
  ],

  correct_answer: [
    'correct_answer',
    'correctanswer',
    'correct',
    'answer',
    'right_answer',
    'correct_option',
    'correctoption',
    'সঠিক_উত্তর',
    'উত্তর'
  ],

  explanation: [
    'explanation',
    'ব্যাখ্যা'
  ]
};

const IMPORT_HEADER_LOOKUP = {};

Object
  .entries(IMPORT_HEADER_ALIASES)
  .forEach(([key, values]) => {

    values.forEach(value => {

      const normalized =
        normalizeImportHeader(value);

      if (normalized) {
        IMPORT_HEADER_LOOKUP[normalized] = key;
      }

    });

  });


function normalizeImportHeader(value) {

  return String(value ?? '')
    .normalize('NFKC')
    .replace(/^\uFEFF/, '')
    .replace(
      /[\u200B-\u200D\u2060\u00A0]/g,
      ' '
    )
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[“”‘’"']/g, '')
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/[\s-]+/g, '_')
    .replace(
      /[^a-z0-9_\u0980-\u09ff]/g,
      ''
    )
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}


function parseImportCorrect(value) {

  const x =
    String(value ?? '')
      .trim()
      .toUpperCase();

  const map = {

    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',

    'ক': 'A',
    'খ': 'B',
    'গ': 'C',
    'ঘ': 'D',

    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',

    '০': 'A',
    '১': 'A',
    '২': 'B',
    '৩': 'C',
    '৪': 'D'

  };

  return map[x] || x;
}


/* =========================
   IMPORT PARSER
========================= */

function parseImportSheet(sheet) {

  const matrix =
    XLSX.utils.sheet_to_json(
      sheet,
      {
        header: 1,
        defval: '',
        raw: false,
        blankrows: true
      }
    );

  if (!matrix.length) {

    return {
      rows: [],
      error: 'ফাইলে কোনো data পাওয়া যায়নি।'
    };
  }

  let best = null;

  for (
    let rowIndex = 0;
    rowIndex < Math.min(matrix.length, 50);
    rowIndex++
  ) {

    const map = {};
    let recognized = 0;

    (matrix[rowIndex] || [])
      .forEach((value, columnIndex) => {

        const key =
          IMPORT_HEADER_LOOKUP[
            normalizeImportHeader(value)
          ];

        if (key) {

          recognized++;

          if (map[key] === undefined) {
            map[key] = columnIndex;
          }

        }

      });

    const found =
      IMPORT_REQUIRED_HEADERS
        .filter(k => map[k] !== undefined);

    if (
      !best ||
      found.length > best.found.length ||
      (
        found.length === best.found.length &&
        recognized > best.recognized
      )
    ) {

      best = {
        rowIndex,
        map,
        found,
        recognized
      };
    }

    if (
      found.length ===
      IMPORT_REQUIRED_HEADERS.length
    ) {
      break;
    }
  }

  if (
    !best ||
    best.found.length <
      IMPORT_REQUIRED_HEADERS.length
  ) {

    const found =
      best?.found || [];

    const missing =
      IMPORT_REQUIRED_HEADERS
        .filter(
          k => !found.includes(k)
        );

    return {
      rows: [],
      error:
        'Excel/CSV header সঠিকভাবে শনাক্ত করা যায়নি। ' +
        'প্রয়োজনীয় header: ' +
        IMPORT_REQUIRED_HEADERS.join(', ') +
        '। Missing: ' +
        missing.join(', ')
    };
  }

  const rows = [];

  for (
    let i = best.rowIndex + 1;
    i < matrix.length;
    i++
  ) {

    const source =
      matrix[i] || [];

    const hasData =
      source.some(
        value =>
          String(value ?? '').trim() !== ''
      );

    if (!hasData) continue;

    const row = {
      __excelRow: i + 1
    };

    Object
      .entries(best.map)
      .forEach(([key, columnIndex]) => {

        row[key] =
          String(
            source[columnIndex] ?? ''
          );

      });

    row.correct_answer =
      parseImportCorrect(
        row.correct_answer
      );

    rows.push(row);
  }

  return {
    rows,
    headerRowIndex: best.rowIndex
  };
}


/* =========================
   IMPORT PREVIEW
========================= */

async function previewImport() {

  if (!$('file')) {
    return msg(
      'qmsg',
      'Import file input পাওয়া যাচ্ছে না।',
      true
    );
  }

  const file =
    $('file').files[0];

  if (!file) {
    return msg(
      'qmsg',
      'CSV/Excel file নির্বাচন করুন।',
      true
    );
  }

  if (
    !$('folder')?.value ||
    !$('set')?.value
  ) {
    return msg(
      'qmsg',
      'Import-এর আগে Folder এবং Set নির্বাচন করুন।',
      true
    );
  }

  try {

    const workbook =
      XLSX.read(
        await file.arrayBuffer(),
        {
          type: 'array'
        }
      );

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];

    if (!sheet) {
      return msg(
        'qmsg',
        'Excel/CSV-তে কোনো Sheet পাওয়া যায়নি।',
        true
      );
    }

    const parsed =
      parseImportSheet(sheet);

    if (parsed.error) {
      return msg(
        'qmsg',
        parsed.error,
        true
      );
    }

    const rows =
      parsed.rows.map(row => ({

        category:
          String(
            row.category ||
            CATS[cat]
          ).trim(),

        subject:
          String(
            row.subject || ''
          ).trim(),

        question_number:
          String(
            row.question_number || ''
          ).trim(),

        question:
          String(
            row.question || ''
          ).trim(),

        option_a:
          String(
            row.option_a || ''
          ).trim(),

        option_b:
          String(
            row.option_b || ''
          ).trim(),

        option_c:
          String(
            row.option_c || ''
          ).trim(),

        option_d:
          String(
            row.option_d || ''
          ).trim(),

        correct_answer:
          parseImportCorrect(
            row.correct_answer
          ),

        explanation:
          String(
            row.explanation || ''
          ).trim(),

        __excelRow:
          row.__excelRow
      }));

    const bad =
      rows.filter(row =>

        !row.question ||
        !row.option_a ||
        !row.option_b ||
        !row.option_c ||
        !row.option_d ||
        !['A', 'B', 'C', 'D']
          .includes(
            row.correct_answer
          )

      );

    importData = rows;

    if ($('preview')) {

      $('preview').innerHTML =
        `<div class="q">
          <b>${bn(rows.length)}টি row পাওয়া গেছে।</b>
          ${
            bad.length
              ? `<br>
                 <span class="small">
                 ${bn(bad.length)}
                 টি row-তে required data/answer সমস্যা আছে।
                 </span>`
              : ''
          }
          <pre>${esc(
            JSON.stringify(
              rows.slice(0, 5),
              null,
              2
            )
          )}</pre>
        </div>`;
    }

    if ($('importBtn')) {
      $('importBtn')
        .classList
        .remove('hidden');
    }

    msg(
      'qmsg',
      'Preview প্রস্তুত হয়েছে।'
    );

  } catch (error) {

    console.error(error);

    msg(
      'qmsg',
      'Excel/CSV পড়তে সমস্যা: ' +
      error.message,
      true
    );
  }
}


/* =========================
   IMPORT QUESTIONS
========================= */

async function importRows() {

  if (!importData.length) {
    return msg(
      'qmsg',
      'আগে Preview তৈরি করুন।',
      true
    );
  }

  const selectedFolderId =
    Number(
      $('folder')?.value || 0
    ) || null;

  const selectedSetId =
    Number(
      $('set')?.value || 0
    ) || null;

  if (
    !selectedFolderId ||
    !selectedSetId
  ) {
    return msg(
      'qmsg',
      'Import-এর আগে Folder এবং Set নির্বাচন করুন।',
      true
    );
  }

  let selectedFolderMeta = null;
  let selectedSetMeta = null;

  let success = 0;
  const failed = [];

  for (
    let i = 0;
    i < importData.length;
    i++
  ) {

    const row =
      importData[i];

    const rowNo =
      row.__excelRow ||
      i + 2;

    /*
      Category file-এ না থাকলে
      UI-তে নির্বাচিত Category ব্যবহার হবে।
    */

    const suppliedCategory =
      String(
        row.category || ''
      ).trim();

    let category =
      CATS[cat];

    if (suppliedCategory) {

      const matched =
        Object.values(CATS)
          .find(
            value =>
              value === suppliedCategory
          );

      if (!matched) {

        failed.push(
          `Row ${rowNo}: category "${suppliedCategory}" পরিচিত Category নয়।`
        );

        continue;
      }

      category = matched;
    }


    /* Required fields */

    if (
      !row.question ||
      !row.option_a ||
      !row.option_b ||
      !row.option_c ||
      !row.option_d ||
      !row.correct_answer
    ) {

      failed.push(
        `Row ${rowNo}: required field খালি।`
      );

      continue;
    }


    if (
      !['A', 'B', 'C', 'D']
        .includes(
          row.correct_answer
        )
    ) {

      failed.push(
        `Row ${rowNo}: correct_answer অবশ্যই A, B, C অথবা D হতে হবে।`
      );

      continue;
    }


    /* Folder */

    if (!selectedFolderMeta) {

      const result =
        await db
          .from('question_bank_folders')
          .select(
            'id,sub_category'
          )
          .eq(
            'id',
            selectedFolderId
          )
          .maybeSingle();

      if (result.error) {

        failed.push(
          `Row ${rowNo}: ${result.error.message}`
        );

        continue;
      }

      selectedFolderMeta =
        result.data;
    }

    if (
      !selectedFolderMeta ||
      selectedFolderMeta.sub_category !==
        category
    ) {

      failed.push(
        `Row ${rowNo}: নির্বাচিত Folder বর্তমান Category-এর সাথে মেলে না।`
      );

      continue;
    }


    const folderId =
      selectedFolderMeta.id;


    /* Set */

    if (!selectedSetMeta) {

      const result =
        await db
          .from('question_bank_sets')
          .select(
            'id,folder_id'
          )
          .eq(
            'id',
            selectedSetId
          )
          .maybeSingle();

      if (result.error) {

        failed.push(
          `Row ${rowNo}: ${result.error.message}`
        );

        continue;
      }

      selectedSetMeta =
        result.data;
    }

    if (
      !selectedSetMeta ||
      Number(
        selectedSetMeta.folder_id
      ) !== Number(folderId)
    ) {

      failed.push(
        `Row ${rowNo}: নির্বাচিত Set নির্বাচিত Folder-এর সাথে মেলে না।`
      );

      continue;
    }

    const setId =
      selectedSetMeta.id;


    /* Subject */

    let subjectId = null;

    if (row.subject) {

      const subject =
        subjects.find(
          item =>
            norm(item.name) ===
            norm(row.subject)
        );

      if (!subject) {

        failed.push(
          `Row ${rowNo}: Subject পাওয়া যায়নি: ${row.subject}`
        );

        continue;
      }

      subjectId =
        subject.id;
    }


    /* Question number */

    let questionNumber = null;

    if (
      String(
        row.question_number || ''
      ).trim()
    ) {

      const n =
        Number(
          String(
            row.question_number
          ).trim()
        );

      if (
        !Number.isInteger(n) ||
        n <= 0
      ) {

        failed.push(
          `Row ${rowNo}: question_number অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।`
        );

        continue;
      }

      questionNumber = n;
    }


    /*
      Final database payload.
      Source নেই।
      Folder এবং Set CSV থেকে নেওয়া হচ্ছে না।
      UI selection থেকেই নেওয়া হচ্ছে।
    */

    const payload = {

      folder_id:
        Number(folderId),

      set_id:
        Number(setId),

      subject_id:
        subjectId
          ? Number(subjectId)
          : null,

      category,

      question_number:
        questionNumber,

      question_text:
        String(
          row.question
        ).trim(),

      option_a:
        String(
          row.option_a
        ).trim(),

      option_b:
        String(
          row.option_b
        ).trim(),

      option_c:
        String(
          row.option_c
        ).trim(),

      option_d:
        String(
          row.option_d
        ).trim(),

      correct_answer:
        String(
          row.correct_answer
        ).trim()
        .toUpperCase(),

      explanation:
        String(
          row.explanation || ''
        ).trim() || null
    };


    const result =
      await db
        .from('questions')
        .insert(payload);

    if (result.error) {

      failed.push(
        `Row ${rowNo}: ${result.error.message}`
      );

    } else {

      success++;
    }
  }


  let message =
    `✅ ${bn(success)}টি প্রশ্ন Import হয়েছে।`;

  if (failed.length) {

    message +=
      ` ❌ ${bn(failed.length)}টি Row Import হয়নি।`;

    if ($('preview')) {

      $('preview').innerHTML +=
        `<div class="q">
          <b>যেসব Row Import হয়নি:</b>
          <br><br>
          ${failed
            .map(esc)
            .join('<br>')}
        </div>`;
    }
  }

  msg(
    'qmsg',
    message,
    failed.length > 0
  );

  await loadQuestions();
}


/* =========================
   NORMALIZE
========================= */

function norm(value) {

  return String(
    value ?? ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}


/* =========================
   QUESTIONS LIST
========================= */

async function loadQuestions() {

  if (!$('questions')) return;

  let query =
    db
      .from('questions')
      .select(
        `
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        question_number,
        category,
        folder_id,
        set_id,
        subjects(name)
        `
      )
      .order(
        'id',
        {
          ascending: false
        }
      )
      .limit(200);


  if ($('filterFolder')?.value) {

    query =
      query.eq(
        'folder_id',
        Number(
          $('filterFolder').value
        )
      );
  }


  if ($('filterSet')?.value) {

    query =
      query.eq(
        'set_id',
        Number(
          $('filterSet').value
        )
      );
  }


  if ($('filterSubject')?.value) {

    query =
      query.eq(
        'subject_id',
        Number(
          $('filterSubject').value
        )
      );
  }


  const term =
    $('search')?.value.trim() || '';

  if (term) {

    query =
      query.ilike(
        'question_text',
        '%' + term + '%'
      );
  }


  const {
    data,
    error
  } = await query;


  if (error) {

    return msg(
      'qmsg',
      error.message,
      true
    );
  }


  $('questions').innerHTML =
    (data || [])
      .map(x => {

        const correctMap = {
          A: 'ক',
          B: 'খ',
          C: 'গ',
          D: 'ঘ'
        };

        return `
          <div class="q">

            <b>
              ${
                x.question_number
                  ? bn(x.question_number) + '. '
                  : ''
              }
              ${esc(x.question_text)}
            </b>

            <div>
              ক. ${esc(x.option_a)}<br>
              খ. ${esc(x.option_b)}<br>
              গ. ${esc(x.option_c)}<br>
              ঘ. ${esc(x.option_d)}
            </div>

            <div class="small">
              ${esc(x.category || '')}
              ·
              ${esc(x.subjects?.name || '')}
              ·
              সঠিক:
              ${
                correctMap[
                  x.correct_answer
                ] ||
                esc(x.correct_answer)
              }
            </div>

          </div>
        `;
      })
      .join('') ||
    'কোনো প্রশ্ন নেই।';
}


/* =========================
   EXAM
========================= */

async function createExam() {

  const name =
    $('examName')?.value.trim();

  if (!name) {
    return msg(
      'examMsg',
      'পরীক্ষার নাম দিন।',
      true
    );
  }

  const {
    data,
    error
  } = await db
    .from('exams')
    .insert({

      exam_name: name,

      status:
        $('examStatus')?.value ||
        'inactive',

      total_questions: 0,

      marks_per_question: 1,

      negative_mark: 0,

      pass_mark: 0

    })
    .select('id')
    .single();


  if (error) {

    return msg(
      'examMsg',
      error.message,
      true
    );
  }


  const settings =
    await db
      .from('exam_settings')
      .upsert(
        {
          exam_id: data.id,

          total_questions: 0,

          total_marks: 0,

          pass_mark: 0,

          duration_minutes: 20,

          marks_per_question: 1,

          negative_mark: 0,

          show_answers: false,

          multiple_attempts: false,

          device_attempt_protection: true,

          random_questions: false,

          random_options: false
        },
        {
          onConflict: 'exam_id'
        }
      );


  if (settings.error) {

    return msg(
      'examMsg',
      settings.error.message,
      true
    );
  }


  if ($('examName')) {
    $('examName').value = '';
  }


  msg(
    'examMsg',
    '✅ Exam তৈরি হয়েছে।'
  );


  await loadExams();


  if ($('examSelect')) {
    $('examSelect').value =
      data.id;
  }


  loadSettings();
}


/* =========================
   LOAD EXAMS
========================= */

async function loadExams() {

  const {
    data,
    error
  } = await db
    .from('exams')
    .select(
      `
      id,
      exam_name,
      status,
      total_questions,
      marks_per_question,
      negative_mark,
      pass_mark
      `
    )
    .order(
      'id',
      {
        ascending: false
      }
    );


  if (error) {

    return msg(
      'examMsg',
      error.message,
      true
    );
  }


  exams = data || [];


  if ($('sExams')) {

    $('sExams').textContent =
      bn(exams.length);
  }


  if ($('sActive')) {

    $('sActive').textContent =
      bn(
        exams.filter(
          x =>
            x.status ===
            'active'
        ).length
      );
  }


  const options =
    '<option value="">Exam নির্বাচন করুন</option>' +
    exams
      .map(x =>
        `<option value="${x.id}">
          ${esc(x.exam_name)}
          (#${x.id})
        </option>`
      )
      .join('');


  if ($('examSelect')) {
    $('examSelect').innerHTML =
      options;
  }


  if ($('mapExam')) {
    $('mapExam').innerHTML =
      options;
  }


  if ($('exams')) {

    $('exams').innerHTML =
      exams
        .map(x => {

          const url =
            new URL(
              '../index.html',
              location.href
            ).href +
            '?exam=' +
            x.id;

          return `
            <div class="examrow">

              <b>
                ${esc(x.exam_name)}
              </b>

              ·
              ${esc(x.status)}

              ·
              ${bn(
                x.total_questions || 0
              )}
              প্রশ্ন

              <br>

              <span class="link">
                ${esc(url)}
              </span>

              <br>

              <button
                onclick="copyLink(${x.id})">
                🔗 Exam Link কপি
              </button>

              <button
                class="secondary"
                onclick="activate(
                  ${x.id},
                  '${x.status === 'active'
                    ? 'inactive'
                    : 'active'}'
                )">

                ${
                  x.status === 'active'
                    ? 'Inactive'
                    : 'Active'
                }

              </button>

            </div>
          `;
        })
        .join('');
  }


  if ($('sQuestions')) {

    const count =
      await db
        .from('questions')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        );

    $('sQuestions').textContent =
      bn(count.count || 0);
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


async function activate(
  id,
  status
) {

  const { error } =
    await db
      .from('exams')
      .update({ status })
      .eq('id', id);

  if (error) {

    return msg(
      'examMsg',
      error.message,
      true
    );
  }

  await loadExams();
}


/* =========================
   EXAM SETTINGS
========================= */

async function loadSettings() {

  const id =
    $('examSelect')?.value;

  if (!id) return;


  const {
    data,
    error
  } = await db
    .from('exam_settings')
    .select('*')
    .eq(
      'exam_id',
      id
    )
    .maybeSingle();


  if (error) {

    return msg(
      'settingsMsg',
      error.message,
      true
    );
  }


  const s =
    data || {};


  if ($('totalQ'))
    $('totalQ').value =
      s.total_questions ?? 0;

  if ($('totalMarks'))
    $('totalMarks').value =
      s.total_marks ?? 0;

  if ($('pass'))
    $('pass').value =
      s.pass_mark ?? 0;

  if ($('duration'))
    $('duration').value =
      s.duration_minutes ?? 20;

  if ($('marks'))
    $('marks').value =
      s.marks_per_question ?? 1;

  if ($('negative'))
    $('negative').value =
      s.negative_mark ?? 0;

  if ($('examiner'))
    $('examiner').value =
      s.examiner_name ?? '';

  if ($('syllabus'))
    $('syllabus').value =
      s.syllabus ?? '';

  if ($('showAnswers'))
    $('showAnswers').checked =
      !!s.show_answers;

  if ($('multiple'))
    $('multiple').checked =
      !!s.multiple_attempts;

  if ($('device'))
    $('device').checked =
      s.device_attempt_protection !== false;

  if ($('randomQ'))
    $('randomQ').checked =
      !!s.random_questions;

  if ($('randomO'))
    $('randomO').checked =
      !!s.random_options;

  if ($('startDate'))
    $('startDate').value =
      s.exam_date || '';

  if ($('startTime'))
    $('startTime').value =
      s.start_time || '';

  if ($('endDate'))
    $('endDate').value =
      s.end_date || '';

  if ($('endTime'))
    $('endTime').value =
      s.end_time || '';
}


async function saveSettings() {

  const id =
    $('examSelect')?.value;

  if (!id) {

    return msg(
      'settingsMsg',
      'Exam নির্বাচন করুন।',
      true
    );
  }


  const payload = {

    exam_id: id,

    total_questions:
      Number(
        $('totalQ')?.value
      ) || 0,

    total_marks:
      Number(
        $('totalMarks')?.value
      ) || 0,

    pass_mark:
      Number(
        $('pass')?.value
      ) || 0,

    duration_minutes:
      Number(
        $('duration')?.value
      ) || 20,

    marks_per_question:
      Number(
        $('marks')?.value
      ) || 1,

    negative_mark:
      Number(
        $('negative')?.value
      ) || 0,

    examiner_name:
      $('examiner')?.value.trim() ||
      null,

    syllabus:
      $('syllabus')?.value.trim() ||
      null,

    show_answers:
      $('showAnswers')?.checked ||
      false,

    multiple_attempts:
      $('multiple')?.checked ||
      false,

    device_attempt_protection:
      $('device')?.checked !== false,

    random_questions:
      $('randomQ')?.checked ||
      false,

    random_options:
      $('randomO')?.checked ||
      false,

    exam_date:
      $('startDate')?.value ||
      null,

    start_time:
      $('startTime')?.value ||
      null,

    end_date:
      $('endDate')?.value ||
      null,

    end_time:
      $('endTime')?.value ||
      null
  };


  const {
    error
  } = await db
    .from('exam_settings')
    .upsert(
      payload,
      {
        onConflict: 'exam_id'
      }
    );


  if (error) {

    return msg(
      'settingsMsg',
      error.message,
      true
    );
  }


  const examUpdate =
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


  if (examUpdate.error) {

    return msg(
      'settingsMsg',
      examUpdate.error.message,
      true
    );
  }


  msg(
    'settingsMsg',
    '✅ Exam Settings সংরক্ষিত হয়েছে।'
  );

  await loadExams();
}


/* =========================
   QUESTION MAPPING
========================= */

async function loadPool() {

  const examId =
    $('mapExam')?.value;

  if (!examId) {

    return msg(
      'mapMsg',
      'Exam নির্বাচন করুন।',
      true
    );
  }


  let query =
    db
      .from('questions')
      .select(
        `
        id,
        question_text,
        category,
        folder_id,
        set_id,
        question_number
        `
      )
      .limit(200);


  if ($('mapFolder')?.value) {

    query =
      query.eq(
        'folder_id',
        Number(
          $('mapFolder').value
        )
      );
  }


  if ($('mapSet')?.value) {

    query =
      query.eq(
        'set_id',
        Number(
          $('mapSet').value
        )
      );
  }


  const {
    data,
    error
  } = await query;


  if (error) {

    return msg(
      'mapMsg',
      error.message,
      true
    );
  }


  const existing =
    await db
      .from('exam_questions')
      .select('question_id')
      .eq(
        'exam_id',
        examId
      );


  const ids =
    new Set(
      (existing.data || [])
        .map(
          x =>
            String(
              x.question_id
            )
        )
    );


  if (!$('pool')) return;


  $('pool').innerHTML =
    (data || [])
      .map(x => {

        return `
          <label class="q">

            <input
              type="checkbox"
              class="poolq"
              value="${x.id}"
              ${
                ids.has(
                  String(x.id)
                )
                  ? 'checked'
                  : ''
              }
            >

            ${esc(x.question_text)}

            <span class="small">
              (${esc(x.category || '')})
            </span>

          </label>
        `;
      })
      .join('') +

    `
      <button
        onclick="saveMapping(${examId})">
        Exam-এ নির্বাচিত প্রশ্ন Save করুন
      </button>
    `;
}


async function saveMapping(examId) {

  const ids =
    [
      ...document
        .querySelectorAll(
          '.poolq:checked'
        )
    ]
      .map(
        x =>
          Number(x.value)
      );


  const old =
    await db
      .from('exam_questions')
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

    const {
      error
    } = await db
      .from('exam_questions')
      .insert(
        ids.map(
          (id, index) => ({
            exam_id: examId,
            question_id: id,
            question_order:
              index + 1
          })
        )
      );


    if (error) {

      return msg(
        'mapMsg',
        error.message,
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
    `✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে।`
  );

  await loadExams();
}


/* =========================
   EVENT BINDINGS
========================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    if ($('folder')) {

      $('folder').addEventListener(
        'change',
        loadSets
      );
    }


    if ($('filterFolder')) {

      $('filterFolder')
        .addEventListener(
          'change',
          async () => {

            await loadFilterSets();
            await loadQuestions();

          }
        );
    }


    if ($('mapFolder')) {

      $('mapFolder')
        .addEventListener(
          'change',
          loadMapSets
        );
    }


    /*
      Category button থাকলে
      সেটিও এখানে bind হবে।
    */

    document
      .querySelectorAll('.cats button')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            const id =
              button.id
                .replace(
                  'cat-',
                  ''
                );

            if (CATS[id]) {
              selectCategory(id);
            }
          }
        );

      });


    init();

  }
);
