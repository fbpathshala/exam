const CATS = {
  recruitment: 'নিয়োগ পরীক্ষা',
  verification_test: 'যাচাই পরীক্ষা',
  recent: 'সাম্প্রতিক প্রশ্ন'
};

let cat = 'verification_test';
let folders = [];
let sets = [];
let subjects = [];
let importData = [];

const $ = id => document.getElementById(id);

const bn = n =>
  String(n ?? '').replace(
    /\d/g,
    d => '০১২৩৪৫৬৭৮৯'[d]
  );

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

  const e = $(id);

  if (!e) return;

  e.textContent = text;

  e.style.color =
    err ? '#b91c1c' : '#166534';
}


/* =========================
   LOGIN
========================= */

async function login() {

  msg('loginMsg', 'Login হচ্ছে...');

  const { error } =
    await db.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });

  if (error) {

    msg(
      'loginMsg',
      error.message,
      true
    );

    return;
  }

  await init();
}


async function logout() {

  await db.auth.signOut();

  location.reload();
}


/* =========================
   INITIALIZE
========================= */

async function init() {

  const { data, error } =
    await db.auth.getSession();

  if (error) {

    msg(
      'loginMsg',
      error.message,
      true
    );

    return;
  }

  if (!data.session) return;

  $('login').classList.add('hidden');

  $('app').classList.remove('hidden');

  await loadSubjects();

  await selectCategory(cat);

  setupMenu();
}


/* =========================
   THREE LINE MENU
========================= */

function setupMenu() {

  const btn = $('adminMenuBtn');
  const panel = $('adminMenuPanel');

  if (!btn || !panel) return;

  btn.addEventListener(
    'click',
    e => {

      e.stopPropagation();

      panel.classList.toggle('hidden');

    }
  );


  document.addEventListener(
    'click',
    () => {

      panel.classList.add('hidden');

    }
  );

}


/* =========================
   SUBJECT
========================= */

async function loadSubjects() {

  const {
    data,
    error
  } = await db
    .from('subjects')
    .select('id,name')
    .order('id');


  if (error) {

    msg(
      'qmsg',
      error.message,
      true
    );

    return;
  }


  subjects = data || [];


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


/* =========================
   CATEGORY
========================= */

async function selectCategory(c) {

  if (!CATS[c]) return;

  cat = c;


  document
    .querySelectorAll('.cats button')
    .forEach(
      b => b.classList.remove('active')
    );


  $('cat-' + c)?.classList.add('active');


  $('currentCat').textContent =
    'বর্তমান Category: ' + CATS[c];


  await loadFolders();
}


/* =========================
   FOLDER
========================= */

async function loadFolders() {

  const {
    data,
    error
  } = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  folders = data || [];


  $('folder').innerHTML =
    '<option value="">Folder নির্বাচন করুন</option>' +

    folders
      .map(
        x =>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
      )
      .join('');


  await loadSets();
}


/* =========================
   SET
========================= */

async function loadSets() {

  const id = $('folder').value;


  if (!id) {

    sets = [];

    $('set').innerHTML =
      '<option value="">Set নির্বাচন করুন</option>';

    return;
  }


  const {
    data,
    error
  } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(id))
    .order('id');


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  sets = data || [];


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
}


/* =========================
   CREATE FOLDER
========================= */

async function createFolder() {

  const name =
    $('newFolder').value.trim();


  if (!name) {

    msg(
      'folderMsg',
      'Folder-এর নাম দিন',
      true
    );

    return;
  }


  const {
    data,
    error
  } = await db
    .from('question_bank_folders')
    .insert({
      sub_category: CATS[cat],
      folder_name: name
    })
    .select('id')
    .single();


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  $('newFolder').value = '';

  await loadFolders();

  $('folder').value =
    String(data.id);

  await loadSets();


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
    $('newSet').value.trim();


  if (!folderId) {

    msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন',
      true
    );

    return;
  }


  if (!name) {

    msg(
      'folderMsg',
      'Set-এর নাম দিন',
      true
    );

    return;
  }


  const {
    data,
    error
  } = await db
    .from('question_bank_sets')
    .insert({
      folder_id: Number(folderId),
      set_name: name
    })
    .select('id')
    .single();


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  $('newSet').value = '';

  await loadSets();

  $('set').value =
    String(data.id);


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

    msg(
      'qmsg',
      'Category, Folder ও Set নির্বাচন করুন',
      true
    );

    return;
  }


  if (
    !text ||
    !a ||
    !b ||
    !c ||
    !d ||
    !correct
  ) {

    msg(
      'qmsg',
      'প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',
      true
    );

    return;
  }


  const p = {

    folder_id: Number(folderId),

    set_id: Number(setId),

    subject_id:
      subjectId
        ? Number(subjectId)
        : null,

    question_text: text,

    option_a: a,

    option_b: b,

    option_c: c,

    option_d: d,

    correct_answer: correct,

    explanation:
      $('explanation').value.trim() ||
      null,

    question_number:
      $('qno').value
        ? Number($('qno').value)
        : null,

    category: CATS[cat],

    source_type: cat

  };


  const { error } =
    await db
      .from('questions')
      .insert(p);


  if (error) {

    msg(
      'qmsg',
      error.message,
      true
    );

    return;
  }


  [
    'qno',
    'qtext',
    'a',
    'b',
    'c',
    'd',
    'explanation'
  ]
    .forEach(
      x => $(x).value = ''
    );


  $('correct').value = '';


  msg(
    'qmsg',
    '✅ প্রশ্ন Question Bank-এ যোগ হয়েছে'
  );
}


/* =========================
   NORMALIZE
========================= */

function norm(v) {

  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .trim();
}


/* =========================
   CATEGORY MATCH
========================= */

function normalizeCategory(value) {

  const raw = norm(value);


  if (!raw) return CATS[cat];


  const aliases = {

    'নিয়োগ পরীক্ষা':
      'recruitment',

    'নিয়োগ':
      'recruitment',

    'recruitment':
      'recruitment',

    'recruitment exam':
      'recruitment',


    'যাচাই পরীক্ষা':
      'verification_test',

    'যাচাই':
      'verification_test',

    'verification':
      'verification_test',

    'verification test':
      'verification_test',


    'সাম্প্রতিক প্রশ্ন':
      'recent',

    'সাম্প্রতিক':
      'recent',

    'recent':
      'recent',

    'recent questions':
      'recent'

  };


  if (aliases[raw]) {

    return CATS[aliases[raw]];
  }


  /*
    ছোটখাটো লেখার পার্থক্য
    সামলানোর জন্য punctuation/
    whitespace সরিয়ে আবার মিলানো।
  */

  const compact =
    raw
      .replace(/\s/g, '')
      .replace(/[^\u0980-\u09ffa-z0-9]/g, '');


  for (const key of Object.keys(CATS)) {

    const target =
      norm(CATS[key])
        .replace(/\s/g, '')
        .replace(/[^\u0980-\u09ffa-z0-9]/g, '');


    if (
      compact === target ||
      compact.includes(target) ||
      target.includes(compact)
    ) {

      return CATS[key];
    }
  }


  /*
    অচেনা Category পেলে নতুন
    Category বানানো হবে না।
    বর্তমানে নির্বাচিত Category-তেই যাবে।
  */

  return CATS[cat];
}


/* =========================
   TEMPLATE
========================= */

function template() {

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
      1,
      'বাংলাদেশ',
      '',
      'যাচাই পরীক্ষা'
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
   PREVIEW
========================= */

async function previewImport() {

  const f =
    $('file').files[0];


  if (!f) {

    msg(
      'qmsg',
      'CSV/Excel file নির্বাচন করুন',
      true
    );

    return;
  }


  const folderId =
    $('folder').value;

  const setId =
    $('set').value;


  if (!folderId || !setId) {

    msg(
      'qmsg',
      'CSV/Excel Upload-এর আগে Folder ও Set নির্বাচন করুন',
      true
    );

    return;
  }


  try {

    const data =
      XLSX.read(
        await f.arrayBuffer(),
        {
          type: 'array'
        }
      );


    const sheet =
      data.Sheets[
        data.SheetNames[0]
      ];


    if (!sheet) {

      msg(
        'qmsg',
        'Excel/CSV-তে কোনো Sheet পাওয়া যায়নি',
        true
      );

      return;
    }


    const rows =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          defval: '',
          raw: false
        }
      );


    if (!rows.length) {

      msg(
        'qmsg',
        'ফাইলে কোনো প্রশ্ন পাওয়া যায়নি',
        true
      );

      return;
    }


    importData = rows;


    $('preview').innerHTML = `

      <div class="q">

        <b>
          ${bn(rows.length)}
          টি প্রশ্ন পাওয়া গেছে
        </b>

        <pre>
${esc(
  JSON.stringify(
    rows.slice(0, 5),
    null,
    2
  )
)}
        </pre>

      </div>

    `;


    $('importBtn')
      .classList
      .remove('hidden');


    msg(
      'qmsg',
      '✅ Preview প্রস্তুত হয়েছে'
    );

  } catch (error) {

    msg(
      'qmsg',
      'ফাইল পড়তে সমস্যা হয়েছে: ' +
      error.message,
      true
    );
  }
}


/* =========================
   IMPORT
========================= */

async function importRows() {

  if (!importData.length) {

    msg(
      'qmsg',
      'Import করার মতো কোনো প্রশ্ন নেই',
      true
    );

    return;
  }


  const folderId =
    $('folder').value;

  const setId =
    $('set').value;


  if (!folderId || !setId) {

    msg(
      'qmsg',
      'আগে Folder ও Set নির্বাচন করুন',
      true
    );

    return;
  }


  const selectedFolder =
    $('folder')
      .selectedOptions[0]
      ?.textContent
      ?.trim() || '';


  const selectedSet =
    $('set')
      .selectedOptions[0]
      ?.textContent
      ?.trim() || '';


  const selectedCategory =
    CATS[cat];


  let ok = 0;
  let fail = [];


  for (
    let i = 0;
    i < importData.length;
    i++
  ) {

    const r =
      importData[i];


    const question =
      String(
        r.question ?? ''
      ).trim();


    const a =
      String(
        r.option_a ?? ''
      ).trim();


    const b =
      String(
        r.option_b ?? ''
      ).trim();


    const c =
      String(
        r.option_c ?? ''
      ).trim();


    const d =
      String(
        r.option_d ?? ''
      ).trim();


    const correct =
      String(
        r.correct_answer ?? ''
      )
        .trim()
        .toUpperCase();


    /*
      শুধুমাত্র এই ৬টি
      Field বাধ্যতামূলক।
    */

    if (
      !question ||
      !a ||
      !b ||
      !c ||
      !d ||
      !correct
    ) {

      fail.push(
        `Row ${i + 2}: প্রয়োজনীয় ৬টি Field-এর কোনো একটি নেই`
      );

      continue;
    }


    /*
      Correct answer অবশ্যই
      A/B/C/D হতে হবে।
    */

    if (
      !['A', 'B', 'C', 'D']
        .includes(correct)
    ) {

      fail.push(
        `Row ${i + 2}: correct_answer অবশ্যই A, B, C অথবা D হতে হবে`
      );

      continue;
    }


    /*
      Category দেওয়া থাকলে
      Normalize করা হবে।

      Category না থাকলে
      Upload-এর সময় নির্বাচিত
      Category ব্যবহার হবে।
    */

    const category =
      normalizeCategory(
        r.category
      );


    /*
      Subject optional
    */

    let subjectId = null;


    const subjectValue =
      String(
        r.subject ?? ''
      ).trim();


    if (subjectValue) {

      const subjectNorm =
        norm(subjectValue);


      const subject =
        subjects.find(
          x =>
            norm(x.name) ===
            subjectNorm
        );


      if (!subject) {

        /*
          Subject না মিললে পুরো
          Import বন্ধ নয়।
          শুধু এই Row বাদ যাবে।
        */

        fail.push(
          `Row ${i + 2}: Subject পাওয়া যায়নি: ${subjectValue}`
        );

        continue;
      }


      subjectId =
        subject.id;
    }


    /*
      Question number optional
    */

    let questionNumber = null;


    if (
      r.question_number !==
      undefined &&
      String(
        r.question_number
      ).trim() !== ''
    ) {

      const n =
        Number(
          r.question_number
        );


      if (
        !Number.isFinite(n) ||
        n <= 0
      ) {

        fail.push(
          `Row ${i + 2}: question_number সঠিক সংখ্যা নয়`
        );

        continue;
      }


      questionNumber = n;
    }


    /*
      Source আলাদা করে নেওয়া হবে না।

      Source তৈরি হবে:

      Category / Folder / Set / Question Number
    */


    const p = {

      folder_id:
        Number(folderId),

      set_id:
        Number(setId),

      subject_id:
        subjectId,

      category:
        category,

      source_type:
        cat,

      question_number:
        questionNumber,

      question_text:
        question,

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
        String(
          r.explanation ?? ''
        ).trim() || null

    };


    const { error } =
      await db
        .from('questions')
        .insert(p);


    if (error) {

      fail.push(
        `Row ${i + 2}: ${error.message}`
      );

      continue;
    }


    ok++;
  }


  let resultText =
    `✅ ${bn(ok)}টি প্রশ্ন Import হয়েছে`;


  if (fail.length) {

    resultText +=
      ` | ❌ ${bn(fail.length)}টি Row Import হয়নি`;
  }


  msg(
    'qmsg',
    resultText,
    fail.length > 0
  );


  /*
    Failed rows আলাদা করে দেখানো হবে,
    যাতে বোঝা যায় কোন Row-তে সমস্যা।
  */

  if (fail.length) {

    $('preview').innerHTML += `

      <div class="q">

        <b>
          যে Row-গুলো Import হয়নি:
        </b>

        <br><br>

        ${fail
          .map(
            x =>
              esc(x)
          )
          .join('<br>')}

      </div>

    `;
  }
}


/* =========================
   FOLDER RENAME
========================= */

async function renameSelectedFolder() {

  const id =
    $('folder').value;


  if (!id) {

    msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন',
      true
    );

    return;
  }


  const old =
    $('folder')
      .selectedOptions[0]
      ?.textContent || '';


  const name =
    prompt(
      'নতুন Folder-এর নাম লিখুন:',
      old
    );


  if (name === null) return;


  const value =
    name.trim();


  if (!value) {

    msg(
      'folderMsg',
      'Folder-এর নাম খালি রাখা যাবে না',
      true
    );

    return;
  }


  const { error } =
    await db
      .from('question_bank_folders')
      .update({
        folder_name: value
      })
      .eq(
        'id',
        Number(id)
      );


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  await loadFolders();

  $('folder').value =
    String(id);

  await loadSets();


  msg(
    'folderMsg',
    '✅ Folder-এর নাম পরিবর্তন হয়েছে'
  );
}


/* =========================
   FOLDER DELETE
========================= */

async function deleteSelectedFolder() {

  const id =
    $('folder').value;


  if (!id) {

    msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন',
      true
    );

    return;
  }


  const name =
    $('folder')
      .selectedOptions[0]
      ?.textContent ||
    'এই Folder';


  const check =
    await db
      .from('question_bank_sets')
      .select(
        'id',
        {
          count: 'exact',
          head: true
        }
      )
      .eq(
        'folder_id',
        Number(id)
      );


  if (check.error) {

    msg(
      'folderMsg',
      check.error.message,
      true
    );

    return;
  }


  if (
    check.count &&
    !confirm(
      `"${name}" Folder-এর ভিতরে ${check.count}টি Set আছে। Delete করবেন?`
    )
  ) {

    return;
  }


  const { error } =
    await db
      .from('question_bank_folders')
      .delete()
      .eq(
        'id',
        Number(id)
      );


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  await loadFolders();


  msg(
    'folderMsg',
    '✅ Folder Delete হয়েছে'
  );
}


/* =========================
   SET RENAME
========================= */

async function renameSelectedSet() {

  const id =
    $('set').value;


  if (!id) {

    msg(
      'folderMsg',
      'আগে Set নির্বাচন করুন',
      true
    );

    return;
  }


  const old =
    $('set')
      .selectedOptions[0]
      ?.textContent || '';


  const name =
    prompt(
      'নতুন Set-এর নাম লিখুন:',
      old
    );


  if (name === null) return;


  const value =
    name.trim();


  if (!value) {

    msg(
      'folderMsg',
      'Set-এর নাম খালি রাখা যাবে না',
      true
    );

    return;
  }


  const { error } =
    await db
      .from('question_bank_sets')
      .update({
        set_name: value
      })
      .eq(
        'id',
        Number(id)
      );


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  await loadSets();

  $('set').value =
    String(id);


  msg(
    'folderMsg',
    '✅ Set-এর নাম পরিবর্তন হয়েছে'
  );
}


/* =========================
   SET DELETE
========================= */

async function deleteSelectedSet() {

  const id =
    $('set').value;


  if (!id) {

    msg(
      'folderMsg',
      'আগে Set নির্বাচন করুন',
      true
    );

    return;
  }


  const name =
    $('set')
      .selectedOptions[0]
      ?.textContent ||
    'এই Set';


  const check =
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
        Number(id)
      );


  if (check.error) {

    msg(
      'folderMsg',
      check.error.message,
      true
    );

    return;
  }


  if (
    check.count &&
    !confirm(
      `"${name}" Set-এর মধ্যে ${check.count}টি প্রশ্ন আছে। Delete করলে প্রশ্নগুলোও মুছে যাবে। নিশ্চিত?`
    )
  ) {

    return;
  }


  const { error } =
    await db
      .from('question_bank_sets')
      .delete()
      .eq(
        'id',
        Number(id)
      );


  if (error) {

    msg(
      'folderMsg',
      error.message,
      true
    );

    return;
  }


  await loadSets();


  msg(
    'folderMsg',
    '✅ Set Delete হয়েছে'
  );
}


/* =========================
   EVENTS
========================= */

$('folder')
  .addEventListener(
    'change',
    loadSets
  );


init();
