(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let currentQuestions = [];
  let selectedQuestionIds = new Set();

  function showMessage(id, message, success = true) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = success ? "#15803d" : "#dc2626";
  }

  function getDB() {
    if (!window.db) {
      throw new Error("Supabase সংযোগ পাওয়া যায়নি।");
    }
    return window.db;
  }

  function normalize(value) {
    return String(value ?? "").trim();
  }

  function getQuestionId(q) {
    return q.id ?? q.question_id ?? null;
  }

  function getQuestionText(q) {
    return q.question_text ?? q.question ?? q.text ?? "প্রশ্নের লেখা পাওয়া যায়নি";
  }

  function getOptions(q) {
    return [
      q.option_a ?? q.option1 ?? q.a,
      q.option_b ?? q.option2 ?? q.b,
      q.option_c ?? q.option3 ?? q.c,
      q.option_d ?? q.option4 ?? q.d
    ].filter(Boolean);
  }

  async function loadExams() {
    const db = getDB();
    const select = $("examSelect");

    const { data, error } = await db
      .from("exams")
      .select("id, exam_name")
      .order("id", { ascending: false });

    if (error) throw error;

    select.replaceChildren(new Option("পরীক্ষা নির্বাচন করুন", ""));

    (data || []).forEach((exam) => {
      select.add(new Option(exam.exam_name || `পরীক্ষা ${exam.id}`, exam.id));
    });
  }

  async function loadFolders() {
    const db = getDB();
    const select = $("folderSelect");

    select.replaceChildren(new Option("ফোল্ডার নির্বাচন করুন", ""));

    const { data, error } = await db
      .from("question_bank_folders")
      .select("id, folder_name")
      .order("folder_name");

    if (error) throw error;

    (data || []).forEach((folder) => {
      select.add(new Option(folder.folder_name, folder.id));
    });

    $("setSelect").replaceChildren(new Option("সেট নির্বাচন করুন", ""));
  }

  async function loadSets() {
    const db = getDB();
    const folderId = $("folderSelect").value;
    const select = $("setSelect");

    select.replaceChildren(new Option("সেট নির্বাচন করুন", ""));
    clearQuestionList("প্রশ্নের সেট নির্বাচন করুন।");

    if (!folderId) return;

    const { data, error } = await db
      .from("question_bank_sets")
      .select("id, set_name")
      .eq("folder_id", Number(folderId))
      .order("set_name");

    if (error) throw error;

    (data || []).forEach((set) => {
      select.add(new Option(set.set_name, set.id));
    });
  }

  async function createExam() {
    const db = getDB();
    const examName = normalize($("examName").value);
    const duration = Number($("duration").value);
    const marks = Number($("marks").value);
    const negative = Number($("negative").value);
    const passMark = Number($("passMark").value);

    if (!examName) {
      showMessage("createMessage", "পরীক্ষার নাম লিখুন।", false);
      return;
    }

    if (duration <= 0 || marks < 0 || negative < 0 || passMark < 0) {
      showMessage("createMessage", "সময় ও নম্বরের ঘরগুলো সঠিকভাবে পূরণ করুন।", false);
      return;
    }

    const button = $("createExam");
    button.disabled = true;

    try {
      // exams টেবিলে শুধু নিশ্চিতভাবে ব্যবহৃত কলাম পাঠানো হচ্ছে।
      const { data: exam, error: examError } = await db
        .from("exams")
        .insert({ exam_name: examName })
        .select("id, exam_name")
        .single();

      if (examError) throw examError;

      // সময় ও নম্বর exam_settings টেবিলে রাখা হবে।
      const { error: settingsError } = await db
        .from("exam_settings")
        .upsert({
          exam_id: exam.id,
          duration_minutes: duration,
          marks_per_question: marks,
          negative_mark: negative,
          pass_mark: passMark
        }, { onConflict: "exam_id" });

      if (settingsError) {
        // সেটিংস সেভ না হলেও তৈরি হওয়া পরীক্ষাটি মুছে ফেলা হবে না।
        throw new Error(
          "পরীক্ষা তৈরি হয়েছে, কিন্তু সেটিংস সেভ হয়নি: " +
          settingsError.message
        );
      }

      await loadExams();
      $("examSelect").value = String(exam.id);
      $("examName").value = "";

      showMessage("createMessage", "পরীক্ষা সফলভাবে তৈরি হয়েছে।");
    } catch (error) {
      console.error(error);
      showMessage("createMessage", error.message || "পরীক্ষা তৈরি হয়নি।", false);
    } finally {
      button.disabled = false;
    }
  }

  function clearQuestionList(message) {
    currentQuestions = [];
    selectedQuestionIds.clear();

    if ($("questionList")) $("questionList").replaceChildren();
    showMessage("questionCount", message);
  }

  async function loadQuestions() {
    const db = getDB();
    const examId = $("examSelect").value;
    const setId = $("setSelect").value;

    if (!examId) {
      showMessage("questionMessage", "আগে পরীক্ষা নির্বাচন করুন।", false);
      return;
    }

    if (!setId) {
      showMessage("questionMessage", "প্রশ্নের সেট নির্বাচন করুন।", false);
      return;
    }

    const button = $("loadQuestions");
    button.disabled = true;

    try {
      const { data: questions, error } = await db
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, set_id")
        .eq("set_id", Number(setId))
        .order("id");

      if (error) throw error;

      const { data: saved, error: savedError } = await db
        .from("exam_questions")
        .select("question_id")
        .eq("exam_id", Number(examId));

      if (savedError) throw savedError;

      currentQuestions = questions || [];
      selectedQuestionIds = new Set(
        (saved || []).map((row) => String(row.question_id))
      );

      renderQuestions();

      showMessage(
        "questionMessage",
        `সেট থেকে ${currentQuestions.length}টি প্রশ্ন পাওয়া গেছে। আগে যোগ করা প্রশ্নও চিহ্নিত আছে।`
      );
    } catch (error) {
      console.error(error);
      showMessage("questionMessage", "প্রশ্ন লোড হয়নি: " + error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  function renderQuestions() {
    const container = $("questionList");
    container.replaceChildren();

    currentQuestions.forEach((q, index) => {
      const id = getQuestionId(q);
      if (id == null) return;

      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;gap:10px;padding:12px;border-bottom:1px solid #ddd;align-items:flex-start";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.checked = selectedQuestionIds.has(String(id));

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedQuestionIds.add(String(id));
        else selectedQuestionIds.delete(String(id));
        updateQuestionCount();
      });

      const text = document.createElement("div");
      const title = document.createElement("div");
      title.textContent = `${index + 1}. ${getQuestionText(q)}`;
      text.appendChild(title);

      const options = getOptions(q);
      if (options.length) {
        const details = document.createElement("small");
        details.textContent = options.join(" | ");
        details.style.display = "block";
        details.style.marginTop = "6px";
        text.appendChild(details);
      }

      label.append(checkbox, text);
      container.appendChild(label);
    });

    updateQuestionCount();
  }

  function updateQuestionCount() {
    showMessage(
      "questionCount",
      `মোট প্রশ্ন: ${currentQuestions.length}টি | নির্বাচিত: ${selectedQuestionIds.size}টি`
    );
  }

  function selectAllQuestions() {
    currentQuestions.forEach((q) => {
      const id = getQuestionId(q);
      if (id != null) selectedQuestionIds.add(String(id));
    });
    renderQuestions();
  }

  function clearAllQuestions() {
    selectedQuestionIds.clear();
    renderQuestions();
  }

  async function saveQuestions() {
    const db = getDB();
    const examId = Number($("examSelect").value);

    if (!examId) {
      showMessage("questionMessage", "পরীক্ষা নির্বাচন করুন।", false);
      return;
    }

    const button = $("saveQuestions");
    button.disabled = true;

    try {
      const selectedIds = [...selectedQuestionIds].map(Number);
      const existingResult = await db
        .from("exam_questions")
        .select("question_id")
        .eq("exam_id", examId);

      if (existingResult.error) throw existingResult.error;

      const existingIds = (existingResult.data || []).map(
        (row) => Number(row.question_id)
      );

      const toAdd = selectedIds.filter((id) => !existingIds.includes(id));
      const toRemove = existingIds.filter((id) => !selectedIds.includes(id));

      if (toAdd.length) {
        const { error } = await db.from("exam_questions").insert(
          toAdd.map((id, index) => ({
            exam_id: examId,
            question_id: id,
            question_order: index + 1
          }))
        );
        if (error) throw error;
      }

      if (toRemove.length) {
        const { error } = await db
          .from("exam_questions")
          .delete()
          .eq("exam_id", examId)
          .in("question_id", toRemove);

        if (error) throw error;
      }

      showMessage(
        "questionMessage",
        `সংরক্ষণ সম্পন্ন। নতুন যোগ: ${toAdd.length}টি, বাদ: ${toRemove.length}টি।`
      );
    } catch (error) {
      console.error(error);
      showMessage("questionMessage", "প্রশ্ন সংরক্ষণ হয়নি: " + error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  async function initialize() {
    $("createExam").addEventListener("click", createExam);
    $("loadQuestions").addEventListener("click", loadQuestions);
    $("selectAll").addEventListener("click", selectAllQuestions);
    $("clearAll").addEventListener("click", clearAllQuestions);
    $("saveQuestions").addEventListener("click", saveQuestions);

    $("folderSelect").addEventListener("change", async () => {
      try {
        await loadSets();
      } catch (error) {
        showMessage("questionMessage", "সেট লোড হয়নি: " + error.message, false);
      }
    });

    $("setSelect").addEventListener("change", () => {
      clearQuestionList("প্রশ্ন দেখতে ‘প্রশ্ন দেখুন’ বাটনে চাপ দিন।");
    });

    try {
      await loadExams();
      await loadFolders();
      showMessage("createMessage", "পরীক্ষা তৈরির জন্য প্রস্তুত।");
    } catch (error) {
      console.error(error);
      showMessage("createMessage", "ডেটাবেজ লোড হয়নি: " + error.message, false);
      showMessage("questionMessage", "ডেটাবেজ লোড হয়নি: " + error.message, false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
