const CATS={
  recruitment:'নিয়োগ পরীক্ষা',
  verification_test:'যাচাই পরীক্ষা',
  recent:'সাম্প্রতিক প্রশ্ন'
};

let cat='verification_test',folders=[],sets=[],subjects=[],exams=[],importData=[];

const $=id=>document.getElementById(id);

const bn=n=>String(n??'').replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[m]));

function msg(id,t,err=false){
  const e=$(id);
  if(!e)return;
  e.textContent=t;
  e.style.color=err?'#b91c1c':'#166534';
}

async function login(){
  msg('loginMsg','Login হচ্ছে...');
  const{error}=await db.auth.signInWithPassword({
    email:$('email').value.trim(),
    password:$('password').value
  });
  if(error)return msg('loginMsg',error.message,true);
  await init();
}

async function logout(){
  await db.auth.signOut();
  location.reload();
}

function showPage(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  $(p)?.classList.remove('hidden');

  if(p==='bank')loadBank();
  if(p==='exam')loadExams();
}

async function init(){
  const{data,error}=await db.auth.getSession();

  if(error){
    return msg('loginMsg',error.message,true);
  }

  if(!data.session){
    $('login')?.classList.remove('hidden');
    $('app')?.classList.add('hidden');
    return;
  }

  $('login')?.classList.add('hidden');
  $('app')?.classList.remove('hidden');

  if($('userEmail')){
    $('userEmail').textContent=data.session.user.email||'';
  }

  await loadSubjects();
  await loadBank();
  await loadExams();

  showPage('dashboard');
}

async function loadSubjects(){
  const s=$('subject'),f=$('filterSubject');

  if(!s||!f)return;

  s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>';
  f.innerHTML='<option value="">সব বিষয়</option>';

  const{data,error}=await db
    .from('subjects')
    .select('id,name')
    .order('id');

  if(error){
    console.error(error);
    s.innerHTML='<option value="">বিষয় লোড হয়নি</option>';
    f.innerHTML='<option value="">বিষয় লোড হয়নি</option>';
    return msg('qmsg','Subject লোড হয়নি: '+error.message,true);
  }

  subjects=data||[];

  s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+
    subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');

  f.innerHTML='<option value="">সব বিষয়</option>'+
    subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
}

async function loadBank(){
  await loadFolders();
  await loadFilterFolders();
  await loadQuestions();
}

async function selectCategory(c){
  cat=c;

  document.querySelectorAll('.cats button')
    .forEach(b=>b.classList.remove('active'));

  $('cat-'+c)?.classList.add('active');

  if($('currentCat')){
    $('currentCat').textContent='বর্তমান Category: '+CATS[c];
  }

  await loadFolders();
  await loadFilterFolders();
}

async function loadFolders(){
  const{data,error}=await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category',CATS[cat])
    .order('id');

  if(error)return msg('folderMsg',error.message,true);

  folders=data||[];

  if($('folder')){
    $('folder').innerHTML=
      '<option value="">Folder নির্বাচন করুন</option>'+
      folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
  }

  if($('mapFolder')){
    $('mapFolder').innerHTML=
      '<option value="">Folder নির্বাচন করুন</option>'+
      folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
  }

  if($('filterFolder')){
    $('filterFolder').innerHTML=
      '<option value="">সব Folder</option>'+
      folders.map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
  }

  await loadSets();
}

async function loadFilterFolders(){
  const{data,error}=await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category',CATS[cat])
    .order('id');

  if(error)return;

  if($('filterFolder')){
    $('filterFolder').innerHTML=
      '<option value="">সব Folder</option>'+
      (data||[]).map(x=>`<option value="${x.id}">${esc(x.folder_name)}</option>`).join('');
  }
}

async function loadSets(){
  const id=$('folder')?.value;

  if(!id){
    sets=[];
    if($('set')){
      $('set').innerHTML='<option value="">Set নির্বাচন করুন</option>';
    }
    return;
  }

  const{data,error}=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)return msg('folderMsg',error.message,true);

  sets=data||[];

  if($('set')){
    $('set').innerHTML=
      '<option value="">Set নির্বাচন করুন</option>'+
      sets.map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
  }
}

async function loadFilterSets(){
  const id=$('filterFolder')?.value;

  if(!id){
    if($('filterSet')){
      $('filterSet').innerHTML='<option value="">সব Set</option>';
    }
    return;
  }

  const{data,error}=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)return msg('qmsg',error.message,true);

  if($('filterSet')){
    $('filterSet').innerHTML=
      '<option value="">সব Set</option>'+
      (data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
  }
}

async function loadMapSets(){
  const id=$('mapFolder')?.value;

  if(!id){
    if($('mapSet')){
      $('mapSet').innerHTML='<option value="">সব Set</option>';
    }
    return;
  }

  const{data,error}=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)return msg('mapMsg',error.message,true);

  if($('mapSet')){
    $('mapSet').innerHTML=
      '<option value="">সব Set</option>'+
      (data||[]).map(x=>`<option value="${x.id}">${esc(x.set_name)}</option>`).join('');
  }
}

async function createFolder(){
  const name=$('newFolder').value.trim();

  if(!name)return msg('folderMsg','Folder-এর নাম দিন',true);

  const{data,error}=await db
    .from('question_bank_folders')
    .insert({
      sub_category:CATS[cat],
      folder_name:name
    })
    .select('id,folder_name')
    .single();

  if(error)return msg('folderMsg',error.message,true);

  $('newFolder').value='';
  await loadFolders();
  $('folder').value=data.id;
  await loadSets();

  msg('folderMsg','✅ Folder তৈরি হয়েছে');
}

async function createSet(){
  const folderId=$('folder').value;
  const name=$('newSet').value.trim();

  if(!folderId)return msg('folderMsg','আগে Folder নির্বাচন করুন',true);
  if(!name)return msg('folderMsg','Set-এর নাম দিন',true);

  const{data,error}=await db
    .from('question_bank_sets')
    .insert({
      folder_id:Number(folderId),
      set_name:name
    })
    .select('id,set_name')
    .single();

  if(error)return msg('folderMsg',error.message,true);

  $('newSet').value='';
  await loadSets();
  $('set').value=data.id;

  msg('folderMsg','✅ Set তৈরি হয়েছে');
}

async function addManual(){
  const folderId=$('folder').value;
  const setId=$('set').value;
  const subjectId=$('subject').value;
  const text=$('qtext').value.trim();
  const a=$('a').value.trim();
  const b=$('b').value.trim();
  const c=$('c').value.trim();
  const d=$('d').value.trim();
  const correct=$('correct').value;

  if(!folderId||!setId){
    return msg('qmsg','Category, Folder ও Set নির্বাচন করুন',true);
  }

  if(!subjectId||!text||!a||!b||!c||!d||!correct){
    return msg('qmsg','বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',true);
  }

  const p={
    folder_id:Number(folderId),
    set_id:Number(setId),
    subject_id:Number(subjectId),
    question_text:text,
    option_a:a,
    option_b:b,
    option_c:c,
    option_d:d,
    correct_answer:correct,
    explanation:$('explanation').value.trim()||null,
    question_number:$('qno').value?Number($('qno').value):null,
    category:CATS[cat],
    source_name:$('source').value.trim()||null,
    source_type:cat
  };

  const{error}=await db.from('questions').insert(p);

  if(error)return msg('qmsg',error.message,true);

  ['qno','source','qtext','a','b','c','d','explanation']
    .forEach(x=>$(x).value='');

  $('correct').value='';

  msg('qmsg','✅ প্রশ্ন Question Bank-এ যোগ হয়েছে');

  await loadQuestions();
}

function mode(m){
  $('manualBox')?.classList.toggle('hidden',m!=='manual');
  $('importBox')?.classList.toggle('hidden',m!=='import');
}

function template(){
  const selectedName=id=>{
    const el=$(id);
    if(!el||!el.value)return '';
    return String(el.selectedOptions?.[0]?.textContent||'').trim();
  };

  const rows=[
    ['category','folder','set','subject','question_number','question','option_a','option_b','option_c','option_d','correct_answer','explanation'],
    [
      CATS[cat],
      selectedName('folder'),
      selectedName('set'),
      selectedName('subject'),
      1,
      'বাংলাদেশের রাজধানী কোনটি?',
      'ঢাকা',
      'চট্টগ্রাম',
      'রাজশাহী',
      'খুলনা',
      'A',
      ''
    ]
  ];

  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb,ws,'Questions');
  XLSX.writeFile(wb,'question-import-template.xlsx');
}

const IMPORT_REQUIRED_HEADERS=[
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer'
];

const IMPORT_HEADER_ALIASES={
  category:['category','cat','বিভাগ','ক্যাটাগরি'],
  folder:['folder','folder_name','foldername','ফোল্ডার'],
  set:['set','set_name','setname','সেট'],
  subject:['subject','subject_name','বিষয়','বিষয়'],
  question_number:['question_number','questionnumber','question_no','questionno','qno','number','ক্রমিক','প্রশ্ন_নম্বর','প্রশ্ন_নং'],
  question:['question','questions','question_text','questiontext','প্রশ্ন'],
  option_a:['option_a','optiona','option_1','option1','a','ক','অপশন_ক'],
  option_b:['option_b','optionb','option_2','option2','b','খ','অপশন_খ'],
  option_c:['option_c','optionc','option_3','option3','c','গ','অপশন_গ'],
  option_d:['option_d','optiond','option_4','option4','d','ঘ','অপশন_ঘ'],
  correct_answer:['correct_answer','correctanswer','correct','answer','right_answer','correct_option','correctoption','সঠিক_উত্তর','উত্তর'],
  explanation:['explanation','ব্যাখ্যা']
};

const IMPORT_HEADER_LOOKUP={};

Object.entries(IMPORT_HEADER_ALIASES).forEach(([k,vs])=>{
  vs.forEach(v=>{
    const n=normalizeImportHeader(v);
    if(n)IMPORT_HEADER_LOOKUP[n]=k;
  });
});

function normalizeImportHeader(v){
  return String(v??'')
    .normalize('NFKC')
    .replace(/^\uFEFF/,'')
    .replace(/[\u200B-\u200D\u2060\u00A0]/g,' ')
    .replace(/[\r\n\t]+/g,' ')
    .replace(/[“”‘’"']/g,'')
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g,'-')
    .replace(/[\s-]+/g,'_')
    .replace(/[^a-z0-9_\u0980-\u09ff]/g,'')
    .replace(/_+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function parseImportCorrect(v){
  const x=String(v??'').trim().toUpperCase();

  return ({
    A:'A',
    B:'B',
    C:'C',
    D:'D',
    'ক':'A',
    'খ':'B',
    'গ':'C',
    'ঘ':'D',
    '1':'A',
    '2':'B',
    '3':'C',
    '4':'D',
    '০':'A',
    '১':'A',
    '২':'B',
    '৩':'C',
    '৪':'D'
  }[x]||x.replace(/^OPTION[_ -]?/,''));
}

function parseImportSheet(sheet){
  const matrix=XLSX.utils.sheet_to_json(sheet,{
    header:1,
    defval:'',
    raw:false,
    blankrows:true
  });

  if(!matrix.length){
    return{
      rows:[],
      error:'ফাইলে কোনো data পাওয়া যায়নি'
    };
  }

  let best=null;

  for(let ri=0;ri<Math.min(matrix.length,50);ri++){
    const map={};
    let recognized=0;

    (matrix[ri]||[]).forEach((v,ci)=>{
      const k=IMPORT_HEADER_LOOKUP[normalizeImportHeader(v)];

      if(k){
        recognized++;
        if(map[k]===undefined)map[k]=ci;
      }
    });

    const found=IMPORT_REQUIRED_HEADERS
      .filter(k=>map[k]!==undefined);

    if(
      !best||
      found.length>best.found.length||
      (
        found.length===best.found.length &&
        recognized>best.recognized
      )
    ){
      best={
        rowIndex:ri,
        map,
        found,
        recognized
      };
    }

    if(found.length===IMPORT_REQUIRED_HEADERS.length)break;
  }

  if(!best||best.found.length<IMPORT_REQUIRED_HEADERS.length){
    const found=best?.found||[];

    return{
      rows:[],
      error:
        'Excel/CSV header সঠিকভাবে শনাক্ত করা যায়নি। প্রয়োজনীয় header: '+
        IMPORT_REQUIRED_HEADERS.join(', ')+
        '। Missing: '+
        IMPORT_REQUIRED_HEADERS
          .filter(k=>!found.includes(k))
          .join(', ')
    };
  }

  const rows=[];

  for(let i=best.rowIndex+1;i<matrix.length;i++){
    const src=matrix[i]||[];
    const r={__excelRow:i+1};
    const any=src.some(v=>String(v??'').trim()!=='');

    if(!any)continue;

    Object.entries(best.map).forEach(([k,ci])=>{
      r[k]=String(src[ci]??'');
    });

    r.correct_answer=parseImportCorrect(r.correct_answer);
    rows.push(r);
  }

  return{
    rows,
    headerRowIndex:best.rowIndex
  };
}

async function previewImport(){
  const f=$('file').files[0];

  if(!f)return msg('qmsg','CSV/Excel file নির্বাচন করুন',true);

  try{
    const data=XLSX.read(await f.arrayBuffer(),{type:'array'});
    const sheet=data.Sheets[data.SheetNames[0]];
    const parsed=parseImportSheet(sheet);

    if(parsed.error)return msg('qmsg',parsed.error,true);

    const rows=parsed.rows.map(r=>({
      ...r,
      category:String(r.category||CATS[cat]).trim(),
      folder:String(r.folder||'').trim(),
      set:String(r.set||'').trim(),
      subject:String(r.subject||'').trim(),
      question_number:String(r.question_number||'').trim(),
      question:String(r.question||'').trim(),
      option_a:String(r.option_a||'').trim(),
      option_b:String(r.option_b||'').trim(),
      option_c:String(r.option_c||'').trim(),
      option_d:String(r.option_d||'').trim(),
      correct_answer:parseImportCorrect(r.correct_answer),
      explanation:String(r.explanation||'').trim()
    }));

    const bad=rows.filter(r=>
      !r.question||
      !r.option_a||
      !r.option_b||
      !r.option_c||
      !r.option_d||
      !['A','B','C','D'].includes(r.correct_answer)
    );

    importData=rows;

    $('preview').innerHTML=
      `<div class="q">
        <b>${bn(rows.length)}টি row পাওয়া গেছে</b>
        ${
          bad.length
          ?`<br><span class="small">${bn(bad.length)}টি row-তে required data/answer সমস্যা আছে</span>`
          :''
        }
        <pre>${esc(JSON.stringify(rows.slice(0,5),null,2))}</pre>
      </div>`;

    $('importBtn').classList.remove('hidden');

    msg('qmsg','Preview প্রস্তুত হয়েছে');

  }catch(e){
    msg('qmsg','Excel/CSV পড়তে সমস্যা: '+e.message,true);
  }
}

async function importRows(){
  let ok=0,fail=[];

  const selectedFolderId=Number($('folder')?.value||0)||null;
  const selectedSetId=Number($('set')?.value||0)||null;

  let selectedFolderMeta=null;
  let selectedSetMeta=null;

  for(let i=0;i<importData.length;i++){
    const r=importData[i];

    const category=
      Object.values(CATS).includes(String(r.category).trim())
      ?String(r.category).trim()
      :CATS[cat];

    const folderName=String(r.folder||'').trim();
    const setName=String(r.set||'').trim();

    if(
      !r.question||
      !r.option_a||
      !r.option_b||
      !r.option_c||
      !r.option_d||
      !r.correct_answer
    ){
      fail.push(`Row ${i+2}: required field missing`);
      continue;
    }

    let fid=null,sid=null;

    if(folderName){
      const fr=await db
        .from('question_bank_folders')
        .select('id')
        .eq('sub_category',category)
        .eq('folder_name',folderName)
        .maybeSingle();

      if(fr.error){
        fail.push(`Row ${i+2}: ${fr.error.message}`);
        continue;
      }

      fid=fr.data?.id;

      if(!fid){
        const x=await db
          .from('question_bank_folders')
          .insert({
            sub_category:category,
            folder_name:folderName
          })
          .select('id')
          .single();

        if(x.error){
          fail.push(`Row ${i+2}: ${x.error.message}`);
          continue;
        }

        fid=x.data.id;
      }

    }else if(selectedFolderId){

      if(!selectedFolderMeta){
        const fr=await db
          .from('question_bank_folders')
          .select('id,sub_category')
          .eq('id',selectedFolderId)
          .maybeSingle();

        if(fr.error){
          fail.push(`Row ${i+2}: ${fr.error.message}`);
          continue;
        }

        selectedFolderMeta=fr.data;
      }

      if(
        !selectedFolderMeta||
        selectedFolderMeta.sub_category!==category
      ){
        fail.push(`Row ${i+2}: নির্বাচিত Folder বর্তমান Category-এর সাথে মেলে না`);
        continue;
      }

      fid=selectedFolderMeta.id;

    }else{
      fail.push(`Row ${i+2}: Folder দেওয়া নেই। Import-এর আগে Folder নির্বাচন করুন`);
      continue;
    }

    if(setName){

      const sr=await db
        .from('question_bank_sets')
        .select('id')
        .eq('folder_id',fid)
        .eq('set_name',setName)
        .maybeSingle();

      if(sr.error){
        fail.push(`Row ${i+2}: ${sr.error.message}`);
        continue;
      }

      sid=sr.data?.id;

      if(!sid){
        const x=await db
          .from('question_bank_sets')
          .insert({
            folder_id:fid,
            set_name:setName
          })
          .select('id')
          .single();

        if(x.error){
          fail.push(`Row ${i+2}: ${x.error.message}`);
          continue;
        }

        sid=x.data.id;
      }

    }else if(selectedSetId){

      if(!selectedSetMeta){
        const sr=await db
          .from('question_bank_sets')
          .select('id,folder_id')
          .eq('id',selectedSetId)
          .maybeSingle();

        if(sr.error){
          fail.push(`Row ${i+2}: ${sr.error.message}`);
          continue;
        }

        selectedSetMeta=sr.data;
      }

      if(
        !selectedSetMeta||
        Number(selectedSetMeta.folder_id)!==Number(fid)
      ){
        fail.push(`Row ${i+2}: নির্বাচিত Set নির্বাচিত Folder-এর সাথে মেলে না`);
        continue;
      }

      sid=selectedSetMeta.id;

    }else{
      fail.push(`Row ${i+2}: Set দেওয়া নেই। Import-এর আগে Set নির্বাচন করুন`);
      continue;
    }

    let sub=null;

    if(r.subject){
      sub=subjects.find(x=>norm(x.name)===norm(r.subject));

      if(!sub){
        fail.push(`Row ${i+2}: Subject পাওয়া যায়নি: ${r.subject}`);
        continue;
      }
    }

    const p={
      folder_id:fid,
      set_id:sid,
      subject_id:sub?.id||null,
      category,
      source_type:cat,
      question_number:r.question_number?Number(r.question_number):null,
      question_text:String(r.question).trim(),
      option_a:String(r.option_a).trim(),
      option_b:String(r.option_b).trim(),
      option_c:String(r.option_c).trim(),
      option_d:String(r.option_d).trim(),
      correct_answer:String(r.correct_answer).trim().toUpperCase(),
      explanation:String(r.explanation||'').trim()||null
    };

    const x=await db.from('questions').insert(p);

    if(x.error){
      fail.push(`Row ${i+2}: ${x.error.message}`);
    }else{
      ok++;
    }
  }

  msg(
    'qmsg',
    `✅ ${bn(ok)}টি Import হয়েছে${
      fail.length
      ?` | ❌ ${bn(fail.length)}টি ব্যর্থ`
      :''
    }`,
    !!fail.length
  );

  if(fail.length){
    $('preview').innerHTML+=
      '<div class="q">'+fail.map(esc).join('<br>')+'</div>';
  }

  await loadQuestions();
}

async function loadQuestions(){

  let q=db
    .from('questions')
    .select(
      'id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,category,folder_id,set_id,subjects(name)'
    )
    .order('id',{ascending:false})
    .limit(200);

  if($('filterFolder')?.value){
    q=q.eq('folder_id',Number($('filterFolder').value));
  }

  if($('filterSet')?.value){
    q=q.eq('set_id',Number($('filterSet').value));
  }

  if($('filterSubject')?.value){
    q=q.eq('subject_id',Number($('filterSubject').value));
  }

  const term=$('search')?.value.trim();

  if(term){
    q=q.ilike('question_text','%'+term+'%');
  }

  const{data,error}=await q;

  if(error)return msg('qmsg',error.message,true);

  if(!$('questions'))return;

  $('questions').innerHTML=
    (data||[]).map(x=>
      `<div class="q">
        <b>${bn(x.question_number||'')}. ${esc(x.question_text)}</b>
        <div>
          ক. ${esc(x.option_a)}<br>
          খ. ${esc(x.option_b)}<br>
          গ. ${esc(x.option_c)}<br>
          ঘ. ${esc(x.option_d)}
        </div>
        <div class="small">
          ${esc(x.category)} ·
          ${esc(x.subjects?.name||'')} ·
          সঠিক:
          ${esc(({A:'ক',B:'খ',C:'গ',D:'ঘ'})[x.correct_answer]||x.correct_answer)}
        </div>
      </div>`
    ).join('')||'কোনো প্রশ্ন নেই';
}

async function createExam(){

  const name=$('examName').value.trim();

  if(!name)return msg('examMsg','পরীক্ষার নাম দিন',true);

  const{data,error}=await db
    .from('exams')
    .insert({
      exam_name:name,
      status:$('examStatus').value,
      total_questions:0,
      marks_per_question:1,
      negative_mark:0,
      pass_mark:0
    })
    .select('id')
    .single();

  if(error)return msg('examMsg',error.message,true);

  const s=await db
    .from('exam_settings')
    .upsert({
      exam_id:data.id,
      total_questions:0,
      total_marks:0,
      pass_mark:0,
      duration_minutes:20,
      marks_per_question:1,
      negative_mark:0,
      show_answers:false,
      multiple_attempts:false,
      device_attempt_protection:true,
      random_questions:false,
      random_options:false
    },{
      onConflict:'exam_id'
    });

  if(s.error)return msg('examMsg',s.error.message,true);

  $('examName').value='';

  msg('examMsg','✅ Exam তৈরি হয়েছে');

  await loadExams();

  if($('examSelect')){
    $('examSelect').value=data.id;
    loadSettings();
  }
}

/* =========================
   EXAM LOAD
   ========================= */

async function loadExams(){

  const{data,error}=await db
    .from('exams')
    .select(
      'id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark'
    )
    .order('id',{ascending:false});

  if(error){
    return msg('examMsg',error.message,true);
  }

  exams=data||[];

  /*
   * গুরুত্বপূর্ণ:
   * বর্তমান admin.html-এ sActive নেই।
   * তাই এটি আর Dashboard ভাঙবে না।
   */
  if($('sExams')){
    $('sExams').textContent=bn(exams.length);
  }

  if($('sActive')){
    $('sActive').textContent=
      bn(exams.filter(x=>x.status==='active').length);
  }

  const opt=
    '<option value="">Exam নির্বাচন করুন</option>'+
    exams.map(x=>
      `<option value="${x.id}">
        ${esc(x.exam_name)} (#${x.id})
      </option>`
    ).join('');

  if($('examSelect')){
    $('examSelect').innerHTML=opt;
  }

  if($('mapExam')){
    $('mapExam').innerHTML=opt;
  }

  if($('exams')){
    $('exams').innerHTML=
      exams.map(x=>
        `<div class="examrow">
          <b>${esc(x.exam_name)}</b> ·
          ${esc(x.status)} ·
          ${bn(x.total_questions||0)} প্রশ্ন
          <br>
          <span class="link">
            ${location.origin}${location.pathname.replace(/\/[^/]*$/,'/../')}?exam=${x.id}
          </span>
          <br>
          <button onclick="copyLink(${x.id})">
            🔗 Exam Link কপি
          </button>
          <button
            class="secondary"
            onclick="activate(${x.id},'${x.status==='active'?'inactive':'active'}')">
            ${x.status==='active'?'Inactive':'Active'}
          </button>
        </div>`
      ).join('');
  }

  /*
   * Question count
   */
  const count=await db
    .from('questions')
    .select('id',{count:'exact',head:true});

  if($('sQuestions')){
    $('sQuestions').textContent=bn(count.count||0);
  }

  /*
   * Student count:
   * Exam system-এর actual attempt table ব্যবহার করা হচ্ছে।
   * table না থাকলে students fallback করা হবে।
   */
  let studentCount=null;

  const attempts=await db
    .from('exam_attempts')
    .select('id',{count:'exact',head:true});

  if(!attempts.error){
    studentCount=attempts.count||0;
  }else{
    const students=await db
      .from('students')
      .select('id',{count:'exact',head:true});

    if(!students.error){
      studentCount=students.count||0;
    }
  }

  if($('sStudents')&&studentCount!==null){
    $('sStudents').textContent=bn(studentCount);
  }
}

async function copyLink(id){

  const base=new URL('../index.html',location.href).href+'?exam='+id;

  try{
    await navigator.clipboard.writeText(base);
    alert('Exam Link copied');
  }catch(_){
    prompt('Exam Link',base);
  }
}

async function activate(id,status){

  const{error}=await db
    .from('exams')
    .update({status})
    .eq('id',id);

  if(error)return msg('examMsg',error.message,true);

  await loadExams();
}

async function loadSettings(){

  const id=$('examSelect').value;

  if(!id)return;

  const{data,error}=await db
    .from('exam_settings')
    .select('*')
    .eq('exam_id',id)
    .maybeSingle();

  if(error)return msg('settingsMsg',error.message,true);

  const s=data||{};

  $('totalQ').value=s.total_questions??0;
  $('totalMarks').value=s.total_marks??0;
  $('pass').value=s.pass_mark??0;
  $('duration').value=s.duration_minutes??20;
  $('marks').value=s.marks_per_question??1;
  $('negative').value=s.negative_mark??0;
  $('examiner').value=s.examiner_name??'';
  $('syllabus').value=s.syllabus??'';

  $('showAnswers').checked=!!s.show_answers;
  $('multiple').checked=!!s.multiple_attempts;
  $('device').checked=s.device_attempt_protection!==false;
  $('randomQ').checked=!!s.random_questions;
  $('randomO').checked=!!s.random_options;

  $('startDate').value=s.exam_date||'';
  $('startTime').value=s.start_time||'';
  $('endDate').value=s.end_date||'';
  $('endTime').value=s.end_time||'';
}

async function saveSettings(){

  const id=$('examSelect').value;

  if(!id)return msg('settingsMsg','Exam নির্বাচন করুন',true);

  const payload={
    exam_id:id,
    total_questions:Number($('totalQ').value)||0,
    total_marks:Number($('totalMarks').value)||0,
    pass_mark:Number($('pass').value)||0,
    duration_minutes:Number($('duration').value)||20,
    marks_per_question:Number($('marks').value)||1,
    negative_mark:Number($('negative').value)||0,
    examiner_name:$('examiner').value.trim()||null,
    syllabus:$('syllabus').value.trim()||null,
    show_answers:$('showAnswers').checked,
    multiple_attempts:$('multiple').checked,
    device_attempt_protection:$('device').checked,
    random_questions:$('randomQ').checked,
    random_options:$('randomO').checked,
    exam_date:$('startDate').value||null,
    start_time:$('startTime').value||null,
    end_date:$('endDate').value||null,
    end_time:$('endTime').value||null
  };

  const{error}=await db
    .from('exam_settings')
    .upsert(payload,{onConflict:'exam_id'});

  if(error)return msg('settingsMsg',error.message,true);

  const e=await db
    .from('exams')
    .update({
      total_questions:payload.total_questions,
      marks_per_question:payload.marks_per_question,
      negative_mark:payload.negative_mark,
      pass_mark:payload.pass_mark
    })
    .eq('id',id);

  if(e.error)return msg('settingsMsg',e.error.message,true);

  msg('settingsMsg','✅ Exam Settings সংরক্ষিত হয়েছে');

  await loadExams();
}

async function loadPool(){

  const examId=$('mapExam').value;

  if(!examId)return msg('mapMsg','Exam নির্বাচন করুন',true);

  let q=db
    .from('questions')
    .select(
      'id,question_text,category,folder_id,set_id,question_number'
    )
    .limit(200);

  if($('mapFolder').value){
    q=q.eq('folder_id',Number($('mapFolder').value));
  }

  if($('mapSet').value){
    q=q.eq('set_id',Number($('mapSet').value));
  }

  const{data,error}=await q;

  if(error)return msg('mapMsg',error.message,true);

  const existing=await db
    .from('exam_questions')
    .select('question_id')
    .eq('exam_id',examId);

  const ids=new Set(
    (existing.data||[]).map(x=>String(x.question_id))
  );

  $('pool').innerHTML=
    (data||[]).map(x=>
      `<label class="q">
        <input
          type="checkbox"
          class="poolq"
          value="${x.id}"
          ${ids.has(String(x.id))?'checked':''}>
        ${esc(x.question_text)}
        <span class="small">(${esc(x.category||'')})</span>
      </label>`
    ).join('')+
    `<button onclick="saveMapping(${examId})">
      Exam-এ নির্বাচিত প্রশ্ন Save করুন
    </button>`;
}

async function saveMapping(examId){

  const ids=[...document.querySelectorAll('.poolq:checked')]
    .map(x=>Number(x.value));

  const old=await db
    .from('exam_questions')
    .delete()
    .eq('exam_id',examId);

  if(old.error)return msg('mapMsg',old.error.message,true);

  if(ids.length){

    const{error}=await db
      .from('exam_questions')
      .insert(
        ids.map((id,i)=>({
          exam_id:examId,
          question_id:id,
          question_order:i+1
        }))
      );

    if(error)return msg('mapMsg',error.message,true);
  }

  await db
    .from('exams')
    .update({total_questions:ids.length})
    .eq('id',examId);

  await db
    .from('exam_settings')
    .update({total_questions:ids.length})
    .eq('exam_id',examId);

  msg(
    'mapMsg',
    `✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`
  );

  await loadExams();
}

/* =========================
   SAFE EVENTS
   ========================= */

if($('folder')){
  $('folder').onchange=loadSets;
}

if($('filterFolder')){
  $('filterFolder').onchange=async()=>{
    await loadFilterSets();
    await loadQuestions();
  };
}

if($('mapFolder')){
  $('mapFolder').onchange=loadMapSets;
}

selectCategory('verification_test');
init();
