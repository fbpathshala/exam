let CATS=['নিয়োগ পরীক্ষা','যাচাই পরীক্ষা','সাম্প্রতিক প্রশ্ন'];const $=id=>document.getElementById(id),bn=n=>String(n??'').replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));const dbx=()=>window.db;const SUBJECTS=['বাংলা সাহিত্য','বাংলা ভাষা','ইংরেজি সাহিত্য','ইংরেজি ভাষা','গণিত','বাংলাদেশ','আন্তর্জাতিক','দৈনন্দিন বিজ্ঞান','কম্পিউটার ও তথ্য প্রযুক্তি','ভূগোল ও দুর্যোগ ব্যবস্থাপনা','মানসিক দক্ষতা','সুশাসন ও নৈতিকতা'];function cleanRichHTML(html){const t=document.createElement('template');t.innerHTML=html;const allowed=new Set(['B','STRONG','I','EM','U','BR','P','DIV','SPAN','SUB','SUP']);function walk(n){for(const x of [...n.childNodes]){if(x.nodeType===1){if(!allowed.has(x.tagName)){x.replaceWith(document.createTextNode(x.textContent||''));continue;}[...x.attributes].forEach(a=>{if(x.tagName==='SPAN'&&a.name==='class'&&a.value==='math-inline')return;x.removeAttribute(a.name)});walk(x)}else if(x.nodeType!==3)x.remove()}}walk(t.content);return t.innerHTML}function formatQuestionText(v){let s=esc(v).replace(/&lt;(\/?)((?:b|strong|i|em|u|sub|sup|p|div|br))&gt;/gi,'<$1$2>').replace(/&lt;span class=&quot;math-inline&quot;&gt;/gi,'<span class="math-inline">').replace(/&lt;\/span&gt;/gi,'</span>');return cleanRichHTML(s)}let richSavedRange=null;
function captureRichSelection(){const sel=window.getSelection();if(!sel||!sel.rangeCount)return;const range=sel.getRangeAt(0);const node=range.commonAncestorContainer;const el=node.nodeType===1?node:node.parentElement;if(el?.closest?.('.rich-editor'))richSavedRange=range.cloneRange()}
document.addEventListener('selectionchange',captureRichSelection);
function restoreRichSelection(e){e.focus();if(richSavedRange){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(richSavedRange)}}
function insertMathMarkup(e,latex){restoreRichSelection(e);const safe=String(latex).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');document.execCommand('insertHTML',false,'<span class="math-inline">\\('+safe+'\\)</span>')}
function formatEditor(id,cmd){const e=$(id);if(!e)return;restoreRichSelection(e);document.execCommand(cmd,false,null)}

function toggleMathMenu(button,id){const menu=button?.nextElementSibling;if(!menu)return;document.querySelectorAll('.math-tools-menu').forEach(x=>{if(x!==menu)x.classList.add('hidden')});menu.classList.toggle('hidden')}
function runMathAction(id,action){document.querySelectorAll('.math-tools-menu').forEach(x=>x.classList.add('hidden'));if(action==='fraction')insertFraction(id);else if(action==='sqrt')insertSquareRoot(id);else if(action==='power')insertPower(id);else if(action==='subscript')insertSubscript(id)}
document.addEventListener('click',e=>{if(!e.target.closest('.math-tools'))document.querySelectorAll('.math-tools-menu').forEach(x=>x.classList.add('hidden'))});
function insertFraction(id){const e=$(id);if(!e)return;restoreRichSelection(e);const numerator=prompt('লব / উপরের অংশ লিখুন (যেমন: 1, a, x+1 অথবা (x+1)^2):');if(numerator===null||!numerator.trim())return;const denominator=prompt('হর / নিচের অংশ লিখুন (যেমন: 2, b, x-3 অথবা (x-3)^2):');if(denominator===null||!denominator.trim())return;insertMathMarkup(e,'\\frac{'+numerator.trim()+'}{'+denominator.trim()+'}')}
function insertPower(id){const e=$(id);if(!e)return;restoreRichSelection(e);const selected=window.getSelection()?.toString().trim()||'';const base=selected||prompt('যে সংখ্যা/অক্ষরের পাওয়ার হবে তা লিখুন (যেমন: 3, x, a):');if(base===null||!String(base).trim())return;const exponent=prompt('সূচক/ঘাত লিখুন (যেমন: 2, x+3, n-1):');if(exponent===null||!exponent.trim())return;insertMathMarkup(e,String(base).trim()+'^{'+exponent.trim()+'}')}
function insertSubscript(id){const e=$(id);if(!e)return;restoreRichSelection(e);const selected=window.getSelection()?.toString().trim()||'';const base=selected||prompt('যে অক্ষর/চিহ্নের নিচে সূচক বসবে তা লিখুন (যেমন: H, O, S):');if(base===null||!String(base).trim())return;const sub=prompt('নিম্নসূচক লিখুন (যেমন: 2, 3, 4):');if(sub===null||!sub.trim())return;insertMathMarkup(e,String(base).trim()+'_{'+sub.trim()+'}')}
function insertSquareRoot(id){const e=$(id);if(!e)return;restoreRichSelection(e);const selected=window.getSelection()?.toString().trim()||'';const radicand=selected||prompt('যে সংখ্যা/রাশি বর্গমূলের আওতায় থাকবে তা লিখুন (যেমন: 0.6, 25, x+1):');if(radicand===null||!String(radicand).trim())return;insertMathMarkup(e,'\\sqrt{'+String(radicand).trim()+'}')}
function typesetMath(root){if(window.MathJax?.typesetPromise&&root)window.MathJax.typesetPromise([root]).catch(()=>{})}function msg(id,t,e=false){const x=$(id);if(x){x.textContent=t;x.style.color=e?'#b91c1c':'#166534'}}
function showQuestionCount(n,division=activeDivision,extra=''){const el=$('questionCount');if(!el)return;const label=division==='academic'?'Academic Care':'Job Care';el.innerHTML=label+' — মোট <strong>'+bn(n)+'</strong>টি প্রশ্ন'+(extra?' '+esc(extra):'');}
function showQuestionCountLoading(){const el=$('questionCount');if(el)el.textContent='ফিল্টার অনুযায়ী প্রশ্নের সংখ্যা হিসাব হচ্ছে…';}
async function logout(){await dbx().auth.signOut();location.reload()}
let activeDivision='job';
function setupDivisionFilters(){
 const requested=new URLSearchParams(location.search).get('division');
 activeDivision=requested==='academic'?'academic':'job';
 $('jobFilters').classList.toggle('hidden',activeDivision!=='job');$('academicFilters').classList.toggle('hidden',activeDivision!=='academic');
 $('acFilterCategory').addEventListener('change',async()=>{await loadAcademicFilterFolders();await loadQuestions()});
 $('acFilterFolder').addEventListener('change',async()=>{await loadAcademicFilterChapters();await loadQuestions()});
 $('acFilterChapter').addEventListener('change',async()=>{await loadAcademicFilterSets();await loadQuestions()});
 $('acFilterSet').addEventListener('change',loadQuestions);$('acFilterType').addEventListener('change',loadQuestions);
}
async function loadAcademicFilterCategories(){
 const {data,error}=await dbx().from('academic_care_categories').select('id,name').order('name');
 if(error){msg('filterMsg','Academic Care-এর শ্রেণি লোড হয়নি: '+error.message,true);return}
 $('acFilterCategory').innerHTML='<option value="">সব শ্রেণি</option>'+(data||[]).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');
}
async function loadAcademicFilterFolders(){
 const category=$('acFilterCategory').value,el=$('acFilterFolder');
 el.innerHTML='<option value="">সব বিষয়</option>';el.value='';el.disabled=true;
 $('acFilterChapter').innerHTML='<option value="">আগে বিষয় নির্বাচন করুন</option>'; $('acFilterChapter').disabled=true;
 $('acFilterSet').innerHTML='<option value="">আগে অধ্যায় নির্বাচন করুন</option>'; $('acFilterSet').disabled=true;
 if(!category)return;
 const {data,error}=await dbx().from('academic_care_folders').select('id,folder_name').eq('category_id',Number(category)).order('folder_name');
 if(error){msg('filterMsg','Academic Care-এর বিষয় লোড হয়নি: '+error.message,true);return}
 el.innerHTML='<option value="">সব বিষয়</option>'+(data||[]).map(x=>'<option value="'+x.id+'">'+esc(x.folder_name)+'</option>').join('');el.disabled=!(data||[]).length;
}
async function loadAcademicFilterChapters(){
 const folder=$('acFilterFolder').value,el=$('acFilterChapter');
 el.innerHTML='<option value="">সব অধ্যায়</option>';el.value='';el.disabled=true;
 $('acFilterSet').innerHTML='<option value="">আগে অধ্যায় নির্বাচন করুন</option>'; $('acFilterSet').disabled=true;
 if(!folder)return;
 const {data,error}=await dbx().from('academic_care_chapters').select('id,chapter_name').eq('folder_id',Number(folder)).order('chapter_name');
 if(error){msg('filterMsg','Academic Care-এর অধ্যায় লোড হয়নি: '+error.message,true);return}
 el.innerHTML='<option value="">সব অধ্যায়</option>'+(data||[]).map(x=>'<option value="'+x.id+'">'+esc(x.chapter_name)+'</option>').join('');el.disabled=!(data||[]).length;
}
async function loadAcademicFilterSets(){
 const chapter=$('acFilterChapter').value,el=$('acFilterSet');
 el.innerHTML='<option value="">সব সেট</option>';el.value='';el.disabled=true;if(!chapter)return;
 const {data,error}=await dbx().from('academic_care_sets').select('id,set_name').eq('chapter_id',Number(chapter)).order('set_name');
 if(error){msg('filterMsg','Academic Care-এর সেট লোড হয়নি: '+error.message,true);return}
 el.innerHTML='<option value="">সব সেট</option>'+(data||[]).map(x=>'<option value="'+x.id+'">'+esc(x.set_name)+'</option>').join('');el.disabled=!(data||[]).length;
}
async function loadAcademicQuestions(){
 showQuestionCountLoading();
 const term=$('search').value.trim(),category=$('acFilterCategory').value,folder=$('acFilterFolder').value,chapter=$('acFilterChapter').value,set=$('acFilterSet').value,type=$('acFilterType').value;
 const cols='id,question_text,question_type,options,marks,sort_order,created_at,subject,category_id,folder_id,chapter_id,set_id,academic_care_categories(name),academic_care_folders(folder_name),academic_care_chapters(chapter_name),academic_care_sets(set_name)';
 let current=dbx().from('academic_care_question_bank_items').select(cols).order('created_at',{ascending:false}).limit(2000);
 let legacy=dbx().from('academic_care_questions').select('id,question_text,question_type,options,marks,sort_order,created_at,subject,category_id,folder_id,chapter_id,set_id,academic_care_categories(name),academic_care_folders(folder_name),academic_care_chapters(chapter_name),academic_care_sets(set_name)').order('created_at',{ascending:false}).limit(2000);
 for(const q of [current,legacy]){if(type)q.eq('question_type',type);if(category)q.eq('category_id',Number(category));if(folder)q.eq('folder_id',Number(folder));if(chapter)q.eq('chapter_id',Number(chapter));if(set)q.eq('set_id',Number(set));if(term)q.ilike('question_text','%'+term+'%');}
 const [cur,old]=await Promise.all([current,legacy]);
 if(cur.error&&old.error){msg('filterMsg','Academic Care-এর প্রশ্ন লোড হয়নি: '+cur.error.message+' / '+old.error.message,true);return}
 const rows=[...(cur.error?[]:(cur.data||[]).map(x=>({...x,_sourceTable:'academic_care_question_bank_items'}))),...(old.error?[]:(old.data||[]).map(x=>({...x,_sourceTable:'academic_care_questions'})))];
 const ids=rows.filter(x=>x.question_type==='mcq').map(x=>x.id);let answerMap={};
 if(ids.length){
  const [a,b]=await Promise.all([dbx().from('academic_care_question_bank_answer_keys').select('question_id,correct_option').in('question_id',ids),dbx().from('academic_care_answer_keys').select('question_id,correct_option').in('question_id',ids)]);
  for(const r of [a,b])if(!r.error)for(const k of r.data||[])answerMap[String(k.question_id)]=k.correct_option;
 }
 const labels={a:'ক',b:'খ',c:'গ',d:'ঘ',A:'ক',B:'খ',C:'গ',D:'ঘ'};
 $('questions').innerHTML=rows.map((x,i)=>{const opts=Array.isArray(x.options)?x.options:[];const options=opts.map((o,j)=>'<div>'+(['ক','খ','গ','ঘ'][j]||'')+'. '+esc(typeof o==='string'?o:(o.text||o.label||o.value||''))+'</div>').join('');const correct=labels[answerMap[String(x.id)]]||'উত্তর নির্ধারিত নেই';const cat=x.academic_care_categories?.name||'',sub=x.academic_care_folders?.folder_name||'',chap=x.academic_care_chapters?.chapter_name||'',setName=x.academic_care_sets?.set_name||'';return '<div class="q" id="academic-question-'+esc(x.id)+'"><div><span class="tag">'+(x.question_type==='mcq'?'MCQ — বহুনির্বাচনী':'CQ — লিখিত')+'</span> '+(x._sourceTable==='academic_care_questions'?'<span class="tag">পুরোনো পরীক্ষার প্রশ্ন</span>':'')+'</div><b>'+bn(i+1)+'. '+esc(x.question_text)+'</b>'+(x.question_type==='mcq'?options+'<div class="qb-answer">সঠিক উত্তর: '+esc(correct)+'</div>':'')+'<div class="qb-explanation">ব্যাখ্যা: '+esc(x.explanation||'ব্যাখ্যা দেওয়া হয়নি।')+'</div><div class="qb-source">Academic Care: '+esc(cat)+' / '+esc(sub)+' / '+esc(chap)+' / '+esc(setName)+' / প্রশ্ন নং '+bn(x.sort_order??'')+'</div></div>'}).join('')||'এই ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি।';
 showQuestionCount(rows.length,'academic',(cur.error||old.error)?'(কিছু প্রশ্ন-টেবিল পড়া যায়নি)':'');
 msg('filterMsg','ফিল্টার অনুযায়ী '+bn(rows.length)+'টি প্রশ্ন পাওয়া গেছে।'+((cur.error||old.error)?' (কিছু পুরোনো/নতুন প্রশ্ন টেবিল পড়া যায়নি।)':''));
}

async function init(){
 const countEl=$('questionCount');
 if(countEl)countEl.textContent='প্রশ্ন ব্যাংক চালু হচ্ছে…';
 const watchdog=setTimeout(()=>{
  if(countEl&&countEl.textContent.includes('চালু হচ্ছে')){
   countEl.textContent='প্রশ্ন ব্যাংক চালু হতে বেশি সময় নিচ্ছে। নিচের বার্তাটি দেখুন বা পেজটি রিফ্রেশ করুন।';
   msg('filterMsg','Supabase থেকে সাড়া পেতে দেরি হচ্ছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',true);
  }
 },20000);
 try{
  const {data,error}=await dbx().auth.getSession();
  if(error)throw new Error('অ্যাডমিন সেশন যাচাই করা যায়নি: '+error.message);
  if(!data.session)throw new Error('প্রশ্ন ব্যাংক দেখতে আগে কেন্দ্রীয় হোমপেজে অ্যাডমিন হিসেবে লগইন করুন।');
  const params=new URLSearchParams(location.search);
  const requestedType=params.get('type');
  if(['mcq','cq'].includes(requestedType)&&$('filterType'))$('filterType').value=requestedType;
  injectCompactActionStyle();
  setupDivisionFilters();

  // আগে প্রশ্ন দেখাই; ফিল্টারের সহায়ক তালিকা লোড হতে দেরি হলেও প্রশ্ন আটকে থাকবে না।
  if(activeDivision==='academic'){
   await loadQuestions();
   await loadAcademicFilterCategories();
  }else{
   const hasSourceCategory=!!params.get('category');
   if(hasSourceCategory){
    const {data:categoryRows,error:categoryError}=await dbx().from('question_bank_categories').select('name').order('name');
    if(categoryError)throw new Error('ক্যাটাগরি লোড হয়নি: '+categoryError.message);
    CATS=(categoryRows||[]).map(x=>x.name);
    $('filterCategory').innerHTML='<option value="">সব ক্যাটাগরি</option>'+CATS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    await applySourceTarget();
   }
   await loadQuestions();
   if(!hasSourceCategory){
    const {data:categoryRows,error:categoryError}=await dbx().from('question_bank_categories').select('name').order('name');
    if(!categoryError&&categoryRows){
     CATS=categoryRows.map(x=>x.name);
     $('filterCategory').innerHTML='<option value="">সব ক্যাটাগরি</option>'+CATS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    }
    await loadFolders();
   }
  }

  $('filterSubject').innerHTML='<option value="">সব বিষয়</option>'+SUBJECTS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  const {data:subjectRows,error:subjectError}=await dbx().from('subjects').select('id,name').order('name');
  if(subjectError)msg('filterMsg','বিষয় লোড হয়নি: '+subjectError.message,true);
  $('editSubject').innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+SUBJECTS.map(name=>{const x=(subjectRows||[]).find(v=>v.name===name);return x?`<option value="${x.id}">${esc(x.name)}</option>`:''}).join('');
  $('editCategory').innerHTML=CATS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  highlightSourceQuestion();
  setupMenu();
 }catch(e){
  console.error('Question Bank init failed:',e);
  if(countEl)countEl.textContent='প্রশ্ন ব্যাংক লোড করা যায়নি।';
  msg('filterMsg','প্রশ্ন লোড করা যায়নি: '+(e?.message||String(e)),true);
 }finally{
  clearTimeout(watchdog);
 }
}
function sourceHref(x){const p=new URLSearchParams({category:x.category||'',folder:String(x.folder_id||''),set:String(x.set_id||''),question:String(x.id)});return 'question_bank.html?'+p.toString()+'#question-'+x.id}function highlightSourceQuestion(){const id=new URLSearchParams(location.search).get('question');if(!id)return;const el=document.getElementById('question-'+id);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f59e0b';el.style.outlineOffset='4px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset=''},3000)}async function applySourceTarget(){const p=new URLSearchParams(location.search),c=p.get('category'),f=p.get('folder'),s=p.get('set');if(!c||!CATS.includes(c))return;$('filterCategory').value=c;await loadFolders('filterFolder','',f||'');if(f)await loadSets('filterSet',f,s||'')}function injectCompactActionStyle(){if(document.getElementById('qbCompactActionStyle'))return;const s=document.createElement('style');s.id='qbCompactActionStyle';s.textContent='.qb-card-meta{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}.qb-subject{margin-left:auto;text-align:right;max-width:65%;overflow-wrap:anywhere;font-size:13px;font-weight:600;color:#2563eb}.qb-pagination{display:flex;justify-content:center;align-items:center;gap:12px;padding:14px;flex-wrap:wrap}.qb-pagination button:disabled{opacity:.45;cursor:not-allowed}.qb-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.qb-actions button{padding:4px 8px!important;font-size:12px!important;line-height:1.2!important;min-height:30px!important;border-radius:6px!important;white-space:nowrap}';document.head.appendChild(s)}async function loadFolders(target='filterFolder',category='',selected=''){const e=$(target);if(!e)return;const selectedCategory=target==='filterFolder'?($('filterCategory')?.value||''):target==='editFolder'?(category||$('editCategory')?.value||''):'';if(target==='editFolder'&&!selectedCategory){e.innerHTML='<option value="">আগে ক্যাটাগরি নির্বাচন করুন</option>';e.value='';e.disabled=true;if($('editSet')){$('editSet').innerHTML='<option value="">আগে সাব-ক্যাটাগরি নির্বাচন করুন</option>'; $('editSet').value='';$('editSet').disabled=true;}return}let q=dbx().from('question_bank_folders').select('id,folder_name,sub_category').order('folder_name');if(selectedCategory)q=q.eq('sub_category',selectedCategory);const{data,error}=await q;if(error)return msg('filterMsg',error.message,true);e.innerHTML='<option value="">'+(target==='filterFolder'?'সব সাব-ক্যাটাগরি':'সাব-ক্যাটাগরি নির্বাচন করুন')+'</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');if(target!=='filterFolder')e.disabled=!(data||[]).length;if(selected)e.value=String(selected);if(target==='filterFolder')await loadSets('filterSet',e.value);else if(target==='editFolder')await loadSets('editSet',e.value)}async function loadSets(target='filterSet',folder='',selected=''){const id=folder||($(target==='filterSet'?'filterFolder':target==='editSet'?'editFolder':target==='currentMoveSet'?'currentMoveFolder':'moveFolder')?.value||'');const e=$(target);if(!e)return;if(!id){e.innerHTML='<option value="">'+(target==='filterSet'?'সব সেট':'আগে সাব-ক্যাটাগরি নির্বাচন করুন')+'</option>';e.value='';if(target!=='filterSet')e.disabled=true;return}const{data,error}=await dbx().from('question_bank_sets').select('id,set_name').eq('folder_id',Number(id)).order('set_name');if(error)return msg('filterMsg',error.message,true);e.innerHTML='<option value="">'+(target==='filterSet'?'সব সেট':'Set নির্বাচন করুন')+'</option>'+(data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');if(target!=='filterSet')e.disabled=!(data||[]).length;if(selected)e.value=String(selected)}let currentQuestionPage=0,lastQuestionFilterKey='';function renderQuestionPager(total){const pages=Math.max(1,Math.ceil(total/1000)),el=$('questionPager');if(!el)return;el.innerHTML=pages>1?`<div class="qb-pagination"><button class="secondary" ${currentQuestionPage===0?'disabled':''} onclick="changeQuestionPage(${currentQuestionPage-1})">আগের পৃষ্ঠা</button><span>${Array.from({length:pages},(_,i)=>`<button class="secondary" ${i===currentQuestionPage?'disabled':''} onclick="changeQuestionPage(${i})">${bn(i+1)}</button>`).join(' ')} <small>মোট ${bn(pages)} পৃষ্ঠা</small></span><button class="secondary" ${currentQuestionPage>=pages-1?'disabled':''} onclick="changeQuestionPage(${currentQuestionPage+1})">পরের পৃষ্ঠা</button></div>`:'';}async function changeQuestionPage(page){currentQuestionPage=Math.max(0,page);await loadQuestions(true)}async function loadQuestions(keepPage=false){showQuestionCountLoading();if(activeDivision==='academic')return loadAcademicQuestions();const filterKey=JSON.stringify([$('filterCategory').value,$('filterFolder').value,$('filterSet').value,$('filterSubject').value,$('search').value.trim(),$('filterType')?.value||'']);if(!keepPage&&filterKey!==lastQuestionFilterKey)currentQuestionPage=0;lastQuestionFilterKey=filterKey;showQuestionCountLoading();if(activeDivision==='academic')return loadAcademicQuestions();let q=dbx().from('questions').select('id,question_text,question_type,reference_answer,option_a,option_b,option_c,option_d,correct_answer,explanation,question_number,category,folder_id,set_id,subject_id,subjects(name),question_bank_folders(folder_name),question_bank_sets(set_name)',{count:'exact'}).order('set_id',{ascending:false,nullsFirst:false}).order('question_number',{ascending:true,nullsFirst:false}).order('id',{ascending:true}).range(currentQuestionPage*1000,currentQuestionPage*1000+999);const c=$('filterCategory').value,f=$('filterFolder').value,s=$('filterSet').value,sub=$('filterSubject').value,t=$('search').value.trim(),type=$('filterType')?.value||'';if(type)q=q.eq('question_type',type);if(c)q=q.eq('category',c);if(f)q=q.eq('folder_id',+f);if(s)q=q.eq('set_id',+s);if(sub){const sid=SUBJECTS.indexOf(sub);const{data}=await dbx().from('subjects').select('id').eq('name',sub).maybeSingle();if(data?.id)q=q.eq('subject_id',data.id)}if(t)q=q.ilike('question_text','%'+t+'%');const{data,error,count}=await q;if(error){showQuestionCount(0,'job','(লোডে সমস্যা হয়েছে)');return msg('filterMsg',error.message,true)}const total=count??(data||[]).length;showQuestionCount(total,'job');renderQuestionPager(total);msg('filterMsg','এই পৃষ্ঠায় '+bn((data||[]).length)+'টি; মোট '+bn(total)+'টি প্রশ্ন পাওয়া গেছে।');$('questions').innerHTML=(data||[]).map((x,i)=>{const isCQ=x.question_type==='cq',subjectName=x.subjects?.name||'বিষয় নির্ধারিত নয়',cor={A:'ক',B:'খ',C:'গ',D:'ঘ'}[x.correct_answer]||x.correct_answer;const copy=encodeURIComponent(JSON.stringify({no:currentQuestionPage*1000+i+1,q:x.question_text,a:x.option_a,b:x.option_b,c:x.option_c,d:x.option_d,cor,ex:x.explanation||'',ref:x.reference_answer||'',type:x.question_type||'mcq'}));return `<div class="q" id="question-${x.id}"><div class="qb-card-meta"><span class="tag">${isCQ?'CQ':'MCQ'}</span><span class="qb-subject">${esc(subjectName)}</span></div><b>${bn(currentQuestionPage*1000+i+1)}. ${formatQuestionText(x.question_text)}</b>${isCQ?`<div class="qb-answer">নমুনা উত্তর: ${esc(x.reference_answer||'নমুনা উত্তর দেওয়া হয়নি।')}</div>`:`<div>ক. ${formatQuestionText(x.option_a)}<br>খ. ${formatQuestionText(x.option_b)}<br>গ. ${formatQuestionText(x.option_c)}<br>ঘ. ${formatQuestionText(x.option_d)}</div><div class="qb-answer">সঠিক উত্তর: ${esc(cor)}</div>`}<div class="qb-explanation" data-copy="${encodeURIComponent(JSON.stringify(x.explanation||'ব্যাখ্যা দেওয়া হয়নি।'))}" style="cursor:pointer" title="চেপে ধরে ব্যাখ্যা কপি করুন" onpointerdown="startExplanationCopy(this.dataset.copy)" onpointerup="cancelExplanationCopy()" onpointerleave="cancelExplanationCopy()" onpointercancel="cancelExplanationCopy()" oncontextmenu="event.preventDefault();copyExplanationNow(this.dataset.copy)">ব্যাখ্যা: ${esc(x.explanation||'ব্যাখ্যা দেওয়া হয়নি।')} <small style="opacity:.65">(চেপে ধরে কপি)</small></div><div class="qb-source"><a href="${sourceHref(x)}" style="color:inherit;text-decoration:underline">Source: ${esc(x.category||'')} / ${esc(x.question_bank_folders?.folder_name||'')} / ${esc(x.question_bank_sets?.set_name||'')} / প্রশ্ন নং ${esc(x.question_number??'')}</a></div><div class="qb-actions"><button onclick="editQuestion(${x.id})">✏️ Edit</button><button class="secondary" onclick="deleteQuestion(${x.id})">🗑️ Remove</button><button onclick="openMove(${x.id},${x.folder_id||0},${x.set_id||0})">📁 Move</button><button onclick="copyQuestion('${copy}')">📋 Copy</button></div></div>`}).join('')||'কোনো প্রশ্ন নেই';typesetMath($('questions'))}function normalizeCopiedMath(value){
 let source=String(value??'').replace(/\\[()]/g,'').trim();
 const commands={times:'×',cdot:'·',div:'÷',le:'≤',leq:'≤',ge:'≥',geq:'≥',neq:'≠',ne:'≠',pm:'±',infty:'∞',pi:'π',degree:'°',alpha:'α',beta:'β',theta:'θ',Delta:'Δ',delta:'δ',approx:'≈',perp:'⊥',parallel:'∥',sum:'∑',int:'∫',rightarrow:'→',to:'→'};
 function readArgument(s,index){
  while(index<s.length&&/\s/.test(s[index]))index++;
  if(s[index]==='{'){
   let depth=1,j=index+1;
   while(j<s.length&&depth){if(s[j]==='{')depth++;else if(s[j]==='}')depth--;j++}
   return {value:parse(s.slice(index+1,Math.max(index+1,j-1))),next:j};
  }
  if(index>=s.length)return {value:'',next:index};
  if(s[index]==='\\'){
   let j=index+1;while(j<s.length&&/[a-zA-Z]/.test(s[j]))j++;
   if(j===index+1)j++;
   return {value:parse(s.slice(index,j)),next:j};
  }
  return {value:s[index],next:index+1};
 }
 function parse(s){
  let out='';
  for(let i=0;i<s.length;){
   const ch=s[i];
   if(ch==='\\'){
    let j=i+1;while(j<s.length&&/[a-zA-Z]/.test(s[j]))j++;
    if(j===i+1){const escaped=s[j]||'';out+=({'%':'%','$':'$','&':'&','#':'#','_':'_','{':'{','}':'}'}[escaped]??escaped);i=j+1;continue}
    const command=s.slice(i+1,j);
    if(command==='sqrt'||command==='root'){
     const arg=readArgument(s,j);out+='√('+arg.value+')';i=arg.next;continue;
    }
    if(['frac','dfrac','tfrac'].includes(command)){
     const a=readArgument(s,j),b=readArgument(s,a.next);out+='('+a.value+')/('+b.value+')';i=b.next;continue;
    }
    if(command==='left'||command==='right'){i=j;continue}
    if(command==='text'||command==='mathrm'||command==='mathbf'||command==='mathit'){
     const arg=readArgument(s,j);out+=arg.value;i=arg.next;continue;
    }
    out+=commands[command]??(command.length===1?command:'');i=j;continue;
   }
   if(ch==='^'||ch==='_'){
     const arg=readArgument(s,i+1);
     const upper={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','−':'⁻','=':'⁼','(':'⁽',')':'⁾','a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','D':'ᴰ','E':'ᴱ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ','O':'ᴼ','P':'ᴾ','R':'ᴿ','T':'ᵀ','U':'ᵁ','V':'ⱽ','W':'ᵂ'};
     const lower={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','−':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','h':'ₕ','i':'ᵢ','j':'ⱼ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','o':'ₒ','p':'ₚ','r':'ᵣ','s':'ₛ','t':'ₜ','u':'ᵤ','v':'ᵥ','x':'ₓ'};
     const map=ch==='^'?upper:lower;
     const converted=Array.from(arg.value).map(c=>map[c]||null);
     out+=converted.every(Boolean)?converted.join(''):ch+'('+arg.value+')';
     i=arg.next;continue;
    }
   }
   if(ch==='{'){
    const arg=readArgument(s,i);out+=arg.value;i=arg.next;continue;
   }
   if(ch==='}') {i++;continue}
   out+=ch;i++;
  }
  return out;
 }
 return parse(source).replace(/[ \t]+/g,' ').replace(/\s*([×·÷=<>≤≥≠±≈→])\s*/g,' $1 ').replace(/[ \t]{2,}/g,' ').trim();
}
function richHTMLToPlainText(value){
 const template=document.createElement('template');template.innerHTML=String(value??'');
 template.content.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
 template.content.querySelectorAll('p,div').forEach(el=>el.append('\n'));
 template.content.querySelectorAll('.math-inline').forEach(el=>{
  const annotation=el.querySelector('mjx-assistive-mml annotation[encoding="application/x-tex"], annotation[encoding="application/x-tex"]');
  const raw=annotation?.textContent??el.textContent??'';
  el.replaceWith(document.createTextNode(normalizeCopiedMath(raw)));
 });
 return normalizeCopiedMath((template.content.textContent||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim());
}
let explanationCopyTimer=null;function cancelExplanationCopy(){if(explanationCopyTimer){clearTimeout(explanationCopyTimer);explanationCopyTimer=null}}function startExplanationCopy(s){cancelExplanationCopy();explanationCopyTimer=setTimeout(()=>{explanationCopyTimer=null;copyExplanationNow(s)},600)}async function copyExplanationNow(s){cancelExplanationCopy();try{const value=JSON.parse(decodeURIComponent(s));await navigator.clipboard.writeText(richHTMLToPlainText(value));msg('filterMsg','✅ শুধু ব্যাখ্যাটি Copy হয়েছে।')}catch(e){msg('filterMsg','ব্যাখ্যা Copy করা যায়নি।',true)}}
async function copyQuestion(s){const x=JSON.parse(decodeURIComponent(s)),plain=v=>richHTMLToPlainText(v);let t;if(x.type==='cq'){t=bn(x.no)+'. '+plain(x.q)+'\nনমুনা উত্তর: '+plain(x.ref||'')}else{t=bn(x.no)+'. '+plain(x.q)+'\nক. '+plain(x.a)+'\nখ. '+plain(x.b)+'\nগ. '+plain(x.c)+'\nঘ. '+plain(x.d)+'\nসঠিক উত্তর: '+plain(x.cor)}try{await navigator.clipboard.writeText(t);msg('filterMsg','✅ প্রশ্নটি (ব্যাখ্যা ছাড়া) Messenger-এ ব্যবহারের উপযোগী সাধারণ লেখায় Copy হয়েছে।')}catch(e){msg('filterMsg','Copy করা যায়নি।',true)}}async function deleteQuestion(id){if(!confirm('এই প্রশ্নটি Remove করবেন?'))return;const{error}=await dbx().from('questions').delete().eq('id',id);if(error)return msg('filterMsg',error.message,true);await loadQuestions();msg('filterMsg','✅ প্রশ্ন Remove হয়েছে।')}async function editQuestion(id){const{data,error}=await dbx().from('questions').select('*').eq('id',id).single();if(error)return msg('filterMsg',error.message,true);$('editId').value=id;$('editType').value=data.question_type||'mcq';syncEditType();$('editQuestionNumber').value=data.question_number??'';$('editQuestion').innerHTML=formatQuestionText(data.question_text||'');$('editA').innerHTML=formatQuestionText(data.option_a||'');$('editB').innerHTML=formatQuestionText(data.option_b||'');$('editC').innerHTML=formatQuestionText(data.option_c||'');$('editD').innerHTML=formatQuestionText(data.option_d||'');$('editCorrect').value=data.correct_answer||'';$('editExplanation').innerHTML=formatQuestionText(data.explanation||'');$('editReferenceAnswer').value=data.reference_answer||'';$('editCqExplanation').innerHTML=formatQuestionText(data.explanation||'');$('editCategory').value=data.category||CATS[0];await loadFolders('editFolder',data.category||CATS[0],data.folder_id);await loadSets('editSet',data.folder_id,data.set_id);$('editSubject').value=data.subject_id?String(data.subject_id):'';$('editBox').classList.remove('hidden');$('editBox').scrollIntoView({behavior:'smooth'})}function syncEditType(){const type=$('editType')?.value||'mcq';$('editMcqFields')?.classList.toggle('hidden',type!=='mcq');$('editCqFields')?.classList.toggle('hidden',type!=='cq')}
async function saveEdit(){const id=+$('editId').value,n=$('editQuestionNumber').value.trim(),type=$('editType').value||'mcq',p={question_type:type,question_number:n?+n:null,question_text:cleanRichHTML($('editQuestion').innerHTML).trim(),category:$('editCategory').value,folder_id:+$('editFolder').value||null,set_id:+$('editSet').value||null};const selectedSubjectId=+$('editSubject').value;if(selectedSubjectId)p.subject_id=selectedSubjectId;if(!p.question_text)return msg('editMsg','প্রশ্ন লিখুন।',true);if(type==='mcq'){Object.assign(p,{option_a:cleanRichHTML($('editA').innerHTML).trim(),option_b:cleanRichHTML($('editB').innerHTML).trim(),option_c:cleanRichHTML($('editC').innerHTML).trim(),option_d:cleanRichHTML($('editD').innerHTML).trim(),correct_answer:$('editCorrect').value,reference_answer:null,explanation:cleanRichHTML($('editExplanation').innerHTML).trim()||null});if(!p.option_a||!p.option_b||!p.option_c||!p.option_d||!p.correct_answer)return msg('editMsg','MCQ-এর চারটি অপশন ও সঠিক উত্তর পূরণ করুন।',true)}else{Object.assign(p,{option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:null,reference_answer:$('editReferenceAnswer').value.trim()||null,explanation:cleanRichHTML($('editCqExplanation').innerHTML).trim()||null})}const{error}=await dbx().from('questions').update(p).eq('id',id);if(error)return msg('editMsg',error.message,true);msg('editMsg','✅ প্রশ্ন আপডেট হয়েছে।');await loadQuestions(true);closeEdit();const updatedQuestion=document.getElementById('question-'+id);if(updatedQuestion)updatedQuestion.scrollIntoView({behavior:'auto',block:'center'});}
function closeEdit(){$('editBox').classList.add('hidden')}async function openMove(id,folder,set){$('moveQuestionId').value=id;await loadFolders('currentMoveFolder','',folder);await loadSets('currentMoveSet',folder,set);await loadFolders('moveFolder','',folder);await loadSets('moveSet',folder,set);$('moveBox').classList.remove('hidden');$('moveBox').scrollIntoView({behavior:'smooth'})}function closeMove(){$('moveBox').classList.add('hidden')}async function moveQuestion(){const id=+$('moveQuestionId').value,f=+$('moveFolder').value,s=+$('moveSet').value;if(!f||!s)return msg('moveMsg','গন্তব্য সাব-ক্যাটাগরি ও সেট নির্বাচন করুন।',true);const{error}=await dbx().from('questions').update({folder_id:f,set_id:s}).eq('id',id);if(error)return msg('moveMsg',error.message,true);msg('moveMsg','✅ প্রশ্ন সফলভাবে মুভ হয়েছে।');await loadQuestions();setTimeout(closeMove,500)}function setupMenu(){const b=$('adminMenuBtn'),p=$('adminMenuPanel');b?.addEventListener('click',e=>{e.stopPropagation();p.classList.toggle('hidden')});document.addEventListener('click',e=>{if(p&&!p.contains(e.target)&&e.target!==b)p.classList.add('hidden')})}$('filterType')?.addEventListener('change',loadQuestions);$('filterCategory').addEventListener('change',async()=>{await loadFolders();await loadQuestions()});$('filterFolder').addEventListener('change',async()=>{await loadSets('filterSet',$('filterFolder').value);await loadQuestions()});$('filterSet').addEventListener('change',loadQuestions);$('filterSubject').addEventListener('change',loadQuestions);$('editCategory').addEventListener('change',()=>loadFolders('editFolder',$('editCategory').value));$('editFolder').addEventListener('change',()=>loadSets('editSet',$('editFolder').value));$('currentMoveFolder').addEventListener('change',()=>loadSets('currentMoveSet',$('currentMoveFolder').value));$('moveFolder').addEventListener('change',()=>loadSets('moveSet',$('moveFolder').value));let tm;$('search').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(loadQuestions,250)});init();