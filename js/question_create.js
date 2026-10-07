const CATS = {
  recruitment: 'নিয়োগ পরীক্ষা',
  verification_test: 'যাচাই পরীক্ষা',
  recent: 'সাম্প্রতিক প্রশ্ন'
};

let cat = 'verification_test';
let subjects = [];

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
  const el = $(id);
  if (!el) return;

  el.textContent = text;
  el.style.color = err ? '#b91c1c' : '#166534';
}

/* =========================
   MENU
========================= */

function setupMenu() {
  const btn = $('adminMenuBtn');
  const panel = $('adminMenuPanel');

  if (!btn || !panel) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.add('hidden');
    }
  });
}

/* =========================
   LOGIN
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

/* =========================
   INIT
========================= */

async function init() {
  setupMenu();

  const { data, error } = await db.auth.getSession();

  if (error) {
    msg('loginMsg', error.message, true);
    return;
  }

  if (!data.session) return;

  $('login')?.classList.add('hidden');
  $('app')?.classList.remove('hidden');

  await loadSubjects();
  await selectCategory(cat);
}

/* =========================
   SUBJECTS
========================= */

async function loadSubjects() {
  const { data, error } = await db
    .from('subjects')
    .select('id,name')
    .order('id');

  if (error) {
    msg('loginMsg', error.message, true);
    return;
  }

  subjects = data || [];

  const el = $('subject');

  if (!el) return;

  el.innerHTML =
    '<option value="">বিষয় নির্বাচন করুন</option>' +
    subjects
      .map(
        x =>
          `<option value="${x.id}">${esc(x.name)}</option>`
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
    .forEach(b => b.classList.remove('active'));

  $('cat-' + c)?.classList.add('active');

  if ($('currentCat')) {
    $('currentCat').textContent =
      'বর্তমান Category: ' + CATS[c];
  }

  await loadFolders();
}

/* =========================
   FOLDER
========================= */

async function loadFolders() {
  const { data, error } = await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (error) {
    msg('loginMsg', error.message, true);
    return;
  }

  const el = $('folder');

  if (!el) return;

  el.innerHTML =
    '<option value="">Folder নির্বাচন করুন</option>' +
    (data || [])
      .map(
        x =>
          `<option value="${x.id}">${esc(x.folder_name)}</option>`
      )
      .join('');

  await loadSets();
}

/* =========================
   SET
========================= */

async function loadSets() {
  const folderId = $('folder')?.value;
  const el = $('set');

  if (!el) return;

  if (!folderId) {
    el.innerHTML =
      '<option value="">Set নির্বাচন করুন</option>';
    return;
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(folderId))
    .order('id');

  if (error) {
    msg('loginMsg', error.message, true);
    return;
  }

  el.innerHTML =
    '<option value="">Set নির্বাচন করুন</option>' +
    (data || [])
      .map(
        x =>
          `<option value="${x.id}">${esc(x.set_name)}</option>`
      )
      .join('');
}

/* =========================
   TEXT NORMALIZATION
========================= */

function norm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—−]/g, '-')
    .replace(/\s+/g, ' ');
}

/* =========================
   CATEGORY NORMALIZATION
========================= */

/*
  CSV/Excel-এর category থাকলে সেটি
  system-এর existing Category-এর সঙ্গে মিলানো হবে।

  কোনো নতুন Category তৈরি করা হবে না।
*/

function normalizeCategory(value) {
  const raw = norm(value);

  if (!raw) return null;

  const aliases = {
    'নিয়োগ পরীক্ষা': 'নিয়োগ পরীক্ষা',
    'নিয়োগ': 'নিয়োগ পরীক্ষা',
    'নিয়োগ পরিক্ষা': 'নিয়োগ পরীক্ষা',

    'recruitment': 'নিয়োগ পরীক্ষা',
    'recruitment exam': 'নিয়োগ পরীক্ষা',

    'যাচাই পরীক্ষা': 'যাচাই পরীক্ষা',
    'যাচাই': 'যাচাই পরীক্ষা',
    'যাচাই পরিক্ষা': 'যাচাই পরীক্ষা',

    'verification': 'যাচাই পরীক্ষা',
    'verification test': 'যাচাই পরীক্ষা',

    'সাম্প্রতিক প্রশ্ন': 'সাম্প্রতিক প্রশ্ন',
    'সাম্প্রতিক': 'সাম্প্রতিক প্রশ্ন',

    'recent': 'সাম্প্রতিক প্রশ্ন',
    'recent questions': 'সাম্প্রতিক প্রশ্ন'
  };

  return aliases[raw] || null;
}

/* =========================
   CSV / EXCEL HEADER CHECK
========================= */

const REQUIRED_HEADERS = [
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer'
];

const OPTIONAL_HEADERS = [
  'question_number',
  'subject',
  'explanation',
  'category'
];

const FORBIDDEN_HEADERS = [
  'source',
  'folder',
  'set'
];

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function validateHeaders(rows) {
  if (!rows || !rows.length) {
    return {
      ok: false,
      message: 'ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।'
    };
  }

  const headers = Object.keys(rows[0]).map(
    normalizeHeader
  );

  /*
    পুরোনো Source/Folder/Set ভিত্তিক template
    যাতে ভুল করে ব্যবহার না করা যায়।
  */

  const forbiddenFound =
    FORBIDDEN_HEADERS.filter(
      h => headers.includes(h)
    );

  if (forbiddenFound.length) {
    return {
      ok: false,
      message:
        `এই ফাইলে পুরোনো/অনুমোদনহীন column আছে: ${forbiddenFound.join(', ')}। ` +
        `নতুন Template ব্যবহার করুন।`
    };
  }

  const missingRequired =
    REQUIRED_HEADERS.filter(
      h => !headers.includes(h)
    );

  if (missingRequired.length) {
    return {
      ok: false,
      message:
        `Required column পাওয়া যায়নি: ${missingRequired.join(', ')}`
    };
  }

  return {
    ok: true,
    headers
  };
}

/* =========================
   TEMPLATE
========================= */

function template() {
  /*
    Required:
    question
    option_a
    option_b
    option_c
    option_d
    correct_answer

    Optional:
    question_number
    subject
    explanation
    category

    Source / Folder / Set নেই।
  */

  const headers = [
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
  ];

  const example = [
    'বাংলাদেশের রাজধানী কোনটি?',
    'ঢাকা',
    'চট্টগ্রাম',
    'রাজশাহী',
    'খুলনা',
    'A',
    '',
    '',
    '',
    ''
  ];

  const ws =
    XLSX.utils.aoa_to_sheet([
      headers,
      example
    ]);

  ws['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
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
   READ EXCEL / CSV
========================= */

function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const wb = XLSX.read(
          e.target.result,
          {
            type: 'array',
            raw: false
          }
        );

        const sheetName =
          wb.SheetNames[0];

        if (!sheetName) {
          reject(
            new Error(
              'Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।'
            )
          );
          return;
        }

        const sheet =
          wb.Sheets[sheetName];

        if (!sheet) {
          reject(
            new Error(
              'Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।'
            )
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

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          'ফাইল পড়া যাচ্ছে না।'
        )
      );
    };

    reader.readAsArrayBuffer(file);
  });
}

/* =========================
   PREVIEW IMPORT
========================= */

async function previewImport() {
  const file =
    $('importFile')?.files?.[0];

  if (!file) {
    msg(
      'importMsg',
      'আগে CSV/Excel ফাইল নির্বাচন করুন।',
      true
    );
    return;
  }

  if (
    !$('folder')?.value ||
    !$('set')?.value
  ) {
    msg(
      'importMsg',
      'আগে Folder এবং Set নির্বাচন করুন।',
      true
    );
    return;
  }

  try {
    const rows =
      await readWorkbook(file);

    const headerCheck =
      validateHeaders(rows);

    if (!headerCheck.ok) {
      msg(
        'importMsg',
        headerCheck.message,
        true
      );
      return;
    }

    if ($('importPreview')) {
      $('importPreview').innerHTML =
        `<b>মোট Row: ${bn(rows.length)}</b><br><br>` +
        rows
          .slice(0, 5)
          .map(
            (r, i) =>
              `<div class="q">
                <b>Row ${bn(i + 2)}</b><br>
                ${esc(
                  r.question ||
                  '(question খালি)'
                )}
              </div>`
          )
          .join('');
    }

    msg(
      'importMsg',
      `ফাইল ঠিকভাবে পড়া গেছে। মোট ${bn(rows.length)}টি Row পাওয়া গেছে।`
    );
  } catch (err) {
    msg(
      'importMsg',
      err.message ||
        'ফাইল পড়তে সমস্যা হয়েছে।',
      true
    );
  }
}

/* =========================
   IMPORT QUESTIONS
========================= */

async function importRows() {
  const file =
    $('importFile')?.files?.[0];

  if (!file) {
    msg(
      'importMsg',
      'আগে CSV/Excel ফাইল নির্বাচন করুন।',
      true
    );
    return;
  }

  const folderId =
    $('folder')?.value;

  const setId =
    $('set')?.value;

  if (!folderId || !setId) {
    msg(
      'importMsg',
      'আগে Folder এবং Set নির্বাচন করুন।',
      true
    );
    return;
  }

  let rows;

  try {
    rows =
      await readWorkbook(file);
  } catch (err) {
    msg(
      'importMsg',
      err.message ||
        'ফাইল পড়তে সমস্যা হয়েছে।',
      true
    );
    return;
  }

  const headerCheck =
    validateHeaders(rows);

  if (!headerCheck.ok) {
    msg(
      'importMsg',
      headerCheck.message,
      true
    );
    return;
  }

  const folderNumber =
    Number(folderId);

  const setNumber =
    Number(setId);

  if (
    !Number.isInteger(folderNumber) ||
    !Number.isInteger(setNumber)
  ) {
    msg(
      'importMsg',
      'Folder বা Set নির্বাচন সঠিক নয়।',
      true
    );
    return;
  }

  let success = 0;
  const failed = [];

  /*
    Upload destination:
    নির্বাচিত Category + Folder + Set

    CSV-এর Folder/Set ব্যবহার করা হবে না।
  */

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {
    const row = rows[i];
    const rowNo = i + 2;

    /* -------------------------
       Required fields
    ------------------------- */

    const question =
      String(
        row.question ?? ''
      ).trim();

    const a =
      String(
        row.option_a ?? ''
      ).trim();

    const b =
      String(
        row.option_b ?? ''
      ).trim();

    const c =
      String(
        row.option_c ?? ''
      ).trim();

    const d =
      String(
        row.option_d ?? ''
      ).trim();

    const correct =
      String(
        row.correct_answer ?? ''
      )
        .trim()
        .toUpperCase();

    const missing = [];

    if (!question)
      missing.push('question');

    if (!a)
      missing.push('option_a');

    if (!b)
      missing.push('option_b');

    if (!c)
      missing.push('option_c');

    if (!d)
      missing.push('option_d');

    if (!correct)
      missing.push('correct_answer');

    if (missing.length) {
      failed.push(
        `Row ${rowNo}: Required field খালি — ${missing.join(', ')}`
      );
      continue;
    }

    if (
      !['A', 'B', 'C', 'D'].includes(
        correct
      )
    ) {
      failed.push(
        `Row ${rowNo}: correct_answer অবশ্যই A, B, C অথবা D হতে হবে।`
      );
      continue;
    }

    /* -------------------------
       Question Number
    ------------------------- */

    let questionNumber = null;

    const qnoRaw =
      String(
        row.question_number ?? ''
      ).trim();

    if (qnoRaw !== '') {
      const n =
        Number(qnoRaw);

      if (
        !Number.isFinite(n) ||
        n <= 0 ||
        !Number.isInteger(n)
      ) {
        failed.push(
          `Row ${rowNo}: question_number অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।`
        );
        continue;
      }

      questionNumber = n;
    }

    /* -------------------------
       Category
    ------------------------- */

    let category =
      CATS[cat];

    const suppliedCategory =
      String(
        row.category ?? ''
      ).trim();

    if (suppliedCategory) {
      const normalized =
        normalizeCategory(
          suppliedCategory
        );

      if (!normalized) {
        failed.push(
          `Row ${rowNo}: category "${suppliedCategory}" পরিচিত Category নয়। নতুন Category তৈরি করা হবে না।`
        );
        continue;
      }

      category = normalized;
    }

    /* -------------------------
       Subject
    ------------------------- */

    let subjectId = null;

    const suppliedSubject =
      String(
        row.subject ?? ''
      ).trim();

    if (suppliedSubject) {
      const found =
        subjects.find(
          s =>
            norm(s.name) ===
            norm(suppliedSubject)
        );

      if (!found) {
        failed.push(
          `Row ${rowNo}: subject "${suppliedSubject}" পাওয়া যায়নি।`
        );
        continue;
      }

      subjectId = found.id;
    }

    /* -------------------------
       Explanation
    ------------------------- */

    const explanation =
      String(
        row.explanation ?? ''
      ).trim() || null;

    /* -------------------------
       DATABASE INSERT
    -------------------------

       লক্ষ্য করুন:

       এখানে কোনো
       source
       source_type
       source field

       নেই।

       Source পরিচয় স্বয়ংক্রিয়ভাবে
       Category + Folder + Set +
       Question Number থেকেই পাওয়া যাবে।
    */

    const { error } =
      await db
        .from('questions')
        .insert({
          folder_id: folderNumber,
          set_id: setNumber,
          subject_id: subjectId,

          category,

          question_number:
            questionNumber,

          question_text:
            question,

          option_a: a,
          option_b: b,
          option_c: c,
          option_d: d,

          correct_answer:
            correct,

          explanation
        });

    if (error) {
      failed.push(
        `Row ${rowNo}: ${error.message}`
      );
    } else {
      success++;
    }
  }

  let result =
    `সফলভাবে ${bn(success)}টি প্রশ্ন যোগ হয়েছে।`;

  if (failed.length) {
    result +=
      ` ${bn(failed.length)}টি Row যোগ হয়নি।`;

    if ($('importPreview')) {
      $('importPreview').innerHTML =
        '<b>যেসব Row যোগ হয়নি:</b><br><br>' +
        failed
          .map(
            x =>
              `<div class="q">${esc(x)}</div>`
          )
          .join('');
    }
  } else {
    if ($('importPreview')) {
      $('importPreview').innerHTML = '';
    }
  }

  msg(
    'importMsg',
    result,
    failed.length > 0
  );
}

/* =========================
   MANUAL QUESTION
========================= */

async function addManual() {
  const folderId =
    $('folder')?.value;

  const setId =
    $('set')?.value;

  if (!folderId || !setId) {
    msg(
      'manualMsg',
      'আগে Folder এবং Set নির্বাচন করুন।',
      true
    );
    return;
  }

  const question =
    $('question')
      ?.value
      .trim();

  const a =
    $('optionA')
      ?.value
      .trim();

  const b =
    $('optionB')
      ?.value
      .trim();

  const c =
    $('optionC')
      ?.value
      .trim();

  const d =
    $('optionD')
      ?.value
      .trim();

  const correct =
    $('correctAnswer')
      ?.value
      .trim()
      .toUpperCase();

  const explanation =
    $('explanation')
      ?.value
      .trim() || null;

  const qnoRaw =
    $('questionNumber')
      ?.value
      .trim() || '';

  const subjectId =
    $('subject')?.value || null;

  /* Required validation */

  if (
    !question ||
    !a ||
    !b ||
    !c ||
    !d ||
    !correct
  ) {
    msg(
      'manualMsg',
      'প্রয়োজনীয় ঘরগুলো পূরণ করুন।',
      true
    );
    return;
  }

  if (
    !['A', 'B', 'C', 'D'].includes(
      correct
    )
  ) {
    msg(
      'manualMsg',
      'সঠিক উত্তর A, B, C অথবা D হতে হবে।',
      true
    );
    return;
  }

  /* Question Number */

  let questionNumber = null;

  if (qnoRaw) {
    const n =
      Number(qnoRaw);

    if (
      !Number.isInteger(n) ||
      n <= 0
    ) {
      msg(
        'manualMsg',
        'প্রশ্ন নম্বর অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।',
        true
      );
      return;
    }

    questionNumber = n;
  }

  /*
    Manual Question destination:

    বর্তমান UI-এর
    Category + Folder + Set

    এগুলোর ভিত্তিতেই প্রশ্ন সংরক্ষণ হবে।

    কোনো Source field নেই।
  */

  const { error } =
    await db
      .from('questions')
      .insert({
        folder_id: Number(folderId),
        set_id: Number(setId),

        subject_id:
          subjectId
            ? Number(subjectId)
            : null,

        category:
          CATS[cat],

        question_number:
          questionNumber,

        question_text:
          question,

        option_a: a,
        option_b: b,
        option_c: c,
        option_d: d,

        correct_answer:
          correct,

        explanation
      });

  if (error) {
    msg(
      'manualMsg',
      error.message,
      true
    );
    return;
  }

  msg(
    'manualMsg',
    'প্রশ্ন সফলভাবে যোগ হয়েছে।'
  );

  /* Clear form */

  [
    'question',
    'questionNumber',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'explanation'
  ].forEach(id => {
    if ($(id)) {
      $(id).value = '';
    }
  });

  if ($('correctAnswer')) {
    $('correctAnswer').value = '';
  }

  if ($('subject')) {
    $('subject').value = '';
  }
}

/* =========================
   EVENTS
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

    init();
  }
);
