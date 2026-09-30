const CATS = {
  recruitment: 'নিয়োগ পরীক্ষা',
  verification_test: 'যাচাই পরীক্ষা',
  recent: 'সাম্প্রতিক প্রশ্ন'
};

let cat = 'verification_test';

let subjects = [];
let importData = [];

/* =========================================================
   Helpers
   ========================================================= */

const $ = id => document.getElementById(id);

function bn(n) {
  return String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function norm(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function msg(id, text, error = false) {
  const el = $(id);
  if (!el) return;

  el.textContent = text;
  el.style.color = error ? '#b91c1c' : '#15803d';
}

/* =========================================================
   Login / App
   ========================================================= */

async function login() {
  const email = $('email')?.value?.trim();
  const password = $('password')?.value;

  if (!email || !password) {
    msg('loginMsg', 'Email ও Password দিন', true);
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
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

function showPage(page) {
  document
    .querySelectorAll('.page')
    .forEach(el => {
      el.style.display =
        el.id === page ? 'block' : 'none';
    });

  document
    .querySelectorAll('[data-page]')
    .forEach(el => {
      el.classList.toggle(
        'active',
        el.dataset.page === page
      );
    });
}

/* =========================================================
   Initialisation
   ========================================================= */

async function init() {
  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session) {
    if ($('loginPage')) {
      $('loginPage').style.display = 'block';
    }

    if ($('app')) {
      $('app').style.display = 'none';
    }

    return;
  }

  if ($('loginPage')) {
    $('loginPage').style.display = 'none';
  }

  if ($('app')) {
    $('app').style.display = 'block';
  }

  const emailEl = $('adminEmail');

  if (emailEl) {
    emailEl.textContent =
      session.user.email || '';
  }

  await loadBank();
  await loadExams();
}

/* =========================================================
   Question Bank
   ========================================================= */

async function loadBank() {
  await loadSubjects();
  await loadFolders();
  await loadSets();

  showPage('bankPage');
}

async function loadSubjects() {
  const { data, error } = await db
    .from('subjects')
    .select('id,name')
    .order('name');

  if (error) {
    console.error(error);
    return;
  }

  subjects = data || [];

  const subjectSelect = $('subject');

  if (subjectSelect) {
    subjectSelect.innerHTML =
      '<option value="">Subject নির্বাচন করুন</option>' +
      subjects
        .map(
          s =>
            `<option value="${s.id}">
              ${esc(s.name)}
            </option>`
        )
        .join('');
  }
}

/* =========================================================
   Category
   ========================================================= */

function selectCategory(key) {
  if (!CATS[key]) return;

  cat = key;

  document
    .querySelectorAll('[data-category]')
    .forEach(btn => {
      btn.classList.toggle(
        'active',
        btn.dataset.category === key
      );
    });

  const current = $('currentCategory');

  if (current) {
    current.textContent = CATS[key];
  }

  loadFolders();
}

/* =========================================================
   Folders
   ========================================================= */

async function loadFolders() {
  const folder = $('folder');

  if (!folder) return;

  folder.innerHTML =
    '<option value="">Folder নির্বাচন করুন</option>';

  const { data, error } = await db
    .from('question_bank_folders')
    .select('id,folder_name,sub_category')
    .eq('sub_category', CATS[cat])
    .order('folder_name');

  if (error) {
    console.error(error);
    return;
  }

  (data || []).forEach(f => {
    const option =
      document.createElement('option');

    option.value = f.id;
    option.textContent = f.folder_name;

    folder.appendChild(option);
  });

  await loadSets();
}

async function editFolder() {
  const folder = $('folder');

  if (!folder?.value) {
    alert('আগে Folder নির্বাচন করুন');
    return;
  }

  const oldName =
    folder.options[folder.selectedIndex]
      ?.textContent || '';

  const newName = prompt(
    'নতুন Folder-এর নাম দিন:',
    oldName
  );

  if (!newName || !newName.trim()) {
    return;
  }

  const { error } = await db
    .from('question_bank_folders')
    .update({
      folder_name: newName.trim()
    })
    .eq('id', folder.value);

  if (error) {
    alert(error.message);
    return;
  }

  await loadFolders();
  msg(
    'qmsg',
    '✅ Folder-এর নাম পরিবর্তন হয়েছে'
  );
}

async function deleteFolder() {
  const folder = $('folder');

  if (!folder?.value) {
    alert('আগে Folder নির্বাচন করুন');
    return;
  }

  const folderId = Number(folder.value);

  const { count, error: countError } =
    await db
      .from('question_bank_sets')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('folder_id', folderId);

  if (countError) {
    alert(countError.message);
    return;
  }

  if ((count || 0) > 0) {
    alert(
      'এই Folder-এর ভিতরে Set আছে। আগে Setগুলো Delete করুন।'
    );
    return;
  }

  if (
    !confirm(
      'এই Folder Delete করতে চান?'
    )
  ) {
    return;
  }

  const { error } = await db
    .from('question_bank_folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadFolders();

  msg(
    'qmsg',
    '✅ Folder Delete হয়েছে'
  );
}

/* =========================================================
   Folder Filter
   ========================================================= */

function filterFolders() {
  const search =
    norm($('folderSearch')?.value);

  document
    .querySelectorAll('#folder option')
    .forEach(option => {
      if (!option.value) return;

      option.hidden =
        search &&
        !norm(option.textContent)
          .includes(search);
    });
}

/* =========================================================
   Sets
   ========================================================= */

async function loadSets() {
  const set = $('set');

  if (!set) return;

  set.innerHTML =
    '<option value="">Set নির্বাচন করুন</option>';

  const folderId =
    Number($('folder')?.value || 0);

  if (!folderId) {
    return;
  }

  const { data, error } = await db
    .from('question_bank_sets')
    .select('id,set_name,folder_id')
    .eq('folder_id', folderId)
    .order('set_name');

  if (error) {
    console.error(error);
    return;
  }

  (data || []).forEach(s => {
    const option =
      document.createElement('option');

    option.value = s.id;
    option.textContent = s.set_name;

    set.appendChild(option);
  });

  await loadQuestions();
}

async function editSet() {
  const set = $('set');

  if (!set?.value) {
    alert('আগে Set নির্বাচন করুন');
    return;
  }

  const oldName =
    set.options[set.selectedIndex]
      ?.textContent || '';

  const newName = prompt(
    'নতুন Set-এর নাম দিন:',
    oldName
  );

  if (!newName || !newName.trim()) {
    return;
  }

  const { error } = await db
    .from('question_bank_sets')
    .update({
      set_name: newName.trim()
    })
    .eq('id', set.value);

  if (error) {
    alert(error.message);
    return;
  }

  await loadSets();

  msg(
    'qmsg',
    '✅ Set-এর নাম পরিবর্তন হয়েছে'
  );
}

async function deleteSet() {
  const set = $('set');

  if (!set?.value) {
    alert('আগে Set নির্বাচন করুন');
    return;
  }

  const setId = Number(set.value);

  const { count, error: countError } =
    await db
      .from('questions')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('set_id', setId);

  if (countError) {
    alert(countError.message);
    return;
  }

  if ((count || 0) > 0) {
    alert(
      'এই Set-এর ভিতরে প্রশ্ন আছে। আগে প্রশ্নগুলো Move/Delete করুন।'
    );
    return;
  }

  if (
    !confirm(
      'এই Set Delete করতে চান?'
    )
  ) {
    return;
  }

  const { error } = await db
    .from('question_bank_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadSets();

  msg(
    'qmsg',
    '✅ Set Delete হয়েছে'
  );
}

/* =========================================================
   Set Filter
   ========================================================= */

function filterSets() {
  const search =
    norm($('setSearch')?.value);

  document
    .querySelectorAll('#set option')
    .forEach(option => {
      if (!option.value) return;

      option.hidden =
        search &&
        !norm(option.textContent)
          .includes(search);
    });
}

/* =========================================================
   Map Sets
   ========================================================= */

async function mapSets() {
  const folderId =
    Number($('folder')?.value || 0);

  if (!folderId) return;

  await loadSets();
}

/* =========================================================
   Create Folder
   ========================================================= */

async function createFolder() {
  const name = prompt(
    'নতুন Folder-এর নাম দিন:'
  );

  if (!name || !name.trim()) {
    return;
  }

  const { error } = await db
    .from('question_bank_folders')
    .insert({
      sub_category: CATS[cat],
      folder_name: name.trim()
    });

  if (error) {
    alert(error.message);
    return;
  }

  await loadFolders();

  msg(
    'qmsg',
    '✅ Folder তৈরি হয়েছে'
  );
}

/* =========================================================
   Create Set
   ========================================================= */

async function createSet() {
  const folderId =
    Number($('folder')?.value || 0);

  if (!folderId) {
    alert('আগে Folder নির্বাচন করুন');
    return;
  }

  const name = prompt(
    'নতুন Set-এর নাম দিন:'
  );

  if (!name || !name.trim()) {
    return;
  }

  const { error } = await db
    .from('question_bank_sets')
    .insert({
      folder_id: folderId,
      set_name: name.trim()
    });

  if (error) {
    alert(error.message);
    return;
  }

  await loadSets();

  msg(
    'qmsg',
    '✅ Set তৈরি হয়েছে'
  );
}

/* =========================================================
   Manual Question
   ========================================================= */

async function addManual() {
  const folderId =
    Number($('folder')?.value || 0) || null;

  const setId =
    Number($('set')?.value || 0) || null;

  const subjectId =
    Number($('subject')?.value || 0) || null;

  const question =
    $('manualQuestion')?.value?.trim();

  const optionA =
    $('manualA')?.value?.trim();

  const optionB =
    $('manualB')?.value?.trim();

  const optionC =
    $('manualC')?.value?.trim();

  const optionD =
    $('manualD')?.value?.trim();

  let correct =
    $('manualCorrect')?.value?.trim()
      ?.toUpperCase();

  const explanation =
    $('manualExplanation')?.value?.trim();

  if (
    !question ||
    !optionA ||
    !optionB ||
    !optionC ||
    !optionD ||
    !['A', 'B', 'C', 'D'].includes(correct)
  ) {
    msg(
      'qmsg',
      'প্রশ্ন, চারটি অপশন এবং সঠিক উত্তর পূরণ করুন',
      true
    );
    return;
  }

  const { error } = await db
    .from('questions')
    .insert({
      folder_id: folderId,
      set_id: setId,
      subject_id: subjectId,

      category: CATS[cat],

      source_name: null,
      source_type: cat,

      question_number: null,

      question_text: question,

      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,

      correct_answer: correct,

      explanation:
        explanation || null
    });

  if (error) {
    msg(
      'qmsg',
      error.message,
      true
    );
    return;
  }

  msg(
    'qmsg',
    '✅ প্রশ্ন যোগ হয়েছে'
  );

  await loadQuestions();
}

/* =========================================================
   Excel Template
   ========================================================= */

function template() {
  const headers = [
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
  ];

  const example = [
    'যাচাই পরীক্ষা',
    'বাংলাদেশ',
    'সেট-১',
    'বাংলাদেশ',
    'বিসিএস',
    '1',
    'বাংলাদেশের রাজধানী কোনটি?',
    'ঢাকা',
    'চট্টগ্রাম',
    'রাজশাহী',
    'খুলনা',
    'A',
    ''
  ];

  const csv =
    headers.join(',') +
    '\n' +
    example
      .map(v =>
        `"${String(v).replace(/"/g, '""')}"`
      )
      .join(',');

  const blob =
    new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download =
    'mcq_question_template.csv';

  a.click();

  URL.revokeObjectURL(url);
}

/* =========================================================
   Excel / CSV Preview
   ========================================================= */

async function previewImport() {
  const file =
    $('excelFile')?.files?.[0];

  if (!file) {
    alert(
      'আগে Excel/CSV ফাইল নির্বাচন করুন'
    );
    return;
  }

  try {
    const ext =
      file.name
        .split('.')
        .pop()
        .toLowerCase();

    let rows = [];

    if (
      ext === 'xlsx' ||
      ext === 'xls'
    ) {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: 'array'
        });

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: ''
          }
        );
    } else {
      const text =
        await file.text();

      const workbook =
        XLSX.read(text, {
          type: 'string'
        });

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: ''
          }
        );
    }

    /*
     * Excel header → internal key
     */
    const aliases = {
      category: [
        'category',
        'Category'
      ],

      folder: [
        'folder',
        'Folder'
      ],

      set: [
        'set',
        'Set'
      ],

      subject: [
        'subject',
        'Subject'
      ],

      source: [
        'source',
        'Source'
      ],

      question_number: [
        'question_number',
        'Question Number',
        'QuestionNumber'
      ],

      question: [
        'question',
        'Question'
      ],

      option_a: [
        'option_a',
        'Option A',
        'OptionA'
      ],

      option_b: [
        'option_b',
        'Option B',
        'OptionB'
      ],

      option_c: [
        'option_c',
        'Option C',
        'OptionC'
      ],

      option_d: [
        'option_d',
        'Option D',
        'OptionD'
      ],

      correct_answer: [
        'correct_answer',
        'Correct Answer',
        'CorrectAnswer'
      ],

      explanation: [
        'explanation',
        'Explanation'
      ]
    };

    importData =
      rows.map(row => {
        const obj = {};

        Object.keys(aliases)
          .forEach(key => {
            obj[key] = '';

            for (
              const alias of aliases[key]
            ) {
              if (
                row[alias] !== undefined &&
                row[alias] !== null
              ) {
                obj[key] =
                  String(row[alias]).trim();
                break;
              }
            }
          });

        return obj;
      });

    const preview =
      $('preview');

    if (preview) {
      preview.innerHTML =
        `<strong>৩৫ টি row পাওয়া গেছে</strong>`;

      if (importData.length !== 35) {
        preview.innerHTML =
          `<strong>${bn(importData.length)} টি row পাওয়া গেছে</strong>`;
      }

      const pre =
        document.createElement('pre');

      pre.textContent =
        JSON.stringify(
          importData.slice(0, 5),
          null,
          2
        );

      preview.appendChild(pre);
    }

    msg(
      'qmsg',
      `✅ ${bn(importData.length)}টি row প্রস্তুত`
    );

  } catch (error) {
    console.error(error);

    msg(
      'qmsg',
      `❌ ফাইল পড়তে সমস্যা: ${error.message}`,
      true
    );
  }
}

/* =========================================================
   IMPORT
   ========================================================= */

async function importRows() {
  if (!importData.length) {
    alert(
      'আগে Excel/CSV ফাইল Preview করুন'
    );
    return;
  }

  let ok = 0;
  const fail = [];

  /*
   * বর্তমানে Admin panel-এ নির্বাচিত Folder / Set
   */
  const selectedFolderId =
    Number($('folder')?.value || 0) || null;

  const selectedSetId =
    Number($('set')?.value || 0) || null;

  /*
   * Excel/CSV row থেকে value নেওয়ার helper।
   *
   * নতুন template:
   * question
   * option_a
   *
   * আবার Preview-তে দেখা Title Case:
   * Question
   * Option A
   *
   * দুই ধরনের নামই গ্রহণ করবে।
   */
  const getValue = (row, ...keys) => {
    for (const key of keys) {
      if (
        row &&
        row[key] !== undefined &&
        row[key] !== null &&
        String(row[key]).trim() !== ''
      ) {
        return String(row[key]).trim();
      }
    }

    return '';
  };

  for (
    let i = 0;
    i < importData.length;
    i++
  ) {
    const r = importData[i];

    /*
     * ==============================
     * Read Excel / CSV Fields
     * ==============================
     */

    const categoryRaw =
      getValue(
        r,
        'category',
        'Category'
      );

    const folderName =
      getValue(
        r,
        'folder',
        'Folder'
      );

    const setName =
      getValue(
        r,
        'set',
        'Set'
      );

    const subjectName =
      getValue(
        r,
        'subject',
        'Subject'
      );

    const sourceName =
      getValue(
        r,
        'source',
        'Source'
      );

    const rawQuestionNumber =
      getValue(
        r,
        'question_number',
        'Question Number'
      );

    const question =
      getValue(
        r,
        'question',
        'Question'
      );

    const optionA =
      getValue(
        r,
        'option_a',
        'Option A'
      );

    const optionB =
      getValue(
        r,
        'option_b',
        'Option B'
      );

    const optionC =
      getValue(
        r,
        'option_c',
        'Option C'
      );

    const optionD =
      getValue(
        r,
        'option_d',
        'Option D'
      );

    let correct =
      getValue(
        r,
        'correct_answer',
        'Correct Answer'
      );

    const explanation =
      getValue(
        r,
        'explanation',
        'Explanation'
      );

    /*
     * ==============================
     * Category
     * ==============================
     */

    const category =
      Object.values(CATS).includes(
        categoryRaw
      )
        ? categoryRaw
        : CATS[cat];

    /*
     * ==============================
     * Correct Answer Normalize
     * ==============================
     *
     * ক → A
     * খ → B
     * গ → C
     * ঘ → D
     *
     * a/b/c/d-ও গ্রহণ করবে।
     */

    const correctMap = {
      'ক': 'A',
      'খ': 'B',
      'গ': 'C',
      'ঘ': 'D'
    };

    correct =
      correctMap[correct] ||
      correct.toUpperCase();

    /*
     * ==============================
     * ONLY REQUIRED FIELDS
     * ==============================
     *
     * বাধ্যতামূলক:
     *
     * ১. Question
     * ২. Option A
     * ৩. Option B
     * ৪. Option C
     * ৫. Option D
     * ৬. Correct Answer
     *
     * Category / Folder / Set / Subject /
     * Source / Question Number / Explanation
     * কোনোটি বাধ্যতামূলক নয়।
     */

    if (
      !question ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !['A', 'B', 'C', 'D'].includes(
        correct
      )
    ) {
      fail.push(
        `Row ${i + 2}: প্রশ্ন, চারটি অপশন এবং সঠিক উত্তর পূরণ করতে হবে`
      );

      continue;
    }

    /*
     * ==============================
     * Folder / Set Selection
     * ==============================
     *
     * Excel-এ Category না থাকলে
     * বর্তমান Admin Category ব্যবহার করবে।
     *
     * Excel-এ Category থাকলে এবং সেটি
     * বর্তমান Category-এর সঙ্গে না মিললে
     * বর্তমান Folder/Set ব্যবহার করবে না।
     */

    const categoryProvided =
      !!categoryRaw;

    const selectedCategoryMatches =
      !categoryProvided ||
      category === CATS[cat];

    let fid =
      selectedCategoryMatches
        ? selectedFolderId
        : null;

    let sid =
      selectedCategoryMatches
        ? selectedSetId
        : null;

    /*
     * ==============================
     * Folder
     * ==============================
     *
     * Excel-এ Folder থাকলে:
     *
     * ১. খুঁজবে
     * ২. না থাকলে তৈরি করবে
     */

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

        fid = x.data.id;
      }

      /*
       * Folder দেওয়া আছে কিন্তু Set নেই।
       * তাই পুরোনো selected Set ব্যবহার করা যাবে না।
       */
      if (!setName) {
        sid = null;
      }
    }

    /*
     * ==============================
     * Set
     * ==============================
     *
     * Excel-এ Set থাকলে:
     *
     * Folder-এর ভিতরে Set খুঁজবে।
     * না থাকলে তৈরি করবে।
     */

    if (setName) {
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

      if (!sid) {
        const x =
          await db
            .from(
              'question_bank_sets'
            )
            .insert({
              folder_id: fid,
              set_name: setName
            })
            .select('id')
            .single();

        if (x.error) {
          fail.push(
            `Row ${i + 2}: ${x.error.message}`
          );

          continue;
        }

        sid = x.data.id;
      }
    }

    /*
     * ==============================
     * Subject
     * ==============================
     *
     * Subject optional.
     *
     * Subject না পাওয়া গেলেও Import
     * বন্ধ হবে না।
     */

    let sub = null;

    if (subjectName) {
      sub =
        subjects.find(
          x =>
            norm(x.name) ===
            norm(subjectName)
        ) || null;
    }

    /*
     * ==============================
     * Question Number
     * ==============================
     *
     * Optional।
     */

    let questionNumber = null;

    if (rawQuestionNumber !== '') {
      const n =
        Number(rawQuestionNumber);

      if (!Number.isNaN(n)) {
        questionNumber = n;
      }
    }

    /*
     * ==============================
     * Final Payload
     * ==============================
     *
     * source_id পাঠানো হচ্ছে না।
     *
     * কারণ source এখন optional এবং
     * source_id nullable করা হয়েছে।
     */

    const payload = {
      folder_id: fid,

      set_id: sid,

      subject_id:
        sub?.id || null,

      category:
        category,

      source_name:
        sourceName || null,

      source_type:
        cat,

      question_number:
        questionNumber,

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
        explanation || null
    };

    /*
     * ==============================
     * Database Insert
     * ==============================
     */

    const x =
      await db
        .from('questions')
        .insert(payload);

    if (x.error) {
      fail.push(
        `Row ${i + 2}: ${x.error.message}`
      );
    } else {
      ok++;
    }
  }

  /*
   * ==============================
   * Import Result
   * ==============================
   */

  msg(
    'qmsg',
    `✅ ${bn(ok)}টি Import হয়েছে${
      fail.length
        ? ` | ❌ ${bn(fail.length)}টি ব্যর্থ`
        : ''
    }`,
    !!fail.length
  );

  /*
   * Error details
   */

  if (fail.length) {
    const preview =
      $('preview');

    if (preview) {
      preview.innerHTML +=
        '<div class="q">' +
        fail
          .map(esc)
          .join('<br>') +
        '</div>';
    }
  }

  /*
   * Question list reload
   */

  await loadQuestions();
}

/* =========================================================
   Question List
   ========================================================= */

async function loadQuestions() {
  const list =
    $('questionList');

  if (!list) return;

  const folderId =
    Number($('folder')?.value || 0);

  const setId =
    Number($('set')?.value || 0);

  let query =
    db
      .from('questions')
      .select(
        `
        id,
        question_number,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        category,
        source_name,
        folder_id,
        set_id
        `
      )
      .order(
        'question_number',
        {
          ascending: true,
          nullsFirst: false
        }
      );

  if (folderId) {
    query =
      query.eq(
        'folder_id',
        folderId
      );
  }

  if (setId) {
    query =
      query.eq(
        'set_id',
        setId
      );
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    console.error(error);

    list.innerHTML =
      `<div class="q">
        ${esc(error.message)}
      </div>`;

    return;
  }

  if (!data?.length) {
    list.innerHTML =
      '<div class="q">কোনো প্রশ্ন নেই</div>';

    return;
  }

  list.innerHTML =
    data
      .map(
        (q, index) => `
          <div class="q">
            <label>
              <input
                type="checkbox"
                class="bankQuestionCheck"
                value="${q.id}"
              >

              <strong>
                ${bn(index + 1)}.
              </strong>

              ${esc(q.question_text)}
            </label>

            <div>
              ক) ${esc(q.option_a)}
            </div>

            <div>
              খ) ${esc(q.option_b)}
            </div>

            <div>
              গ) ${esc(q.option_c)}
            </div>

            <div>
              ঘ) ${esc(q.option_d)}
            </div>

            <div>
              <strong>
                উত্তর:
              </strong>
              ${esc(q.correct_answer)}
            </div>

            ${
              q.explanation
                ? `
                  <div>
                    <strong>
                      ব্যাখ্যা:
                    </strong>
                    ${esc(q.explanation)}
                  </div>
                `
                : ''
            }
          </div>
        `
      )
      .join('');
}

/* =========================================================
   Select / Clear All Questions
   ========================================================= */

function selectAllQuestions() {
  document
    .querySelectorAll(
      '.bankQuestionCheck'
    )
    .forEach(cb => {
      cb.checked = true;
    });
}

function clearAllQuestions() {
  document
    .querySelectorAll(
      '.bankQuestionCheck'
    )
    .forEach(cb => {
      cb.checked = false;
    });
}

/* =========================================================
   Move Questions
   ========================================================= */

async function loadMoveSets() {
  const moveFolder =
    Number(
      $('moveFolder')?.value || 0
    );

  const moveSet =
    $('moveSet');

  if (!moveSet) return;

  moveSet.innerHTML =
    '<option value="">Set নির্বাচন করুন</option>';

  if (!moveFolder) {
    return;
  }

  const {
    data,
    error
  } = await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq(
      'folder_id',
      moveFolder
    )
    .order('set_name');

  if (error) {
    console.error(error);
    return;
  }

  (data || []).forEach(s => {
    const option =
      document.createElement(
        'option'
      );

    option.value = s.id;
    option.textContent =
      s.set_name;

    moveSet.appendChild(
      option
    );
  });
}

async function moveSelectedQuestions() {
  const ids =
    Array.from(
      document.querySelectorAll(
        '.bankQuestionCheck:checked'
      )
    ).map(
      el => Number(el.value)
    )
    .filter(Boolean);

  if (!ids.length) {
    alert(
      'কমপক্ষে একটি প্রশ্ন নির্বাচন করুন'
    );
    return;
  }

  const folderId =
    Number(
      $('moveFolder')?.value || 0
    );

  const setId =
    Number(
      $('moveSet')?.value || 0
    );

  if (!folderId || !setId) {
    alert(
      'Move করার জন্য Folder ও Set নির্বাচন করুন'
    );
    return;
  }

  if (
    !confirm(
      `${bn(ids.length)}টি প্রশ্ন Move করতে চান?`
    )
  ) {
    return;
  }

  const {
    error
  } = await db
    .from('questions')
    .update({
      folder_id:
        folderId,
      set_id:
        setId
    })
    .in(
      'id',
      ids
    );

  if (error) {
    alert(error.message);
    return;
  }

  msg(
    'qmsg',
    `✅ ${bn(ids.length)}টি প্রশ্ন Move হয়েছে`
  );

  await loadQuestions();
}

/* =========================================================
   Exam Management
   ========================================================= */

async function loadExams() {
  const list =
    $('examList');

  if (!list) return;

  const {
    data,
    error
  } = await db
    .from('exam_settings')
    .select('*')
    .order(
      'id',
      {
        ascending: false
      }
    );

  if (error) {
    console.error(error);
    return;
  }

  list.innerHTML =
    (data || [])
      .map(
        exam => `
          <div class="q">
            <strong>
              ${esc(
                exam.exam_name ||
                exam.name ||
                ''
              )}
            </strong>
          </div>
        `
      )
      .join('') ||
    '<div class="q">কোনো Exam নেই</div>';
}

/* =========================================================
   Exam Create
   ========================================================= */

async function createExam() {
  const name =
    $('examName')?.value?.trim();

  if (!name) {
    alert(
      'Exam-এর নাম দিন'
    );
    return;
  }

  const {
    error
  } = await db
    .from('exam_settings')
    .insert({
      exam_name:
        name
    });

  if (error) {
    alert(error.message);
    return;
  }

  msg(
    'examMsg',
    '✅ Exam তৈরি হয়েছে'
  );

  await loadExams();
}

/* =========================================================
   Exam Link
   ========================================================= */

async function linkQuestionsToExam() {
  const examId =
    Number(
      $('examSelect')?.value || 0
    );

  if (!examId) {
    alert(
      'Exam নির্বাচন করুন'
    );
    return;
  }

  const ids =
    Array.from(
      document.querySelectorAll(
        '.bankQuestionCheck:checked'
      )
    )
      .map(
        el => Number(el.value)
      )
      .filter(Boolean);

  if (!ids.length) {
    alert(
      'প্রশ্ন নির্বাচন করুন'
    );
    return;
  }

  const rows =
    ids.map(
      questionId => ({
        exam_id:
          examId,
        question_id:
          questionId
      })
    );

  const {
    error
  } = await db
    .from('exam_questions')
    .insert(rows);

  if (error) {
    alert(error.message);
    return;
  }

  msg(
    'examMsg',
    `✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`
  );
}

/* =========================================================
   Activate Exam
   ========================================================= */

async function activateExam() {
  const examId =
    Number(
      $('examSelect')?.value || 0
    );

  if (!examId) {
    alert(
      'Exam নির্বাচন করুন'
    );
    return;
  }

  const {
    error
  } = await db
    .from('exam_settings')
    .update({
      active: true
    })
    .eq(
      'id',
      examId
    );

  if (error) {
    alert(error.message);
    return;
  }

  msg(
    'examMsg',
    '✅ Exam Activate হয়েছে'
  );

  await loadExams();
}

/* =========================================================
   Exam Settings
   ========================================================= */

async function saveExamSettings() {
  const examId =
    Number(
      $('examSelect')?.value || 0
    );

  if (!examId) {
    alert(
      'Exam নির্বাচন করুন'
    );
    return;
  }

  const payload = {};

  const duration =
    Number(
      $('examDuration')?.value || 0
    );

  if (duration) {
    payload.duration_minutes =
      duration;
  }

  if (
    $('examTitle')?.value !==
    undefined
  ) {
    payload.exam_name =
      $('examTitle').value.trim();
  }

  const {
    error
  } = await db
    .from('exam_settings')
    .update(payload)
    .eq(
      'id',
      examId
    );

  if (error) {
    alert(error.message);
    return;
  }

  msg(
    'examMsg',
    '✅ Exam Settings Save হয়েছে'
  );

  await loadExams();
}

/* =========================================================
   Global Event Handlers
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    /*
     * Login
     */

    $('loginBtn')?.addEventListener(
      'click',
      login
    );

    $('logoutBtn')?.addEventListener(
      'click',
      logout
    );

    /*
     * Category
     */

    document
      .querySelectorAll(
        '[data-category]'
      )
      .forEach(btn => {
        btn.addEventListener(
          'click',
          () =>
            selectCategory(
              btn.dataset.category
            )
        );
      });

    /*
     * Folder
     */

    $('folder')?.addEventListener(
      'change',
      async () => {
        await loadSets();
      }
    );

    $('folderSearch')?.addEventListener(
      'input',
      filterFolders
    );

    /*
     * Set
     */

    $('set')?.addEventListener(
      'change',
      async () => {
        await loadQuestions();
      }
    );

    $('setSearch')?.addEventListener(
      'input',
      filterSets
    );

    /*
     * Buttons
     */

    $('editFolderBtn')
      ?.addEventListener(
        'click',
        editFolder
      );

    $('deleteFolderBtn')
      ?.addEventListener(
        'click',
        deleteFolder
      );

    $('editSetBtn')
      ?.addEventListener(
        'click',
        editSet
      );

    $('deleteSetBtn')
      ?.addEventListener(
        'click',
        deleteSet
      );

    $('createFolderBtn')
      ?.addEventListener(
        'click',
        createFolder
      );

    $('createSetBtn')
      ?.addEventListener(
        'click',
        createSet
      );

    /*
     * Manual Question
     */

    $('addManualBtn')
      ?.addEventListener(
        'click',
        addManual
      );

    /*
     * Import
     */

    $('templateBtn')
      ?.addEventListener(
        'click',
        template
      );

    $('previewBtn')
      ?.addEventListener(
        'click',
        previewImport
      );

    $('importBtn')
      ?.addEventListener(
        'click',
        importRows
      );

    /*
     * Question Selection
     */

    $('selectAllQuestionsBtn')
      ?.addEventListener(
        'click',
        selectAllQuestions
      );

    $('clearAllQuestionsBtn')
      ?.addEventListener(
        'click',
        clearAllQuestions
      );

    /*
     * Move
     */

    $('moveFolder')
      ?.addEventListener(
        'change',
        loadMoveSets
      );

    $('moveSelectedBtn')
      ?.addEventListener(
        'click',
        moveSelectedQuestions
      );

    /*
     * Exam
     */

    $('createExamBtn')
      ?.addEventListener(
        'click',
        createExam
      );

    $('linkQuestionsBtn')
      ?.addEventListener(
        'click',
        linkQuestionsToExam
      );

    $('activateExamBtn')
      ?.addEventListener(
        'click',
        activateExam
      );

    $('saveExamSettingsBtn')
      ?.addEventListener(
        'click',
        saveExamSettings
      );

    /*
     * Page navigation
     */

    document
      .querySelectorAll(
        '[data-page]'
      )
      .forEach(el => {
        el.addEventListener(
          'click',
          () =>
            showPage(
              el.dataset.page
            )
        );
      });

    /*
     * Start
     */

    init();
  }
);
