(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let currentExam = null;
  let currentSettings = null;

  const DEFAULT_THANK_YOU =
    "পরীক্ষায় অংশগ্রহণ করার জন্য ধন্যবাদ।";

  const DEFAULT_PAGE_URL =
    "https://www.facebook.com/facebookpathshala";

  const DEFAULT_GROUP_URL =
    "https://www.facebook.com/groups/facebookpathshala";

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

  function numberValue(id, fallback = NaN) {
    const el = $(id);
    const value = Number(el.value);

    return el.value.trim() !== "" && Number.isFinite(value)
      ? value
      : fallback;
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
      "pageLink",
      "showPageLink",
      "groupLink",
      "showGroupLink",
      "saveSettings"
    ].forEach((id) => {
      const el = $(id);
      if (el) el.disabled = !enabled;
    });
  }

  async function loadExams() {
    const db = getDB();
    const select = $("examSelect");

    const { data, error } = await db
      .from("exams")
      .select("id, exam_name")
      .order("id", { ascending: false });

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
      showMessage("loadMessage", "কোনো পরীক্ষা পাওয়া যায়নি।", false);
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
        "সেটিংস লোড হয়েছে। এখন পরিবর্তন করে সেভ করতে পারবেন।"
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
      settings.duration_minutes ?? 20;

    $("marks").value =
      settings.marks_per_question ?? 1;

    $("negative").value =
      settings.negative_mark ?? 0;

    $("passMark").value =
      settings.pass_mark ?? 0;

    $("showResult").checked =
      settings.show_result !== false;

    $("showPosition").checked =
      settings.show_rank !== false;

    $("showAnswerPaper").checked =
      settings.show_answers === true;

    $("thankYouMessage").value =
      settings.thank_you_message ?? DEFAULT_THANK_YOU;

    $("pageLink").value =
      settings.facebook_page_url ?? DEFAULT_PAGE_URL;

    $("showPageLink").checked =
      settings.show_page_link === true;

    $("groupLink").value =
      settings.facebook_group_url ?? DEFAULT_GROUP_URL;

    $("showGroupLink").checked =
      settings.show_group_link === true;
  }

  function validateUrl(id, label) {
    const value = $(id).value.trim();

    if (!value) return null;

    try {
      const url = new URL(value);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error();
      }

      return value;
    } catch {
      throw new Error(label + " সঠিক URL নয়।");
    }
  }

  function validateForm() {
    const name = $("examName").value.trim();
    const duration = numberValue("duration");
    const marks = numberValue("marks");
    const negative = numberValue("negative");
    const passMark = numberValue("passMark");

    if (!name) {
      throw new Error("পরীক্ষার নাম লিখুন।");
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error("পরীক্ষার সময় ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।");
    }

    if (!Number.isFinite(marks) || marks < 0) {
      throw new Error("প্রতি প্রশ্নের নম্বর সঠিকভাবে লিখুন।");
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
      passMark,
      pageUrl: validateUrl("pageLink", "Facebook Page"),
      groupUrl: validateUrl("groupLink", "Facebook Group")
    };
  }

  async function saveSettings(event) {
    event.preventDefault();

    const db = getDB();
    const examId = getSelectedExamId();

    if (
      !examId ||
      !currentExam ||
      String(currentExam.id) !== String(examId)
    ) {
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

      // exams টেবিলে শুধু নিশ্চিতভাবে ব্যবহৃত পরীক্ষার নাম আপডেট হবে।
      const { error: examError } = await db
        .from("exams")
        .update({
          exam_name: values.name
        })
        .eq("id", examId);

      if (examError) throw examError;

      // প্রতিটি পরীক্ষার নিজস্ব সেটিংস exam_settings-এ থাকবে।
      const settingsUpdate = {
        exam_id: Number(examId),
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

        facebook_page_url: values.pageUrl,
        show_page_link: $("showPageLink").checked,

        facebook_group_url: values.groupUrl,
        show_group_link: $("showGroupLink").checked
      };

      const { error: settingsError } = await db
        .from("exam_settings")
        .upsert(settingsUpdate, {
          onConflict: "exam_id"
        });

      if (settingsError) throw settingsError;

      currentExam = {
        ...currentExam,
        exam_name: values.name
      };

      currentSettings = {
        ...currentSettings,
        ...settingsUpdate
      };

      const selectedId = String(examId);
      await loadExams();
      $("examSelect").value = selectedId;

      showMessage(
        "settingsMessage",
        "সেটিংস সফলভাবে সেভ হয়েছে। আগের শিক্ষার্থীদের রেকর্ড মুছে ফেলা হয়নি।"
      );

      showMessage(
        "loadMessage",
        "নির্বাচিত পরীক্ষার সেটিংস আপডেট হয়েছে।"
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
        "একটি পরীক্ষা নির্বাচন করে সেটিংস লোড করুন।"
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
