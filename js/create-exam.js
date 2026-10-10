(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  let folders = [];
  let subjects = [];
  let qs = [];
  let chosen = new Set();
  let loadedSet = "";

  const say = (id, message) => {
    $(id).textContent = message;
  };

  const db = () => window.db;

  const bn = value =>
    String(value).replace(/[0-9]/g, digit => "০১২৩৪৫৬৭৮৯"[digit]);

  function questionText(q) {
    return q.question_text ?? q.question ?? q.text ?? "প্রশ্ন";
  }

  function selectedSubject() {
    return $("subjectSelect").value;
  }

  function visibleQuestions() {
    const subjectId = selectedSubject();

    if (!subjectId) return qs;

    return qs.filter(q => String(q.subject_id ?? "") === subjectId);
  }

  function count() {
    const visible = visibleQuestions();

    say(
      "questionCount",
      `সেটে মোট প্রশ্ন: ${bn(qs.length)}টি | ` +
      `এখন দেখানো হচ্ছে: ${bn(visible.length)}টি | ` +
      `নির্বাচিত মোট: ${bn(chosen.size)}টি`
    );
  }

  function render() {
    const root = $("questionList");
    root.replaceChildren();

    visibleQuestions().forEach((q, index) => {
      const label = document.createElement("label");
      label.className = "question";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = chosen.has(String(q.id));

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          chosen.add(String(q.id));
        } else {
          chosen.delete(String(q.id));
        }

        count();
      });

      const text = document.createElement("span");
      text.textContent = `${bn(index + 1)}। ${questionText(q)}`;

      label.append(checkbox, text);
      root.append(label);
    });

    count();
  }

  function resetSets(message = "আগে ফোল্ডার নির্বাচন করুন") {
    const select = $("setSelect");
    select.replaceChildren(new Option(message, ""));
    select.disabled = true;
  }

  function resetQuestions(message = "প্রশ্নের সেট নির্বাচন করুন।") {
    qs = [];
    chosen.clear();
    loadedSet = "";
    $("questionList").replaceChildren();
    say("questionCount", message);
    say("questionMessage", "");
  }

  function resetFolders(message = "আগে ক্যাটাগরি নির্বাচন করুন") {
    const select = $("folderSelect");
    select.replaceChildren(new Option(message, ""));
    select.disabled = true;
  }

  async function loadFolders() {
    const category = $("categorySelect").value;

    resetFolders();
    resetSets();
    resetQuestions();

    if (!category) {
      // সব ক্যাটাগরি নির্বাচন করলে সব ফোল্ডার দেখানো হবে।
      folders.forEach(folder => {
        $("folderSelect").add(
          new Option(folder.folder_name, folder.id)
        );
      });

      $("folderSelect").disabled = false;
      return;
    }

    const matching = folders.filter(folder =>
      String(folder.sub_category ?? "").trim() === category
    );

    if (!matching.length) {
      resetFolders("এই ক্যাটাগরিতে ফোল্ডার নেই");
      say("questionMessage", "নির্বাচিত ক্যাটাগরিতে কোনো ফোল্ডার পাওয়া যায়নি।");
      return;
    }

    matching.forEach(folder => {
      $("folderSelect").add(
        new Option(folder.folder_name, folder.id)
      );
    });

    $("folderSelect").disabled = false;
  }

  async function loadSets() {
    const folderId = $("folderSelect").value;

    resetSets();
    resetQuestions();

    if (!folderId) return;

    try {
      const result = await db()
        .from("question_bank_sets")
        .select("id,set_name")
        .eq("folder_id", Number(folderId))
        .order("set_name");

      if (result.error) throw result.error;

      const select = $("setSelect");
      select.replaceChildren(new Option("সেট নির্বাচন করুন", ""));

      (result.data || []).forEach(item => {
        select.add(new Option(item.set_name, item.id));
      });

      select.disabled = false;

      if (!result.data?.length) {
        resetSets("এই ফোল্ডারে কোনো সেট নেই");
      }
    } catch (error) {
      resetSets("সেট লোড হয়নি");
      say("questionMessage", "সেট লোড হয়নি: " + error.message);
    }
  }

  async function loadQuestionList() {
    try {
      const setId = $("setSelect").value;

      if (!setId) {
        throw new Error("প্রথমে ক্যাটাগরি, ফোল্ডার ও সেট নির্বাচন করুন।");
      }

      say("questionMessage", "প্রশ্ন লোড হচ্ছে...");

      const result = await db()
        .from("questions")
        .select("*")
        .eq("set_id", Number(setId))
        .order("id");

      if (result.error) throw result.error;

      qs = result.data || [];
      chosen.clear();
      loadedSet = String(setId);

      render();

      say(
        "questionMessage",
        qs.length
          ? "প্রশ্ন লোড হয়েছে। এখন বিষয় ফিল্টার ব্যবহার করে প্রশ্ন নির্বাচন করুন।"
          : "এই সেটে কোনো প্রশ্ন পাওয়া যায়নি।"
      );
    } catch (error) {
      say("questionMessage", "প্রশ্ন লোড হয়নি: " + error.message);
    }
  }

  async function init() {
    try {
      if (!db()) {
        throw new Error("Supabase সংযোগ পাওয়া যায়নি।");
      }

      const folderResult = await db()
        .from("question_bank_folders")
        .select("id,folder_name,sub_category")
        .order("folder_name");

      if (folderResult.error) throw folderResult.error;

      folders = folderResult.data || [];

      const subjectResult = await db()
        .from("subjects")
        .select("id,name")
        .order("name");

      if (subjectResult.error) throw subjectResult.error;

      subjects = subjectResult.data || [];

      const subjectSelect = $("subjectSelect");

      subjects.forEach(subject => {
        subjectSelect.add(
          new Option(subject.name, String(subject.id))
        );
      });

      $("categorySelect").addEventListener("change", async () => {
        await loadFolders();
      });

      $("folderSelect").addEventListener("change", async () => {
        await loadSets();
      });

      $("setSelect").addEventListener("change", () => {
        resetQuestions();
      });

      $("subjectSelect").addEventListener("change", () => {
        render();
      });

      $("loadQuestions").addEventListener("click", loadQuestionList);

      $("selectAll").addEventListener("click", () => {
        visibleQuestions().forEach(question => {
          chosen.add(String(question.id));
        });

        render();
      });

      $("clearAll").addEventListener("click", () => {
        chosen.clear();
        render();
      });

      $("createExam").addEventListener("click", createExam);

      say(
        "questionCount",
        "প্রথমে ক্যাটাগরি, ফোল্ডার ও সেট নির্বাচন করুন।"
      );

    } catch (error) {
      say("createMessage", "ডেটাবেজ লোড হয়নি: " + error.message);
    }
  }

  async function createExam() {
    const name = $("examName").value.trim();
    const duration = Number($("duration").value);
    const marks = Number($("marks").value);
    const negative = Number($("negative").value);
    const pass = Number($("passMark").value);

    if (!name) {
      say("createMessage", "পরীক্ষার নাম লিখুন।");
      return;
    }

    if (!loadedSet || !chosen.size) {
      say("createMessage", "প্রশ্ন লোড করে অন্তত একটি প্রশ্ন নির্বাচন করুন।");
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      ![marks, negative, pass].every(
        value => Number.isFinite(value) && value >= 0
      )
    ) {
      say("createMessage", "সময় ও নম্বর সঠিকভাবে লিখুন।");
      return;
    }

    const selected = qs.filter(q => chosen.has(String(q.id)));

    if (!selected.length) {
      say("createMessage", "কোনো প্রশ্ন নির্বাচন করা হয়নি।");
      return;
    }

    const button = $("createExam");
    button.disabled = true;

    let examId;

    try {
      say("createMessage", "পরীক্ষা তৈরি হচ্ছে...");

      const examResult = await db()
        .from("exams")
        .insert({ exam_name: name })
        .select("id")
        .single();

      if (examResult.error) throw examResult.error;

      examId = examResult.data.id;

      const settingsResult = await db()
        .from("exam_settings")
        .upsert({
          exam_id: examId,
          duration_minutes: duration,
          marks_per_question: marks,
          negative_mark: negative,
          pass_mark: pass,
          total_questions: selected.length,
          total_marks: selected.length * marks
        }, {
          onConflict: "exam_id"
        });

      if (settingsResult.error) throw settingsResult.error;

      const questionResult = await db()
        .from("exam_questions")
        .insert(
          selected.map((question, index) => ({
            exam_id: examId,
            question_id: question.id,
            question_order: index + 1
          }))
        );

      if (questionResult.error) throw questionResult.error;

      say("createMessage", "পরীক্ষা তৈরি হয়েছে। পরীক্ষা ব্যবস্থাপনায় নেওয়া হচ্ছে...");

      location.href =
        "exam-manager.html?exam=" + encodeURIComponent(examId);

    } catch (error) {
      say(
        "createMessage",
        examId
          ? "পরীক্ষার প্রাথমিক রেকর্ড তৈরি হয়েছে, কিন্তু পরবর্তী ধাপে সমস্যা হয়েছে: " +
            error.message +
            "। আবার তৈরি করার আগে পরীক্ষা ব্যবস্থাপনায় রেকর্ডটি যাচাই করুন।"
          : "পরীক্ষা তৈরি করা যায়নি: " + error.message
      );
    } finally {
      button.disabled = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
