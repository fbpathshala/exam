
const $ = id => document.getElementById(id);

let currentExam = null;
let poolQuestions = [];
let selectedIds = new Set();

const say = (id, text, bad = false) => {
  const el = $(id);
  el.textContent = text;
  el.style.color = bad ? '#b91c1c' : '#166534';
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

async function init() {
  if (!window.db) {
    say('pageMsg', 'Supabase সংযোগ পাওয়া যায়নি।', true);
    return;
  }

  const { data, error } = await db.auth.getSession();

  if (error || !data?.session) {
    location.href = 'dashboard.html';
    return;
  }

  await loadExams();
}

async function loadExams() {
  const { data, error } = await db
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    say('pageMsg', error.message, true);
    return;
  }

  if (!data?.length) {
    $('exams').textContent = 'এখনো কোনো পরীক্ষা তৈরি হয়নি।';
    return;
  }

  $('exams').innerHTML = data.map(e => `
    <article class="card exam-card" data-exam-id="${esc(e.id)}">
      <div>
        <div class="exam-title" data-copy="${esc(e.id)}">
          ${esc(e.exam_name || 'নামহীন পরীক্ষা')}
        </div>
        <p>প্রশ্ন: ${Number(e.total_questions) || 0}
          · স্ট্যাটাস: ${e.status === 'active' ? 'চালু' : 'বন্ধ'}
        </p>
      </div>

      <div class="actions">
        <button data-action="manage" data-id="${esc(e.id)}">
          ⚙️ ব্যবস্থাপনা
        </button>
        <button class="secondary" data-action="map" data-id="${esc(e.id)}">
          প্রশ্ন যোগ/বিয়োগ
        </button>
        <button class="secondary" data-action="status"
          data-id="${esc(e.id)}" data-status="${esc(e.status)}">
          ${e.status === 'active' ? 'পরীক্ষা বন্ধ' : 'পরীক্ষা চালু'}
        </button>
        <button class="secondary" data-action="rename"
          data-id="${esc(e.id)}" data-name="${esc(e.exam_name || '')}">
          নাম পরিবর্তন
        </button>
        <a class="btn secondary" href="exam-setting.html?exam=${encodeURIComponent(e.id)}">
          সেটিংস
        </a>
        <a class="btn secondary" href="answer-paper.html?exam=${encodeURIComponent(e.id)}">
          উত্তরপত্র
        </a>
        <a class="btn secondary" href="results.html?exam=${encodeURIComponent(e.id)}">
          ফলাফল
        </a>
        <button class="danger" data-action="delete" data-id="${esc(e.id)}">
          ডিলিট
        </button>
      </div>
    </article>
  `).join('');

  $('exams').querySelectorAll('[data-copy]').forEach(el => {
    el.onclick = () => copyExamLink(el.dataset.copy);
  });

  $('exams').querySelectorAll('[data-action]').forEach(el => {
    el.onclick = () => handleAction(el);
  });
}

async function copyExamLink(id) {
  // শিক্ষার্থীদের পরীক্ষার প্রকৃত URL ভিন্ন হলে এখানে ফাইলের নাম বদলাতে হবে।
  const link = new URL(
    'exam.html?exam=' + encodeURIComponent(id),
    location.href
  ).href;

  try {
    await navigator.clipboard.writeText(link);
    say('pageMsg', 'পরীক্ষার লিংক কপি হয়েছে: ' + link);
  } catch {
    prompt('পরীক্ষার লিংক কপি করুন:', link);
  }
}

async function handleAction(el) {
  const id = el.dataset.id;
  const action = el.dataset.action;

  if (action === 'manage') {
    location.href = 'exam-setting.html?exam=' + encodeURIComponent(id);
    return;
  }

  if (action === 'map') {
    await openMapping(id);
    return;
  }

  if (action === 'status') {
    const next = el.dataset.status === 'active' ? 'inactive' : 'active';
    const { error } = await db.from('exams')
      .update({ status: next }).eq('id', id);

    if (error) say('pageMsg', error.message, true);
    else await loadExams();
    return;
  }

  if (action === 'rename') {
    const name = prompt('নতুন পরীক্ষার নাম:', el.dataset.name || '');
    if (!name?.trim()) return;

    const { error } = await db.from('exams')
      .update({ exam_name: name.trim() }).eq('id', id);

    if (error) say('pageMsg', error.message, true);
    else await loadExams();
    return;
  }

  if (action === 'delete') {
    await deleteExamSafely(id);
  }
}

async function deleteExamSafely(id) {
  if (!confirm(
    'পরীক্ষাটি মুছতে চান? শিক্ষার্থীর রেকর্ড থাকলে বা রেকর্ড যাচাই করা না গেলে ডিলিট বন্ধ থাকবে।'
  )) return;

  // কোনো টেবিল যাচাই করতে ব্যর্থ হলেও নিরাপত্তার জন্য ডিলিট বন্ধ থাকবে।
  for (const table of ['exam_attempts', 'attempt_answers', 'exam_results']) {
    const { data, error } = await db.from(table)
      .select('id').eq('exam_id', id).limit(1);

    if (error) {
      say(
        'pageMsg',
        table + ' যাচাই করা যায়নি। নিরাপত্তার জন্য ডিলিট বন্ধ: ' +
        error.message,
        true
      );
      return;
    }

    if (data?.length) {
      say(
        'pageMsg',
        'শিক্ষার্থীর অংশগ্রহণ/উত্তর/ফলাফলের রেকর্ড আছে। পরীক্ষা ডিলিট করা হয়নি।',
        true
      );
      return;
    }
  }

  const { error: questionError } = await db.from('exam_questions')
    .delete().eq('exam_id', id);

  if (questionError) {
    say('pageMsg', questionError.message, true);
    return;
  }

  const { error: settingsError } = await db.from('exam_settings')
    .delete().eq('exam_id', id);

  if (settingsError) {
    say('pageMsg', settingsError.message, true);
    return;
  }

  const { error } = await db.from('exams').delete().eq('id', id);

  if (error) say('pageMsg', error.message, true);
  else {
    say('pageMsg', 'পরীক্ষা মুছে ফেলা হয়েছে।');
    await loadExams();
  }
}

async function openMapping(id) {
  currentExam = id;
  selectedIds = new Set();
  poolQuestions = [];

  const { data: exam, error } = await db.from('exams')
    .select('exam_name').eq('id', id).single();

  if (error) {
    say('pageMsg', error.message, true);
    return;
  }

  $('mappingExamName').textContent = exam.exam_name || '';
  $('mapping').classList.remove('hidden');

  const { data, error: linkError } = await db.from('exam_questions')
    .select('question_id').eq('exam_id', id);

  if (linkError) {
    say('mapMsg', linkError.message, true);
    return;
  }

  (data || []).forEach(row => selectedIds.add(String(row.question_id)));

  await loadFolders();
  await renderSelected();
  say('mapMsg', 'ফোল্ডার ও সেট নির্বাচন করে প্রশ্ন দেখুন।');
  $('mapping').scrollIntoView({ behavior: 'smooth' });
}

async function loadFolders() {
  const { data, error } = await db.from('question_bank_folders')
    .select('*').order('name');

  if (error) {
    say('mapMsg', error.message, true);
    return;
  }

  $('folder').innerHTML =
    '<option value="">ফোল্ডার নির্বাচন</option>' +
    (data || []).map(f => `
      <option value="${esc(f.id)}">
        ${esc(f.name || f.folder_name || f.title || f.id)}
      </option>
    `).join('');

  $('set').innerHTML = '<option value="">সেট নির্বাচন</option>';
  $('folder').onchange = loadSets;
}

async function loadSets() {
  const folderId = $('folder').value;
  $('set').innerHTML = '<option value="">সেট নির্বাচন</option>';

  if (!folderId) return;

  const { data, error } = await db.from('question_bank_sets')
    .select('*').eq('folder_id', folderId).order('name');

  if (error) {
    say('mapMsg', error.message, true);
    return;
  }

  $('set').innerHTML += (data || []).map(s => `
    <option value="${esc(s.id)}">
      ${esc(s.name || s.set_name || s.title || s.id)}
    </option>
  `).join('');
}

async function loadPool() {
  const setId = $('set').value;
  if (!setId) return say('mapMsg', 'আগে একটি সেট নির্বাচন করুন।', true);

  const { data, error } = await db.from('questions')
    .select('*').eq('set_id', setId).order('id');

  if (error) {
    say('mapMsg', error.message, true);
    return;
  }

  poolQuestions = data || [];

  $('pool').innerHTML = poolQuestions.map(q => `
    <label class="qrow">
      <input type="checkbox" data-qid="${esc(q.id)}"
        ${selectedIds.has(String(q.id)) ? 'checked' : ''}>
      ${esc(q.question_text || q.question || q.question_bn || q.text || ('প্রশ্ন ID ' + q.id))}
    </label>
  `).join('') || 'এই সেটে প্রশ্ন পাওয়া যায়নি।';

  $('pool').querySelectorAll('[data-qid]').forEach(box => {
    box.onchange = () => {
      if (box.checked) selectedIds.add(String(box.dataset.qid));
      else selectedIds.delete(String(box.dataset.qid));
      renderSelected();
    };
  });

  say('mapMsg', poolQuestions.length + 'টি প্রশ্ন পাওয়া গেছে।');
}

async function renderSelected() {
  const ids = [...selectedIds];

  if (!ids.length) {
    $('selectedList').textContent = 'কোনো প্রশ্ন নির্বাচিত নেই।';
    return;
  }

  const questionMap = new Map(
    poolQuestions.map(q => [String(q.id), q])
  );

  const missing = ids.filter(id => !questionMap.has(id));

  if (missing.length) {
    const { data, error } = await db.from('questions')
      .select('*').in('id', missing);

    if (error) {
      say('mapMsg', error.message, true);
      return;
    }

    (data || []).forEach(q => questionMap.set(String(q.id), q));
  }

  $('selectedList').innerHTML = ids.map((id, i) => {
    const q = questionMap.get(id);
    const text = q?.question_text || q?.question ||
      q?.question_bn || q?.text || ('প্রশ্ন ID ' + id);

    return `<div class="qrow">${i + 1}. ${esc(text)}</div>`;
  }).join('');
}

async function saveMapping() {
  if (!currentExam) return;

  const ids = [...selectedIds];
  say('mapMsg', 'প্রশ্নের তালিকা সংরক্ষণ হচ্ছে…');

  const { error: deleteError } = await db.from('exam_questions')
    .delete().eq('exam_id', currentExam);

  if (deleteError) {
    say('mapMsg', deleteError.message, true);
    return;
  }

  if (ids.length) {
    const rows = ids.map((question_id, index) => ({
      exam_id: currentExam,
      question_id,
      sort_order: index + 1
    }));

    const { error } = await db.from('exam_questions').insert(rows);

    if (error) {
      say('mapMsg', error.message, true);
      return;
    }
  }

  const { error: updateError } = await db.from('exams')
    .update({ total_questions: ids.length }).eq('id', currentExam);

  if (updateError) {
    say('mapMsg', updateError.message, true);
    return;
  }

  const { error: settingsError } = await db.from('exam_settings')
    .upsert({
      exam_id: currentExam,
      total_questions: ids.length
    }, { onConflict: 'exam_id' });

  if (settingsError) {
    say('mapMsg', settingsError.message, true);
    return;
  }

  say('mapMsg', 'প্রশ্নের তালিকা সংরক্ষণ হয়েছে।');
  await renderSelected();
  await loadExams();
}

$('loadPool').onclick = loadPool;

$('selectAll').onclick = () => {
  poolQuestions.forEach(q => selectedIds.add(String(q.id)));
  $('pool').querySelectorAll('[data-qid]').forEach(box => {
    box.checked = true;
  });
  renderSelected();
};

$('deselectAll').onclick = () => {
  poolQuestions.forEach(q => selectedIds.delete(String(q.id)));
  $('pool').querySelectorAll('[data-qid]').forEach(box => {
    box.checked = false;
  });
  renderSelected();
};

$('saveMap').onclick = saveMapping;
$('closeMapping').onclick = () => $('mapping').classList.add('hidden');

init();
