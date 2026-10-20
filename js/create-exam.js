(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  let categories = [];
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
    const subjectId = String(selectedSubject() || "").trim();

    if (!subjectId) return qs;

    return qs.filter(q => {
      const questionSubjectId = String(q.subject_id ?? "").trim();
      return questionSubjectId !== "" && questionSubjectId === subjectId;
    });
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

      const content = document.createElement("span");
      content.className = "question-content";

      const stem = document.createElement("span");
      stem.className = "question-stem";
      stem.textContent = `${bn(index + 1)}। ${questionText(q)}`;
      content.append(stem);

      const optionFields = [
        ["ক", q.option_a ?? q.option_1 ?? q.option1],
        ["খ", q.option_b ?? q.option_2 ?? q.option2],
        ["গ", q.option_c ?? q.option_3 ?? q.option3],
        ["ঘ", q.option_d ?? q.option_4 ?? q.option4]
      ];
      const availableOptions = optionFields.filter(([, value]) =>
        value !== null && value !== undefined && String(value).trim() !== ""
      );

      if (availableOptions.length) {
        const options = document.createElement("div");
        options.className = "question-options";
        availableOptions.forEach(([letter, value]) => {
          const option = document.createElement("div");
          option.className = "question-option";
          option.textContent = `${letter}. ${value}`;
          options.append(option);
        });
        content.append(options);
      }

      label.append(checkbox, content);
      root.append(label);
    });

    count();
  }

  function resetSets(message = "আগে সাব-ক্যাটাগরি নির্বাচন করুন") {
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
      resetFolders("আগে ক্যাটাগরি নির্বাচন করুন");
      return;
    }

    // Job Care-এর বর্তমান Question Bank কাঠামোয় folder-কে
    // question_bank_folders.sub_category দিয়ে category name-এর সঙ্গে মেলানো হয়।
    const categoryRow = categories.find(item => String(item.id) === String(category));
    const categoryName = categoryRow?.name ?? "";
    const matching = folders.filter(folder =>
      String(folder.category_id ?? "") === String(category) ||
      String(folder.sub_category ?? "").trim() === String(categoryName).trim()
    );

    if (!matching.length) {
      resetFolders("এই ক্যাটাগরিতে সাব-ক্যাটাগরি নেই");
      say("questionMessage", "নির্বাচিত ক্যাটাগরিতে কোনো সাব-ক্যাটাগরি পাওয়া যায়নি।");
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
        throw new Error("প্রথমে ক্যাটাগরি, সাব-ক্যাটাগরি ও সেট নির্বাচন করুন।");
      }

      say("questionMessage", "প্রশ্ন লোড হচ্ছে...");

      // Supabase REST সাধারণত প্রতি অনুরোধে সর্বোচ্চ ১০০০টি রেকর্ড দেয়।
      // Range pagination দিয়ে নির্বাচিত সেটের সব প্রশ্ন আনা হবে।
      const pageSize = 1000;
      const allQuestions = [];
      for (let from = 0; ; from += pageSize) {
        const result = await db()
          .from("questions")
          .select("*")
          .eq("set_id", Number(setId))
          .order("id")
          .range(from, from + pageSize - 1);

        if (result.error) throw result.error;

        const page = result.data || [];
        allQuestions.push(...page);
        if (page.length < pageSize) break;
      }

      qs = allQuestions;
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

      const categoryResult = await db()
        .from("question_bank_categories")
        .select("id,name")
        .order("name");

      if (categoryResult.error) throw categoryResult.error;
      categories = categoryResult.data || [];

      const categorySelect = $("categorySelect");
      categorySelect.replaceChildren(new Option("ক্যাটাগরি নির্বাচন করুন", ""));
      categories.forEach(category => {
        categorySelect.add(new Option(category.name, String(category.id)));
      });

      const folderResult = await db()
        .from("question_bank_folders")
        .select("id,folder_name,category_id,sub_category")
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
      subjectSelect.replaceChildren(new Option("সব বিষয়", ""));

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
        "প্রথমে ক্যাটাগরি, সাব-ক্যাটাগরি ও সেট নির্বাচন করুন।"
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
        .insert({
          exam_name: name,
          total_questions: selected.length,
          marks_per_question: marks,
          negative_mark: negative,
          pass_mark: pass
        })
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
            question_order: index + 1,
            marks,
            negative_mark: negative
          }))
        );

      if (questionResult.error) throw questionResult.error;

      say("createMessage", "পরীক্ষা তৈরি হয়েছে। পরীক্ষা ব্যবস্থাপনায় নেওয়া হচ্ছে...");

      location.href =
        "exam-manager.html?exam=" + encodeURIComponent(examId);

    } catch (error) {
      let cleanupOk = true;
      if (examId) {
        for (const table of ["exam_questions", "exam_settings"]) {
          try {
            const cleanup = await db().from(table).delete().eq("exam_id", examId);
            if (cleanup.error) cleanupOk = false;
          } catch (_) {
            cleanupOk = false;
          }
        }
        try {
          const cleanupExam = await db().from("exams").delete().eq("id", examId);
          if (cleanupExam.error) cleanupOk = false;
        } catch (_) {
          cleanupOk = false;
        }
      }
      const detail = !examId
        ? ""
        : cleanupOk
          ? " অসম্পূর্ণ পরীক্ষার রেকর্ড স্বয়ংক্রিয়ভাবে পরিষ্কার করা হয়েছে।"
          : " অসম্পূর্ণ রেকর্ড পুরোপুরি পরিষ্কার করা যায়নি। Exam ID: " + examId + "।";
      say("createMessage", "পরীক্ষা তৈরি করা যায়নি: " + error.message + detail);
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
