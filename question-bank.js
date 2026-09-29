console.log("NEW QUESTION BANK JS LOADED - 2026-09-29");

let exams = [];
let questions = [];
let importRows = [];

/* =========================
   BASIC HELPERS
========================= */

function qb$(id) {
  return document.getElementById(id);
}

function qbNorm(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function qbCategory(value) {
  if (typeof canonicalCat === "function") {
    return canonicalCat(String(value || "").trim());
  }

  return String(value || "").trim();
}

function qbSafe(value) {
  if (typeof safe === "function") {
    return safe(value);
  }

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function qbBn(value) {
  if (typeof bn === "function") {
    return bn(value);
  }

  const map = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯"
  };

  return String(value).replace(/[0-9]/g, n => map[n]);
}

function qbAnswerBn(value) {
  if (typeof answerBn === "function") {
    return answerBn(value);
  }

  const map = {
    A: "ক",
    B: "খ",
    C: "গ",
    D: "ঘ"
  };

  return map[String(value || "").toUpperCase()] || value || "";
}


/* =========================
   INIT
========================= */

async function init() {
  const user = await requireAdmin();

  if (!user) return;

  if (qb$("adminEmail")) {
    qb$("adminEmail").textContent = user.email || "";
  }

  let result = await db
    .from("exams")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);

    if (qb$("bankInfo")) {
      qb$("bankInfo").textContent =
        "Exam লোড করা যায়নি: " + result.error.message;
    }

    return;
  }

  exams = result.data || [];

  result = await db
    .from("questions")
    .select("*")
    .order("question_order", { ascending: true });

  if (result.error) {
    console.error(result.error);

    if (qb$("bankInfo")) {
      qb$("bankInfo").textContent =
        "প্রশ্ন লোড করা যায়নি: " + result.error.message;
    }

    return;
  }

  questions = result.data || [];

  fillExam("bankExam", "সব পরীক্ষা");
  fillCategory("bankCategory", true);

  renderBankCategories("");
  renderBank();

  installQuestionBankEvents();

  addBulkImportPanel();
}


/* =========================
   EVENTS
========================= */

function installQuestionBankEvents() {
  const exam = qb$("bankExam");
  const category = qb$("bankCategory");
  const search = qb$("bankSearch");

  if (exam) {
    exam.onchange = function () {
      renderBankCategories(category ? category.value : "");
      renderBank();
    };
  }

  if (category) {
    category.onchange = function () {
      renderBankCategories(category.value);
      renderBank();
    };
  }

  if (search) {
    search.oninput = renderBank;
  }

  if (qb$("closeModal")) {
    qb$("closeModal").onclick = function () {
      qb$("editModal").classList.add("hidden");
    };
  }

  if (qb$("updateBtn")) {
    qb$("updateBtn").onclick = updateQuestion;
  }

  if (qb$("cloneFromEditBtn")) {
    qb$("cloneFromEditBtn").onclick = cloneFromEdit;
  }

  if (qb$("logoutBtn")) {
    qb$("logoutBtn").onclick = logoutAdmin;
  }
}


/* =========================
   FILTER
========================= */

function getFilteredQuestions() {
  const examId = String(
    qb$("bankExam")?.value || ""
  );

  const category = qbCategory(
    qb$("bankCategory")?.value || ""
  );

  const search = qbNorm(
    qb$("bankSearch")?.value || ""
  );

  return questions.filter(function (q) {

    const examOK =
      !examId ||
      String(q.exam_id) === examId;

    const categoryOK =
      !category ||
      qbCategory(q.category) === category;

    const searchOK =
      !search ||
      [
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.explanation,
        q.category
      ].some(function (value) {
        return qbNorm(value).includes(search);
      });

    return examOK && categoryOK && searchOK;
  });
}


/* =========================
   RENDER QUESTIONS
========================= */

function renderBank() {
  const list = qb$("bankList");

  if (!list) return;

  const filtered = getFilteredQuestions();

  const category = qbCategory(
    qb$("bankCategory")?.value || ""
  );

  if (qb$("bankInfo")) {
    qb$("bankInfo").textContent =
      `মোট ${qbBn(filtered.length)}টি প্রশ্ন পাওয়া গেছে। ` +
      `${category
        ? `বর্তমান Category: ${category}`
        : "সব Category"
      }`;
  }

  list.innerHTML =
    filtered.map(function (q, index) {

      return `
        <div class="bankItem">

          <div class="bankTop">
            <span class="bankNo">
              প্রশ্ন ${qbBn(index + 1)}
            </span>

            <span class="bankCat">
              ${qbSafe(
                qbCategory(q.category) ||
                "ক্যাটাগরি নেই"
              )}
            </span>
          </div>

          <div class="bankQuestion">
            <b>
              ${qbBn(index + 1)}.
              ${qbSafe(q.question_text || "")}
            </b>
          </div>

          <div class="bankOption">
            ক) ${qbSafe(q.option_a || "")}
          </div>

          <div class="bankOption">
            খ) ${qbSafe(q.option_b || "")}
          </div>

          <div class="bankOption">
            গ) ${qbSafe(q.option_c || "")}
          </div>

          <div class="bankOption">
            ঘ) ${qbSafe(q.option_d || "")}
          </div>

          <div class="bankAnswer">
            <b>সঠিক উত্তর:</b>
            ${qbSafe(qbAnswerBn(q.correct_option))}
          </div>

          <div class="bankExplanation">
            <b>ব্যাখ্যা:</b><br>
            ${qbSafe(
              q.explanation ||
              "ব্যাখ্যা দেওয়া হয়নি।"
            )}
          </div>

          <div class="bankActions">

            <button onclick="openEdit('${q.id}')">
              ✏️ প্রশ্ন এডিট করুন
            </button>

            <button onclick="cloneQuestion('${q.id}')">
              📋 নতুন প্রশ্ন
            </button>

            <button
              class="danger"
              onclick="deleteQuestion('${q.id}')">
              🗑️ মুছুন
            </button>

          </div>

        </div>
      `;

    }).join("") ||

    `<div class="msg">
      এই ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি।
    </div>`;
}


/* =========================
   CATEGORY BUTTONS
========================= */

function renderBankCategories(selected = "") {

  const box = qb$("bankCategories");

  if (!box) return;

  const selectedCategory =
    qbCategory(selected);

  const selectedExam =
    String(qb$("bankExam")?.value || "");

  const pool = selectedExam
    ? questions.filter(function (q) {
        return String(q.exam_id) === selectedExam;
      })
    : questions;

  box.innerHTML = "";

  const allButton =
    document.createElement("button");

  allButton.className =
    !selectedCategory ? "active" : "";

  allButton.textContent =
    `সব Category (${qbBn(pool.length)})`;

  allButton.onclick = function () {

    if (qb$("bankCategory")) {
      qb$("bankCategory").value = "";
    }

    renderBankCategories("");
    renderBank();
  };

  box.appendChild(allButton);

  const categories = [];

  pool.forEach(function (q) {

    const category =
      qbCategory(q.category);

    if (
      category &&
      !categories.some(function (c) {
        return qbCategory(c) === category;
      })
    ) {
      categories.push(category);
    }

  });

  const ordered = [];

  if (Array.isArray(window.CATEGORIES)) {

    window.CATEGORIES.forEach(function (c) {

      if (
        categories.some(function (x) {
          return qbCategory(x) === qbCategory(c);
        })
      ) {
        ordered.push(c);
      }

    });
  }

  categories.forEach(function (c) {

    if (
      !ordered.some(function (x) {
        return qbCategory(x) === qbCategory(c);
      })
    ) {
      ordered.push(c);
    }

  });

  ordered.forEach(function (category) {

    const count =
      pool.filter(function (q) {
        return (
          qbCategory(q.category) ===
          qbCategory(category)
        );
      }).length;

    if (!count) return;

    const button =
      document.createElement("button");

    button.className =
      qbCategory(category) === selectedCategory
        ? "active"
        : "";

    button.textContent =
      `${category} (${qbBn(count)})`;

    button.onclick = function () {

      if (qb$("bankCategory")) {
        qb$("bankCategory").value = category;
      }

      renderBankCategories(category);
      renderBank();
    };

    box.appendChild(button);
  });
}


/* =========================
   EDIT QUESTION
========================= */

window.openEdit = function (id) {

  const q =
    questions.find(function (item) {
      return String(item.id) === String(id);
    });

  if (!q) return;

  fillExam("editExam");
  fillCategory("editCategory", false);

  qb$("editId").value = q.id;
  qb$("editExam").value = q.exam_id || "";
  qb$("editCategory").value = q.category || "";
  qb$("editText").value = q.question_text || "";
  qb$("editA").value = q.option_a || "";
  qb$("editB").value = q.option_b || "";
  qb$("editC").value = q.option_c || "";
  qb$("editD").value = q.option_d || "";
  qb$("editCorrect").value = q.correct_option || "";
  qb$("editExplanation").value = q.explanation || "";

  qb$("editModal").classList.remove("hidden");
};


async function updateQuestion() {

  const id =
    qb$("editId").value;

  const payload = {

    exam_id:
      qb$("editExam").value || null,

    category:
      qb$("editCategory").value || null,

    question_text:
      qb$("editText").value.trim(),

    option_a:
      qb$("editA").value.trim(),

    option_b:
      qb$("editB").value.trim(),

    option_c:
      qb$("editC").value.trim(),

    option_d:
      qb$("editD").value.trim(),

    correct_option:
      qb$("editCorrect").value,

    explanation:
      qb$("editExplanation").value.trim() || null
  };

  if (
    !payload.question_text ||
    !payload.option_a ||
    !payload.option_b ||
    !payload.option_c ||
    !payload.option_d ||
    !payload.correct_option
  ) {

    msg(
      "editMsg",
      "প্রশ্ন, চারটি অপশন এবং সঠিক উত্তর পূরণ করুন।",
      "error"
    );

    return;
  }

  const result =
    await db
      .from("questions")
      .update(payload)
      .eq("id", id);

  if (result.error) {

    msg(
      "editMsg",
      result.error.message,
      "error"
    );

    return;
  }

  location.reload();
}


/* =========================
   CLONE
========================= */

window.cloneQuestion = function (id) {

  const q =
    questions.find(function (item) {
      return String(item.id) === String(id);
    });

  if (!q) return;

  localStorage.setItem(
    "cloneQuestion",
    JSON.stringify(q)
  );

  location.href = "questions.html";
};


function cloneFromEdit() {

  const q = {

    exam_id: qb$("editExam").value,
    category: qb$("editCategory").value,
    question_text: qb$("editText").value,
    option_a: qb$("editA").value,
    option_b: qb$("editB").value,
    option_c: qb$("editC").value,
    option_d: qb$("editD").value,
    correct_option: qb$("editCorrect").value,
    explanation: qb$("editExplanation").value

  };

  localStorage.setItem(
    "cloneQuestion",
    JSON.stringify(q)
  );

  location.href = "questions.html";
}


/* =========================
   DELETE
========================= */

window.deleteQuestion = async function (id) {

  if (!confirm("এই প্রশ্নটি মুছে ফেলবেন?")) {
    return;
  }

  const result =
    await db
      .from("questions")
      .delete()
      .eq("id", id);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  location.reload();
};


/* =====================================================
   EXCEL / CSV IMPORT PANEL
===================================================== */

function addBulkImportPanel() {

  if (qb$("bulkImportPanel")) {
    return;
  }

  const list =
    qb$("bankList");

  if (!list || !list.parentElement) {
    return;
  }

  const panel =
    document.createElement("div");

  panel.id =
    "bulkImportPanel";

  panel.className =
    "card";

  panel.style.marginTop =
    "18px";

  panel.innerHTML = `

    <h3>
      📥 Excel / CSV দিয়ে প্রশ্ন যোগ করুন
    </h3>

    <p>
      Excel অথবা CSV ফাইল নির্বাচন করুন।
      আগে Preview ও Validation হবে।
      তারপর Valid প্রশ্নগুলো Database-এ
      Import করা যাবে।
    </p>

    <div style="
      display:grid;
      gap:10px;
    ">

      <select id="importExam">
        <option value="">
          Exam নির্বাচন করুন
        </option>
      </select>

      <select id="importCategory">
        <option value="">
          Category নির্বাচন করুন
        </option>
      </select>

      <input
        id="importFile"
        type="file"
        accept=".xlsx,.xls,.csv"
      >

      <div>
        <b>প্রয়োজনীয় Column:</b><br>
        question, option_a, option_b,
        option_c, option_d,
        correct_answer, explanation,
        category, exam
      </div>

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      ">

        <button
          id="downloadTemplateBtn"
          type="button">
          ⬇️ Template
        </button>

        <button
          id="readImportBtn"
          type="button">
          🔎 ফাইল যাচাই করুন
        </button>

        <button
          id="importQuestionsBtn"
          type="button"
          disabled>
          ✅ Import করুন
        </button>

      </div>

      <div id="importMsg" class="msg"></div>

      <div id="importPreview"></div>

    </div>
  `;

  list.parentElement.insertBefore(
    panel,
    list
  );

  fillExam(
    "importExam",
    "Exam নির্বাচন করুন"
  );

  fillCategory(
    "importCategory",
    false
  );

  qb$("downloadTemplateBtn").onclick =
    downloadImportTemplate;

  qb$("readImportBtn").onclick =
    readImportFile;

  qb$("importQuestionsBtn").onclick =
    importQuestions;
}


/* =========================
   LOAD EXCEL LIBRARY
========================= */

function loadXLSX() {

  return new Promise(function (resolve, reject) {

    if (window.XLSX) {
      resolve();
      return;
    }

    const oldScript =
      document.querySelector(
        'script[data-xlsx="1"]'
      );

    if (oldScript) {

      oldScript.addEventListener(
        "load",
        resolve,
        { once: true }
      );

      oldScript.addEventListener(
        "error",
        function () {
          reject(
            new Error(
              "Excel library লোড হয়নি।"
            )
          );
        },
        { once: true }
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

    script.dataset.xlsx = "1";

    script.onload = resolve;

    script.onerror = function () {

      reject(
        new Error(
          "Excel library লোড হয়নি। Internet connection পরীক্ষা করুন।"
        )
      );

    };

    document.head.appendChild(script);
  });
}


/* =========================
   CSV READER
========================= */

function csvToRows(text) {

  const result = [];

  let row = [];
  let cell = "";
  let quoted = false;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {

      if (quoted && next === '"') {

        cell += '"';
        i++;

      } else {

        quoted = !quoted;
      }

    } else if (ch === "," && !quoted) {

      row.push(cell);
      cell = "";

    } else if (
      (ch === "\n" || ch === "\r") &&
      !quoted
    ) {

      if (ch === "\r" && next === "\n") {
        i++;
      }

      row.push(cell);

      if (
        row.some(function (v) {
          return String(v).trim();
        })
      ) {
        result.push(row);
      }

      row = [];
      cell = "";

    } else {

      cell += ch;
    }
  }

  if (cell || row.length) {

    row.push(cell);

    if (
      row.some(function (v) {
        return String(v).trim();
      })
    ) {
      result.push(row);
    }
  }

  if (!result.length) {
    return [];
  }

  const headers =
    result[0].map(function (v) {
      return String(v).trim();
    });

  return result
    .slice(1)
    .map(function (columns) {

      const obj = {};

      headers.forEach(
        function (header, index) {

          obj[header] =
            columns[index] ?? "";

        }
      );

      return obj;
    });
}


/* =========================
   IMPORT KEY
========================= */

function importKey(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_");
}


/* =========================
   NORMALIZE IMPORT ROW
========================= */

function normalizeImportRow(raw) {

  const x = {};

  Object.entries(raw || {})
    .forEach(function ([key, value]) {

      x[importKey(key)] =
        String(value ?? "").trim();

    });

  function pick() {

    const keys =
      Array.from(arguments);

    for (const key of keys) {

      const value =
        x[importKey(key)];

      if (
        value !== undefined &&
        value !== ""
      ) {
        return value;
      }
    }

    return "";
  }

  let answer =
    pick(
      "correct_answer",
      "correct_option",
      "answer",
      "সঠিক_উত্তর",
      "উত্তর"
    );

  const answerMap = {

    "ক": "A",
    "খ": "B",
    "গ": "C",
    "ঘ": "D",

    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",

    "a": "A",
    "b": "B",
    "c": "C",
    "d": "D"

  };

  answer =
    answerMap[
      String(answer)
        .trim()
        .toLowerCase()
    ] ||
    String(answer)
      .trim()
      .toUpperCase();

  return {

    category:
      pick(
        "category",
        "ক্যাটাগরি"
      ),

    exam:
      pick(
        "exam",
        "exam_name",
        "পরীক্ষা",
        "পরীক্ষার_নাম"
      ),

    question_text:
      pick(
        "question",
        "question_text",
        "প্রশ্ন"
      ),

    option_a:
      pick(
        "option_a",
        "a",
        "ক"
      ),

    option_b:
      pick(
        "option_b",
        "b",
        "খ"
      ),

    option_c:
      pick(
        "option_c",
        "c",
        "গ"
      ),

    option_d:
      pick(
        "option_d",
        "d",
        "ঘ"
      ),

    correct_option:
      answer,

    explanation:
      pick(
        "explanation",
        "ব্যাখ্যা"
      )

  };
}


/* =========================
   VALIDATE IMPORT
========================= */

function validateImportRows(rows) {

  return rows.map(function (row, index) {

    const errors = [];

    if (!row.question_text) {
      errors.push("প্রশ্ন নেই");
    }

    if (!row.option_a) {
      errors.push("ক অপশন নেই");
    }

    if (!row.option_b) {
      errors.push("খ অপশন নেই");
    }

    if (!row.option_c) {
      errors.push("গ অপশন নেই");
    }

    if (!row.option_d) {
      errors.push("ঘ অপশন নেই");
    }

    if (
      !["A", "B", "C", "D"]
        .includes(row.correct_option)
    ) {
      errors.push(
        "সঠিক উত্তর A/B/C/D নয়"
      );
    }

    return {
      ...row,
      rowNumber: index + 2,
      errors
    };
  });
}


/* =========================
   READ IMPORT FILE
========================= */

async function readImportFile() {

  const file =
    qb$("importFile")?.files?.[0];

  const message =
    qb$("importMsg");

  const preview =
    qb$("importPreview");

  const importButton =
    qb$("importQuestionsBtn");

  if (!file) {

    message.textContent =
      "আগে Excel/CSV ফাইল নির্বাচন করুন।";

    message.className =
      "msg error";

    return;
  }

  importButton.disabled = true;

  message.textContent =
    "ফাইল পড়া হচ্ছে...";

  message.className = "msg";

  preview.innerHTML = "";

  importRows = [];

  try {

    let rows = [];

    if (/\.csv$/i.test(file.name)) {

      rows =
        csvToRows(
          await file.text()
        );

    } else {

      await loadXLSX();

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(
          buffer,
          {
            type: "array"
          }
        );

      if (!workbook.SheetNames.length) {

        throw new Error(
          "Excel sheet পাওয়া যায়নি।"
        );
      }

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: ""
          }
        );
    }

    if (!rows.length) {

      throw new Error(
        "ফাইলে কোনো data row পাওয়া যায়নি।"
      );
    }

    importRows =
      validateImportRows(
        rows.map(normalizeImportRow)
      );

    renderImportPreview();

    const valid =
      importRows.filter(function (row) {
        return row.errors.length === 0;
      });

    importButton.disabled =
      valid.length === 0;

    message.textContent =
      `মোট ${qbBn(importRows.length)}টি row | ` +
      `Valid ${qbBn(valid.length)} | ` +
      `Invalid ${qbBn(
        importRows.length - valid.length
      )}`;

    message.className =
      valid.length
        ? "msg success"
        : "msg error";

  } catch (error) {

    console.error(error);

    message.textContent =
      "ফাইল পড়তে সমস্যা: " +
      error.message;

    message.className =
      "msg error";
  }
}


/* =========================
   IMPORT PREVIEW
========================= */

function renderImportPreview() {

  const box =
    qb$("importPreview");

  if (!box) return;

  const max =
    Math.min(
      importRows.length,
      100
    );

  let html = `

    <div style="overflow:auto;">

      <table style="
        width:100%;
        border-collapse:collapse;
        min-width:850px;
      ">

        <thead>
          <tr>
            <th>Row</th>
            <th>Category</th>
            <th>Question</th>
            <th>Answer</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
  `;

  for (
    let i = 0;
    i < max;
    i++
  ) {

    const row =
      importRows[i];

    const valid =
      row.errors.length === 0;

    html += `

      <tr>

        <td>
          ${qbBn(row.rowNumber)}
        </td>

        <td>
          ${qbSafe(row.category || "—")}
        </td>

        <td>
          ${qbSafe(row.question_text || "—")}
        </td>

        <td>
          ${qbSafe(
            qbAnswerBn(
              row.correct_option
            ) || "—"
          )}
        </td>

        <td>
          ${
            valid
              ? "✅ Valid"
              : "❌ " +
                qbSafe(
                  row.errors.join(", ")
                )
          }
        </td>

      </tr>
    `;
  }

  html += `

        </tbody>

      </table>

    </div>
  `;

  if (importRows.length > max) {

    html += `

      <p>
        প্রথম ${qbBn(max)}টি row Preview
        দেখানো হয়েছে। Import-এর সময়
        সব Valid row নেওয়া হবে।
      </p>

    `;
  }

  box.innerHTML = html;
}


/* =========================
   FIND EXAM
========================= */

function resolveImportExam(value) {

  const text =
    String(value || "").trim();

  if (!text) {
    return null;
  }

  const byId =
    exams.find(function (exam) {

      return (
        String(exam.id) === text
      );

    });

  if (byId) {
    return byId.id;
  }

  const byTitle =
    exams.find(function (exam) {

      return (
        qbNorm(exam.title) ===
        qbNorm(text)
      );

    });

  if (byTitle) {
    return byTitle.id;
  }

  const byName =
    exams.find(function (exam) {

      return (
        qbNorm(exam.name) ===
        qbNorm(text)
      );

    });

  return byName?.id || null;
}


/* =========================
   IMPORT TO DATABASE
========================= */

async function importQuestions() {

  const validRows =
    importRows.filter(function (row) {
      return row.errors.length === 0;
    });

  const message =
    qb$("importMsg");

  const button =
    qb$("importQuestionsBtn");

  if (!validRows.length) {

    message.textContent =
      "Import করার মতো Valid প্রশ্ন নেই।";

    message.className =
      "msg error";

    return;
  }

  button.disabled = true;

  message.textContent =
    "Database-এ প্রশ্ন যোগ হচ্ছে...";

  message.className = "msg";

  try {

    const fallbackExam =
      qb$("importExam")?.value || "";

    const fallbackCategory =
      qb$("importCategory")?.value || "";

    const payload = [];

    for (
      const row of validRows
    ) {

      const examId =
        resolveImportExam(row.exam) ||
        fallbackExam;

      if (!examId) {

        throw new Error(
          `Row ${row.rowNumber}-এর Exam পাওয়া যায়নি।`
        );
      }

      payload.push({

        exam_id:
          examId,

        category:
          row.category ||
          fallbackCategory ||
          null,

        question_text:
          row.question_text,

        option_a:
          row.option_a,

        option_b:
          row.option_b,

        option_c:
          row.option_c,

        option_d:
          row.option_d,

        correct_option:
          row.correct_option,

        explanation:
          row.explanation ||
          null

      });
    }

    let inserted = 0;

    for (
      let i = 0;
      i < payload.length;
      i += 100
    ) {

      const batch =
        payload.slice(
          i,
          i + 100
        );

      const result =
        await db
          .from("questions")
          .insert(batch);

      if (result.error) {
        throw result.error;
      }

      inserted += batch.length;

      message.textContent =
        `Import চলছে... ` +
        `${qbBn(inserted)} / ` +
        `${qbBn(payload.length)}`;
    }

    message.textContent =
      `✅ সফলভাবে ${qbBn(inserted)}টি প্রশ্ন Import হয়েছে।`;

    message.className =
      "msg success";

    setTimeout(
      function () {
        location.reload();
      },
      1000
    );

  } catch (error) {

    console.error(error);

    message.textContent =
      "Import ব্যর্থ: " +
      error.message;

    message.className =
      "msg error";

    button.disabled = false;
  }
}


/* =========================
   DOWNLOAD CSV TEMPLATE
========================= */

function downloadImportTemplate() {

  const rows = [

    [
      "category",
      "exam",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "correct_answer",
      "explanation"
    ],

    [
      "বাংলাদেশ",
      "পরীক্ষার নাম",
      "বাংলাদেশের রাজধানী কোনটি?",
      "ঢাকা",
      "চট্টগ্রাম",
      "রাজশাহী",
      "খুলনা",
      "A",
      "বাংলাদেশের রাজধানী ঢাকা।"
    ]

  ];

  const csv =
    rows
      .map(function (row) {

        return row
          .map(function (value) {

            return (
              '"' +
              String(value)
                .replace(/"/g, '""') +
              '"'
            );

          })
          .join(",");

      })
      .join("\r\n");

  const blob =
    new Blob(
      [
        "\uFEFF" + csv
      ],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "question-import-template.csv";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/* =========================
   START
========================= */

init();
