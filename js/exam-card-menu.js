/* Exam Management card actions. Load after js/admin.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const escHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bn = n => String(n ?? '').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const message = (text, isError) => {
    if (typeof window.msg === 'function') window.msg('examMsg', text, !!isError);
    else alert(text);
  };

  window.openExamMapping = async function (id, mode) {
    if ($('mapExam')) $('mapExam').value = String(id);
    window.examMapMode = mode;
    const card = $('mapExam')?.closest('.card');
    if (card) card.scrollIntoView({behavior:'smooth', block:'start'});
    const hint = $('examMapActionHint');
    if (hint) hint.textContent = mode === 'remove'
      ? 'প্রশ্ন বাদ দিতে তালিকা থেকে টিক তুলে সংরক্ষণ করুন। বর্তমানে দেখানো তালিকার বাইরের প্রশ্নের ম্যাপিং অক্ষত থাকবে।'
      : 'প্রশ্ন যোগ করতে প্রশ্নে টিক দিন, তারপর সংরক্ষণ করুন। বর্তমানে দেখানো তালিকার বাইরের প্রশ্নের ম্যাপিং অক্ষত থাকবে।';
    if (typeof window.loadPool === 'function') await window.loadPool();
  };

  window.loadExams = async function () {
    const {data, error} = await db.from('exams')
      .select('id, exam_name, status, total_questions, marks_per_question, negative_mark, pass_mark')
      .order('id', {ascending:false});
    if (error) return message(error.message, true);
    window.exams = data || [];
    if ($('sExams')) $('sExams').textContent = bn(data.length);
    if ($('sActive')) $('sActive').textContent = bn(data.filter(x => x.status === 'active').length);
    const options = '<option value="">Exam নির্বাচন করুন</option>' + data.map(x =>
      `<option value="${escHtml(x.id)}">${escHtml(x.exam_name)} (#${escHtml(x.id)})</option>`).join('');
    if ($('examSelect')) $('examSelect').innerHTML = options;
    if ($('mapExam')) $('mapExam').innerHTML = options;
    if ($('exams')) $('exams').innerHTML = data.map(x => {
      const id = Number(x.id), active = x.status === 'active';
      const url = new URL('../index.html', location.href).href + '?exam=' + encodeURIComponent(x.id);
      return `<article class="examrow exam-card-v2">
        <div class="exam-card-head"><div class="exam-card-title"><b>${escHtml(x.exam_name)}</b><span class="exam-status ${active?'is-active':'is-inactive'}">${active?'সক্রিয়':'নিষ্ক্রিয়'}</span></div>
        <span class="exam-count">${bn(x.total_questions || 0)} প্রশ্ন</span>
        <details class="exam-actions"><summary aria-label="পরীক্ষার কাজ">⋮</summary><div class="exam-actions-menu">
          <button type="button" onclick="openExamMapping(${id},'add')">➕ প্রশ্ন যোগ</button>
          <button type="button" onclick="openExamMapping(${id},'remove')">➖ প্রশ্ন বাদ</button>
          <button type="button" onclick="printExamPaper(${id},false)">📝 পরীক্ষার প্রশ্নপত্র</button>
          <button type="button" onclick="printExamPaper(${id},true)">✅ পরীক্ষার উত্তরপত্র</button>
          <button type="button" onclick="openExamSettings(${id})">⚙️ সেটিংস পরিবর্তন</button>
          <button type="button" onclick="renameExam(${id})">✏️ নাম পরিবর্তন</button>
          <button type="button" onclick="activate(${id},'${active?'inactive':'active'}')">${active?'⏸ Inactive করুন':'▶ Active করুন'}</button>
          <button type="button" class="danger" onclick="deleteExamSafely(${id})">🗑️ ডিলিট</button>
        </div></details></div>
        <div class="exam-link-text">${escHtml(url)}</div>
        <button type="button" class="exam-copy-btn" onclick="copyLink(${id})">🔗 Exam Link কপি</button>
      </article>`;
    }).join('');
    if ($('sQuestions')) {
      const q = await db.from('questions').select('id', {count:'exact', head:true});
      if (!q.error) $('sQuestions').textContent = bn(q.count || 0);
    }
  };

  window.openExamSettings = async function (id) {
    if ($('examSelect')) $('examSelect').value = String(id);
    if (typeof window.loadSettings === 'function') await window.loadSettings();
    const card = $('examSelect')?.closest('.card');
    if (card) card.scrollIntoView({behavior:'smooth', block:'start'});
  };

  window.renameExam = async function (id) {
    const {data, error} = await db.from('exams').select('exam_name').eq('id', id).single();
    if (error) return message(error.message, true);
    const name = prompt('পরীক্ষার নতুন নাম লিখুন:', data.exam_name || '');
    if (name === null) return;
    if (!name.trim()) return message('পরীক্ষার নাম খালি রাখা যাবে না।', true);
    const result = await db.from('exams').update({exam_name:name.trim()}).eq('id', id);
    if (result.error) return message(result.error.message, true);
    await window.loadExams();
    message('পরীক্ষার নাম পরিবর্তন হয়েছে।', false);
  };

  window.deleteExamSafely = async function (id) {
    const attempts = await db.from('exam_attempts').select('id', {count:'exact', head:true}).eq('exam_id', id);
    if (attempts.error) return message('শিক্ষার্থীর রেকর্ড যাচাই করা যায়নি; নিরাপত্তার জন্য ডিলিট বন্ধ রাখা হয়েছে। ' + attempts.error.message, true);
    if ((attempts.count || 0) > 0) return message(`এই পরীক্ষায় ${bn(attempts.count)}টি শিক্ষার্থী-রেকর্ড আছে। রেকর্ড সুরক্ষার জন্য পরীক্ষা ডিলিট করা যাবে না।`, true);
    const results = await db.from('exam_results').select('id', {count:'exact', head:true}).eq('exam_id', id);
    if (results.error && !/does not exist|schema cache|could not find/i.test(results.error.message || '')) return message('ফলাফলের রেকর্ড যাচাই করা যায়নি; ডিলিট বন্ধ রাখা হয়েছে। ' + results.error.message, true);
    if (!results.error && (results.count || 0) > 0) return message('এই পরীক্ষার ফলাফলের রেকর্ড আছে। রেকর্ড সুরক্ষার জন্য ডিলিট করা যাবে না।', true);
    if (!confirm('শিক্ষার্থীর অংশগ্রহণ/ফলাফলের রেকর্ড পাওয়া যায়নি। পরীক্ষাটি ডিলিট করার চেষ্টা করবেন?')) return;
    // Delete the parent first only after checks; database foreign-key constraints can still safely reject it.
    const removed = await db.from('exams').delete().eq('id', id);
    if (removed.error) return message('পরীক্ষাটি ডিলিট হয়নি। ডাটাবেসে থাকা সম্পর্কিত রেকর্ড/নিয়মের কারণে আটকে থাকতে পারে: ' + removed.error.message, true);
    await window.loadExams();
    message('পরীক্ষাটি ডিলিট হয়েছে।', false);
  };

  // Update mappings only for the question IDs currently rendered in the pool.
  // This avoids wiping mappings hidden by folder/set filters or the 200-question display limit.
  window.saveMapping = async function (examId) {
    const visible = [...document.querySelectorAll('.poolq')].map(el => String(el.value));
    if (!visible.length) return message('বর্তমান তালিকায় কোনো প্রশ্ন নেই। ফিল্টার/প্রশ্ন লোড করে আবার চেষ্টা করুন।', true);
    const checked = [...document.querySelectorAll('.poolq:checked')].map(el => String(el.value));
    const current = await db.from('exam_questions').select('question_id').eq('exam_id', examId).in('question_id', visible);
    if (current.error) return message(current.error.message, true);
    const oldSet = new Set((current.data || []).map(r => String(r.question_id)));
    const newSet = new Set(checked);
    const removeIds = [...oldSet].filter(id => !newSet.has(id));
    const addIds = [...newSet].filter(id => !oldSet.has(id));
    if (removeIds.length) {
      const del = await db.from('exam_questions').delete().eq('exam_id', examId).in('question_id', removeIds);
      if (del.error) return message(del.error.message, true);
    }
    if (addIds.length) {
      const ins = await db.from('exam_questions').insert(addIds.map((id, i) => ({exam_id:Number(examId), question_id:Number(id), question_order:Date.now()+i})));
      if (ins.error) return message(ins.error.message, true);
    }
    const count = await db.from('exam_questions').select('question_id', {count:'exact', head:true}).eq('exam_id', examId);
    if (count.error) return message(count.error.message, true);
    const total = count.count || 0;
    const upd = await db.from('exams').update({total_questions:total}).eq('id', examId);
    if (upd.error) return message(upd.error.message, true);
    const settings = await db.from('exam_settings').upsert({exam_id:Number(examId), total_questions:total}, {onConflict:'exam_id'});
    if (settings.error) return message('প্রশ্নের ম্যাপিং সংরক্ষিত হয়েছে, তবে সেটিংসের প্রশ্নসংখ্যা আপডেট হয়নি: ' + settings.error.message, true);
    await window.loadExams();
    if (typeof window.loadPool === 'function') await window.loadPool();
    message('প্রশ্নের তালিকা সংরক্ষণ হয়েছে। ফিল্টারের বাইরের পুরোনো ম্যাপিং অক্ষত আছে।', false);
  };

  window.printExamPaper = async function (id, withAnswers) {
    const exam = await db.from('exams').select('exam_name').eq('id', id).single();
    if (exam.error) return message(exam.error.message, true);
    const result = await db.from('exam_questions')
      .select('question_order, questions(id, question_text, option_a, option_b, option_c, option_d, correct_answer)')
      .eq('exam_id', id).order('question_order', {ascending:true});
    if (result.error) return message('প্রশ্নপত্র লোড করা যায়নি: ' + result.error.message, true);
    const rows = (result.data || []).filter(row => row.questions).map(row => row.questions);
    if (!rows.length) return message('এই পরীক্ষায় কোনো প্রশ্ন যোগ করা হয়নি।', true);
    const letters = ['ক','খ','গ','ঘ'];
    const answerIndex = value => {
      const s = String(value ?? '').trim().toLowerCase();
      const letterMap = {'a':0,'b':1,'c':2,'d':3,'ক':0,'খ':1,'গ':2,'ঘ':3,'option_a':0,'option_b':1,'option_c':2,'option_d':3};
      if (Object.prototype.hasOwnProperty.call(letterMap, s)) return letterMap[s];
      return -1;
    };
    const body = rows.map((q, i) => {
      const answer = answerIndex(q.correct_answer);
      const opts = [q.option_a,q.option_b,q.option_c,q.option_d].map((value, j) => {
        const marked = withAnswers && (answer === j || (answer < 0 && String(q.correct_answer ?? '').trim() === String(value ?? '').trim()));
        return `<div>${letters[j]}) ${escHtml(value)}${marked ? ' ✓' : ''}</div>`;
      }).join('');
      return `<section class="q"><b>${bn(i+1)}. ${escHtml(q.question_text)}</b><div class="opts">${opts}</div></section>`;
    }).join('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return message('নতুন ট্যাব খোলা যায়নি। Browser popup অনুমতি দিন।', true);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(exam.data.exam_name)}${withAnswers?' - উত্তরপত্র':' - প্রশ্নপত্র'}</title><style>body{font-family:Arial,"Noto Sans Bengali",sans-serif;max-width:850px;margin:24px auto;padding:0 16px;color:#172033}h1{text-align:center;font-size:22px}.sub{text-align:center;color:#475569}.q{padding:14px 0;border-bottom:1px solid #ddd;break-inside:avoid}.opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.print{position:fixed;right:12px;top:12px;padding:10px 16px}@media(max-width:600px){.opts{grid-template-columns:1fr}}@media print{.print{display:none}body{margin:0 auto}}</style></head><body><button class="print" onclick="window.print()">প্রিন্ট করুন</button><h1>${escHtml(exam.data.exam_name)}</h1><div class="sub">${withAnswers?'উত্তরপত্র':'প্রশ্নপত্র'} · মোট প্রশ্ন: ${bn(rows.length)}</div>${body}</body></html>`);
    printWindow.document.close();
  };

  // Show the safety hint in the existing mapping card without changing the original HTML.
  document.addEventListener('DOMContentLoaded', () => {
    const mapExam = $('mapExam');
    const card = mapExam?.closest('.card');
    if (card && !$('examMapActionHint')) {
      const hint = document.createElement('div');
      hint.id = 'examMapActionHint';
      hint.textContent = 'পরীক্ষার কার্ডের ⋮ মেনু থেকে প্রশ্ন যোগ/বাদ শুরু করতে পারবেন।';
      mapExam.parentElement?.insertAdjacentElement('afterend', hint);
    }
  });
})();
