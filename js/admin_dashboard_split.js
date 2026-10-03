const CATS={recruitment:'নিয়োগ পরীক্ষা',verification_test:'যাচাই পরীক্ষা',recent:'সাম্প্রতিক প্রশ্ন'};
let cat='verification_test',folders=[],sets=[],subjects=[],exams=[],importData=[];
const $=id=>document.getElementById(id),bn=n=>String(n??'').replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function msg(id,t,err=false){const e=$(id);if(!e)return;e.textContent=t;e.style.color=err?'#b91c1c':'#166534'}
async function login(){msg('loginMsg','Login হচ্ছে...');const{error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg('loginMsg',error.message,true);await init()}
async function logout(){await db.auth.signOut();location.reload()}
function showPage(p){if(p==='dashboard'){location.href='dashboard.html';return}document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(p)?.classList.remove('hidden');if(p==='bank')loadBank();if(p==='exam')loadExams()}
async function init(){const{data,error}=await db.auth.getSession();if(error)return msg('loginMsg',error.message,true);if(!data.session){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}$('login').classList.add('hidden');$('app').classList.remove('hidden');if($('userEmail'))$('userEmail').textContent=data.session.user.email||'';await loadSubjects();await loadBank();await loadExams();const section=new URLSearchParams(location.search).get('section');showPage(section==='exam'?'exam':'bank')}
async function loadSubjects(){const s=$('subject'),f=$('filterSubject');if(!s||!f)return;s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>';f.innerHTML='<option value="">সব বিষয়</option>';const{data,error}=await db.from('subjects').select('id,name').order('id');if(error){console.error(error);s.innerHTML='<option value="">বিষয় লোড হয়নি</option>';f.innerHTML='<option value="">বিষয় লোড হয়নি</option>';return msg('qmsg','Subject লোড হয়নি: '+error.message,true)}subjects=data||[];s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');f.innerHTML='<option value="">সব বিষয়</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}
async function loadBank(){await loadFolders();await loadFilterFolders();await loadQuestions()}
async function selectCategory(c){cat=c;document.querySelectorAll('.cats button').forEach(b=>b.classList.remove('active'));$('cat-'+c)?.classList.add('active');$('currentCat').textContent='বর্তমান Category: '+CATS[c];await loadFolders();await loadFilterFolders()}
async function loadFolders(){const{data,error}=await db.from('question_bank_folders').select('id,folder_name').eq('sub_category',CATS[cat]).order('id');if(error)return msg('folderMsg',error.message,true);folders=data||[];$('folder').innerHTML='<option value="">Folder নির্বাচন করুন</option>'+folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');$('mapFolder').innerHTML='<option value="">Folder নির্বাচন করুন</option>'+folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');$('filterFolder').innerHTML='<option value="">সব Folder</option>'+folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');await loadSets()}
async function loadFilterFolders(){const{data,error}=await db.from('question_bank_folders').select('id,folder_name').eq('sub_category',CATS[cat]).order('id');if(error)return; $('filterFolder').innerHTML='<option value="">সব Folder</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('')}
async function loadSets(){const id=$('folder').value;if(!id){sets=[];$('set').innerHTML='<option value="">Set নির্বাচন করুন</option>';return}const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');if(error)return msg('folderMsg',error.message,true);sets=data||[];$('set').innerHTML='<option value="">Set নির্বাচন করুন</option>'+sets.map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('')}
async function loadFilterSets(){const id=$('filterFolder').value;if(!id){$('filterSet').innerHTML='<option value="">সব Set</option>';return}const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');if(error)return msg('qmsg',error.message,true);$('filterSet').innerHTML='<option value="">সব Set</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('')}
async function loadMapSets(){const id=$('mapFolder').value;if(!id){$('mapSet').innerHTML='<option value="">সব Set</option>';return}const{data,error}=await db.from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('id');if(error)return msg('mapMsg',error.message,true);$('mapSet').innerHTML='<option value="">সব Set</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('')}
async function createFolder(){const name=$('newFolder').value.trim();if(!name)return msg('folderMsg','Folder-এর নাম দিন',true);const{data,error}=await db.from('question_bank_folders').insert({sub_category:CATS[cat],folder_name:name}).select('id,folder_name').single();if(error)return msg('folderMsg',error.message,true);$('newFolder').value='';await loadFolders();$('folder').value=data.id;await loadSets();msg('folderMsg','✅ Folder তৈরি হয়েছে')}
async function createSet(){const folderId=$('folder').value,name=$('newSet').value.trim();if(!folderId)return msg('folderMsg','আগে Folder নির্বাচন করুন',true);if(!name)return msg('folderMsg','Set-এর নাম দিন',true);const{data,error}=await db.from('question_bank_sets').insert({folder_id:Number(folderId),set_name:name}).select('id,set_name').single();if(error)return msg('folderMsg',error.message,true);$('newSet').value='';await loadSets();$('set').value=data.id;msg('folderMsg','✅ Set তৈরি হয়েছে')}
async function addManual(){const folderId=$('folder').value,setId=$('set').value,subjectId=$('subject').value,text=$('qtext').value.trim(),a=$('a').value.trim(),b=$('b').value.trim(),c=$('c').value.trim(),d=$('d').value.trim(),correct=$('correct').value;if(!folderId||!setId)return msg('qmsg','Category, Folder ও Set নির্বাচন করুন',true);if(!subjectId||!text||!a||!b||!c||!d||!correct)return msg('qmsg','বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',true);const p={folder_id:Number(folderId),set_id:Number(setId),subject_id:Number(subjectId),question_text:text,option_a:a,option_b:b,option_c:c,option_d:d,correct_answer:correct,explanation:$('explanation').value.trim()||null,question_number:$('qno').value?Number($('qno').value):null,category:CATS[cat],source_name:$('source').value.trim()||null,source_type:cat};const{error}=await db.from('questions').insert(p);if(error)return msg('qmsg',error.message,true);['qno','source','qtext','a','b','c','d','explanation'].forEach(x=>$(x).value='');$('correct').value='';msg('qmsg','✅ প্রশ্ন Question Bank-এ যোগ হয়েছে');await loadQuestions()}
function mode(m){$('manualBox').classList.toggle('hidden',m!=='manual');$('importBox').classList.toggle('hidden',m!=='import')}
function template(){const rows=[['category','folder','set','subject','source','question_number','question','option_a','option_b','option_c','option_d','correct_answer','explanation'],['যাচাই পরীক্ষা','বাংলাদেশ','সেট-১','বাংলাদেশ','বিসিএস',1,'বাংলাদেশের রাজধানী কোনটি?','ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','A','']];const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Questions');XLSX.writeFile(wb,'question-import-template.xlsx')}
async function previewImport(){const f=$('file').files[0];if(!f)return msg('qmsg','CSV/Excel file নির্বাচন করুন',true);const data=XLSX.read(await f.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]],{defval:''});importData=rows;$('preview').innerHTML=`<div class="q"><b>${bn(rows.length)}টি row পাওয়া গেছে</b><pre>${esc(JSON.stringify(rows.slice(0,5),null,2))}</pre></div>`;$('importBtn').classList.remove('hidden');msg('qmsg','Preview প্রস্তুত হয়েছে')}
function norm(v){return String(v??'').trim().toLowerCase()}
async function importRows(){let ok=0,fail=[];for(let i=0;i<importData.length;i++){const r=importData[i],category=Object.values(CATS).includes(String(r.category).trim())?String(r.category).trim():CATS[cat],folderName=String(r.folder||'').trim(),setName=String(r.set||'').trim();if(!folderName||!setName||!r.question||!r.option_a||!r.option_b||!r.option_c||!r.option_d||!r.correct_answer){fail.push(`Row ${i+2}: required field missing`);continue}let fr=await db.from('question_bank_folders').select('id').eq('sub_category',category).eq('folder_name',folderName).maybeSingle();if(fr.error){fail.push(`Row ${i+2}: ${fr.error.message}`);continue}let fid=fr.data?.id;if(!fid){const x=await db.from('question_bank_folders').insert({sub_category:category,folder_name:folderName}).select('id').single();if(x.error){fail.push(`Row ${i+2}: ${x.error.message}`);continue}fid=x.data.id}const sr=await db.from('question_bank_sets').select('id').eq('folder_id',fid).eq('set_name',setName).maybeSingle();let sid=sr.data?.id;if(!sid){const x=await db.from('question_bank_sets').insert({folder_id:fid,set_name:setName}).select('id').single();if(x.error){fail.push(`Row ${i+2}: ${x.error.message}`);continue}sid=x.data.id}let sub=null;if(r.subject){sub=subjects.find(x=>norm(x.name)===norm(r.subject));if(!sub){fail.push(`Row ${i+2}: Subject পাওয়া যায়নি: ${r.subject}`);continue}}const p={folder_id:fid,set_id:sid,subject_id:sub?.id||null,category,source_name:String(r.source||'').trim()||null,source_type:cat,question_number:r.question_number?Number(r.question_number):null,question_text:String(r.question).trim(),option_a:String(r.option_a).trim(),option_b:String(r.option_b).trim(),option_c:String(r.option_c).trim(),option_d:String(r.option_d).trim(),correct_answer:String(r.correct_answer).trim().toUpperCase(),explanation:String(r.explanation||'').trim()||null};const x=await db.from('questions').insert(p);if(x.error)fail.push(`Row ${i+2}: ${x.error.message}`);else ok++}msg('qmsg',`✅ ${bn(ok)}টি Import হয়েছে${fail.length?` | ❌ ${bn(fail.length)}টি ব্যর্থ`:''}`,!!fail.length);if(fail.length)$('preview').innerHTML+='<div class="q">'+fail.map(esc).join('<br>')+'</div>';await loadQuestions()}
async function openQuestionSource(id,category,folderId,setId){
  const reverse=Object.keys(CATS).find(k=>CATS[k]===String(category||''));
  if(reverse && reverse!==cat) await selectCategory(reverse);
  if(folderId) $('filterFolder').value=String(folderId);
  await loadFilterSets();
  if(setId) $('filterSet').value=String(setId);
  $('search').value='';
  await loadQuestions();
  const el=$('question-card-'+id);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('source-highlight');setTimeout(()=>el.classList.remove('source-highlight'),2500)}
}

async function editQuestion(id){
  const{data,error}=await db.from('questions').select('question_number,source_name,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation').eq('id',id).single();
  if(error)return msg('qmsg',error.message,true);
  const q=data;
  const qno=prompt('মূল প্রশ্ন নম্বর:',q.question_number??'');if(qno===null)return;
  const source=prompt('Source / পরীক্ষার নাম:',q.source_name||'');if(source===null)return;
  const text=prompt('প্রশ্ন:',q.question_text);if(text===null)return;
  const a=prompt('ক. অপশন:',q.option_a);if(a===null)return;
  const b=prompt('খ. অপশন:',q.option_b);if(b===null)return;
  const c=prompt('গ. অপশন:',q.option_c);if(c===null)return;
  const d=prompt('ঘ. অপশন:',q.option_d);if(d===null)return;
  const correct=prompt('সঠিক উত্তর A / B / C / D:',q.correct_answer);if(correct===null)return;
  const explanation=prompt('ব্যাখ্যা:',q.explanation||'');if(explanation===null)return;
  const ca=correct.trim().toUpperCase();
  if(!text.trim()||!a.trim()||!b.trim()||!c.trim()||!d.trim()||!['A','B','C','D'].includes(ca))return msg('qmsg','প্রশ্ন, চার অপশন এবং A/B/C/D সঠিক উত্তর ঠিকভাবে দিন',true);
  const r=await db.from('questions').update({question_number:qno.trim()?Number(qno):null,source_name:source.trim()||null,question_text:text.trim(),option_a:a.trim(),option_b:b.trim(),option_c:c.trim(),option_d:d.trim(),correct_answer:ca,explanation:explanation.trim()||null}).eq('id',id);
  if(r.error)return msg('qmsg',r.error.message,true);
  msg('qmsg','✅ প্রশ্ন আপডেট হয়েছে');await loadQuestions();
}

async function deleteQuestion(id){
  const card=$('question-card-'+id),title=card?.querySelector('b')?.textContent||'এই প্রশ্ন';
  if(!confirm('এই প্রশ্নটি স্থায়ীভাবে Delete করবেন?\n\n'+title))return;
  const{error}=await db.from('questions').delete().eq('id',id);
  if(error)return msg('qmsg',error.message,true);
  msg('qmsg','✅ প্রশ্ন Delete হয়েছে');await loadQuestions();
}

async function loadQuestions(){
  let q=db.from('questions').select('id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,question_number,category,source_name,folder_id,set_id,subject_id,subjects(name)').order('id',{ascending:false}).limit(200);
  q=q.eq('category',CATS[cat]);
  if($('filterFolder').value)q=q.eq('folder_id',Number($('filterFolder').value));
  if($('filterSet').value)q=q.eq('set_id',Number($('filterSet').value));
  if($('filterSubject').value)q=q.eq('subject_id',Number($('filterSubject').value));
  const term=$('search').value.trim();if(term)q=q.ilike('question_text','%'+term+'%');
  const{data,error}=await q;if(error)return msg('qmsg',error.message,true);
  const rows=data||[],folderIds=[...new Set(rows.map(x=>x.folder_id).filter(Boolean))],setIds=[...new Set(rows.map(x=>x.set_id).filter(Boolean))];
  const[fr,sr]=await Promise.all([folderIds.length?db.from('question_bank_folders').select('id,folder_name').in('id',folderIds):Promise.resolve({data:[],error:null}),setIds.length?db.from('question_bank_sets').select('id,set_name').in('id',setIds):Promise.resolve({data:[],error:null})]);
  if(fr.error)return msg('qmsg',fr.error.message,true);if(sr.error)return msg('qmsg',sr.error.message,true);
  const fm=new Map((fr.data||[]).map(x=>[String(x.id),x.folder_name])),sm=new Map((sr.data||[]).map(x=>[String(x.id),x.set_name])),ans={A:'ক',B:'খ',C:'গ',D:'ঘ'};
  $('questions').innerHTML=rows.map((x,i)=>{const folder=fm.get(String(x.folder_id))||'—',set=sm.get(String(x.set_id))||'—',correct=ans[x.correct_answer]||x.correct_answer||'—';return `<div class="q" id="question-card-${x.id}" data-question-id="${x.id}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><b>${bn(i+1)}. ${esc(x.question_text)}</b><div class="bank-actions"><button type="button" class="secondary" onclick="editQuestion(${x.id})">✏️ Edit</button><button type="button" class="secondary" onclick="deleteQuestion(${x.id})">🗑️ Delete</button></div></div><div style="margin-top:8px">ক. ${esc(x.option_a)}<br>খ. ${esc(x.option_b)}<br>গ. ${esc(x.option_c)}<br>ঘ. ${esc(x.option_d)}</div><div class="small source-line"><b>Source:</b> <a href="#question-card-${x.id}" onclick="openQuestionSource(${x.id},'${esc(x.category||'')}',${Number(x.folder_id)||0},${Number(x.set_id)||0});return false;">${esc(x.category||'—')} → ${esc(folder)} → ${esc(set)} → প্রশ্ন নং ${bn(x.question_number??'—')}</a>${x.source_name?` · ${esc(x.source_name)}`:''} · বিষয়: ${esc(x.subjects?.name||'—')} · সঠিক: ${esc(correct)}</div>${x.explanation?`<div class="small" style="margin-top:5px">ব্যাখ্যা: ${esc(x.explanation)}</div>`:''}</div>`}).join('')||'কোনো প্রশ্ন নেই';
}

async function goToQuestionSource(questionId,category,folderId,setId){
  const key=String(category||'').trim();
  const found=Object.keys(CATS).find(k=>CATS[k]===key);
  if(found){
    cat=found;
    document.querySelectorAll('.cats button').forEach(b=>b.classList.remove('active'));
    $('cat-'+found)?.classList.add('active');
    $('currentCat').textContent='বর্তমান Category: '+CATS[found];
  }
  $('filterFolder').value='';
  $('filterSet').innerHTML='<option value="">সব Set</option>';
  $('filterSubject').value='';
  $('search').value='';
  await loadFilterFolders();
  if(folderId){
    $('filterFolder').value=String(folderId);
    await loadFilterSets();
    if(setId){$('filterSet').value=String(setId)}
  }
  await loadQuestions();
  const el=$('question-card-'+questionId);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f59e0b';el.style.outlineOffset='3px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset=''},2200)}
}

function ensureQuestionEditor(){
  if($('questionEditor'))return;
  const d=document.createElement('div');
  d.id='questionEditor';
  d.className='hidden';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px;overflow:auto';
  d.innerHTML=`<div class="card" style="width:min(760px,100%);max-height:92vh;overflow:auto">
    <h2>প্রশ্ন Edit</h2>
    <input id="editQno" type="number" placeholder="মূল প্রশ্ন নম্বর">
    <input id="editSource" placeholder="Source / পরীক্ষার নাম">
    <select id="editSubject"></select>
    <textarea id="editQtext" placeholder="প্রশ্ন"></textarea>
    <div class="grid"><input id="editA" placeholder="ক. অপশন"><input id="editB" placeholder="খ. অপশন"><input id="editC" placeholder="গ. অপশন"><input id="editD" placeholder="ঘ. অপশন"></div>
    <div class="grid"><select id="editCorrect"><option value="">সঠিক উত্তর</option><option value="A">ক</option><option value="B">খ</option><option value="C">গ</option><option value="D">ঘ</option></select><input id="editExplanation" placeholder="ব্যাখ্যা"></div>
    <input id="editId" type="hidden">
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" onclick="saveQuestionEdit()">💾 Save</button><button type="button" class="secondary" onclick="closeQuestionEditor()">বাতিল</button></div>
    <p id="editMsg" class="msg"></p>
  </div>`;
  document.body.appendChild(d);
}

async function openQuestionEditor(id){
  ensureQuestionEditor();
  const{data,error}=await db.from('questions').select('id,question_number,source_name,subject_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation').eq('id',id).single();
  if(error)return msg('qmsg',error.message,true);
  $('editId').value=data.id;
  $('editQno').value=data.question_number??'';
  $('editSource').value=data.source_name??'';
  $('editQtext').value=data.question_text??'';
  $('editA').value=data.option_a??'';$('editB').value=data.option_b??'';$('editC').value=data.option_c??'';$('editD').value=data.option_d??'';
  $('editCorrect').value=data.correct_answer??'';$('editExplanation').value=data.explanation??'';
  $('editSubject').innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  $('editSubject').value=data.subject_id??'';
  $('editMsg').textContent='';
  $('questionEditor').style.display='flex';
}
function closeQuestionEditor(){if($('questionEditor'))$('questionEditor').style.display='none'}
async function saveQuestionEdit(){
  const id=Number($('editId').value);
  const p={question_number:$('editQno').value?Number($('editQno').value):null,source_name:$('editSource').value.trim()||null,subject_id:$('editSubject').value?Number($('editSubject').value):null,question_text:$('editQtext').value.trim(),option_a:$('editA').value.trim(),option_b:$('editB').value.trim(),option_c:$('editC').value.trim(),option_d:$('editD').value.trim(),correct_answer:$('editCorrect').value,explanation:$('editExplanation').value.trim()||null};
  if(!p.question_text||!p.option_a||!p.option_b||!p.option_c||!p.option_d||!p.correct_answer)return msg('editMsg','প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',true);
  const{error}=await db.from('questions').update(p).eq('id',id);
  if(error)return msg('editMsg',error.message,true);
  closeQuestionEditor();
  msg('qmsg','✅ প্রশ্ন আপডেট হয়েছে');
  await loadQuestions();
}
async function deleteQuestion(id){
  const card=$('question-card-'+id);
  const title=card?.querySelector('b')?.textContent||'এই প্রশ্ন';
  if(!confirm('এই প্রশ্নটি স্থায়ীভাবে Delete করবেন?\n\n'+title))return;
  const{error}=await db.from('questions').delete().eq('id',id);
  if(error)return msg('qmsg',error.message,true);
  msg('qmsg','✅ প্রশ্ন Delete হয়েছে');
  await loadQuestions();
}
async function createExam(){const name=$('examName').value.trim();if(!name)return msg('examMsg','পরীক্ষার নাম দিন',true);const{data,error}=await db.from('exams').insert({exam_name:name,status:$('examStatus').value,total_questions:0,marks_per_question:1,negative_mark:0,pass_mark:0}).select('id').single();if(error)return msg('examMsg',error.message,true);const s=await db.from('exam_settings').upsert({exam_id:data.id,total_questions:0,total_marks:0,pass_mark:0,duration_minutes:20,marks_per_question:1,negative_mark:0,show_answers:false,multiple_attempts:false,device_attempt_protection:true,random_questions:false,random_options:false},{onConflict:'exam_id'});if(s.error)return msg('examMsg',s.error.message,true);$('examName').value='';msg('examMsg','✅ Exam তৈরি হয়েছে');await loadExams();$('examSelect').value=data.id;loadSettings()}
async function loadExams(){const{data,error}=await db.from('exams').select('id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark').order('id',{ascending:false});if(error)return msg('examMsg',error.message,true);exams=data||[];if($('sExams'))$('sExams').textContent=bn(exams.length);if($('sActive'))$('sActive').textContent=bn(exams.filter(x=>x.status==='active').length);const opt='<option value="">Exam নির্বাচন করুন</option>'+exams.map(x=>`<option value="${x.id}">${esc(x.exam_name)} (#${x.id})</option>`).join('');$('examSelect').innerHTML=opt;$('mapExam').innerHTML=opt;$('exams').innerHTML=exams.map(x=>`<div class="examrow"><b>${esc(x.exam_name)}</b> · ${esc(x.status)} · ${bn(x.total_questions||0)} প্রশ্ন<br><span class="link">${location.origin}${location.pathname.replace(/\/[^/]*$/,'/../')}?exam=${x.id}</span><br><button onclick="copyLink(${x.id})">🔗 Exam Link কপি</button><button class="secondary" onclick="activate(${x.id},'${x.status==='active'?'inactive':'active'}')">${x.status==='active'?'Inactive':'Active'}</button></div>`).join('');const count=await db.from('questions').select('id',{count:'exact',head:true});if($('sQuestions'))$('sQuestions').textContent=bn(count.count||0)}
async function copyLink(id){const base=new URL('../index.html',location.href).href+'?exam='+id;try{await navigator.clipboard.writeText(base);alert('Exam Link copied')}catch(_){prompt('Exam Link',base)}}
async function activate(id,status){const{error}=await db.from('exams').update({status}).eq('id',id);if(error)return msg('examMsg',error.message,true);await loadExams()}
async function loadSettings(){const id=$('examSelect').value;if(!id)return;const{data,error}=await db.from('exam_settings').select('*').eq('exam_id',id).maybeSingle();if(error)return msg('settingsMsg',error.message,true);const s=data||{};$('totalQ').value=s.total_questions??0;$('totalMarks').value=s.total_marks??0;$('pass').value=s.pass_mark??0;$('duration').value=s.duration_minutes??20;$('marks').value=s.marks_per_question??1;$('negative').value=s.negative_mark??0;$('examiner').value=s.examiner_name??'';$('syllabus').value=s.syllabus??'';$('showAnswers').checked=!!s.show_answers;$('multiple').checked=!!s.multiple_attempts;$('device').checked=s.device_attempt_protection!==false;$('randomQ').checked=!!s.random_questions;$('randomO').checked=!!s.random_options;$('startDate').value=s.exam_date||'';$('startTime').value=s.start_time||'';$('endDate').value=s.end_date||'';$('endTime').value=s.end_time||''}
async function saveSettings(){const id=$('examSelect').value;if(!id)return msg('settingsMsg','Exam নির্বাচন করুন',true);const payload={exam_id:id,total_questions:Number($('totalQ').value)||0,total_marks:Number($('totalMarks').value)||0,pass_mark:Number($('pass').value)||0,duration_minutes:Number($('duration').value)||20,marks_per_question:Number($('marks').value)||1,negative_mark:Number($('negative').value)||0,examiner_name:$('examiner').value.trim()||null,syllabus:$('syllabus').value.trim()||null,show_answers:$('showAnswers').checked,multiple_attempts:$('multiple').checked,device_attempt_protection:$('device').checked,random_questions:$('randomQ').checked,random_options:$('randomO').checked,exam_date:$('startDate').value||null,start_time:$('startTime').value||null,end_date:$('endDate').value||null,end_time:$('endTime').value||null};const{error}=await db.from('exam_settings').upsert(payload,{onConflict:'exam_id'});if(error)return msg('settingsMsg',error.message,true);const e=await db.from('exams').update({total_questions:payload.total_questions,marks_per_question:payload.marks_per_question,negative_mark:payload.negative_mark,pass_mark:payload.pass_mark}).eq('id',id);if(e.error)return msg('settingsMsg',e.error.message,true);msg('settingsMsg','✅ Exam Settings সংরক্ষিত হয়েছে');await loadExams()}
async function loadPool(){const examId=$('mapExam').value;if(!examId)return msg('mapMsg','Exam নির্বাচন করুন',true);let q=db.from('questions').select('id,question_text,category,folder_id,set_id,question_number').limit(200);if($('mapFolder').value)q=q.eq('folder_id',Number($('mapFolder').value));if($('mapSet').value)q=q.eq('set_id',Number($('mapSet').value));const{data,error}=await q;if(error)return msg('mapMsg',error.message,true);const existing=await db.from('exam_questions').select('question_id').eq('exam_id',examId);const ids=new Set((existing.data||[]).map(x=>String(x.question_id)));$('pool').innerHTML=(data||[]).map(x=>`<label class="q"><input type="checkbox" class="poolq" value="${x.id}" ${ids.has(String(x.id))?'checked':''}> ${esc(x.question_text)} <span class="small">(${esc(x.category||'')})</span></label>`).join('')+`<button onclick="saveMapping(${examId})">Exam-এ নির্বাচিত প্রশ্ন Save করুন</button>`}
async function saveMapping(examId){const ids=[...document.querySelectorAll('.poolq:checked')].map(x=>Number(x.value));const old=await db.from('exam_questions').delete().eq('exam_id',examId);if(old.error)return msg('mapMsg',old.error.message,true);if(ids.length){const{error}=await db.from('exam_questions').insert(ids.map((id,i)=>({exam_id:examId,question_id:id,question_order:i+1})));if(error)return msg('mapMsg',error.message,true)}await db.from('exams').update({total_questions:ids.length}).eq('id',examId);await db.from('exam_settings').update({total_questions:ids.length}).eq('exam_id',examId);msg('mapMsg',`✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`);await loadExams()}
$('folder').onchange=loadSets;$('filterSubject').onchange=loadQuestions;$('search').oninput=()=>{clearTimeout(window.__qsearch);window.__qsearch=setTimeout(loadQuestions,250)};$('filterFolder').onchange=async()=>{await loadFilterSets();await loadQuestions()};$('mapFolder').onchange=loadMapSets;
selectCategory('verification_test');init();
