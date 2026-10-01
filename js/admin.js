/*
  ফেইসবুক পাঠশালা — Admin enhancement layer
  বর্তমান admin.html-এর বিদ্যমান Exam/Question Bank logic অক্ষুণ্ণ রেখে
  Question Bank থেকে bulk selection + select all/deselect all যোগ করে।
*/
(function(){
  "use strict";

  let poolQuestions = [];
  const poolSelected = new Set();

  const bn = window.bn || function(v){
    return String(v).replace(/\d/g,d=>"০১২৩৪৫৬৭৮৯"[d]);
  };
  const esc = window.esc || function(v){
    return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  };
  const SUBJECTS = window.SUBJECTS || {
    1:"বাংলা সাহিত্য",2:"বাংলা ব্যাকরণ",3:"গণিত",4:"ইংরেজি সাহিত্য",
    5:"ইংরেজি ব্যাকরণ",6:"বাংলাদেশ",7:"আন্তর্জাতিক",8:"বিজ্ঞান",
    9:"কম্পিউটার ও তথ্য প্রযুক্তি",10:"ভূগোল",11:"সাম্প্রতিক প্রশ্নোত্তর"
  };

  function addStyles(){
    if(document.getElementById("bulkPoolStyles")) return;
    const s=document.createElement("style");
    s.id="bulkPoolStyles";
    s.textContent=`
      .bulk-pool-card{margin-top:18px}
      .bulk-pool-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
      .bulk-pool-tools .btn{padding:9px 12px}
      .bulk-pool-count{font-weight:700;color:#334155}
      .bulk-pool-item{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:8px 0;background:#fff}
      .bulk-pool-item label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
      .bulk-pool-item input{width:auto;margin-top:4px}
      .bulk-pool-meta{font-size:12px;color:#64748b;margin-top:5px}
    `;
    document.head.appendChild(s);
  }

  function getDraft(){
    try{return window.draft || draft;}catch(e){return null;}
  }

  function renderPool(){
    const box=document.getElementById("bulkQuestionPool");
    const count=document.getElementById("bulkPoolSelectedCount");
    if(!box) return;
    if(!poolQuestions.length){
      box.innerHTML='<p class="muted">কোনো প্রশ্ন পাওয়া যায়নি।</p>';
      if(count) count.textContent="নির্বাচিত: ০টি";
      return;
    }
    box.innerHTML=poolQuestions.map((q,i)=>{
      const checked=poolSelected.has(String(q.id))?"checked":"";
      const subject=q.subject_id?SUBJECTS[q.subject_id]:"";
      return `<div class="bulk-pool-item">
        <label>
          <input type="checkbox" data-pool-id="${q.id}" ${checked}>
          <span><b>${bn(i+1)}.</b> ${esc(q.question_text)}
          <div class="bulk-pool-meta">${esc(q.source_name||"")} ${subject?"· "+esc(subject):""}</div>
          <div class="small">ক) ${esc(q.option_a)} · খ) ${esc(q.option_b)} · গ) ${esc(q.option_c)} · ঘ) ${esc(q.option_d)}</div>
          </span>
        </label>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-pool-id]").forEach(el=>{
      el.addEventListener("change",()=>{
        const id=String(el.dataset.poolId);
        if(el.checked) poolSelected.add(id); else poolSelected.delete(id);
        updateCount();
      });
    });
    updateCount();
  }

  function updateCount(){
    const el=document.getElementById("bulkPoolSelectedCount");
    if(el) el.textContent=`নির্বাচিত: ${bn(poolSelected.size)}টি`;
  }

  window.loadQuestionPool=async function(){
    const box=document.getElementById("bulkQuestionPool");
    if(!box) return;
    box.innerHTML='<p class="muted">প্রশ্ন লোড হচ্ছে...</p>';
    try{
      if(!window.client) throw new Error("Supabase client পাওয়া যায়নি।");
      let q=client.from("questions")
        .select("id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,source_type,source_name,subject_id")
        .order("id",{ascending:false}).limit(200);

      const source=document.getElementById("bulkPoolSource")?.value||"";
      const subject=document.getElementById("bulkPoolSubject")?.value||"";
      const search=document.getElementById("bulkPoolSearch")?.value.trim()||"";
      if(source) q=q.eq("source_type",source);
      if(subject) q=q.eq("subject_id",Number(subject));

      const {data,error}=await q;
      if(error) throw error;
      poolQuestions=(data||[]).filter(x=>{
        if(!search) return true;
        const s=search.toLowerCase();
        return String(x.question_text||"").toLowerCase().includes(s) ||
               String(x.source_name||"").toLowerCase().includes(s);
      });
      poolSelected.clear();
      renderPool();
    }catch(e){
      box.innerHTML=`<div class="status error">❌ ${esc(e.message||e)}</div>`;
    }
  };

  window.selectAllPoolQuestions=function(){
    poolQuestions.forEach(q=>poolSelected.add(String(q.id)));
    renderPool();
  };

  window.clearAllPoolQuestions=function(){
    poolSelected.clear();
    renderPool();
  };

  window.addSelectedPoolQuestions=function(){
    const d=getDraft();
    if(!Array.isArray(d)){
      alert("বর্তমান Draft প্রশ্ন তালিকা পাওয়া যায়নি।");
      return;
    }
    const chosen=poolQuestions.filter(q=>poolSelected.has(String(q.id)));
    if(!chosen.length){
      alert("আগে অন্তত একটি প্রশ্ন নির্বাচন করুন।");
      return;
    }
    let added=0;
    chosen.forEach(q=>{
      const exists=d.some(x=>String(x.source_question_id||"")===String(q.id));
      if(exists) return;
      d.push({
        source_question_id:q.id,
        question_text:q.question_text||"",
        option_a:q.option_a||"",
        option_b:q.option_b||"",
        option_c:q.option_c||"",
        option_d:q.option_d||"",
        correct_answer:q.correct_answer||"A",
        explanation:q.explanation||"",
        subject_id:q.subject_id||null
      });
      added++;
    });
    if(typeof window.renderDraft==="function") window.renderDraft();
    else { try{renderDraft();}catch(e){} }
    const st=document.getElementById("draftStatus");
    if(st){
      st.className="status success";
      st.textContent=`${bn(added)}টি প্রশ্ন ড্রাফটে যোগ হয়েছে।`;
    }
    poolSelected.clear();
    updateCount();
  };

  function injectUI(){
    if(document.getElementById("bulkQuestionPoolCard")) return;
    const examTab=document.getElementById("examTab");
    if(!examTab) return;
    const cards=examTab.querySelectorAll(".card");
    let anchor=null;
    cards.forEach(c=>{
      if(!anchor && c.querySelector("#manualQuestion")) anchor=c;
    });
    if(!anchor) return;

    const card=document.createElement("div");
    card.id="bulkQuestionPoolCard";
    card.className="card bulk-pool-card";
    card.innerHTML=`
      <h3>📚 Question Bank থেকে একসাথে প্রশ্ন নির্বাচন</h3>
      <p class="muted">এখানে প্রশ্নগুলো একসাথে নির্বাচন করতে পারবেন। <b>সব নির্বাচন</b> / <b>সব বাতিল</b> দিয়ে দ্রুত বাছাই করুন, তারপর ড্রাফটে যোগ করুন।</p>
      <div class="grid3">
        <select id="bulkPoolSource">
          <option value="">সব ক্যাটাগরি</option>
          <option value="verification_test">যাচাই পরীক্ষা</option>
          <option value="job_solution">জব সলিউশন</option>
        </select>
        <select id="bulkPoolSubject">
          <option value="">সব বিষয়</option>
          <option value="1">বাংলা সাহিত্য</option><option value="2">বাংলা ব্যাকরণ</option>
          <option value="3">গণিত</option><option value="4">ইংরেজি সাহিত্য</option>
          <option value="5">ইংরেজি ব্যাকরণ</option><option value="6">বাংলাদেশ</option>
          <option value="7">আন্তর্জাতিক</option><option value="8">বিজ্ঞান</option>
          <option value="9">কম্পিউটার ও তথ্য প্রযুক্তি</option><option value="10">ভূগোল</option>
          <option value="11">সাম্প্রতিক প্রশ্নোত্তর</option>
        </select>
        <input id="bulkPoolSearch" placeholder="সেট/পরীক্ষার নাম বা প্রশ্ন খুঁজুন">
      </div>
      <div class="bulk-pool-tools">
        <button class="btn primary" type="button" id="bulkPoolLoadBtn">🔎 প্রশ্ন দেখুন</button>
        <button class="btn secondary" type="button" id="bulkPoolAllBtn">☑️ সব নির্বাচন</button>
        <button class="btn secondary" type="button" id="bulkPoolNoneBtn">☐ সব বাতিল</button>
        <button class="btn success" type="button" id="bulkPoolAddBtn">➕ নির্বাচিত প্রশ্ন ড্রাফটে যোগ করুন</button>
        <span id="bulkPoolSelectedCount" class="bulk-pool-count">নির্বাচিত: ০টি</span>
      </div>
      <div id="bulkQuestionPool"><p class="muted">ফিল্টার দিয়ে “প্রশ্ন দেখুন” চাপুন।</p></div>
    `;
    anchor.insertAdjacentElement("afterend",card);
    document.getElementById("bulkPoolLoadBtn").onclick=window.loadQuestionPool;
    document.getElementById("bulkPoolAllBtn").onclick=window.selectAllPoolQuestions;
    document.getElementById("bulkPoolNoneBtn").onclick=window.clearAllPoolQuestions;
    document.getElementById("bulkPoolAddBtn").onclick=window.addSelectedPoolQuestions;
  }

  function boot(){
    addStyles();
    injectUI();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
