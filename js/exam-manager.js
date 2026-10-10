/* Compatible with the current exam-manager.html. Keeps exam/student records intact when status changes. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const BN = '০১২৩৪৫৬৭৮৯';
  const bn = value => String(value ?? '').replace(/\d/g, d => BN[d]);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const message = (text, error = false) => {
    const el = $('message');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#b42318' : '#166534';
  };
  let exams = [];
  const busy = new Set();

  function examLink(id) {
    return new URL(`index.html?exam=${encodeURIComponent(id)}`, location.href).href;
  }
  async function copyLink(id) {
    const link = examLink(id);
    try {
      await navigator.clipboard.writeText(link);
      message('✅ পরীক্ষার লিংক কপি হয়েছে।');
    } catch (_) {
      window.prompt('পরীক্ষার লিংক কপি করুন:', link);
    }
  }
  function render() {
    const root = $('examList');
    if (!root) return message('HTML-এ examList পাওয়া যায়নি।', true);
    if (!exams.length) {
      root.innerHTML = '<div class="exam">এখনো কোনো পরীক্ষা তৈরি করা হয়নি।</div>';
      return;
    }
    root.innerHTML = exams.map(e => {
      const id = String(e.id);
      const active = e.status === 'active';
      const link = examLink(e.id);
      return `<section class="exam" data-exam-id="${esc(id)}">
        <div class="head">
          <button class="name" type="button" data-action="copy" data-id="${esc(id)}" style="flex:1;text-align:left;background:#fff;color:#1756a9">${esc(e.exam_name || `পরীক্ষা ${id}`)}<div style="font-size:13px;color:#56677b;font-weight:normal;margin-top:4px">${active ? '🟢 পরীক্ষা সক্রিয়' : '⚪ পরীক্ষা নিষ্ক্রিয়'} · ${bn(e.total_questions || 0)}টি প্রশ্ন</div></button>
          <button class="menu secondary" type="button" data-action="menu" data-id="${esc(id)}" aria-expanded="false">☰</button>
        </div>
        <div class="exam-menu" id="menu-${esc(id)}" hidden>
          <div class="linkbox" style="overflow-wrap:anywhere;margin-top:10px;font-size:13px">${esc(link)}</div>
          <div class="buttons">
            <button type="button" data-action="status" data-id="${esc(id)}" ${busy.has(id) ? 'disabled' : ''}>${active ? 'পরীক্ষা নিষ্ক্রিয় করুন' : 'পরীক্ষা সক্রিয় করুন'}</button>
            <button type="button" class="secondary" data-action="rename" data-id="${esc(id)}">✏️ পরীক্ষার নাম পরিবর্তন</button>
            <button type="button" class="secondary" data-action="copy" data-id="${esc(id)}">🔗 পরীক্ষার লিংক কপি</button>
            <button type="button" class="secondary" data-action="settings" data-id="${esc(id)}">⚙️ পরীক্ষার সেটিংস</button>
            <button type="button" class="secondary" data-action="results" data-id="${esc(id)}">📊 পরীক্ষার ফলাফল</button>
            <button type="button" class="secondary" data-action="question" data-id="${esc(id)}">📝 পরীক্ষার প্রশ্নপত্র</button>
            <button type="button" class="secondary" data-action="answer" data-id="${esc(id)}">✅ পরীক্ষার উত্তরপত্র</button>
          </div>
        </div>
      </section>`;
    }).join('');
  }
  async function loadExams() {
    message('পরীক্ষার তালিকা লোড হচ্ছে…');
    try {
      if (!window.db) throw new Error('Supabase সংযোগ পাওয়া যায়নি। js/supabase.js ফাইলটি আগে লোড হয়েছে কি না দেখুন।');
      const { data, error } = await window.db.from('exams')
        .select('id,exam_name,status,total_questions')
        .order('id', { ascending: false });
      if (error) throw error;
      exams = data || [];
      render();
      message(`✅ ${bn(exams.length)}টি পরীক্ষা লোড হয়েছে।`);
    } catch (err) {
      console.error('Exam list load failed:', err);
      message('পরীক্ষার তালিকা লোড হয়নি: ' + (err?.message || String(err)), true);
    }
  }
  async function toggleStatus(id) {
    const key = String(id);
    if (busy.has(key)) return;
    const exam = exams.find(e => String(e.id) === key);
    if (!exam) return message('পরীক্ষাটি পাওয়া যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।', true);
    const next = exam.status === 'active' ? 'ended' : 'active';
    const activate = next === 'active';
    const confirmText = activate
      ? `“${exam.exam_name}” পরীক্ষা সক্রিয় করবেন?\n\nসক্রিয় হলে শিক্ষার্থীরা পরীক্ষাটি দিতে পারবে।`
      : `“${exam.exam_name}” পরীক্ষা নিষ্ক্রিয় করবেন?\n\nআগের ফলাফল ও শিক্ষার্থীদের রেকর্ড মুছে যাবে না।`;
    if (!window.confirm(confirmText)) return;
    busy.add(key); render(); message(activate ? 'পরীক্ষা সক্রিয় করা হচ্ছে…' : 'পরীক্ষা নিষ্ক্রিয় করা হচ্ছে…');
    try {
      const { error } = await window.db.from('exams').update({ status: next }).eq('id', exam.id);
      if (error) throw error;
      message(activate ? '✅ পরীক্ষা সক্রিয় হয়েছে।' : '✅ পরীক্ষা নিষ্ক্রিয় হয়েছে।');
    } catch (err) {
      console.error('Exam status update failed:', err);
      message('স্ট্যাটাস পরিবর্তন হয়নি: ' + (err?.message || String(err)), true);
    } finally {
      busy.delete(key);
      await loadExams();
    }
  }
  async function renameExam(id) {
    const exam = exams.find(e => String(e.id) === String(id));
    if (!exam) return;
    const name = window.prompt('পরীক্ষার নতুন নাম লিখুন:', exam.exam_name || '');
    if (name === null) return;
    if (!name.trim()) return message('পরীক্ষার নাম খালি রাখা যাবে না।', true);
    try {
      const { error } = await window.db.from('exams').update({ exam_name: name.trim() }).eq('id', exam.id);
      if (error) throw error;
      message('✅ পরীক্ষার নাম পরিবর্তন হয়েছে।');
      await loadExams();
    } catch (err) {
      message('নাম পরিবর্তন হয়নি: ' + (err?.message || String(err)), true);
    }
  }
  $('examList')?.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'menu') {
      const menu = $(`menu-${id}`);
      if (!menu) return;
      const opening = menu.hidden;
      document.querySelectorAll('.exam-menu').forEach(el => { el.hidden = true; });
      document.querySelectorAll('button[data-action="menu"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
      menu.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
    } else if (action === 'copy') await copyLink(id);
    else if (action === 'status') await toggleStatus(id);
    else if (action === 'rename') await renameExam(id);
    else if (action === 'settings') location.href = `exam-setting.html?exam=${encodeURIComponent(id)}`;
    else if (action === 'results') location.href = `results.html?exam=${encodeURIComponent(id)}`;
    else if (action === 'question') location.href = `question-paper.html?exam=${encodeURIComponent(id)}`;
    else if (action === 'answer') location.href = `answer-paper.html?exam=${encodeURIComponent(id)}`;
  });
  loadExams();
})();
