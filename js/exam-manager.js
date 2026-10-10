const $=id=>document.getElementById(id),BN='০১২৩৪৫৬৭৮৯';
const bn=n=>String(n??'').replace(/\d/g,d=>BN[d]);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let exams=[],mapExamId=null,mode='add';
const statusUpdating=new Set();
const msg=(t,e=false)=>{$('msg').textContent=t;$('msg').style.color=e?'#b91c1c':'#166534'};
const mapMsg=(t,e=false)=>{$('mapMsg').textContent=t;$('mapMsg').style.color=e?'#b91c1c':'#166534'};

async function init(){
 const {data}=await db.auth.getSession();
 if(!data.session)return location.href='admin_dashboard_split.html';
 await loadExams(); await loadFolders();
 const id=new URLSearchParams(location.search).get('exam'); if(id)openMapping(Number(id),'add');
}

function statusLabel(status){return status==='active'?'🟢 পরীক্ষা সক্রিয়':'⚪ পরীক্ষা নিষ্ক্রিয়';}
function statusButton(status){return status==='active'?'পরীক্ষা নিষ্ক্রিয় করুন':'পরীক্ষা সক্রিয় করুন';}

async function syncCount(id){
 const {count,error}=await db.from('exam_questions').select('question_id',{count:'exact',head:true}).eq('exam_id',id);
 if(error)return null;
 const total=Number(count||0);
 await db.from('exams').update({total_questions:total}).eq('id',id);
 await db.from('exam_settings').update({total_questions:total}).eq('exam_id',id);
 return total;
}

async function loadExams(){
 const {data,error}=await db.from('exams').select('id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark').order('id',{ascending:false});
 if(error)return msg(error.message,true); exams=data||[];
 await Promise.all(exams.map(async e=>{const c=await syncCount(e.id);if(c!==null)e.total_questions=c;}));
 $('exams').innerHTML=exams.length?exams.map(e=>{
  const link=new URL('index.html?exam='+e.id,location.href).href;
  const safeName=esc(e.exam_name).replace(/'/g,"\\'");
  const safeLink=link.replace(/'/g,"\\'");
  return `<div class="exam-card${mapExamId===e.id?' mapping-open':''}" data-exam-id="${e.id}">
   <div class="exam-head"><div><h2>${esc(e.exam_name)}</h2><div>${statusLabel(e.status)} · ${bn(e.total_questions||0)}টি প্রশ্ন</div></div></div>
   <div class="linkbox">${esc(link)}</div>
   <div class="exam-actions">
    <button onclick="openMapping(${e.id},'add')">➕ প্রশ্ন Add</button>
    <button onclick="openMapping(${e.id},'remove')" class="secondary">➖ প্রশ্ন Remove</button>
    <button onclick="location.href='question-paper.html?exam=${e.id}'">📝 পরীক্ষার প্রশ্নপত্র</button>
    <button onclick="location.href='answer-paper.html?exam=${e.id}'">✅ পরীক্ষার উত্তরপত্র</button>
    <button onclick="renameExam(${e.id},'${safeName}')">✏️ পরীক্ষার নাম পরিবর্তন</button>
    <button onclick="location.href='exam-setting.html?exam=${e.id}'">⚙️ পরীক্ষার সেটিংস পরিবর্তন</button>
    <button onclick="location.href='results.html?exam=${e.id}'">📊 পরীক্ষার ফলাফল</button>
    <button onclick="copyLink('${safeLink}')">🔗 পরীক্ষার লিংক</button>
    <button class="secondary" ${statusUpdating.has(String(e.id))?'disabled':''} onclick="toggleStatus(${e.id},'${e.status==='active'?'ended':'active'}')">${statusButton(e.status)}</button>
    <button class="danger" onclick="deleteExam(${e.id},'${safeName}')">🗑️ পরীক্ষা Delete</button>
   </div></div>`;
 }).join(''):'<div class="card">কোনো পরীক্ষা নেই।</div>';
 if(mapExamId){const card=document.querySelector(`[data-exam-id="${mapExamId}"]`);if(card){card.classList.add('mapping-open');card.appendChild($('mapping'));$('mapping').classList.remove('hidden');$('mapping').classList.add('mapping-inline')}}
}

async function copyLink(link){try{await navigator.clipboard.writeText(link);msg('✅ Exam Link কপি হয়েছে')}catch(_){prompt('Exam Link',link)}}

async function toggleStatus(id,status){
 const key=String(id);
 if(statusUpdating.has(key))return;
 if(!['active','ended'].includes(status))return msg('পরীক্ষার অবস্থা পরিবর্তনের মান সঠিক নয়।',true);
 const exam=exams.find(x=>String(x.id)===key);
 if(!exam)return msg('পরীক্ষাটি তালিকায় পাওয়া যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।',true);
 const goingActive=status==='active';
 const action=goingActive?'সক্রিয়':'নিষ্ক্রিয়';
 const confirmText=goingActive
  ? `“${exam.exam_name}” পরীক্ষা আবার সক্রিয় করবেন?\n\nসক্রিয় হলে শিক্ষার্থীরা পরীক্ষার লিংক থেকে পরীক্ষা দিতে পারবে।`
  : `“${exam.exam_name}” পরীক্ষা নিষ্ক্রিয় করবেন?\n\nনিষ্ক্রিয় হলে শিক্ষার্থীরা এই পরীক্ষা শুরু করতে পারবে না। আগের ফলাফল ও শিক্ষার্থীদের রেকর্ড মুছে যাবে না।`;
 if(!confirm(confirmText))return;
 statusUpdating.add(key);
 try{
  msg(`পরীক্ষাটি ${action} করা হচ্ছে...`);
  const {error}=await db.from('exams').update({status}).eq('id',id);
  if(error){msg('পরীক্ষার অবস্থা পরিবর্তন হয়নি: '+error.message,true);return;}
  msg(goingActive?'✅ পরীক্ষাটি সক্রিয় করা হয়েছে।':'✅ পরীক্ষাটি নিষ্ক্রিয় করা হয়েছে।');
 }catch(err){
  msg('পরীক্ষার অবস্থা পরিবর্তন করা যায়নি: '+(err?.message||String(err)),true);
 }finally{
  statusUpdating.delete(key);
  await loadExams();
 }
}

async function renameExam(id,current){
 const name=prompt('পরীক্ষার নতুন নাম',current); if(name===null)return;
 if(!name.trim())return alert('পরীক্ষার নাম খালি রাখা যাবে না।');
 const {error}=await db.from('exams').update({exam_name:name.trim()}).eq('id',id);
 if(error)return msg(error.message,true); await loadExams();
}

async function deleteExam(id,name){
 const ok=confirm(`⚠️ সতর্কতা\n\n“${name}” পরীক্ষা স্থায়ীভাবে ডিলিট করতে চান?\n\nপরীক্ষার প্রশ্ন mapping, settings, attempt/answer data এবং পরীক্ষাটি মুছে যাবে।\nএই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`);
 if(!ok)return;
 const ok2=confirm(`শেষবার নিশ্চিত করুন:\n\n“${name}” পরীক্ষা ডিলিট করব?`); if(!ok2)return;
 for(const table of ['attempt_answers','exam_attempts','exam_questions','exam_settings']){
  const r=await db.from(table).delete().eq('exam_id',id);
  if(r.error)return msg(table+': '+r.error.message,true);
 }
 const {error}=await db.from('exams').delete().eq('id',id);
 if(error)return msg(error.message,true);
 if(mapExamId===id)closeMapping(); msg('✅ পরীক্ষা ডিলিট হয়েছে।'); await loadExams();
}

async function loadFolders(){
 const {data,error}=await db.from('question_bank_folders').select('id,folder_name').order('id');
 if(error)return mapMsg(error.message,true);
 $('folder').innerHTML='<option value="">Folder নির্বাচন করুন</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
 await loadSets();
}
async function loadSets(){
 const id=$('folder').value;
 if(!id){$('set').innerHTML='<option value="">Set নির্বাচন করুন</option>';return;}
 const {data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');
 if(error)return mapMsg(error.message,true);
 $('set').innerHTML='<option value="">Set নির্বাচন করুন</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
}

async function openMapping(id,m='add'){
 mapExamId=id; mode=m; setMode(m);
 const card=document.querySelector(`[data-exam-id="${id}"]`);
 if(card){document.querySelectorAll('.exam-card.mapping-open').forEach(x=>x.classList.remove('mapping-open'));card.classList.add('mapping-open');card.appendChild($('mapping'));$('mapping').classList.remove('hidden');$('mapping').classList.add('mapping-inline');card.scrollIntoView({behavior:'smooth',block:'start'});}
 const e=exams.find(x=>x.id===id); $('mapTitle').textContent='পরীক্ষা: '+(e?.exam_name||id);
 if(m==='remove')await loadCurrentQuestions();else await loadPool();
}
function setMode(m){
 mode=m; $('addPanel').classList.toggle('hidden',m!=='add'); $('removePanel').classList.toggle('hidden',m!=='remove');
 $('addModeBtn').classList.toggle('active',m==='add'); $('removeModeBtn').classList.toggle('active',m==='remove');
 $('mapHeading').textContent=m==='add'?'➕ প্রশ্ন Add':'➖ প্রশ্ন Remove'; mapMsg('');
}
function closeMapping(){const panel=$('mapping');panel.classList.add('hidden');panel.classList.remove('mapping-inline');document.querySelectorAll('.exam-card.mapping-open').forEach(x=>x.classList.remove('mapping-open'));mapExamId=null;}

async function loadPool(){
 if(!mapExamId)return;
 let q=db.from('questions').select('id,question_text,option_a,option_b,option_c,option_d,folder_id,set_id,question_number').order('id').limit(500);
 if($('folder').value)q=q.eq('folder_id',Number($('folder').value));
 if($('set').value)q=q.eq('set_id',Number($('set').value));
 const [{data,error},existing]=await Promise.all([q,db.from('exam_questions').select('question_id').eq('exam_id',mapExamId)]);
 if(error)return mapMsg(error.message,true); if(existing.error)return mapMsg(existing.error.message,true);
 const ids=new Set((existing.data||[]).map(x=>String(x.question_id)));
 $('pool').innerHTML=(data||[]).map(x=>`<div class="q"><div class="qhead"><input type="checkbox" class="poolq" value="${x.id}" ${ids.has(String(x.id))?'disabled checked':''}><div><div class="qtext"><b>${bn(x.question_number||'')}</b> ${esc(x.question_text)}</div><div class="opts">ক) ${esc(x.option_a)}<br>খ) ${esc(x.option_b)}<br>গ) ${esc(x.option_c)}<br>ঘ) ${esc(x.option_d)}</div></div></div></div>`).join('')||'এই Filter-এ কোনো প্রশ্ন পাওয়া যায়নি।';
 $('selectAll').checked=false; mapMsg(`${bn((data||[]).length)}টি প্রশ্ন দেখানো হয়েছে। ইতিমধ্যে পরীক্ষায় থাকা প্রশ্নগুলো disabled।`);
}

async function saveMapping(){
 if(!mapExamId)return;
 const checked=[...document.querySelectorAll('.poolq:checked:not(:disabled)')].map(x=>Number(x.value));
 if(!checked.length)return mapMsg('Add করার জন্য অন্তত একটি নতুন প্রশ্ন নির্বাচন করুন।',true);
 const old=await db.from('exam_questions').select('question_id,question_order').eq('exam_id',mapExamId).order('question_order');
 if(old.error)return mapMsg(old.error.message,true);
 const existingIds=new Set((old.data||[]).map(x=>Number(x.question_id)));
 const newIds=checked.filter(id=>!existingIds.has(id));
 if(!newIds.length)return mapMsg('নতুন কোনো প্রশ্ন নির্বাচন করা হয়নি।',true);
 const start=(old.data||[]).length;
 const rows=newIds.map((id,i)=>({exam_id:mapExamId,question_id:id,question_order:start+i+1}));
 const {error}=await db.from('exam_questions').insert(rows);
 if(error)return mapMsg(error.message,true);
 const total=await syncCount(mapExamId);
 mapMsg(`✅ ${bn(newIds.length)}টি প্রশ্ন পরীক্ষায় যোগ হয়েছে। মোট ${bn(total||0)}টি প্রশ্ন।`);
 await loadExams(); await loadPool();
}

async function loadCurrentQuestions(){
 if(!mapExamId)return;
 const {data,error}=await db.from('exam_questions').select('question_id,question_order,questions(id,question_text,option_a,option_b,option_c,option_d,question_number)').eq('exam_id',mapExamId).order('question_order');
 if(error)return mapMsg(error.message,true);
 $('currentPool').innerHTML=(data||[]).map((x,i)=>{const q=x.questions||{};return `<div class="q"><div class="qhead"><input type="checkbox" class="removeq" value="${x.question_id}"><div><div class="qtext"><b>${bn(i+1)}.</b> ${esc(q.question_text)}</div><div class="opts">ক) ${esc(q.option_a)}<br>খ) ${esc(q.option_b)}<br>গ) ${esc(q.option_c)}<br>ঘ) ${esc(q.option_d)}</div><div class="meta">প্রশ্ন ব্যাংকের প্রশ্ন নম্বর: ${bn(q.question_number||'')}</div></div></div></div>`}).join('')||'এই পরীক্ষায় কোনো প্রশ্ন নেই।';
 $('removeSelectAll').checked=false; mapMsg(`${bn((data||[]).length)}টি বর্তমান প্রশ্ন দেখানো হয়েছে।`);
}

async function removeSelectedQuestions(){
 if(!mapExamId)return;
 const ids=[...document.querySelectorAll('.removeq:checked')].map(x=>Number(x.value));
 if(!ids.length)return mapMsg('Remove করার জন্য অন্তত একটি প্রশ্ন নির্বাচন করুন।',true);
 const ok=confirm(`আপনি ${bn(ids.length)}টি প্রশ্ন এই পরীক্ষা থেকে Remove করতে চান?\n\nQuestion Bank-এর মূল প্রশ্ন মুছে যাবে না।`); if(!ok)return;
 const {error}=await db.from('exam_questions').delete().eq('exam_id',mapExamId).in('question_id',ids);
 if(error)return mapMsg(error.message,true);
 const total=await syncCount(mapExamId); mapMsg(`✅ ${bn(ids.length)}টি প্রশ্ন এই পরীক্ষা থেকে Remove হয়েছে। মোট ${bn(total||0)}টি প্রশ্ন।`);
 await loadExams(); await loadCurrentQuestions();
}

$('folder').addEventListener('change',async()=>{await loadSets();if(mode==='add')await loadPool();});
$('set').addEventListener('change',()=>{if(mode==='add')loadPool();});
$('loadPool').onclick=loadPool;
$('selectAll').addEventListener('change',e=>document.querySelectorAll('.poolq:not(:disabled)').forEach(x=>x.checked=e.target.checked));
$('deselectAll').onclick=()=>{document.querySelectorAll('.poolq').forEach(x=>{if(!x.disabled)x.checked=false});$('selectAll').checked=false};
$('removeSelectAll').addEventListener('change',e=>document.querySelectorAll('.removeq').forEach(x=>x.checked=e.target.checked));
$('removeDeselectAll').onclick=()=>{document.querySelectorAll('.removeq').forEach(x=>x.checked=false);$('removeSelectAll').checked=false};
$('removeSelected').onclick=removeSelectedQuestions;
$('pool').addEventListener('change',e=>{if(e.target.classList.contains('poolq')){const a=[...document.querySelectorAll('.poolq:not(:disabled)')];$('selectAll').checked=a.length>0&&a.every(x=>x.checked)}});
$('currentPool').addEventListener('change',e=>{if(e.target.classList.contains('removeq')){const a=[...document.querySelectorAll('.removeq')];$('removeSelectAll').checked=a.length>0&&a.every(x=>x.checked)}});
$('saveMap').onclick=saveMapping;
init();
