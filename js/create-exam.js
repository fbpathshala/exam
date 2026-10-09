
const $ = id => document.getElementById(id);

function showMsg(text, error = false) {
  $('msg').textContent = text;
  $('msg').style.color = error ? '#b91c1c' : '#166534';
}

async function init() {
  if (!window.db) {
    showMsg('Supabase সংযোগ পাওয়া যায়নি।', true);
    return;
  }

  const { data, error } = await db.auth.getSession();

  if (error || !data?.session) {
    location.href = 'dashboard.html';
  }
}

$('saveBtn').onclick = async () => {
  const name = $('examName').value.trim();
  const duration = Number($('duration').value);
  const marks = Number($('marks').value);
  const negative = Number($('negative').value);
  const passMark = Number($('passMark').value);

  if (!name) return showMsg('পরীক্ষার নাম লিখুন।', true);

  if (
    !Number.isFinite(duration) || duration <= 0 ||
    !Number.isFinite(marks) || marks < 0 ||
    !Number.isFinite(negative) || negative < 0 ||
    !Number.isFinite(passMark) || passMark < 0
  ) {
    return showMsg('সময় ও নম্বরের মান যাচাই করুন।', true);
  }

  const btn = $('saveBtn');
  btn.disabled = true;
  showMsg('পরীক্ষা তৈরি হচ্ছে…');

  try {
    const { data: exam, error } = await db
      .from('exams')
      .insert({
        exam_name: name,
        status: $('examStatus').value,
        total_questions: 0,
        marks_per_question: marks,
        negative_mark: negative,
        pass_mark: passMark
      })
      .select('id')
      .single();

    if (error) throw error;

    const { error: settingsError } = await db
      .from('exam_settings')
      .upsert({
        exam_id: exam.id,
        total_questions: 0,
        total_marks: 0,
        pass_mark: passMark,
        duration_minutes: duration,
        marks_per_question: marks,
        negative_mark: negative,
        show_answers: false,
        multiple_attempts: false,
        device_attempt_protection: true,
        random_questions: false,
        random_options: false,
        show_result: true,
        show_rank: true,
        thank_you_message: 'পরীক্ষায় অংশগ্রহণ করার জন্য ধন্যবাদ।'
      }, { onConflict: 'exam_id' });

    if (settingsError) {
      // Settings ব্যর্থ হলে শুধু সদ্য তৈরি, ফাঁকা পরীক্ষাটি পরিষ্কার করার চেষ্টা।
      const { error: cleanupError } = await db
        .from('exams')
        .delete()
        .eq('id', exam.id);

      if (cleanupError) {
        throw new Error(
          'সেটিংস সংরক্ষণ হয়নি। পরীক্ষার ID: ' + exam.id +
          '. পরিষ্কার করাও ব্যর্থ: ' + cleanupError.message
        );
      }

      throw settingsError;
    }

    location.href =
      'exam-manager.html?exam=' + encodeURIComponent(exam.id);

  } catch (error) {
    showMsg(error.message || 'পরীক্ষা তৈরি করা যায়নি।', true);
    btn.disabled = false;
  }
};

init();
