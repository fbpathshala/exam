const CATS={recruitment:'নিয়োগ পরীক্ষা',verification_test:'যাচাই পরীক্ষা',recent:'সাম্প্রতিক প্রশ্ন'};
let cat='verification_test',folders=[],sets=[],subjects=[],exams=[],importData=[];
const $=id=>document.getElementById(id),bn=n=>String(n??'').replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function msg(id,t,err=false){const e=$(id);if(!e)return;e.textContent=t;e.style.color=err?'#b91c1c':'#166534'}
async function login(){msg('loginMsg','Login হচ্ছে...');const{error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg('loginMsg',error.message,true);await init()}
async function logout(){await db.auth.signOut();location.reload()}
function showPage(p){if(p==='dashboard'){location.href='dashboard.html';return}document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(p)?.classList.remove('hidden');if(p==='bank')loadBank();if(p==='exam')loadExams()}
async function init(){
 const{data,error}=await db.auth.getSession();
 if(error)return msg('loginMsg',error.message,true);
 if(!data.session){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}
 $('login').classList.add('hidden');$('app').classList.remove('hidden');
 if($('userEmail'))$('userEmail').textContent=data.session.user.email||'';
 await loadSubjects();
 const p=new URLSearchParams(location.search);
 const requestedCat=p.get('category');
 if(requestedCat&&CATS[requestedCat])cat=requestedCat;
 await loadBank();
 await loadExams();
 showPage(p.get('section')==='exam'?'exam':'bank');
 if(p.get('section')==='bank'||!p.get('section')){
   const folderId=p.get('folder_id'),setId=p.get('set_id'),questionId=p.get('question_id');
   if(folderId){$('filterFolder').value=folderId;await loadFilterSets();}
   if(setId)$('filterSet').value=setId;
   if(folderId||setId)await loadQuestions();
   if(questionId)requestAnimationFrame(()=>focusQuestion(questionId));
 }
}
async function loadSubjects(){
 const s=$('subject'),f=$('filterSubject'),e=$('editSubject');
 if(!s||!f)return;
 s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>';
 f.innerHTML='<option value="">সব বিষয়</option>';
 const{data,error}=await db.from('subjects').select('id,name').order('id');
 if(error){s.innerHTML='<option value="">বিষয় লোড হয়নি</option>';f.innerHTML='<option value="">বিষয় লোড হয়নি</option>';if(e)e.innerHTML=s.innerHTML;return msg('qmsg','Subject লোড হয়নি: '+error.message,true)}
 subjects=data||[];
 const opts=subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
 s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+opts;
 f.innerHTML='<option value="">সব বিষয়</option>'+opts;
 if(e)e.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+opts;
}
async function loadBank(){await loadFolders();await loadFilterFolders();await loadQuestions()}
async function selectCategory(c){
 if(!CATS[c])return;
 cat=c;
 document.querySelectorAll('.cats button').forEach(b=>b.classList.remove('active'));
 $('cat-'+c)?.classList.add('active');
 $('currentCat').textContent='বর্তমান Category: '+CATS[c];
 await loadFolders();await loadFilterFolders();
 await loadQuestions();
}
async function loadFolders(){
 const{data,error}=await db.from('question_bank_folders').select('id,folder_name').eq('sub_category',CATS[cat]).order('id');
 if(error)return msg('folderMsg',error.message,true);
 folders=data||[];
 const opts=folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
 if($('folder'))$('folder').innerHTML='<option value="">Folder নির্বাচন করুন</option>'+opts;
 if($('filterFolder'))$('filterFolder').innerHTML='<option value="">সব Folder</option>'+opts;
 if($('mapFolder'))$('mapFolder').innerHTML='<option value="">Folder নির্বাচন করুন</option>'+opts;
 await loadSets();
}
async function loadFilterFolders(){
 const{data,error}=await db.from('question_bank_folders').select('id,folder_name').eq('sub_category',CATS[cat]).order('id');
 if(error)return;
 $('filterFolder').innerHTML='<option value="">সব Folder</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
}
async function loadSets(){
 const id=$('folder')?.value;
 if(!id){sets=[];if($('set'))$('set').innerHTML='<option value="">Set নির্বাচন করুন</option>';return}
 const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');
 if(error)return msg('folderMsg',error.message,true);
 sets=data||[];
 $('set').innerHTML='<option value="">Set নির্বাচন করুন</option>'+sets.map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
}
async function loadFilterSets(){
 const id=$('filterFolder').value;
 if(!id){$('filterSet').innerHTML='<option value="">সব Set</option>';return}
 const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');
 if(error)return msg('qmsg',error.message,true);
 $('filterSet').innerHTML='<option value="">সব Set</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
}
async function loadMapSets(){
 const id=$('mapFolder').value;
 if(!id){$('mapSet').innerHTML='<option value="">সব Set</option>';return}
 const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');
 if(error)return msg('mapMsg',error.message,true);
 $('mapSet').innerHTML='<option value="">সব Set</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
}
async function createFolder(){const name=$('newFolder').value.trim();if(!name)return msg('folderMsg','Folder-এর নাম দিন',true);const{data,error}=await db.from('question_bank_folders').insert({sub_category:CATS[cat],folder_name:name}).select('id,folder_name').single();if(error)return msg('folderMsg',error.message,true);$('newFolder').value='';await loadFolders();$('folder').value=data.id;await loadSets();msg('folderMsg','✅ Folder তৈরি হয়েছে')}
async function createSet(){const folderId=$('folder').value,name=$('newSet').value.trim();if(!folderId)return msg('folderMsg','আগে Folder নির্বাচন করুন',true);if(!name)return msg('folderMsg','Set-এর নাম দিন',true);const{data,error}=await db.from('question_bank_sets').insert({folder_id:Number(folderId),set_name:name}).select('id,set_name').single();if(error)return msg('folderMsg',error.message,true);$('newSet').value='';await loadSets();$('set').value=data.id;msg('folderMsg','✅ Set তৈরি হয়েছে')}
async function addManual(){
 const folderId=$('folder').value,setId=$('set').value,subjectId=$('subject').value,text=$('qtext').value.trim(),a=$('a').value.trim(),b=$('b').value.trim(),c=$('c').value.trim(),d=$('d').value.trim(),correct=$('correct').value;
 if(!folderId||!setId)return msg('qmsg','Folder ও Set নির্বাচন করুন',true);
 if(!subjectId||!text||!a||!b||!c||!d||!correct)return msg('qmsg','বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',true);
 const p={folder_id:Number(folderId),set_id:Number(setId),subject_id:Number(subjectId),question_text:text,option_a:a,option_b:b,option_c:c,option_d:d,correct_answer:correct,explanation:$('explanation').value.trim()||null,question_number:$('qno').value?Number($('qno').value):null,category:CATS[cat],source_type:cat};
 const{error}=await db.from('questions').insert(p);
 if(error)return msg('qmsg',error.message,true);
 ['qno','qtext','a','b','c','d','explanation'].forEach(x=>$(x).value='');$('correct').value='';
 msg('qmsg','✅ প্রশ্ন Question Bank-এ যোগ হয়েছে');await loadQuestions();
}
function mode(m){$('manualBox').classList.toggle('hidden',m!=='manual');$('importBox').classList.toggle('hidden',m!=='import')}
function template(){
 const rows=[
  ['question','source','option_a','option_b','option_c','option_d','correct_answer','question_number','subject','explanation','category','folder','set'],
  ['বাংলাদেশের রাজধানী কোনটি?','বিসিএস ৪৬তম','ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','A',1,'বাংলাদেশ','','যাচাই পরীক্ষা','বাংলাদেশ','মডেল টেস্ট ১']
 ];
 const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Questions');XLSX.writeFile(wb,'question-bank-template.xlsx')
}
function key(v){return norm(v).replace(/[\s\-_\/]+/g,'')}
function field(r,names){for(const n of names){if(Object.prototype.hasOwnProperty.call(r,n)&&String(r[n]??'').trim()!=='')return String(r[n]).trim()}return ''}
function normalizeRow(r){
 const out={};
 Object.keys(r||{}).forEach(k=>out[key(k)]=r[k]);
 return {
  question:field(out,['question','questiontext','প্রশ্ন']),source:field(out,['source','সূত্র']),
  option_a:field(out,['optiona','a','ক','কঅপশন']),option_b:field(out,['optionb','b','খ','খঅপশন']),option_c:field(out,['optionc','c','গ','গঅপশন']),option_d:field(out,['optiond','d','ঘ','ঘঅপশন']),
  correct_answer:field(out,['correctanswer','correct','answer','সঠিকউত্তর']),question_number:field(out,['questionnumber','qno','প্রশ্ননম্বর']),subject:field(out,['subject','বিষয়']),explanation:field(out,['explanation','ব্যাখ্যা']),category:field(out,['category','ক্যাটাগরি']),folder:field(out,['folder','ফোল্ডার']),set:field(out,['set','সেট'])
 }
}
function normalizeCorrect(v){const x=norm(v).toUpperCase();return ({'ক':'A','খ':'B','গ':'C','ঘ':'D','A':'A','B':'B','C':'C','D':'D'})[x]||''}
async function previewImport(){
 const f=$('file').files[0];if(!f)return msg('qmsg','CSV/Excel file নির্বাচন করুন',true);
 try{
  const data=XLSX.read(await f.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]],{defval:''});
  importData=rows.map(normalizeRow);
  if(!importData.length){$('preview').innerHTML='<div class="q">কোনো data row পাওয়া যায়নি।</div>';$('importBtn').classList.add('hidden');return msg('qmsg','ফাইলে কোনো প্রশ্ন নেই',true)}
  const errors=[];
  importData.forEach((r,i)=>{const miss=[];['question','option_a','option_b','option_c','option_d','correct_answer'].forEach(k=>{if(!r[k])miss.push(k)});if(r.correct_answer&&!normalizeCorrect(r.correct_answer))miss.push('correct_answer A/B/C/D বা ক/খ/গ/ঘ');if(miss.length)errors.push(`Row ${i+2}: ${miss.join(', ')}`)});
  const sample=importData.slice(0,5).map((r,i)=>`<div class="q"><b>Row ${bn(i+2)}</b><br>${esc(r.question)}<br><span class="small">${esc(r.option_a)} | ${esc(r.option_b)} | ${esc(r.option_c)} | ${esc(r.option_d)} · সঠিক: ${esc(normalizeCorrect(r.correct_answer)||r.correct_answer)}</span></div>`).join('');
  $('preview').innerHTML=`<div class="q"><b>${bn(importData.length)}টি row পাওয়া গেছে</b><br>${errors.length?`❌ ${bn(errors.length)}টি row-তে সমস্যা পাওয়া গেছে।`: '✅ Required fields ঠিক আছে।'} </div>${sample}${errors.length?`<div class="q">${errors.map(esc).join('<br>')}</div>`:''}`;
  $('importBtn').classList.toggle('hidden',errors.length>0);msg('qmsg',errors.length?'Import করার আগে ভুলগুলো ঠিক করুন':'Preview প্রস্তুত — Import করা যাবে',errors.length>0);
 }catch(e){$('importBtn').classList.add('hidden');msg('qmsg','ফাইল পড়তে সমস্যা: '+e.message,true)}
}
async function importRows(){
 let ok=0,fail=[];
 for(let i=0;i<importData.length;i++){
  const r=importData[i];
  if(!r.question||!r.option_a||!r.option_b||!r.option_c||!r.option_d||!normalizeCorrect(r.correct_answer)){fail.push(`Row ${i+2}: required field missing/invalid`);continue}
  const category=Object.values(CATS).includes(r.category)?r.category:CATS[cat];
  let folderName=r.folder;
  if(!folderName&&$('filterFolder').value)folderName=$('filterFolder').selectedOptions[0]?.textContent||'';
  if(!folderName&&$('folder').value)folderName=$('folder').selectedOptions[0]?.textContent||'';
  let setName=r.set;
  if(!setName&&$('filterSet').value)setName=$('filterSet').selectedOptions[0]?.textContent||'';
  if(!setName&&$('set').value)setName=$('set').selectedOptions[0]?.textContent||'';
  if(!folderName||!setName){fail.push(`Row ${i+2}: Folder/Set পাওয়া যায়নি`);continue}
  let fr=await db.from('question_bank_folders').select('id').eq('sub_category',category).eq('folder_name',folderName).maybeSingle();
  if(fr.error){fail.push(`Row ${i+2}: ${fr.error.message}`);continue}
  let fid=fr.data?.id;
  if(!fid){const x=await db.from('question_bank_folders').insert({sub_category:category,folder_name:folderName}).select('id').single();if(x.error){fail.push(`Row ${i+2}: ${x.error.message}`);continue}fid=x.data.id}
  const sr=await db.from('question_bank_sets').select('id').eq('folder_id',fid).eq('set_name',setName).maybeSingle();
  if(sr.error){fail.push(`Row ${i+2}: ${sr.error.message}`);continue}
  let sid=sr.data?.id;
  if(!sid){const x=await db.from('question_bank_sets').insert({folder_id:fid,set_name:setName}).select('id').single();if(x.error){fail.push(`Row ${i+2}: ${x.error.message}`);continue}sid=x.data.id}
  let sub=null;
  if(r.subject){sub=subjects.find(x=>norm(x.name)===norm(r.subject));if(!sub){fail.push(`Row ${i+2}: Subject পাওয়া যায়নি: ${r.subject}`);continue}}
  const p={folder_id:fid,set_id:sid,subject_id:sub?.id||null,category,source_name:r.source||null,source_type:cat,question_number:r.question_number&&Number.isFinite(Number(r.question_number))?Number(r.question_number):null,question_text:r.question.trim(),option_a:r.option_a.trim(),option_b:r.option_b.trim(),option_c:r.option_c.trim(),option_d:r.option_d.trim(),correct_answer:normalizeCorrect(r.correct_answer),explanation:r.explanation||null};
  const x=await db.from('questions').insert(p);if(x.error)fail.push(`Row ${i+2}: ${x.error.message}`);else ok++
 }
 msg('qmsg',`✅ ${bn(ok)}টি Import হয়েছে${fail.length?` | ❌ ${bn(fail.length)}টি ব্যর্থ`:''}`,!!fail.length);
 if(fail.length)$('preview').innerHTML+=`<div class="q">${fail.map(esc).join('<br>')}</div>`;
 await loadQuestions()
}
function folderName(id){return folders.find(x=>String(x.id)===String(id))?.folder_name||folderCache[String(id)]||''}
let folderCache={},setCache={};
async function refreshQuestionMeta(){
 const fr=await db.from('question_bank_folders').select('id,folder_name,sub_category');if(!fr.error)folderCache=Object.fromEntries((fr.data||[]).map(x=>[String(x.id),x.folder_name]));
 const sr=await db.from('question_bank_sets').select('id,set_name,folder_id');if(!sr.error)setCache=Object.fromEntries((sr.data||[]).map(x=>[String(x.id),x]));
}
function sourceHref(x){const p=new URLSearchParams({section:'bank',category:Object.keys(CATS).find(k=>CATS[k]===x.category)||cat,folder_id:String(x.folder_id),set_id:String(x.set_id),question_id:String(x.id)});return `admin_dashboard_split.html?${p.toString()}`}
function sourceText(x){const c=x.category||CATS[cat],f=folderName(x.folder_id),st=setCache[String(x.set_id)]?.set_name||'',qn=x.question_number??'';return `${c} / ${f||'Folder'} / ${st||'Set'} / প্রশ্ন ${bn(qn)}`}
async function loadQuestions(){
 await refreshQuestionMeta();
 let q=db.from('questions').select('id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,category,folder_id,set_id,subject_id,explanation,source_name,subjects(name)').order('id',{ascending:false}).limit(500);
 if($('filterFolder').value)q=q.eq('folder_id',Number($('filterFolder').value));
 if($('filterSet').value)q=q.eq('set_id',Number($('filterSet').value));
 if($('filterSubject').value)q=q.eq('subject_id',Number($('filterSubject').value));
 const term=$('search').value.trim();if(term)q=q.ilike('question_text','%'+term+'%');
 const{data,error}=await q;if(error)return msg('qmsg',error.message,true);
 const rows=data||[];$('questionCount').textContent=`${bn(rows.length)}টি প্রশ্ন`;
 $('questions').innerHTML=rows.map((x,i)=>{const correct={A:'ক',B:'খ',C:'গ',D:'ঘ'}[String(x.correct_answer).toUpperCase()]||x.correct_answer;const subject=x.subjects?.name||'—';const copyText=buildCopyText(x,i+1,correct,subject);return `<article class="qb-card" id="question-${x.id}" data-id="${x.id}" data-copy="${esc(copyText)}"><div class="qb-card-head"><input class="qb-check question-check" type="checkbox" value="${x.id}" onchange="updateSelectionInfo()"><div class="qb-question">${bn(i+1)}. ${esc(x.question_text)}</div></div><div class="qb-options"><div class="qb-option">ক. ${esc(x.option_a)}</div><div class="qb-option">খ. ${esc(x.option_b)}</div><div class="qb-option">গ. ${esc(x.option_c)}</div><div class="qb-option">ঘ. ${esc(x.option_d)}</div></div><div class="qb-meta qb-correct">সঠিক উত্তর: ${esc(correct)}</div><a class="qb-source" href="${sourceHref(x)}">Source: ${esc(sourceText(x))}</a><div class="qb-meta">বিষয়: ${esc(subject)}</div>${x.explanation?`<details class="qb-explanation"><summary>ব্যাখ্যা দেখুন</summary><div>${esc(x.explanation)}</div></details>`:''}<div class="qb-actions"><button class="secondary" onclick="copyQuestion(${x.id})">📋 Copy</button><button onclick="openEdit(${x.id})">✏️ Edit</button><button class="danger" onclick="deleteQuestion(${x.id})">🗑️ Delete</button></div></article>`}).join('')||'<div class="q">কোনো প্রশ্ন পাওয়া যায়নি</div>';
 updateSelectionInfo()
}
function buildCopyText(x,displayNo,correct,subject){const source=sourceText(x);return `${bn(displayNo)}. ${x.question_text}

ক. ${x.option_a}
খ. ${x.option_b}
গ. ${x.option_c}
ঘ. ${x.option_d}

সঠিক উত্তর: ${correct}
Source: ${source}
বিষয়: ${subject}`}
function copyQuestion(id){const card=document.querySelector(`.qb-card[data-id="${id}"]`);if(!card)return;const text=card.dataset.copy||'';navigator.clipboard?.writeText(text).then(()=>msg('qmsg','✅ প্রশ্নটি Messenger-এর জন্য কপি হয়েছে')).catch(()=>{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();msg('qmsg','✅ প্রশ্নটি কপি হয়েছে')})}
function selectedIds(){return [...document.querySelectorAll('.question-check:checked')].map(x=>Number(x.value))}
function updateSelectionInfo(){$('selectionInfo').textContent=`নির্বাচিত: ${bn(selectedIds().length)}টি`;$('questions')?.querySelectorAll('.qb-card').forEach(c=>{const cb=c.querySelector('.question-check');c.classList.toggle('selected',!!cb?.checked)})}
function selectVisibleQuestions(v){document.querySelectorAll('.question-check').forEach(x=>x.checked=v);updateSelectionInfo()}
function selectByCurrentSet(){const id=$('filterSet').value;if(!id)return msg('qmsg','আগে একটি Set নির্বাচন করুন',true);document.querySelectorAll('.question-check').forEach(x=>x.checked=false);document.querySelectorAll('.qb-card').forEach(c=>{const cb=c.querySelector('.question-check');if(cb){cb.checked=true}});updateSelectionInfo()}
function selectByCurrentFolder(){const id=$('filterFolder').value;if(!id)return msg('qmsg','আগে একটি Folder নির্বাচন করুন',true);document.querySelectorAll('.question-check').forEach(x=>x.checked=true);updateSelectionInfo()}
async function deleteSelectedQuestions(){const ids=selectedIds();if(!ids.length)return msg('qmsg','আগে প্রশ্ন নির্বাচন করুন',true);if(!confirm(`${bn(ids.length)}টি প্রশ্ন মুছে ফেলবেন? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`))return;msg('qmsg','প্রশ্ন মুছে ফেলা হচ্ছে...');const{error}=await db.from('questions').delete().in('id',ids);if(error)return msg('qmsg',error.message,true);msg('qmsg',`✅ ${bn(ids.length)}টি প্রশ্ন মুছে গেছে`);await loadQuestions()}
async function deleteQuestion(id){if(!confirm('এই প্রশ্নটি মুছে ফেলবেন?'))return;const{error}=await db.from('questions').delete().eq('id',id);if(error)return msg('qmsg',error.message,true);msg('qmsg','✅ প্রশ্ন মুছে গেছে');await loadQuestions()}
function openEdit(id){
 const card=document.querySelector(`.qb-card[data-id="${id}"]`);if(!card)return;
 editQuestion(id)
}
async function editQuestion(id){
 const{data,error}=await db.from('questions').select('id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,subject_id,explanation,category,folder_id,set_id').eq('id',id).single();
 if(error)return msg('qmsg',error.message,true);
 $('editId').value=data.id;$('editQno').value=data.question_number??'';$('editSubject').value=data.subject_id??'';$('editText').value=data.question_text||'';$('editA').value=data.option_a||'';$('editB').value=data.option_b||'';$('editC').value=data.option_c||'';$('editD').value=data.option_d||'';$('editCorrect').value=String(data.correct_answer||'').toUpperCase();$('editExplanation').value=data.explanation||'';
 $('editContext').textContent=`Category: ${data.category||'—'} / Folder: ${folderName(data.folder_id)||'—'} / Set: ${setCache[String(data.set_id)]?.set_name||'—'}`;
 $('editMsg').textContent='';$('editModal').classList.remove('hidden');document.body.style.overflow='hidden'
}
function closeEdit(){$('editModal').classList.add('hidden');$('editMsg').textContent='';document.body.style.overflow=''}
async function saveEdit(){
 const id=Number($('editId').value),text=$('editText').value.trim(),a=$('editA').value.trim(),b=$('editB').value.trim(),c=$('editC').value.trim(),d=$('editD').value.trim(),correct=$('editCorrect').value,subjectId=$('editSubject').value;
 if(!id||!text||!a||!b||!c||!d||!correct)return msg('editMsg','প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',true);
 const payload={question_number:$('editQno').value?Number($('editQno').value):null,subject_id:subjectId?Number(subjectId):null,question_text:text,option_a:a,option_b:b,option_c:c,option_d:d,correct_answer:correct,explanation:$('editExplanation').value.trim()||null};
 msg('editMsg','Save হচ্ছে...');const{error}=await db.from('questions').update(payload).eq('id',id);if(error)return msg('editMsg',error.message,true);closeEdit();msg('qmsg','✅ প্রশ্নের সব পরিবর্তন সংরক্ষিত হয়েছে');await loadQuestions();focusQuestion(id)
}
function focusQuestion(id){const el=$(`question-${id}`);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('qb-highlight');void el.offsetWidth;el.classList.add('qb-highlight')}
async function createExam(){const name=$('examName').value.trim();if(!name)return msg('examMsg','পরীক্ষার নাম দিন',true);const{data,error}=await db.from('exams').insert({exam_name:name,status:$('examStatus').value,total_questions:0,marks_per_question:1,negative_mark:0,pass_mark:0}).select('id').single();if(error)return msg('examMsg',error.message,true);const s=await db.from('exam_settings').upsert({exam_id:data.id,total_questions:0,total_marks:0,pass_mark:0,duration_minutes:20,marks_per_question:1,negative_mark:0,show_answers:false,multiple_attempts:false,device_attempt_protection:true,random_questions:false,random_options:false},{onConflict:'exam_id'});if(s.error)return msg('examMsg',s.error.message,true);$('examName').value='';msg('examMsg','✅ Exam তৈরি হয়েছে');await loadExams();$('examSelect').value=data.id;loadSettings()}
async function loadExams(){const{data,error}=await db.from('exams').select('id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark').order('id',{ascending:false});if(error)return msg('examMsg',error.message,true);exams=data||[];$('sExams').textContent=bn(exams.length);$('sActive').textContent=bn(exams.filter(x=>x.status==='active').length);const opt='<option value="">Exam নির্বাচন করুন</option>'+exams.map(x=>`<option value="${x.id}">${esc(x.exam_name)} (#${x.id})</option>`).join('');$('examSelect').innerHTML=opt;$('mapExam').innerHTML=opt;$('exams').innerHTML=exams.map(x=>`<div class="examrow"><b>${esc(x.exam_name)}</b> · ${esc(x.status)} · ${bn(x.total_questions||0)} প্রশ্ন<br><span class="link">${location.origin}${location.pathname.replace(/\/[^/]*$/,'/../')}?exam=${x.id}</span><br><button onclick="copyLink(${x.id})">🔗 Exam Link কপি</button><button class="secondary" onclick="activate(${x.id},'${x.status==='active'?'inactive':'active'}')">${x.status==='active'?'Inactive':'Active'}</button></div>`).join('');const count=await db.from('questions').select('id',{count:'exact',head:true});$('sQuestions').textContent=bn(count.count||0)}
async function copyLink(id){const base=new URL('../index.html',location.href).href+'?exam='+id;try{await navigator.clipboard.writeText(base);alert('Exam Link copied')}catch(_){prompt('Exam Link',base)}}
async function activate(id,status){const{error}=await db.from('exams').update({status}).eq('id',id);if(error)return msg('examMsg',error.message,true);await loadExams()}
async function loadSettings(){const id=$('examSelect').value;if(!id)return;const{data,error}=await db.from('exam_settings').select('*').eq('exam_id',id).maybeSingle();if(error)return msg('settingsMsg',error.message,true);const s=data||{};$('totalQ').value=s.total_questions??0;$('totalMarks').value=s.total_marks??0;$('pass').value=s.pass_mark??0;$('duration').value=s.duration_minutes??20;$('marks').value=s.marks_per_question??1;$('negative').value=s.negative_mark??0;$('examiner').value=s.examiner_name??'';$('syllabus').value=s.syllabus??'';$('showAnswers').checked=!!s.show_answers;$('multiple').checked=!!s.multiple_attempts;$('device').checked=s.device_attempt_protection!==false;$('randomQ').checked=!!s.random_questions;$('randomO').checked=!!s.random_options;$('startDate').value=s.exam_date||'';$('startTime').value=s.start_time||'';$('endDate').value=s.end_date||'';$('endTime').value=s.end_time||''}
async function saveSettings(){const id=$('examSelect').value;if(!id)return msg('settingsMsg','Exam নির্বাচন করুন',true);const payload={exam_id:id,total_questions:Number($('totalQ').value)||0,total_marks:Number($('totalMarks').value)||0,pass_mark:Number($('pass').value)||0,duration_minutes:Number($('duration').value)||20,marks_per_question:Number($('marks').value)||1,negative_mark:Number($('negative').value)||0,examiner_name:$('examiner').value.trim()||null,syllabus:$('syllabus').value.trim()||null,show_answers:$('showAnswers').checked,multiple_attempts:$('multiple').checked,device_attempt_protection:$('device').checked,random_questions:$('randomQ').checked,random_options:$('randomO').checked,exam_date:$('startDate').value||null,start_time:$('startTime').value||null,end_date:$('endDate').value||null,end_time:$('endTime').value||null};const{error}=await db.from('exam_settings').upsert(payload,{onConflict:'exam_id'});if(error)return msg('settingsMsg',error.message,true);const e=await db.from('exams').update({total_questions:payload.total_questions,marks_per_question:payload.marks_per_question,negative_mark:payload.negative_mark,pass_mark:payload.pass_mark}).eq('id',id);if(e.error)return msg('settingsMsg',e.error.message,true);msg('settingsMsg','✅ Exam Settings সংরক্ষিত হয়েছে');await loadExams()}
async function loadPool(){const examId=$('mapExam').value;if(!examId)return msg('mapMsg','Exam নির্বাচন করুন',true);let q=db.from('questions').select('id,question_text,category,folder_id,set_id,question_number').limit(200);if($('mapFolder').value)q=q.eq('folder_id',Number($('mapFolder').value));if($('mapSet').value)q=q.eq('set_id',Number($('mapSet').value));const{data,error}=await q;if(error)return msg('mapMsg',error.message,true);const existing=await db.from('exam_questions').select('question_id').eq('exam_id',examId);const ids=new Set((existing.data||[]).map(x=>String(x.question_id)));$('pool').innerHTML=(data||[]).map(x=>`<label class="q"><input type="checkbox" class="poolq" value="${x.id}" ${ids.has(String(x.id))?'checked':''}> ${esc(x.question_text)} <span class="small">(${esc(x.category||'')})</span></label>`).join('')+`<button onclick="saveMapping(${examId})">Exam-এ নির্বাচিত প্রশ্ন Save করুন</button>`}
async function saveMapping(examId){const ids=[...document.querySelectorAll('.poolq:checked')].map(x=>Number(x.value));const old=await db.from('exam_questions').delete().eq('exam_id',examId);if(old.error)return msg('mapMsg',old.error.message,true);if(ids.length){const{error}=await db.from('exam_questions').insert(ids.map((id,i)=>({exam_id:examId,question_id:id,question_order:i+1})));if(error)return msg('mapMsg',error.message,true)}await db.from('exams').update({total_questions:ids.length}).eq('id',examId);await db.from('exam_settings').update({total_questions:ids.length}).eq('exam_id',examId);msg('mapMsg',`✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`);await loadExams()}
$('folder').onchange=async()=>{await loadSets();};$('filterFolder').onchange=async()=>{await loadFilterSets();await loadQuestions()};$('filterSet').onchange=loadQuestions;$('filterSubject').onchange=loadQuestions;$('search').addEventListener('input',()=>{clearTimeout(window.__qSearchTimer);window.__qSearchTimer=setTimeout(loadQuestions,250)});$('mapFolder').onchange=loadMapSets;
selectCategory('verification_test');init();
