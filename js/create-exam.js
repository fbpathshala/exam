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
      throw new Error(
        "Supabase সংযোগ পাওয়া যায়নি। js/supabase.js পরীক্ষা করুন।"
      );
    }
    return window.db;
  }

  function normalize(value) {
    return String(value ?? "").trim();
  }

  function getQuestionId(question) {
    return question.id ??
      question.question_id ??
      question.uuid ??
      null;
  }

  function getQuestionText(question) {
    return question.question ??
      question.question_text ??
      question.question_bn ??
      question.text ??
      question.title ??
      "প্রশ্নের লেখা পাওয়া যায়নি";
  }

  function getOptionText(question, index) {
    const options = [
      question.option_a ?? question.option1 ?? question.a,
      question.option_b ?? question.option2 ?? question.b,
      question.option_c ?? question.option3 ?? question.c,
      question.option_d ?? question.option4 ?? question.d
    ];

    if (Array.isArray(question.options)) {
      return question.options[index] ?? "";
    }

    return options[index] ?? "";
  }

  function getQuestionOptions(question) {
    return ["ক", "খ", "গ", "ঘ"].map((label, index) => {
      const value = getOptionText(question, index);
      return value ? `${label}. ${value}` : "";
    }).filter(Boolean);
  }

  function clearQuestionList(message) {
    currentQuestions = [];
    selectedQuestionIds.clear();

    $("questionList").replaceChildren();

    showMessage(
      "questionCount",
      message
    );
  }

  async function loadExams() {
    const db = getDB();
    const select = $("examSelect");

    const { data, error } = await db
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "পরীক্ষা নির্বাচন করুন";
    select.appendChild(placeholder);

    (data || []).forEach((exam) => {
      const option = document.createElement("option");

      option.value = exam.id;
      option.textContent =
        exam.exam_name ??
        exam.title ??
        exam.name ??
        `পরীক্ষা ${exam.id}`;

      select.appendChild(option);
    });
  }

  async function loadFolders() {
    const db = getDB();
    const select = $("folderSelect");

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "ফোল্ডার নির্বাচন করুন";
    select.appendChild(placeholder);

    const { data, error } = await db
      .from("question_folders")
      .select("*")
      .order("name");

    if (error) throw error;

    (data || []).forEach((folder) => {
      const option = document.createElement("option");

      option.value = folder.id;
      option.textContent =
        folder.name ??
        folder.folder_name ??
        `ফোল্ডার ${folder.id}`;

      select.appendChild(option);
    });
  }

  async function loadSets() {
    const db = getDB();
    const folderId = $("folderSelect").value;
    const select = $("setSelect");

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "সেট নির্বাচন করুন";
    select.appendChild(placeholder);

    clearQuestionList("প্রশ্নের সেট নির্বাচন করুন।");

    if (!folderId) return;

    const { data, error } = await db
      .from("question_sets")
      .select("*")
      .eq("folder_id", folderId)
      .order("name");

    if (error) throw error;

    (data || []).forEach((set) => {
      const option = document.createElement("option");

      option.value = set.id;
      option.textContent =
        set.name ??
        set.set_name ??
        `সেট ${set.id}`;

      select.appendChild(option);
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

    if (!Number.isFinite(duration) || duration <= 0) {
      showMessage("createMessage", "পরীক্ষার সময় সঠিকভাবে লিখুন।", false);
      return;
    }

    if (!Number.isFinite(marks) || marks < 0) {
      showMessage("createMessage", "প্রতি প্রশ্নের নম্বর সঠিক নয়।", false);
      return;
    }

    if (!Number.isFinite(negative) || negative < 0) {
      showMessage("createMessage", "Negative Mark সঠিক নয়।", false);
      return;
    }

    if (!Number.isFinite(passMark) || passMark < 0) {
      showMessage("createMessage", "পাস নম্বর সঠিক নয়।", false);
      return;
    }

    const button = $("createExam");
    button.disabled = true;

    try {
      const { data, error } = await db
        .from("exams")
        .insert({
          exam_name: examName,
          duration: duration,
          marks_per_question: marks,
          negative_mark: negative,
          pass_mark: passMark
        })
        .select()
        .single();

      if (error) throw error;

      await loadExams();

      $("examSelect").value = data.id;

      $("examName").value = "";

      showMessage(
        "createMessage",
        "পরীক্ষা সফলভাবে তৈরি হয়েছে।"
      );
    } catch (error) {
      console.error("Create exam error:", error);

      showMessage(
        "createMessage",
        "পরীক্ষা তৈরি হয়নি: " + (error.message || "অজানা সমস্যা"),
        false
      );
    } finally {
      button.disabled = false;
    }
  }

  async function loadQuestions() {
    const db = getDB();
    const setId = $("setSelect").value;

    if (!$("examSelect").value) {
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
      const { data, error } = await db
        .from("questions")
        .select("*")
        .eq("set_id", setId);

      if (error) throw error;

      currentQuestions = data || [];
      selectedQuestionIds.clear();

      renderQuestions();

      showMessage(
        "questionMessage",
        `সেট থেকে ${currentQuestions.length}টি প্রশ্ন পাওয়া গেছে।`
      );
    } catch (error) {
      console.error("Load questions error:", error);

      showMessage(
        "questionMessage",
        "প্রশ্ন লোড হয়নি: " + (error.message || "অজানা সমস্যা"),
        false
      );
    } finally {
      button.disabled = false;
    }
  }

  function renderQuestions() {
    const container = $("questionList");
    container.replaceChildren();

    currentQuestions.forEach((question) => {
      const id = getQuestionId(question);

      if (id === null) return;

      const label = document.createElement("label");
      label.className = "question";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.checked = selectedQuestionIds.has(String(id));

      checkbox.addEventListener("change", () => {
        const key = String(id);

        if (checkbox.checked) {
          selectedQuestionIds.add(key);
        } else {
          selectedQuestionIds.delete(key);
        }

        updateQuestionCount();
      });

      const content = document.createElement("div");

      const title = document.createElement("div");
      title.textContent = getQuestionText(question);
      content.appendChild(title);

      const options = getQuestionOptions(question);

      if (options.length) {
        const optionText = document.createElement("small");
        optionText.style.display = "block";
        optionText.style.marginTop = "6px";
        optionText.textContent = options.join(" | ");

        content.appendChild(optionText);
      }

      label.appendChild(checkbox);
      label.appendChild(content);

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
    currentQuestions.forEach((question) => {
      const id = getQuestionId(question);

      if (id !== null) {
        selectedQuestionIds.add(String(id));
      }
    });

    renderQuestions();
  }

  function clearAllQuestions() {
    selectedQuestionIds.clear();
    renderQuestions();
  }

  async function saveQuestions() {
    const db = getDB();
    const examId = $("examSelect").value;

    if (!examId) {
      showMessage("questionMessage", "পরীক্ষা নির্বাচন করুন।", false);
      return;
    }

    if (selectedQuestionIds.size === 0) {
      showMessage("questionMessage", "অন্তত একটি প্রশ্ন নির্বাচন করুন।", false);
      return;
    }

    const button = $("saveQuestions");
    button.disabled = true;

    try {
      const rows = Array.from(selectedQuestionIds).map((questionId) => ({
        exam_id: examId,
        question_id: questionId
      }));

      const { error } = await db
        .from("exam_questions")
        .upsert(rows, {
          onConflict: "exam_id,question_id",
          ignoreDuplicates: true
        });

      if (error) throw error;

      showMessage(
        "questionMessage",
        `${rows.length}টি প্রশ্ন পরীক্ষার সঙ্গে সংরক্ষণ করা হয়েছে।`
      );
    } catch (error) {
      console.error("Save exam questions error:", error);

      showMessage(
        "questionMessage",
        "প্রশ্ন সংরক্ষণ হয়নি: " + (error.message || "অজানা সমস্যা"),
        false
      );
    } finally {
      button.disabled = false;
    }
  }

  async function initialize() {
    try {
      $("createExam").addEventListener("click", createExam);
      $("loadQuestions").addEventListener("click", loadQuestions);
      $("selectAll").addEventListener("click", selectAllQuestions);
      $("clearAll").addEventListener("click", clearAllQuestions);
      $("saveQuestions").addEventListener("click", saveQuestions);

      $("folderSelect").addEventListener("change", async () => {
        try {
          await loadSets();
        } catch (error) {
          showMessage(
            "questionMessage",
            error.message || "প্রশ্নের সেট লোড হয়নি।",
            false
          );
        }
      });

      $("setSelect").addEventListener("change", () => {
        clearQuestionList("প্রশ্ন দেখতে ‘প্রশ্ন দেখুন’ বাটনে চাপ দিন।");
      });

      await loadExams();
      await loadFolders();

      showMessage("createMessage", "পরীক্ষা তৈরির জন্য প্রস্তুত।");
    } catch (error) {
      console.error("Initialization error:", error);

      showMessage(
        "createMessage",
        "ডেটাবেজ লোড হয়নি: " + (error.message || "অজানা সমস্যা"),
        false
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
