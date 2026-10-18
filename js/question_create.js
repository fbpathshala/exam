let CATS = {};

let cat = '';
let subjects = [];
let pendingImportRows = [];

const $ = id => document.getElementById(id);
const bn = n => String(n ?? '').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function client() {
  if (!window.db) throw new Error('Supabase connection লোড হয়নি। পেজটি আবার খুলুন।');
  return window.db;
}

function msg(id, text, err=false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = err ? '#b91c1c' : '#166534';
}

function setupMenu() {
  const btn = $('adminMenuBtn'), panel = $('adminMenuPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('hidden'); });
  document.addEventListener('click', e => { if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden'); });
}

function fillCategorySelect(id, selected=cat) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = '<option value="">ক্যাটাগরি নির্বাচন করুন</option>' + Object.entries(CATS).map(([key,label]) => `<option value="${key}">${esc(label)}</option>`).join('');
  el.value = selected || '';
}

function setCategoryUI() {
  if ($('categorySelect')) $('categorySelect').value = cat;
  if ($('categorySelectManage')) $('categorySelectManage').value = cat;
  ['questionCategory'].forEach(id => { if ($(id)) $(id).value = cat; });
}

async function loadCategories(selected=cat) {
  const {data,error}=await client().from('question_bank_categories').select('id,name').order('name');
  if(error){msg('categoryMsg',error.message,true);return;}
  CATS=Object.fromEntries((data||[]).map(x=>[x.name,x.name]));
  for(const id of ['categorySelect','categorySelectManage','questionCategory','importCategory']) fillCategorySelect(id,selected);
  if(!CATS[cat])cat='';
  setCategoryUI();
}
async function createCategory(){
  const name=$('newCategoryName')?.value.trim();
  if(!name)return msg('categoryMsg','নতুন ক্যাটাগরির নাম লিখুন।',true);
  const {data,error}=await client().from('question_bank_categories').insert({name}).select('id,name').single();
  if(error)return msg('categoryMsg',error.message,true);
  $('newCategoryName').value='';
  cat=data.name;
  await loadCategories(cat);
  await loadFolders();
  await loadImportFolders();
  msg('categoryMsg','✅ নতুন ক্যাটাগরি তৈরি হয়েছে।');
}
async function renameSelectedCategory(){
  const oldName=cat||$('categorySelect')?.value;
  if(!oldName)return msg('categoryMsg','আগে ক্যাটাগরি নির্বাচন করুন।',true);
  const name=prompt('নতুন ক্যাটাগরির নাম লিখুন:',oldName);
  if(name===null)return;
  const value=name.trim();
  if(!value)return msg('categoryMsg','ক্যাটাগরির নাম খালি রাখা যাবে না।',true);
  if(value===oldName)return;
  const {error}=await client().from('question_bank_categories').update({name:value}).eq('name',oldName);
  if(error)return msg('categoryMsg',error.message,true);
  cat=value;
  await loadCategories(value);
  await loadFolders();
  await loadImportFolders();
  msg('categoryMsg','✅ ক্যাটাগরির নাম পরিবর্তন হয়েছে। প্রশ্নের Source-এও নতুন নাম দেখাবে।');
}
async function deleteSelectedCategory(){
  const name=cat||$('categorySelect')?.value;
  if(!name)return msg('categoryMsg','আগে ক্যাটাগরি নির্বাচন করুন।',true);
  const [folders,questions]=await Promise.all([
    client().from('question_bank_folders').select('id',{count:'exact',head:true}).eq('sub_category',name),
    client().from('questions').select('id',{count:'exact',head:true}).eq('category',name)
  ]);
  if(folders.error||questions.error)return msg('categoryMsg',(folders.error||questions.error).message,true);
  if((folders.count||0)||(questions.count||0))return msg('categoryMsg',`❌ এই ক্যাটাগরিতে সাব-ক্যাটাগরি ${bn(folders.count||0)}টি এবং প্রশ্ন ${bn(questions.count||0)}টি আছে। আগে সেগুলো অন্য ক্যাটাগরিতে সরান। কোনো রেকর্ড মুছে ফেলা হয়নি।`,true);
  if(!confirm(`“${name}” ক্যাটাগরি মুছে ফেলবেন?`))return;
  const {error}=await client().from('question_bank_categories').delete().eq('name',name);
  if(error)return msg('categoryMsg',error.message,true);
  cat='';
  await loadCategories('');
  await loadFolders();
  await loadImportFolders();
  msg('categoryMsg','✅ ক্যাটাগরি মুছে ফেলা হয়েছে।');
}

async function login() {
  try {
    msg('loginMsg','Login হচ্ছে...');
    const {error} = await client().auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) return msg('loginMsg', error.message, true);
    await init();
  } catch (e) { msg('loginMsg', e.message || 'Login করতে সমস্যা হয়েছে।', true); }
}

async function logout() { try { await client().auth.signOut(); } finally { location.reload(); } }


const currentDivision = () => new URLSearchParams(location.search).get('division') === 'academic' ? 'academic' : 'job';
function setDivisionSelector(){const el=$('managementSection');if(el)el.value=currentDivision();}
function academicOption(rows,value,label,placeholder){return '<option value="">'+esc(placeholder)+'</option>'+(rows||[]).map(x=>'<option value="'+esc(x[value])+'">'+esc(x[label])+'</option>').join('');}
let academicImportRows = [];
function renderAcademicQuestionUI(){
 const main=document.querySelector('#app main');if(!main)return;
 main.innerHTML = `
 <div class="card category-management-card">
   <div class="category-hero">
     <div class="category-hero-icon" aria-hidden="true">▦</div>
     <div class="category-hero-copy">
       <span class="category-eyebrow">QUESTION ORGANIZATION</span>
       <h2>Academic Care ব্যবস্থাপনা</h2>
       <p>শ্রেণি, বিষয়, অধ্যায় ও সেট নির্বাচন করে প্রশ্নের কাঠামো নির্ধারণ করুন।</p>
     </div>
   </div>
   <div class="category-workflow" aria-label="ব্যবস্থাপনার ধাপ">
     <div class="workflow-step"><span class="workflow-number">০১</span><span>শ্রেণি</span></div>
     <span class="workflow-arrow" aria-hidden="true">›</span>
     <div class="workflow-step"><span class="workflow-number">০২</span><span>বিষয়</span></div>
     <span class="workflow-arrow" aria-hidden="true">›</span>
     <div class="workflow-step"><span class="workflow-number">০৩</span><span>অধ্যায়</span></div>
     <span class="workflow-arrow" aria-hidden="true">›</span>
     <div class="workflow-step"><span class="workflow-number">০৪</span><span>সেট</span></div>
   </div>
   <div class="grid"><div><label for="acCategory">শ্রেণি</label><select id="acCategory"><option value="">শ্রেণি নির্বাচন করুন</option></select></div><div><label for="acFolder">বিষয় / ফোল্ডার</label><select id="acFolder" disabled><option value="">আগে শ্রেণি নির্বাচন করুন</option></select></div><div><label for="acChapter">অধ্যায়</label><select id="acChapter" disabled><option value="">আগে বিষয় নির্বাচন করুন</option></select></div><div><label for="acSet">সেট</label><select id="acSet" disabled><option value="">আগে অধ্যায় নির্বাচন করুন</option></select></div></div>
   <p id="acTaxonomyMsg" class="msg" role="status" aria-live="polite"></p>
 </div>
 <div class="card">
   <div class="section-head"><div><h2>নতুন প্রশ্ন তৈরি</h2><p class="section-note">নির্বাচিত শ্রেণি → বিষয় → অধ্যায় → সেট-এ প্রশ্ন সংরক্ষণ করুন।</p></div></div>
   <div class="destination"><strong>প্রশ্নের গন্তব্য</strong><small>শ্রেণি → বিষয় → অধ্যায় → সেট</small></div>
   <div class="grid"><div><label for="acType">প্রশ্নের ধরন</label><select id="acType"><option value="mcq">MCQ — বহুনির্বাচনী</option><option value="cq">CQ — লিখিত</option></select></div><div><label for="acQuestionNumber">প্রশ্ন নম্বর (ঐচ্ছিক)</label><input id="acQuestionNumber" type="number" min="1" step="1" placeholder="স্বয়ংক্রিয় হবে"></div><div><label for="acMarks">নম্বর</label><input id="acMarks" type="number" min="0" step="0.5" value="1"></div><div><label for="acSubject">বিষয় / টপিক (ঐচ্ছিক)</label><input id="acSubject" placeholder="যেমন: বাংলা ব্যাকরণ"></div></div>
   <div class="field" style="margin:12px 0"><label for="acQuestion">প্রশ্ন</label><textarea id="acQuestion" placeholder="প্রশ্ন লিখুন"></textarea></div>
   <div id="acMcqFields"><div class="grid"><div><label for="acA">ক. অপশন</label><input id="acA" placeholder="ক. অপশন"></div><div><label for="acB">খ. অপশন</label><input id="acB" placeholder="খ. অপশন"></div><div><label for="acC">গ. অপশন</label><input id="acC" placeholder="গ. অপশন"></div><div><label for="acD">ঘ. অপশন</label><input id="acD" placeholder="ঘ. অপশন"></div></div><div class="grid" style="margin-top:12px"><div><label for="acCorrect">সঠিক উত্তর</label><select id="acCorrect"><option value="a">ক</option><option value="b">খ</option><option value="c">গ</option><option value="d">ঘ</option></select></div><div><label for="acExplanation">ব্যাখ্যা (ঐচ্ছিক)</label><input id="acExplanation" placeholder="সঠিক উত্তরের ব্যাখ্যা"></div></div></div>
   <div id="acCqFields" class="hidden"><div class="field"><label for="acCqExplanation">ব্যাখ্যা / শিক্ষকের নোট (ঐচ্ছিক)</label><textarea id="acCqExplanation" placeholder="CQ-এর ব্যাখ্যা বা শিক্ষকের নোট"></textarea></div></div>
   <button id="acSave" type="button">প্রশ্ন Question Bank-এ যোগ করুন</button><p id="acSaveMsg" class="msg" role="status" aria-live="polite"></p>
 </div>
 <div class="card">
   <div class="section-head"><div><h2>CSV / Excel আপলোড</h2><p class="section-note">নির্বাচিত শ্রেণি → বিষয় → অধ্যায় → সেট-এ একসঙ্গে অনেক MCQ যোগ করুন।</p></div><button class="secondary" id="acTemplate" type="button">নমুনা CSV ডাউনলোড</button></div>
   <p class="muted">কলামের নাম: question, option_a, option_b, option_c, option_d, correct_option, marks, subject, explanation। বাংলা কলামের নামও গ্রহণ করা হবে।</p>
   <div class="destination"><strong>প্রশ্নের গন্তব্য</strong><small>আমদানির আগে উপরের শ্রেণি, বিষয়, অধ্যায় ও সেট নির্বাচন করুন।</small></div>
   <div class="field"><label for="acImportFile">CSV / Excel ফাইল (.csv, .xlsx, .xls)</label><input id="acImportFile" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></div>
   <button id="acPreviewImport" type="button" style="margin-top:10px">যাচাই করে Preview দেখুন</button><div id="acImportPreview" class="msg" role="status" aria-live="polite"></div><button id="acImportButton" class="hidden" type="button" style="margin-top:10px">যাচাইকৃত প্রশ্ন Import করুন</button><p id="acImportMsg" class="msg" role="status" aria-live="polite"></p>
 </div>
 <div class="card"><div class="section-head"><div><h2>সাম্প্রতিক সংরক্ষিত প্রশ্ন</h2><p class="section-note">সর্বশেষ ২০টি প্রশ্ন দেখুন।</p></div><button id="acRefresh" class="secondary" type="button">রিফ্রেশ</button></div><div id="acQuestionList" class="itemlist">প্রশ্ন লোড হচ্ছে…</div></div>
 <div class="return-home-wrap"><a class="return-home" href="https://fbpathshala.github.io/home.html">⌂ মূল মেনু / হোম পেইজে ফিরুন</a></div>`;
 $('acCategory').addEventListener('change',loadAcademicFolders);$('acFolder').addEventListener('change',loadAcademicChapters);$('acChapter').addEventListener('change',loadAcademicSets);$('acType').addEventListener('change',syncAcademicType);$('acSave').addEventListener('click',saveAcademicQuestion);$('acRefresh').addEventListener('click',loadAcademicQuestionList);$('acPreviewImport').addEventListener('click',previewAcademicImport);$('acImportButton').addEventListener('click',importAcademicRows);$('acTemplate').addEventListener('click',downloadAcademicTemplate);$('acImportFile').addEventListener('change',()=>{academicImportRows=[];$('acImportPreview').textContent='';$('acImportButton').classList.add('hidden');});loadAcademicCategories();syncAcademicType();loadAcademicQuestionList();
}
function downloadAcademicTemplate(){const rows=[['question','option_a','option_b','option_c','option_d','correct_option','marks','subject','explanation'],['বাংলাদেশের রাজধানী কী?','ঢাকা','চট্টগ্রাম','খুলনা','রাজশাহী','a','1','বাংলাদেশ','বাংলাদেশের রাজধানী ঢাকা।']];const csv='\\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\\r\\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='academic-care-question-template.csv';a.click();URL.revokeObjectURL(url);}
async function previewAcademicImport(){const file=$('acImportFile').files?.[0];if(!file)return msg('acImportMsg','আগে CSV বা Excel ফাইল নির্বাচন করুন।',true);if(!$('acCategory').value||!$('acFolder').value||!$('acChapter').value||!$('acSet').value)return msg('acImportMsg','আগে শ্রেণি, বিষয়, অধ্যায় ও সেট নির্বাচন করুন।',true);if(!window.XLSX)return msg('acImportMsg','Excel/CSV পাঠক লোড হয়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।',true);try{const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});const sheet=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});const norm=s=>String(s??'').trim().toLowerCase().replace(/[\\s_-]+/g,'');const aliases={question:['question','প্রশ্ন'],a:['optiona','option1','কঅপশন','ক'],b:['optionb','option2','খঅপশন','খ'],c:['optionc','option3','গঅপশন','গ'],d:['optiond','option4','ঘঅপশন','ঘ'],correct:['correctoption','correctanswer','answer','সঠিকউত্তর','উত্তর'],marks:['marks','mark','নম্বর'],subject:['subject','topic','বিষয়','টপিক'],explanation:['explanation','ব্যাখ্যা']};const rows=raw.map((r,index)=>{const map={};Object.entries(r).forEach(([k,v])=>map[norm(k)]=String(v??'').trim());const get=k=>{for(const name of aliases[k])if(map[norm(name)]!==undefined)return map[norm(name)];return ''};let correct=get('correct').toLowerCase();if(['ক','a','1','optiona'].includes(correct))correct='a';else if(['খ','b','2','optionb'].includes(correct))correct='b';else if(['গ','c','3','optionc'].includes(correct))correct='c';else if(['ঘ','d','4','optiond'].includes(correct))correct='d';return {row:index+2,question:get('question'),options:[get('a'),get('b'),get('c'),get('d')],correct,marks:get('marks')===''?1:Number(get('marks')),subject:get('subject'),explanation:get('explanation')};}).filter(r=>r.question||r.options.some(Boolean));const invalid=rows.filter(r=>!r.question||r.options.some(x=>!x)||!['a','b','c','d'].includes(r.correct)||!Number.isFinite(r.marks)||r.marks<0);if(!rows.length)throw new Error('ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।');if(invalid.length){academicImportRows=[];$('acImportButton').classList.add('hidden');$('acImportPreview').textContent='';throw new Error('মোট '+bn(rows.length)+'টি প্রশ্নের মধ্যে '+bn(invalid.length)+'টিতে ভুল আছে। প্রশ্ন, চারটি অপশন, সঠিক উত্তর (ক/খ/গ/ঘ বা a/b/c/d) ও নম্বর যাচাই করুন। ভুল সারি: '+invalid.slice(0,8).map(x=>bn(x.row)).join(', '));}academicImportRows=rows;$('acImportPreview').innerHTML='<div class="notice">যাচাই সফল: '+bn(rows.length)+'টি MCQ পাওয়া গেছে। প্রথম ৫টি প্রশ্নের Preview:</div>'+rows.slice(0,5).map((r,i)=>'<div class="item"><strong>'+bn(i+1)+'. '+esc(r.question)+'</strong><div class="muted">ক. '+esc(r.options[0])+' · খ. '+esc(r.options[1])+' · গ. '+esc(r.options[2])+' · ঘ. '+esc(r.options[3])+' · সঠিক উত্তর: '+({'a':'ক','b':'খ','c':'গ','d':'ঘ'}[r.correct])+'</div></div>').join('');$('acImportButton').classList.remove('hidden');msg('acImportMsg','Preview ঠিক থাকলে Import বাটনে চাপুন।');}catch(e){msg('acImportMsg','ফাইল যাচাই হয়নি: '+(e.message||String(e)),true);}}
async function importAcademicRows(){if(!academicImportRows.length)return msg('acImportMsg','আগে ফাইল Preview করে যাচাই করুন।',true);const category=Number($('acCategory').value),folder=Number($('acFolder').value),chapter=Number($('acChapter').value),set=Number($('acSet').value);if(!category||!folder||!chapter||!set)return msg('acImportMsg','শ্রেণি, বিষয়, অধ্যায় ও সেট নির্বাচন করুন।',true);if(!confirm('যাচাইকৃত '+bn(academicImportRows.length)+'টি MCQ Academic Care Question Bank-এ যোগ করবেন?'))return;const button=$('acImportButton');button.disabled=true;let done=0;try{const last=await client().from('academic_care_question_bank_items').select('sort_order').eq('set_id',set).order('sort_order',{ascending:false}).limit(1);if(last.error)throw last.error;let order=Number(last.data?.[0]?.sort_order||0);for(const r of academicImportRows){order++;const inserted=await client().from('academic_care_question_bank_items').insert({question_text:r.question,explanation:r.explanation||null,question_type:'mcq',options:r.options.map((text,i)=>({value:'abcd'[i],text})),marks:r.marks,sort_order:order,category_id:category,folder_id:folder,chapter_id:chapter,set_id:set,subject:r.subject||null}).select('id').single();if(inserted.error)throw new Error('সারি '+bn(r.row||done+2)+': '+inserted.error.message);const key=await client().from('academic_care_question_bank_answer_keys').insert({question_id:inserted.data.id,correct_option:r.correct});if(key.error){await client().from('academic_care_question_bank_items').delete().eq('id',inserted.data.id);throw new Error('সারি '+bn(r.row||done+2)+'-এর সঠিক উত্তর সংরক্ষণ হয়নি: '+key.error.message);}done++;msg('acImportMsg','সংরক্ষণ হচ্ছে: '+bn(done)+' / '+bn(academicImportRows.length));}academicImportRows=[];$('acImportFile').value='';$('acImportPreview').textContent='';button.classList.add('hidden');msg('acImportMsg','সফলভাবে '+bn(done)+'টি প্রশ্ন আমদানি হয়েছে।');await loadAcademicQuestionList();}catch(e){msg('acImportMsg','আমদানি আংশিক হয়েছে: '+bn(done)+'টি সংরক্ষিত। '+(e.message||String(e)),true);}finally{button.disabled=false;}}

async function loadAcademicCategories(){const r=await client().from('academic_care_categories').select('id,name').order('name');if(r.error){msg('acTaxonomyMsg','শ্রেণি লোড হয়নি: '+r.error.message,true);return;}$('acCategory').innerHTML=academicOption(r.data,'id','name','শ্রেণি নির্বাচন করুন');}
async function loadAcademicFolders(){const id=$('acCategory').value;$('acFolder').innerHTML='<option value="">বিষয় নির্বাচন করুন</option>';$('acFolder').disabled=true;$('acChapter').innerHTML='<option value="">আগে বিষয় নির্বাচন করুন</option>';$('acChapter').disabled=true;$('acSet').innerHTML='<option value="">আগে অধ্যায় নির্বাচন করুন</option>';$('acSet').disabled=true;if(!id)return;const r=await client().from('academic_care_folders').select('id,folder_name').eq('category_id',Number(id)).order('folder_name');if(r.error){msg('acTaxonomyMsg','বিষয় লোড হয়নি: '+r.error.message,true);return;}$('acFolder').innerHTML=academicOption(r.data,'id','folder_name','বিষয় নির্বাচন করুন');$('acFolder').disabled=!(r.data||[]).length;}
async function loadAcademicChapters(){const id=$('acFolder').value;$('acChapter').innerHTML='<option value="">অধ্যায় নির্বাচন করুন</option>';$('acChapter').disabled=true;$('acSet').innerHTML='<option value="">আগে অধ্যায় নির্বাচন করুন</option>';$('acSet').disabled=true;if(!id)return;const r=await client().from('academic_care_chapters').select('id,chapter_name').eq('folder_id',Number(id)).order('chapter_name');if(r.error){msg('acTaxonomyMsg','অধ্যায় লোড হয়নি: '+r.error.message,true);return;}$('acChapter').innerHTML=academicOption(r.data,'id','chapter_name','অধ্যায় নির্বাচন করুন');$('acChapter').disabled=!(r.data||[]).length;}
async function loadAcademicSets(){const id=$('acChapter').value;$('acSet').innerHTML='<option value="">সেট নির্বাচন করুন</option>';$('acSet').disabled=true;if(!id)return;const r=await client().from('academic_care_sets').select('id,set_name').eq('chapter_id',Number(id)).order('set_name');if(r.error){msg('acTaxonomyMsg','সেট লোড হয়নি: '+r.error.message,true);return;}$('acSet').innerHTML=academicOption(r.data,'id','set_name','সেট নির্বাচন করুন');$('acSet').disabled=!(r.data||[]).length;}
function syncAcademicType(){const mcq=$('acType')?.value==='mcq';$('acMcqFields')?.classList.toggle('hidden',!mcq);$('acCqFields')?.classList.toggle('hidden',mcq);['acA','acB','acC','acD'].forEach(id=>{if($(id))$(id).required=mcq;});}
async function saveAcademicQuestion(){
 const category=$('acCategory').value,folder=$('acFolder').value,chapter=$('acChapter').value,set=$('acSet').value;if(!category||!folder||!chapter||!set)return msg('acSaveMsg','শ্রেণি, বিষয়, অধ্যায় ও সেট নির্বাচন করুন।',true);
 const question=$('acQuestion').value.trim(),type=$('acType').value,marks=Number($('acMarks').value);if(!question)return msg('acSaveMsg','প্রশ্ন লিখুন।',true);if(!Number.isFinite(marks)||marks<0)return msg('acSaveMsg','নম্বর শূন্য বা তার বেশি হতে হবে।',true);
 const opts=['acA','acB','acC','acD'].map(id=>$(id).value.trim());if(type==='mcq'&&opts.some(x=>!x))return msg('acSaveMsg','MCQ-এর চারটি অপশন পূরণ করুন।',true);
 const orderResult=await client().from('academic_care_question_bank_items').select('sort_order').eq('set_id',Number(set)).order('sort_order',{ascending:false}).limit(1);if(orderResult.error)return msg('acSaveMsg','সেটের প্রশ্নক্রম যাচাই হয়নি: '+orderResult.error.message,true);const requestedOrder=$('acQuestionNumber').value.trim();if(requestedOrder&&(!Number.isInteger(Number(requestedOrder))||Number(requestedOrder)<1))return msg('acSaveMsg','প্রশ্ন নম্বর ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।',true);const nextOrder=requestedOrder?Number(requestedOrder):(orderResult.data&&orderResult.data.length?Number(orderResult.data[0].sort_order)||0:0)+1;
 const payload={question_text:question,explanation:(type==='mcq'?$('acExplanation').value:$('acCqExplanation').value).trim()||null,question_type:type,options:type==='mcq'?opts.map((text,i)=>({value:'abcd'[i],text})):[],marks,sort_order:nextOrder,category_id:Number(category),folder_id:Number(folder),chapter_id:Number(chapter),set_id:Number(set),subject:$('acSubject').value.trim()||null};
 $('acSave').disabled=true;try{const created=await client().from('academic_care_question_bank_items').insert(payload).select('id').single();if(created.error)throw created.error;if(type==='mcq'){const key=await client().from('academic_care_question_bank_answer_keys').insert({question_id:created.data.id,correct_option:$('acCorrect').value});if(key.error){await client().from('academic_care_question_bank_items').delete().eq('id',created.data.id);throw new Error('সঠিক উত্তর সংরক্ষণ হয়নি: '+key.error.message);}}msg('acSaveMsg','প্রশ্ন সফলভাবে Academic Care Question Bank-এ সংরক্ষিত হয়েছে।');['acQuestion','acSubject','acA','acB','acC','acD','acExplanation','acCqExplanation','acQuestionNumber'].forEach(id=>{if($(id))$(id).value='';});$('acMarks').value='1';await loadAcademicQuestionList();}catch(e){msg('acSaveMsg','প্রশ্ন সংরক্ষণ হয়নি: '+(e.message||String(e)),true);}finally{$('acSave').disabled=false;}
}
async function loadAcademicQuestionList(){const el=$('acQuestionList');if(!el)return;el.textContent='প্রশ্ন লোড হচ্ছে…';try{const r=await client().from('academic_care_question_bank_items').select('id,question_text,question_type,marks,subject,created_at').order('created_at',{ascending:false}).limit(20);if(r.error)throw r.error;if(!r.data?.length){el.textContent='এখনো কোনো মাস্টার প্রশ্ন নেই।';return;}el.innerHTML=r.data.map((x,i)=>'<div class="q"><b>'+bn(i+1)+'. ['+(x.question_type==='mcq'?'MCQ':'CQ')+'] '+esc(x.question_text)+'</b><div class="muted">নম্বর: '+bn(x.marks??1)+(x.subject?' · বিষয়: '+esc(x.subject):'')+'</div></div>').join('');}catch(e){el.textContent='প্রশ্ন তালিকা লোড হয়নি: '+(e.message||String(e));}}

async function init() {
  setupMenu();
  try {
    const {data,error} = await client().auth.getSession();
    if (error) return msg('loginMsg', error.message, true);
    if (!data.session) return;
    $('login')?.classList.add('hidden');
    $('app')?.classList.remove('hidden');
    setDivisionSelector();
    if(currentDivision()==='academic'){renderAcademicQuestionUI();return;}
    await loadCategories();
    fillCategorySelect('questionCategory');
    $('categorySelect')?.addEventListener('change', e => selectCategory(e.target.value));
    $('categorySelectManage')?.addEventListener('change', e => selectCategory(e.target.value));
    $('createCategoryBtn')?.addEventListener('click', createCategory);
    await loadSubjects();
    fillCategorySelect('importCategory');
    setCategoryUI();
    await loadFolders();
    await loadImportFolders();
  } catch (e) { msg('loginMsg', e.message || 'পেজ প্রস্তুত করতে সমস্যা হয়েছে।', true); }
}

async function loadSubjects() {
  const {data,error} = await client().from('subjects').select('id,name').order('id');
  if (error) return msg('loginMsg', error.message, true);
  subjects = data || [];
  const el = $('subject');
  if (el) {
    el.innerHTML = '<option value="">বিষয় নির্বাচন করুন</option>' + subjects.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    el.disabled = !($('questionSet')?.value);
  }
}

async function selectCategory(c) {
  cat = CATS[c] ? c : '';
  setCategoryUI();
  // A parent change must clear every dependent selection before loading new children.
  for (const id of ['manageFolder','setManageFolder','questionFolder','manageSet','questionSet']) {
    const el=$(id); if(el){el.value='';el.disabled=true;}
  }
  await loadFolders();
}

async function loadFolders(preferredFolderId=null) {
  try {
    if (!cat || !CATS[cat]) {
      for (const id of ['manageFolder','setManageFolder','questionFolder']) {
        if ($(id)) { $(id).innerHTML = '<option value="">আগে ক্যাটাগরি নির্বাচন করুন</option>'; $(id).value=''; $(id).disabled=true; }
      }
      for (const id of ['manageSet','questionSet']) {
        if ($(id)) { $(id).innerHTML = '<option value="">আগে সাব-ক্যাটাগরি নির্বাচন করুন</option>'; $(id).value=''; $(id).disabled=true; }
      }
      return;
    }
    const {data,error} = await client().from('question_bank_folders').select('id,folder_name').eq('sub_category', CATS[cat]).order('folder_name');
    if (error) throw error;
    const rows = data || [];

    for (const id of ['manageFolder','setManageFolder','questionFolder']) {
      const el = $(id);
      if (!el) continue;
      el.innerHTML = '<option value="">সাব-ক্যাটাগরি নির্বাচন করুন</option>' + rows.map(x => `<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
      el.disabled = rows.length === 0;
      if (preferredFolderId && rows.some(x => String(x.id) === String(preferredFolderId))) el.value = String(preferredFolderId);
    }

    await loadSets();
  } catch (e) { msg('folderMsg', e.message || 'সাব-ক্যাটাগরি লোড করতে সমস্যা হয়েছে।', true); }
}

async function loadSets(preferredSetId=null) {
  const qFolder = $('questionFolder')?.value || '';
  const manageFolder = $('setManageFolder')?.value || '';
  const folderId = qFolder || manageFolder;
  try {
    if (!folderId) {
      ['manageSet','questionSet'].forEach(id => { if ($(id)) { $(id).innerHTML = '<option value="">আগে সাব-ক্যাটাগরি নির্বাচন করুন</option>'; $(id).value=''; $(id).disabled=true; } });
      return;
    }
    const {data,error} = await client().from('question_bank_sets').select('id,set_name').eq('folder_id', Number(folderId)).order('set_name');
    if (error) throw error;
    const rows = data || [];
    for (const id of ['manageSet','questionSet']) {
      const el = $(id);
      if (!el) continue;
      el.innerHTML = '<option value="">Set নির্বাচন করুন</option>' + rows.map(x => `<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
      el.disabled = rows.length === 0;
      if (preferredSetId && rows.some(x => String(x.id) === String(preferredSetId))) el.value = String(preferredSetId);
      if (id === 'questionSet' && $('subject')) $('subject').disabled = !el.value;
    }
  } catch (e) { msg('folderMsg', e.message || 'Set লোড করতে সমস্যা হয়েছে।', true); }
}

async function loadImportFolders(preferredFolderId=null) {
  const categoryKey = $('importCategory')?.value || '';
  const categoryLabel = CATS[categoryKey];
  const el = $('importFolder');
  if (!el) return;
  if (!categoryKey || !categoryLabel) {
    el.innerHTML = '<option value="">আগে ক্যাটাগরি নির্বাচন করুন</option>'; el.value=''; el.disabled=true;
    const setEl = $('importSet');
    if (setEl) { setEl.innerHTML = '<option value="">আগে সাব-ক্যাটাগরি নির্বাচন করুন</option>'; setEl.value=''; setEl.disabled=true; }
    return;
  }
  try {
    const {data,error} = await client().from('question_bank_folders').select('id,folder_name').eq('sub_category', categoryLabel).order('folder_name');
    if (error) throw error;
    const rows = data || [];
    el.innerHTML = '<option value="">সাব-ক্যাটাগরি নির্বাচন করুন</option>' + rows.map(x => `<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
    el.disabled = rows.length === 0;
    if (preferredFolderId && rows.some(x => String(x.id) === String(preferredFolderId))) el.value = String(preferredFolderId);
    await loadImportSets();
  } catch(e) { msg('importMsg', e.message || 'CSV/Excel-এর সাব-ক্যাটাগরি লোড করতে সমস্যা হয়েছে।', true); }
}

async function loadImportSets(preferredSetId=null) {
  const folderId = $('importFolder')?.value || '';
  const el = $('importSet');
  if (!el) return;
  if (!folderId) { el.innerHTML = '<option value="">আগে সাব-ক্যাটাগরি নির্বাচন করুন</option>'; el.value=''; el.disabled=true; return; }
  try {
    const {data,error} = await client().from('question_bank_sets').select('id,set_name').eq('folder_id', Number(folderId)).order('set_name');
    if (error) throw error;
    const rows = data || [];
    el.innerHTML = '<option value="">Set নির্বাচন করুন</option>' + rows.map(x => `<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
    el.disabled = rows.length === 0;
    if (preferredSetId && rows.some(x => String(x.id) === String(preferredSetId))) el.value = String(preferredSetId);
  } catch(e) { msg('importMsg', e.message || 'CSV/Excel-এর Set লোড করতে সমস্যা হয়েছে।', true); }
}

function syncFolderSelection(sourceId) {
  const value = $(sourceId)?.value || '';
  ['manageFolder','setManageFolder','questionFolder'].forEach(id => { if ($(id) && id !== sourceId) $(id).value = value; });
  loadSets();
}

async function createFolder() {
  if (!cat || !CATS[cat]) return msg('folderMsg','আগে ক্যাটাগরি নির্বাচন করুন।',true);
  const name = $('newFolder')?.value.trim();
  if (!name) return msg('folderMsg','নতুন সাব-ক্যাটাগরির নাম দিন।',true);
  try {
    msg('folderMsg','সাব-ক্যাটাগরি তৈরি হচ্ছে...');
    const {data,error} = await client().from('question_bank_folders').insert({sub_category:CATS[cat],folder_name:name}).select('id').single();
    if (error) throw error;
    $('newFolder').value = '';
    await loadFolders(data?.id);
    msg('folderMsg','✅ সাব-ক্যাটাগরি সফলভাবে তৈরি হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

async function createSet() {
  const folderId = $('setManageFolder')?.value || $('questionFolder')?.value;
  const name = $('newSet')?.value.trim();
  if (!folderId) return msg('folderMsg','আগে সাব-ক্যাটাগরি নির্বাচন করুন।',true);
  if (!name) return msg('folderMsg','নতুন Set-এর নাম দিন।',true);
  try {
    msg('folderMsg','Set তৈরি হচ্ছে...');
    const {data,error} = await client().from('question_bank_sets').insert({folder_id:Number(folderId),set_name:name}).select('id').single();
    if (error) throw error;
    $('newSet').value = '';
    syncFolderSelection('setManageFolder');
    await loadSets(data?.id);
    if ($('questionSet')) $('questionSet').value = String(data?.id || '');
    msg('folderMsg','✅ Set সফলভাবে তৈরি হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

async function renameSelectedFolder() {
  const id = $('manageFolder')?.value;
  if (!id) return msg('folderMsg','আগে সাব-ক্যাটাগরি নির্বাচন করুন।',true);
  const old = $('manageFolder').selectedOptions[0]?.textContent || '';
  const name = prompt('নতুন সাব-ক্যাটাগরির নাম লিখুন:', old);
  if (name === null) return;
  const value = name.trim();
  if (!value) return msg('folderMsg','সাব-ক্যাটাগরির নাম খালি রাখা যাবে না।',true);
  if (value === old) return;
  try {
    msg('folderMsg','সাব-ক্যাটাগরির নাম পরিবর্তন হচ্ছে...');
    const {error} = await client().from('question_bank_folders').update({folder_name:value}).eq('id',Number(id));
    if (error) throw error;
    await loadFolders(id);
    msg('folderMsg','✅ সাব-ক্যাটাগরির নাম পরিবর্তন হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

async function deleteSelectedFolder() {
  const id = $('manageFolder')?.value;
  if (!id) return msg('folderMsg','আগে সাব-ক্যাটাগরি নির্বাচন করুন।',true);
  const name = $('manageFolder').selectedOptions[0]?.textContent || 'এই সাব-ক্যাটাগরি';
  try {
    const check = await client().from('question_bank_sets').select('id',{count:'exact',head:true}).eq('folder_id',Number(id));
    if (check.error) throw check.error;
    const count = check.count || 0;
    if (count) return msg('folderMsg',`❌ "${name}" সাব-ক্যাটাগরির মধ্যে ${bn(count)}টি Set আছে। আগে সব Set সরাতে হবে; নিরাপত্তার জন্য সাব-ক্যাটাগরি Delete করা যাবে না।`,true);
    if (!confirm(`"${name}" সাব-ক্যাটাগরি মুছে ফেলবেন?`)) return;
    msg('folderMsg','সাব-ক্যাটাগরি মুছে ফেলা হচ্ছে...');
    const {error} = await client().from('question_bank_folders').delete().eq('id',Number(id));
    if (error) throw error;
    await loadFolders();
    msg('folderMsg','✅ সাব-ক্যাটাগরি মুছে ফেলা হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

async function renameSelectedSet() {
  const id = $('manageSet')?.value;
  if (!id) return msg('folderMsg','আগে Set নির্বাচন করুন।',true);
  const old = $('manageSet').selectedOptions[0]?.textContent || '';
  const name = prompt('নতুন Set-এর নাম লিখুন:', old);
  if (name === null) return;
  const value = name.trim();
  if (!value) return msg('folderMsg','Set-এর নাম খালি রাখা যাবে না।',true);
  if (value === old) return;
  try {
    msg('folderMsg','Set Rename হচ্ছে...');
    const {error} = await client().from('question_bank_sets').update({set_name:value}).eq('id',Number(id));
    if (error) throw error;
    await loadSets(id);
    msg('folderMsg','✅ Set-এর নাম পরিবর্তন হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

async function deleteSelectedSet() {
  const id = $('manageSet')?.value;
  if (!id) return msg('folderMsg','আগে Set নির্বাচন করুন।',true);
  const name = $('manageSet').selectedOptions[0]?.textContent || 'এই Set';
  try {
    const check = await client().from('questions').select('id',{count:'exact',head:true}).eq('set_id',Number(id));
    if (check.error) throw check.error;
    const count = check.count || 0;
    if (count) return msg('folderMsg',`❌ "${name}" Set-এর মধ্যে ${bn(count)}টি প্রশ্ন আছে। আগে প্রশ্নগুলো অন্য Set-এ Move করতে হবে; নিরাপত্তার জন্য Set Delete করা যাবে না।`,true);
    if (!confirm(`"${name}" Set Delete করবেন?`)) return;
    msg('folderMsg','Set Delete হচ্ছে...');
    const {error} = await client().from('question_bank_sets').delete().eq('id',Number(id));
    if (error) throw error;
    await loadSets();
    msg('folderMsg','✅ Set Delete হয়েছে।');
  } catch(e) { msg('folderMsg',e.message,true); }
}

function norm(value) { return String(value ?? '').replace(/\uFEFF/g,'').replace(/\u00A0/g,' ').trim().replace(/\s+/g,' ').replace(/[‐‑‒–—−]/g,'-').toLowerCase(); }
function normalizeCategory(value) {
  const dynamic=Object.keys(CATS).find(name=>norm(name)===norm(value));
  if(dynamic)return dynamic;
  const aliases = {'নিয়োগ পরীক্ষা':'নিয়োগ পরীক্ষা','নিয়োগ':'নিয়োগ পরীক্ষা','নিয়োগ পরীক্ষা':'নিয়োগ পরীক্ষা','নিয়োগ':'নিয়োগ পরীক্ষা','recruitment':'নিয়োগ পরীক্ষা','recruitment exam':'নিয়োগ পরীক্ষা','যাচাই পরীক্ষা':'যাচাই পরীক্ষা','যাচাই':'যাচাই পরীক্ষা','verification':'যাচাই পরীক্ষা','verification test':'যাচাই পরীক্ষা','সাম্প্রতিক প্রশ্ন':'সাম্প্রতিক প্রশ্নোত্তর','সাম্প্রতিক':'সাম্প্রতিক প্রশ্নোত্তর','recent':'সাম্প্রতিক প্রশ্নোত্তর','recent questions':'সাম্প্রতিক প্রশ্নোত্তর'};
  return aliases[norm(value)] || null;
}
function normalizeHeader(value) { return norm(value).replace(/[\s\-]+/g,'_'); }
const HEADER_ALIASES = {question:['question'],option_a:['option_a'],option_b:['option_b'],option_c:['option_c'],option_d:['option_d'],correct_answer:['correct_answer'],question_number:['question_number'],subject:['subject'],explanation:['explanation'],category:['category']};
const REQUIRED_HEADERS = ['question','option_a','option_b','option_c','option_d','correct_answer'];
function canonicalHeader(value) { const h=normalizeHeader(value); for(const [canonical,aliases] of Object.entries(HEADER_ALIASES)){ if(aliases.some(a=>normalizeHeader(a)===h)) return canonical; } return null; }
function validateHeaders(rows) {
  if (!rows.length) throw new Error('ফাইলে কোনো data row পাওয়া যায়নি।');
  const originalHeaders=Object.keys(rows[0]||{}); if(!originalHeaders.length) throw new Error('ফাইলের header পাওয়া যায়নি।');
  const canonical=originalHeaders.map(canonicalHeader); const unknown=originalHeaders.filter((h,i)=>!canonical[i]);
  if(unknown.length) throw new Error(`অপরিচিত column পাওয়া গেছে: ${unknown.join(', ')}। Template-এর column ব্যবহার করুন।`);
  const duplicates=canonical.filter((h,i,a)=>h&&a.indexOf(h)!==i); if(duplicates.length) throw new Error(`একই column একাধিকবার আছে: ${[...new Set(duplicates)].join(', ')}`);
  const missing=REQUIRED_HEADERS.filter(h=>!canonical.includes(h)); if(missing.length) throw new Error(`Required column নেই: ${missing.join(', ')}`);
}
function remapRows(rows){return rows.map(row=>{const out={};Object.entries(row).forEach(([key,value])=>{const canonical=canonicalHeader(key);if(canonical)out[canonical]=String(value??'').trim();});return out;});}
async function ensureXLSX(){
  if(window.XLSX)return;
  await new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-question-xlsx="1"]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Excel/CSV library লোড হয়নি।')),{once:true});return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.async=true;s.dataset.questionXlsx='1';s.onload=resolve;s.onerror=()=>reject(new Error('Excel/CSV library লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।'));document.head.appendChild(s);});
  if(!window.XLSX)throw new Error('Excel/CSV library পাওয়া যায়নি।');
}
async function template(){const headers=['question','option_a','option_b','option_c','option_d','correct_answer','question_number','subject','explanation','category'];const example=['বাংলাদেশের রাজধানী কোনটি?','ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','A','1','বাংলাদেশ','',CATS[cat]];await ensureXLSX();const ws=XLSX.utils.aoa_to_sheet([headers,example]);ws['!cols']=[{wch:35},{wch:20},{wch:20},{wch:20},{wch:20},{wch:16},{wch:18},{wch:20},{wch:35},{wch:22}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Questions');XLSX.writeFile(wb,'question-import-template.xlsx');}
async function readWorkbook(file){await ensureXLSX();const buffer=await file.arrayBuffer();const wb=XLSX.read(buffer,{type:'array',raw:false,cellText:true,cellDates:false});if(!wb.SheetNames?.length)throw new Error('Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।');const sheet=wb.Sheets[wb.SheetNames[0]];if(!sheet)throw new Error('Excel/CSV ফাইলে কোনো Sheet পাওয়া যায়নি।');const rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});validateHeaders(rows);return remapRows(rows);}
function showImportButton(show){const el=$('importBtn');if(!el)return;el.disabled=!show;el.classList.toggle('hidden',!show);}
function renderPreview(rows,failed=[]){const box=$('importPreview');if(!box)return;const parts=[`<b>মোট Row: ${bn(rows.length)}</b>`];if(failed.length){parts.push('<div style="margin-top:10px"><b>যেসব Row-তে সমস্যা:</b></div>');parts.push(failed.slice(0,100).map(x=>`<div class="q">${esc(x)}</div>`).join(''));}const sample=rows.slice(0,5);if(sample.length){parts.push('<div style="margin-top:10px"><b>Preview:</b></div>');parts.push(sample.map((r,i)=>`<div class="q"><b>Row ${bn(i+2)}</b><br>${esc(r.question||'(question খালি)')}</div>`).join(''));}box.innerHTML=parts.join('');}
async function previewImport(){const file=$('importFile')?.files?.[0];if(!file)return msg('importMsg','আগে CSV/Excel ফাইল নির্বাচন করুন।',true);if(!$('importCategory')?.value||!$('importFolder')?.value||!$('importSet')?.value)return msg('importMsg','আগে প্রশ্নের গন্তব্য Category → সাব-ক্যাটাগরি → সেট নির্বাচন করুন।',true);showImportButton(false);msg('importMsg','ফাইল যাচাই করা হচ্ছে...');try{const rows=await readWorkbook(file);const failed=validateRows(rows);pendingImportRows=rows.filter((_,i)=>!failed.some(x=>x.rowIndex===i));renderPreview(rows,failed.map(x=>`Row ${x.rowNo}: ${x.message}`));if(!pendingImportRows.length)return msg('importMsg','কোনো valid Row পাওয়া যায়নি।',true);showImportButton(true);msg('importMsg',`মোট ${bn(rows.length)}টি Row | Valid ${bn(pendingImportRows.length)} | Invalid ${bn(rows.length-pendingImportRows.length)}${failed.length?' — Invalid Row বাদ থাকবে।':''}`,failed.length>0);}catch(err){pendingImportRows=[];if($('importPreview'))$('importPreview').innerHTML='';msg('importMsg',err.message||'ফাইল যাচাই করতে সমস্যা হয়েছে।',true);}}
function validateRows(rows){const failed=[];rows.forEach((row,i)=>{const rowNo=i+2;const missing=[];if(!row.question)missing.push('question');if(!row.option_a)missing.push('option_a');if(!row.option_b)missing.push('option_b');if(!row.option_c)missing.push('option_c');if(!row.option_d)missing.push('option_d');if(!row.correct_answer)missing.push('correct_answer');if(missing.length)failed.push({rowIndex:i,rowNo,message:`Required field খালি — ${missing.join(', ')}`});const correct=String(row.correct_answer||'').trim().toUpperCase();if(correct&&!['A','B','C','D'].includes(correct))failed.push({rowIndex:i,rowNo,message:'correct_answer অবশ্যই A, B, C অথবা D হতে হবে।'});if(String(row.question_number??'').trim()!==''){const n=Number(String(row.question_number).trim());if(!Number.isFinite(n)||n<=0||!Number.isInteger(n))failed.push({rowIndex:i,rowNo,message:'question_number অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।'});}if(String(row.category??'').trim()&&!normalizeCategory(row.category))failed.push({rowIndex:i,rowNo,message:`category "${row.category}" পরিচিত Category নয়।`});if(String(row.subject??'').trim()){const found=subjects.find(s=>norm(s.name)===norm(row.subject));if(!found)failed.push({rowIndex:i,rowNo,message:`subject "${row.subject}" পাওয়া যায়নি।`});}});return failed.filter((x,i,a)=>a.findIndex(y=>y.rowIndex===x.rowIndex)===i);}
async function importRows(){const file=$('importFile')?.files?.[0];if(!file)return msg('importMsg','আগে CSV/Excel ফাইল নির্বাচন করুন।',true);const categoryKey=$('importCategory')?.value||'',folderId=$('importFolder')?.value,setId=$('importSet')?.value;if(!categoryKey||!folderId||!setId)return msg('importMsg','আগে প্রশ্নের গন্তব্য Category → সাব-ক্যাটাগরি → সেট নির্বাচন করুন।',true);let rows=pendingImportRows;if(!rows.length){try{rows=await readWorkbook(file);}catch(err){return msg('importMsg',err.message||'ফাইল পড়তে সমস্যা হয়েছে।',true);}const failed=validateRows(rows);rows=rows.filter((_,i)=>!failed.some(x=>x.rowIndex===i));}if(!rows.length)return msg('importMsg','কোনো valid প্রশ্ন পাওয়া যায়নি।',true);showImportButton(false);msg('importMsg','Database-এ প্রশ্ন যোগ হচ্ছে...');const payload=rows.map(row=>{let questionNumber=null;if(String(row.question_number??'').trim()!=='')questionNumber=Number(row.question_number);let subjectId=null;if(String(row.subject??'').trim()){const found=subjects.find(s=>norm(s.name)===norm(row.subject));subjectId=found?.id??null;}return{folder_id:Number(folderId),set_id:Number(setId),subject_id:subjectId,category:CATS[categoryKey],question_number:questionNumber,question_text:String(row.question??'').trim(),option_a:String(row.option_a??'').trim(),option_b:String(row.option_b??'').trim(),option_c:String(row.option_c??'').trim(),option_d:String(row.option_d??'').trim(),correct_answer:String(row.correct_answer??'').trim().toUpperCase(),explanation:String(row.explanation??'').trim()||null};});const {error}=await client().from('questions').insert(payload);pendingImportRows=[];if(error){if($('importPreview'))$('importPreview').innerHTML=`<div class="q">${esc(error.message)}</div>`;return msg('importMsg',`Database-এ কোনো প্রশ্ন যোগ হয়নি। ${error.message}`,true);}if($('importPreview'))$('importPreview').innerHTML='';if($('importFile'))$('importFile').value='';msg('importMsg',`সফলভাবে ${bn(payload.length)}টি প্রশ্ন যোগ হয়েছে।`);}
function syncQuestionType(){const type=$('questionType')?.value||'mcq';$('mcqFields')?.classList.toggle('hidden',type!=='mcq');$('cqFields')?.classList.toggle('hidden',type!=='cq');}
async function addManual(){
 const folderId=$('questionFolder')?.value,setId=$('questionSet')?.value,type=$('questionType')?.value||'mcq';
 if(!folderId||!setId)return msg('manualMsg','আগে প্রশ্নের সাব-ক্যাটাগরি এবং সেট নির্বাচন করুন।',true);
 const question=$('question')?.value.trim(),qnoRaw=$('questionNumber')?.value.trim()||'',subjectId=$('subject')?.value||null;
 if(!question)return msg('manualMsg','প্রশ্ন লিখুন।',true);
 if(!subjectId)return msg('manualMsg','প্রশ্নের বিষয় নির্বাচন করুন।',true);
 let questionNumber=null;if(qnoRaw){const n=Number(qnoRaw);if(!Number.isInteger(n)||n<=0)return msg('manualMsg','প্রশ্ন নম্বর অবশ্যই ০-এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।',true);questionNumber=n;}
 let payload={folder_id:Number(folderId),set_id:Number(setId),subject_id:Number(subjectId),category:CATS[cat],question_number:questionNumber,question_text:question,question_type:type};
 if(type==='mcq'){
  const a=$('optionA')?.value.trim(),b=$('optionB')?.value.trim(),c=$('optionC')?.value.trim(),d=$('optionD')?.value.trim(),correct=$('correctAnswer')?.value.trim().toUpperCase(),explanation=$('explanation')?.value.trim()||null;
  if(!a||!b||!c||!d||!correct)return msg('manualMsg','MCQ-এর চারটি অপশন ও সঠিক উত্তর পূরণ করুন।',true);
  if(!['A','B','C','D'].includes(correct))return msg('manualMsg','সঠিক উত্তর A, B, C অথবা D হতে হবে।',true);
  payload={...payload,option_a:a,option_b:b,option_c:c,option_d:d,correct_answer:correct,explanation,reference_answer:null};
 }else{
  payload={...payload,option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:null,reference_answer:$('referenceAnswer')?.value.trim()||null,explanation:$('cqExplanation')?.value.trim()||null};
 }
 const {error}=await client().from('questions').insert(payload);
 if(error)return msg('manualMsg','প্রশ্ন সংরক্ষণ হয়নি: '+error.message,true);
 msg('manualMsg',type==='mcq'?'✅ MCQ প্রশ্ন ব্যাংকে সংরক্ষিত হয়েছে।':'✅ CQ প্রশ্ন ব্যাংকে সংরক্ষিত হয়েছে।');
 ['question','questionNumber','optionA','optionB','optionC','optionD','explanation','referenceAnswer','cqExplanation'].forEach(id=>{if($(id))$(id).value='';});
 if($('correctAnswer'))$('correctAnswer').value='';
 if($('subject'))$('subject').value='';
}


window.syncQuestionType=syncQuestionType;window.template=template;window.previewImport=previewImport;window.importRows=importRows;window.addManual=addManual;window.selectCategory=selectCategory;window.createFolder=createFolder;window.createSet=createSet;window.renameSelectedFolder=renameSelectedFolder;window.deleteSelectedFolder=deleteSelectedFolder;window.renameSelectedSet=renameSelectedSet;window.deleteSelectedSet=deleteSelectedSet;window.login=login;window.logout=logout;

document.addEventListener('DOMContentLoaded',()=>{
  $('manageFolder')?.addEventListener('change',()=>syncFolderSelection('manageFolder'));
  $('setManageFolder')?.addEventListener('change',()=>syncFolderSelection('setManageFolder'));
  $('questionFolder')?.addEventListener('change',()=>syncFolderSelection('questionFolder'));
  $('manageSet')?.addEventListener('change',()=>{if($('questionSet'))$('questionSet').value=$('manageSet').value;if($('subject'))$('subject').disabled=!$('questionSet')?.value;});
  $('questionSet')?.addEventListener('change',()=>{if($('manageSet'))$('manageSet').value=$('questionSet').value;if($('subject'))$('subject').disabled=!$('questionSet').value;});
  $('questionCategory')?.addEventListener('change',e=>selectCategory(e.target.value));
  fillCategorySelect('importCategory');
  syncQuestionType();
  $('importCategory')?.addEventListener('change',e=>loadImportFolders());
  $('importFolder')?.addEventListener('change',()=>loadImportSets());
  init();
});
