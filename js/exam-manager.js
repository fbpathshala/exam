(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let currentExam = null;
  let currentSettings = null;

  const DEFAULT_THANK_YOU =
    "পরীক্ষায় অংশগ্রহণ করার জন্য ধন্যবাদ।";

  function showMessage(id, message, success = true) {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.className = "message " + (success ? "success" : "error");
  }

  function getDB() {
    if (!window.db) {
      throw new Error(
        "Supabase সংযোগ পাওয়া যায়নি। js/supabase.js পরীক্ষা করুন।"
      );
    }

    return window.db;
  }

  function getExamName(exam) {
    return exam.exam_name || exam.title || exam.name || "";
  }

  function numberValue(id, fallback = 0) {
    const value = Number($(id).value);
    return Number.isFinite(value) ? value : fallback;
  }

  function getSelectedExamId() {
    return $("examSelect").value;
  }

  function setFormEnabled(enabled) {
    [
      "examName",
      "duration",
      "marks",
      "negative",
      "passMark",
      "showResult",
      "showPosition",
      "showAnswerPaper",
      "thankYouMessage",
      "groupLink",
      "showGroupLink",
      "saveSettings"
    ].forEach((id) => {
      if ($(id)) $(id).disabled = !enabled;
    });
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

      option.value = String(exam.id);
      option.textContent =
        getExamName(exam) || `পরীক্ষা ${exam.id}`;

      select.appendChild(option);
    });

    if (!data || data.length === 0) {
      showMessage(
        "loadMessage",
        "কোনো পরীক্ষা পাওয়া যায়নি।",
        false
      );
    }

    return data || [];
  }

  async function loadExamSettings() {
    const db = getDB();
    const examId = getSelectedExamId();

    if (!examId) {
      showMessage(
        "loadMessage",
        "প্রথমে একটি পরীক্ষা নির্বাচন করুন।",
        false
      );
      return;
    }

    const button = $("loadExamSettings");
    button.disabled = true;

    try {
      const { data: exam, error: examError } = await db
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (examError) throw examError;

      const { data: settings, error: settingsError } = await db
        .from("exam_settings")
        .select("*")
        .eq("exam_id", examId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      currentExam = exam;
      currentSettings = settings || {};

      fillForm(exam, currentSettings);

      setFormEnabled(true);

      showMessage(
        "loadMessage",
        "পরীক্ষার সেটিংস লোড হয়েছে। এখন পরিবর্তন করতে পারবেন।"
      );
    } catch (error) {
      console.error("Load exam settings error:", error);

      showMessage(
        "loadMessage",
        "সেটিংস লোড হয়নি: " +
          (error.message || "অজানা সমস্যা"),
        false
      );
    } finally {
      button.disabled = false;
    }
  }

  function fillForm(exam, settings) {
    $("examName").value = getExamName(exam);

    $("duration").value =
      settings.duration_minutes ??
      exam.duration ??
      20;

    $("marks").value =
      settings.marks_per_question ??
      exam.marks_per_question ??
      1;

    $("negative").value =
      settings.negative_mark ??
      exam.negative_mark ??
      0;

    $("passMark").value =
      settings.pass_mark ??
      exam.pass_mark ??
      0;

    $("showResult").checked =
      settings.show_result !== false;

    $("showPosition").checked =
      settings.show_rank !== false;

    $("showAnswerPaper").checked =
      settings.show_answers === true;

    $("thankYouMessage").value =
      settings.thank_you_message ??
      DEFAULT_THANK_YOU;

    $("groupLink").value =
      settings.facebook_group_url ?? "";

    $("showGroupLink").checked =
      settings.show_group_link === true;
  }

  function validateForm() {
    const name = $("examName").value.trim();
    const duration = numberValue("duration", NaN);
    const marks = numberValue("marks", NaN);
    const negative = numberValue("negative", NaN);
    const passMark = numberValue("passMark", NaN);

    if (!name) {
      throw new Error("পরীক্ষার নাম লিখুন।");
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("পরীক্ষার সময় সঠিকভাবে লিখুন।");
    }

    if (!Number.isFinite(marks) || marks < 0) {
      throw new Error("প্রতি প্রশ্নের নম্বর সঠিক নয়।");
    }

    if (!Number.isFinite(negative) || negative < 0) {
      throw new Error("নেগেটিভ মার্ক সঠিকভাবে লিখুন।");
    }

    if (!Number.isFinite(passMark) || passMark < 0) {
      throw new Error("পাস নম্বর সঠিকভাবে লিখুন।");
    }

    return {
      name,
      duration,
      marks,
      negative,
      passMark
    };
  }

  async function saveSettings(event) {
    event.preventDefault();

    const db = getDB();
    const examId = getSelectedExamId();

    if (!examId || !currentExam || String(currentExam.id) !== String(examId)) {
      showMessage(
        "settingsMessage",
        "প্রথমে পরীক্ষা নির্বাচন করে সেটিংস লোড করুন।",
        false
      );
      return;
    }

    const button = $("saveSettings");
    button.disabled = true;

    try {
      const values = validateForm();

      const examUpdate = {
        exam_name: values.name,
        duration: values.duration,
        marks_per_question: values.marks,
        negative_mark: values.negative,
        pass_mark: values.passMark
      };

      const { error: examError } = await db
        .from("exams")
        .update(examUpdate)
        .eq("id", examId);

      if (examError) throw examError;

      const settingsUpdate = {
        exam_id: examId,
        duration_minutes: values.duration,
        marks_per_question: values.marks,
        negative_mark: values.negative,
        pass_mark: values.passMark,

        show_result: $("showResult").checked,
        show_rank: $("showPosition").checked,
        show_answers: $("showAnswerPaper").checked,

        thank_you_message:
          $("thankYouMessage").value.trim() ||
          DEFAULT_THANK_YOU,

        facebook_group_url:
          $("groupLink").value.trim() || null,

        show_group_link: $("showGroupLink").checked
      };

      const { error: settingsError } = await db
        .from("exam_settings")
        .upsert(settingsUpdate, {
          onConflict: "exam_id"
        });

      if (settingsError) {
        throw settingsError;
      }

      currentExam = {
        ...currentExam,
        ...examUpdate
      };

      currentSettings = {
        ...currentSettings,
        ...settingsUpdate
      };

      await loadExams();

      $("examSelect").value = String(examId);

      showMessage(
        "settingsMessage",
        "সেটিংস সফলভাবে সেভ হয়েছে। আগের শিক্ষার্থীদের রেকর্ড পরিবর্তন করা হয়নি।"
      );

      showMessage(
        "loadMessage",
        "পরীক্ষার সেটিংস আপডেট হয়েছে।"
      );
    } catch (error) {
      console.error("Save settings error:", error);

      showMessage(
        "settingsMessage",
        "সেটিংস সেভ হয়নি: " +
          (error.message || "অজানা সমস্যা"),
        false
      );
    } finally {
      button.disabled = false;
    }
  }

  async function initialize() {
    setFormEnabled(false);

    $("loadExamSettings").addEventListener(
      "click",
      loadExamSettings
    );

    $("examSettingsForm").addEventListener(
      "submit",
      saveSettings
    );

    $("examSelect").addEventListener("change", () => {
      currentExam = null;
      currentSettings = null;

      $("examSettingsForm").reset();
      setFormEnabled(false);

      showMessage(
        "loadMessage",
        "নির্বাচিত পরীক্ষার সেটিংস লোড করুন।"
      );

      $("settingsMessage").textContent = "";
      $("settingsMessage").className = "message";
    });

    try {
      await loadExams();

      showMessage(
        "loadMessage",
        "পরীক্ষা নির্বাচন করে সেটিংস লোড করুন।"
      );
    } catch (error) {
      console.error("Initialization error:", error);

      showMessage(
        "loadMessage",
        "পরীক্ষার তালিকা লোড হয়নি: " +
          (error.message || "অজানা সমস্যা"),
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
