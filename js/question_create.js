const CATS = {
  recruitment: 'নিয়োগ পরীক্ষা',
  verification_test: 'যাচাই পরীক্ষা',
  recent: 'সাম্প্রতিক প্রশ্ন'
};

let cat = 'verification_test';
let subjects = [];
let pendingImportRows = [];

const $ = id => document.getElementById(id);
const bn = n => String(n ?? '').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function msg(id, text, err=false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = err ? '#b91c1c' : '#166534';
}

function setupMenu() {
  const btn = $('adminMenuBtn'), panel = $('adminMenuPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden');
  });
}

async function login() {
  msg('loginMsg','Login হচ্ছে...');
  const {error} = await db.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });
  if (error) return msg('loginMsg', error.message, true);
  await init();
}

async function logout() {
  await db.auth.signOut();
  location.reload();
}

async function init() {
  setupMenu();
  const {data,error} = await db.auth.getSession();
  if (error) return msg('loginMsg', error.message, true);
  if (!data.session) return;
  $('login')?.classList.add('hidden');
  $('app')?.classList.remove('hidden');
  await loadSubjects();
  await selectCategory(cat);
}

async function loadSubjects() {
  const {data,error} = await db.from('subjects').select('id,name').order('id');
  if (error) return msg('loginMsg', error.message, true);
  subjects = data || [];
  const el = $('subject');
  if (el) {
    el.innerHTML = '<option value="">বিষয় নির্বাচন করুন</option>' +
      subjects.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  }
}

async function selectCategory(c) {
  if (!CATS[c]) return;
  cat = c;
  document.querySelectorAll('.cats button').forEach(b => b.classList.remove('active'));
  $('cat-' + c)?.classList.add('active');
  if ($('currentCat')) $('currentCat').textContent = 'বর্তমান Category: ' + CATS[c];
  await loadFolders();
}

async function loadFolders(preferredFolderId=null) {
  const {data,error} = await db.from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category', CATS[cat])
    .order('id');

  if (error) return msg('folderMsg', error.message, true);

  const el = $('folder');
  if (!el) return;

  el.innerHTML = '<option value="">Folder নির্বাচন করুন</option>' +
    (data || []).map(x => `<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');

  if (preferredFolderId && (data || []).some(x => String(x.id) === String(preferredFolderId))) {
    el.value = String(preferredFolderId);
  }

  await loadSets();
}

async function loadSets(preferredSetId=null) {
  const folderId = $('folder')?.value, el = $('set');
  if (!el) return;

  if (!folderId) {
    el.innerHTML = '<option value="">Set নির্বাচন করুন</option>';
    return;
  }

  const {data,error} = await db.from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id', Number(folderId))
    .order('id');

  if (error) return msg('folderMsg', error.message, true);

  el.innerHTML = '<option value="">Set নির্বাচন করুন</option>' +
    (data || []).map(x => `<option value="${x.id}">${esc(x.set_name)}</option>`).join('');

  if (preferredSetId && (data || []).some(x => String(x.id) === String(preferredSetId))) {
    el.value = String(preferredSetId);
  }
}

async function createFolder() {
  const name = $('newFolder')?.value.trim();
  if (!name) return msg('folderMsg','নতুন Folder-এর নাম দিন।',true);

  msg('folderMsg','Folder তৈরি হচ্ছে...');
  const {data,error} = await db.from('question_bank_folders')
    .insert({sub_category:CATS[cat], folder_name:name})
    .select('id')
    .single();

  if (error) return msg('folderMsg', error.message, true);

  $('newFolder').value = '';
  await loadFolders(data?.id);
  msg('folderMsg','✅ Folder সফলভাবে তৈরি হয়েছে।');
}

async function createSet() {
  const folderId = $('folder')?.value;
  const name = $('newSet')?.value.trim();

  if (!folderId) return msg('folderMsg','আগে Folder নির্বাচন করুন।',true);
  if (!name) return msg('folderMsg','নতুন Set-এর নাম দিন।',true);

  msg('folderMsg','Set তৈরি হচ্ছে...');
  const {data,error} = await db.from('question_bank_sets')
    .insert({folder_id:Number(folderId), set_name:name})
    .select('id')
    .single();

  if (error) return msg('folderMsg', error.message, true);

  $('newSet').value = '';
  await loadSets(data?.id);
  msg('folderMsg','✅ Set সফলভাবে তৈরি হয়েছে।');
}

async function renameSelectedFolder() {
  const id = $('folder')?.value;
  if (!id) return msg('folderMsg','আগে Folder নির্বাচন করুন।',true);

  const old = $('folder').selectedOptions[0]?.textContent || '';
  const name = prompt('নতুন Folder-এর নাম লিখুন:', old);
  if (name === null) return;

  const value = name.trim();
  if (!value) return msg('folderMsg','Folder-এর নাম খালি রাখা যাবে না।',true);
  if (value === old) return;

  msg('folderMsg','Folder Rename হচ্ছে...');
  const {error} = await db.from('question_bank_folders')
    .update({folder_name:value})
    .eq('id',Number(id));

  if (error) return msg('folderMsg',error.message,true);

  await loadFolders(id);
  msg('folderMsg','✅ Folder-এর নাম পরিবর্তন হয়েছে।');
}

async function deleteSelectedFolder() {
  const id = $('folder')?.value;
  if (!id) return msg('folderMsg','আগে Folder নির্বাচন করুন।',true);

  const name = $('folder').selectedOptions[0]?.textContent || 'এই Folder';
  const check = await db.from('question_bank_sets')
    .select('id',{count:'exact',head:true})
    .eq('folder_id',Number(id));

  if (check.error) return msg('folderMsg',check.error.message,true);

  const count = check.count || 0;
  const text = count
    ? `"${name}" Folder-এর ভিতরে ${count}টি Set আছে। Delete করলে Set-গুলোও মুছে যাবে। নিশ্চিত?`
    : `"${name}" Folder Delete করবেন?`;

  if (!confirm(text)) return;

  msg('folderMsg','Folder Delete হচ্ছে...');
  const {error} = await db.from('question_bank_folders')
    .delete()
    .eq('id',Number(id));

  if (error) return msg('folderMsg',error.message,true);

  await loadFolders();
  msg('folderMsg','✅ Folder Delete হয়েছে।');
}

async function renameSelectedSet() {
  const id = $('set')?.value;
  if (!id) return msg('folderMsg','আগে Set নির্বাচন করুন।',true);

  const old = $('set').selectedOptions[0]?.textContent || '';
  const name = prompt('নতুন Set-এর নাম লিখুন:', old);
  if (name === null) return;

  const value = name.trim();
  if (!value) return msg('folderMsg','Set-এর নাম খালি রাখা যাবে না।',true);
  if (value === old) return;

  msg('folderMsg','Set Rename হচ্ছে...');
  const {error} = await db.from('question_bank_sets')
    .update({set_name:value})
    .eq('id',Number(id));

  if (error) return msg('folderMsg',error.message,true);

  await loadSets(id);
  msg('folderMsg','✅ Set-এর নাম পরিবর্তন হয়েছে।');
}

async function deleteSelectedSet() {
  const id = $('set')?.value;
  if (!id) return msg('folderMsg','আগে Set নির্বাচন করুন।',true);

  const name = $('set').selectedOptions[0]?.textContent || 'এই Set';
  const check = await db.from('questions')
    .select('id',{count:'exact',head:true})
    .eq('set_id',Number(id));

  if (check.error) return msg('folderMsg',check.error.message,true);

  const count = check.count || 0;
  const text = count
    ? `"${name}" Set-এর মধ্যে ${count}টি প্রশ্ন আছে। Delete করলে প্রশ্নগুলোও মুছে যাবে। নিশ্চিত?`
    : `"${name}" Set Delete করবেন?`;

  if (!confirm(text)) return;

  msg('folderMsg','Set Delete হচ্ছে...');
  const {error} = await db.from('question_bank_sets')
    .delete()
    .eq('id',Number(id));

  if (error) return msg('folderMsg',error.message,true);

  await loadSets();
  msg('folderMsg','✅ Set Delete হয়েছে।');
}

function norm(value) {
  return String(value ?? '').replace(/\uFEFF/g,'').replace(/\u00A0/g,' ').trim()
    .replace(/\s+/g,' ').replace(/[‐‑‒–—−]/g,'-').toLowerCase();
}

function normalizeCategory(value) {
  const aliases = {
    'নিয়োগ পরীক্ষা':'নিয়োগ পরীক্ষা','নিয়োগ':'নিয়োগ পরীক্ষা',
    'নিয়োগ পরীক্ষা':'নিয়োগ পরীক্ষা','নিয়োগ':'নিয়োগ পরীক্ষা',
    'recruitment':'নিয়োগ পরীক্ষা','recruitment exam':'নিয়োগ পরীক্ষা',
    'যাচাই পরীক্ষা':'যাচাই পরীক্ষা','যাচাই':'যাচাই পরীক্ষা',
    'verification':'যাচাই পরীক্ষা','verification test':'যাচাই পরীক্ষা',
    'সাম্প্রতিক প্রশ্ন':'সাম্প্রতিক প্রশ্ন','সাম্প্রতিক':'সাম্প্রতিক প্রশ্ন',
    'recent':'সাম্প্রতিক প্রশ্ন','recent questions':'সাম্প্রতিক প্রশ্ন'
  };
  return aliases[norm(value)] || null;
}

function normalizeHeader(value) {
  return norm(value).replace(/[\s\-]+/g,'_');
}

const HEADER_ALIASES = {
  question: ['question'],
  option_a: ['option_a'],
  option_b: ['option_b'],
  option_c: ['option_c'],
  option_d: ['option_d'],
  correct_answer: ['correct_answer'],
  question_number: ['question_number'],
  subject: ['subject'],
  explanation: ['explanation'],
  category: ['category']
};

const REQUIRED_HEADERS = ['question','option_a','option_b','option_c','option_d','correct_answer'];

function canonicalHeader(value) {
  const h = normalizeHeader(value);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some(a => normalizeHeader(a) === h)) return canonical;
  }
  return null;
}

function validateHeaders(rows) {
  if (!rows.length) throw new Error('ফাইলে কোনো data row পাওয়া যায়নি।');

  const originalHeaders = Object.keys(rows[0] || {});
  if (!originalHeaders.length) throw new Error('ফাইলের header পাওয়া যায়নি।');

  const canonical = originalHeaders.map(canonicalHeader);
  const unknown = originalHeaders.filter((h,i) => !canonical[i]);

  if (unknown.length) {
    throw new Error(`অপরিচিত column পাওয়া গেছে: ${unknown.join(', ')}। Template-এর column ব্যবহার করুন।`);
  }

  const duplicates = canonical.filter((h,i,a) => h && a.indexOf(h) !== i);
  if (duplicates.length) {
    throw new Error(`একই column একাধিকবার আছে: ${[...new Set(duplicates)].join(', ')}`);
  }

  const missing = REQUIRED_HEADERS.filter(h => !canonical.includes(h));
  if (missing.length) {
    throw new Error(`Required column নেই: ${missing.join(', ')}`);
  }
}

function remapRows(rows) {
  return rows.map(row => {
    const out = {};
    Object.entries(row).forEach(([key,value]) => {
      const canonical = canonicalHeader(key);
      if (canonical) out[canonical] = String(value ?? '').trim();
    });
    return out;
  });
}

async function ensureXLSX() {
  if (window.XLSX) return;

  await new Promise((resolve,reject) => {
    const existing = document.querySelector('script[data-question-xlsx="1"]');

    if (existing) {
      existing.addEventListener('load', resolve, {once:true});
      existing.addEventListener('error', () => reject(new Error('Excel/CSV library লোড হয়নি।')), {once:true});
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.async = true;
    s.dataset.questionXlsx = '1';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Excel/CSV library লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।'));
    document.head.appendChild(s);
  });

  if (!window.XLSX) throw new Error('Excel/CSV library পাওয়া যায়নি।');
}

async function template() {
  const headers = [
    'question','option_a','option_b','option_c','option_d',
    'correct_answer','question_number','subject','explanation','category'
  ];

  const example = [
    'বাংলাদেশের রাজধানী কোনটি?','ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা',
    'A','1','বাংলাদেশ','',CATS[cat]
  ];

  await ensureXLSX();

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = [
    {wch:35},{wch:20},{wch:20},{wch:20},{wch:20},
    {wch:16},{wch:18},{wch:20},{wch:35},{wch:22}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, 'question-import-template.xlsx');
}

async function readWorkbook(file) {
  await ensureXLSX();

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer,{type:'array',raw:false,cellText:true,cellDates:false});

  if (!wb.SheetNames?.length) throw new Error('Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।');

  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।');

  const rows = XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});
  validateHeaders(rows);
  return remapRows(rows);
}

function showImportButton(show) {
  const el = $('importBtn');
  if (!el) return;
  el.disabled = !show;
  el.classList.toggle('hidden', !show);
}

function renderPreview(rows, failed=[]) {
  const box = $('importPreview');
  if (!box) return;

  const parts = [`<b>মোট Row: ${bn(rows.length)}</b>`];

  if (failed.length) {
    parts.push('<div style="margin-top:10px"><b>যেসব Row-তে সমস্যা:</b></div>');
    parts.push(failed.slice(0,100).map(x => `<div class="q">${esc(x)}</div>`).join(''));
  }

  const sample = rows.slice(0,5);
  if (sample.length) {
    parts.push('<div style="margin-top:10px"><b>Preview:</b></div>');
    parts.push(sample.map((r,i) =>
      `<div class="q"><b>Row ${bn(i+2)}</b><br>${esc(r.question || '(question খালি)')}</div>`
    ).join(''));
  }

  box.innerHTML = parts.join('');
}

async function previewImport() {
  const file = $('importFile')?.files?.[0];

  if (!file) return msg('importMsg','আগে CSV/Excel ফাইল নির্বাচন করুন।',true);
  if (!$('folder')?.value || !$('set')?.value)
    return msg('importMsg','আগে Folder এবং Set নির্বাচন করুন।',true);

  showImportButton(false);
  msg('importMsg','ফাইল যাচাই করা হচ্ছে...');

  try {
    const rows = await readWorkbook(file);
    const failed = validateRows(rows);

    pendingImportRows = rows.filter((_,i) => !failed.some(x => x.rowIndex === i));

    renderPreview(rows, failed.map(x => `Row ${x.rowNo}: ${x.message}`));

    if (!pendingImportRows.length) {
      return msg('importMsg','কোনো valid Row পাওয়া যায়নি।',true);
    }

    showImportButton(true);
    msg(
      'importMsg',
      `মোট ${bn(rows.length)}টি Row | Valid ${bn(pendingImportRows.length)} | Invalid ${bn(rows.length-pendingImportRows.length)}${failed.length ? ' — Invalid Row বাদ থাকবে।' : ''}`,
      failed.length > 0
    );
  } catch(err) {
    pendingImportRows = [];
    if ($('importPreview')) $('importPreview').innerHTML = '';
    msg('importMsg',err.message || 'ফাইল যাচাই করতে সমস্যা হয়েছে।',true);
  }
}

function validateRows(rows) {
  const failed = [];

  rows.forEach((row,i) => {
    const rowNo = i + 2;
    const missing = [];

    if (!row.question) missing.push('question');
    if (!row.option_a) missing.push('option_a');
    if (!row.option_b) missing.push('option_b');
    if (!row.option_c) missing.push('option_c');
    if (!row.option_d) missing.push('option_d');
    if (!row.correct_answer) missing.push('correct_answer');

    if (missing.length) {
      failed.push({rowIndex:i,rowNo,message:`Required field খালি — ${missing.join(', ')}`});
    }

    const correct = String(row.correct_answer || '').trim().toUpperCase();
    if (correct && !['A','B','C','D'].includes(correct)) {
      failed.push({rowIndex:i,rowNo,message:'correct_answer অবশ্যই A, B, C অথবা D হতে হবে।'});
    }

    if (String(row.question_number ?? '').trim() !== '') {
      const n = Number(String(row.question_number).trim());
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        failed.push({rowIndex:i,rowNo,message:'question_number অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।'});
      }
    }

    if (String(row.category ?? '').trim() && !normalizeCategory(row.category)) {
      failed.push({rowIndex:i,rowNo,message:`category "${row.category}" পরিচিত Category নয়।`});
    }

    if (String(row.subject ?? '').trim()) {
      const found = subjects.find(s => norm(s.name) === norm(row.subject));
      if (!found) failed.push({rowIndex:i,rowNo,message:`subject "${row.subject}" পাওয়া যায়নি।`});
    }
  });

  return failed.filter((x,i,a) => a.findIndex(y => y.rowIndex === x.rowIndex) === i);
}

async function importRows() {
  const file = $('importFile')?.files?.[0];
  if (!file) return msg('importMsg','আগে CSV/Excel ফাইল নির্বাচন করুন।',true);

  const folderId = $('folder')?.value, setId = $('set')?.value;
  if (!folderId || !setId)
    return msg('importMsg','আগে Folder এবং Set নির্বাচন করুন।',true);

  let rows = pendingImportRows;

  if (!rows.length) {
    try {
      rows = await readWorkbook(file);
    } catch(err) {
      return msg('importMsg',err.message || 'ফাইল পড়তে সমস্যা হয়েছে।',true);
    }

    const failed = validateRows(rows);
    rows = rows.filter((_,i) => !failed.some(x => x.rowIndex === i));
  }

  if (!rows.length) return msg('importMsg','কোনো valid প্রশ্ন পাওয়া যায়নি।',true);

  showImportButton(false);
  msg('importMsg','Database-এ প্রশ্ন যোগ হচ্ছে...');

  const payload = rows.map(row => {
    let questionNumber = null;
    if (String(row.question_number ?? '').trim() !== '') {
      questionNumber = Number(row.question_number);
    }

    let category = CATS[cat];
    if (String(row.category ?? '').trim()) {
      category = normalizeCategory(row.category);
    }

    let subjectId = null;
    if (String(row.subject ?? '').trim()) {
      const found = subjects.find(s => norm(s.name) === norm(row.subject));
      subjectId = found?.id ?? null;
    }

    return {
      folder_id:Number(folderId),
      set_id:Number(setId),
      subject_id:subjectId,
      category,
      question_number:questionNumber,
      question_text:String(row.question ?? '').trim(),
      option_a:String(row.option_a ?? '').trim(),
      option_b:String(row.option_b ?? '').trim(),
      option_c:String(row.option_c ?? '').trim(),
      option_d:String(row.option_d ?? '').trim(),
      correct_answer:String(row.correct_answer ?? '').trim().toUpperCase(),
      explanation:String(row.explanation ?? '').trim() || null
    };
  });

  const {error} = await db.from('questions').insert(payload);
  pendingImportRows = [];

  if (error) {
    if ($('importPreview')) $('importPreview').innerHTML = `<div class="q">${esc(error.message)}</div>`;
    return msg('importMsg',`Database-এ কোনো প্রশ্ন যোগ হয়নি। ${error.message}`,true);
  }

  if ($('importPreview')) $('importPreview').innerHTML = '';
  if ($('importFile')) $('importFile').value = '';
  msg('importMsg',`সফলভাবে ${bn(payload.length)}টি প্রশ্ন যোগ হয়েছে।`);
}

async function addManual() {
  const folderId = $('folder')?.value, setId = $('set')?.value;

  if (!folderId || !setId) {
    return msg('manualMsg','আগে Folder এবং Set নির্বাচন করুন।',true);
  }

  const question = $('question')?.value.trim();
  const a = $('optionA')?.value.trim();
  const b = $('optionB')?.value.trim();
  const c = $('optionC')?.value.trim();
  const d = $('optionD')?.value.trim();
  const correct = $('correctAnswer')?.value.trim().toUpperCase();
  const explanation = $('explanation')?.value.trim() || null;
  const qnoRaw = $('questionNumber')?.value.trim() || '';
  const subjectId = $('subject')?.value || null;

  if (!question || !a || !b || !c || !d || !correct) {
    return msg('manualMsg','প্রয়োজনীয় ঘরগুলো পূরণ করুন।',true);
  }

  if (!['A','B','C','D'].includes(correct)) {
    return msg('manualMsg','সঠিক উত্তর A, B, C অথবা D হতে হবে।',true);
  }

  let questionNumber = null;

  if (qnoRaw) {
    const n = Number(qnoRaw);
    if (!Number.isInteger(n) || n <= 0) {
      return msg('manualMsg','প্রশ্ন নম্বর অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।',true);
    }
    questionNumber = n;
  }

  const {error} = await db.from('questions').insert({
    folder_id:Number(folderId),
    set_id:Number(setId),
    subject_id:subjectId ? Number(subjectId) : null,
    category:CATS[cat],
    question_number:questionNumber,
    question_text:question,
    option_a:a,
    option_b:b,
    option_c:c,
    option_d:d,
    correct_answer:correct,
    explanation
  });

  if (error) return msg('manualMsg',error.message,true);

  msg('manualMsg','প্রশ্ন সফলভাবে যোগ হয়েছে।');

  ['question','questionNumber','optionA','optionB','optionC','optionD','explanation']
    .forEach(id => { if ($(id)) $(id).value=''; });

  if ($('correctAnswer')) $('correctAnswer').value='';
  if ($('subject')) $('subject').value='';
}

window.template = template;
window.previewImport = previewImport;
window.importRows = importRows;
window.addManual = addManual;
window.selectCategory = selectCategory;
window.loadSets = loadSets;
window.createFolder = createFolder;
window.createSet = createSet;
window.renameSelectedFolder = renameSelectedFolder;
window.deleteSelectedFolder = deleteSelectedFolder;
window.renameSelectedSet = renameSelectedSet;
window.deleteSelectedSet = deleteSelectedSet;
window.login = login;
window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
  if ($('folder')) $('folder').addEventListener('change',loadSets);
  init();
});