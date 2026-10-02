const CATS={
  recruitment:'নিয়োগ পরীক্ষা',
  verification_test:'যাচাই পরীক্ষা',
  recent:'সাম্প্রতিক প্রশ্ন'
};

let cat='verification_test',folders=[],sets=[],subjects=[],exams=[],importData=[];

const $=id=>document.getElementById(id);

const bn=n=>String(n??'').replace(
  /\d/g,
  d=>'০১২৩৪৫৬৭৮৯'[d]
);

const esc=v=>String(v??'').replace(
  /[&<>"']/g,
  m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m])
);

function msg(id,t,err=false){
  const e=$(id);
  if(!e)return;
  e.textContent=t;
  e.style.color=err?'#b91c1c':'#166534';
}


/* =========================
   LOGIN
========================= */

async function login(){
  msg('loginMsg','Login হচ্ছে...');

  const{
    error
  }=await db.auth.signInWithPassword({
    email:$('email').value.trim(),
    password:$('password').value
  });

  if(error)
    return msg('loginMsg',error.message,true);

  await init();
}

async function logout(){
  await db.auth.signOut();
  location.reload();
}


/* =========================
   PAGE
========================= */

function showPage(p){

  document
    .querySelectorAll('.page')
    .forEach(x=>x.classList.add('hidden'));

  $(p)?.classList.remove('hidden');

  if(p==='bank')
    loadBank();

  if(p==='exam')
    loadExams();
}


/* =========================
   INIT
========================= */

async function init(){

  const{
    data,
    error
  }=await db.auth.getSession();

  if(error)
    return msg('loginMsg',error.message,true);

  if(!data.session){

    $('login').classList.remove('hidden');
    $('app').classList.add('hidden');

    return;
  }

  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');

  const ue=$('userEmail');

  if(ue)
    ue.textContent=data.session.user.email||'';

  await loadSubjects();
  await loadBank();
  await loadExams();

  showPage('dashboard');
}


/* =========================
   SUBJECTS
========================= */

async function loadSubjects(){

  const s=$('subject');
  const f=$('filterSubject');

  if(!s||!f)return;

  s.innerHTML='<option value="">বিষয় নির্বাচন করুন</option>';
  f.innerHTML='<option value="">সব বিষয়</option>';

  const{
    data,
    error
  }=await db
    .from('subjects')
    .select('id,name')
    .order('id');

  if(error){

    console.error(error);

    s.innerHTML='<option value="">বিষয় লোড হয়নি</option>';
    f.innerHTML='<option value="">বিষয় লোড হয়নি</option>';

    return msg(
      'qmsg',
      'Subject লোড হয়নি: '+error.message,
      true
    );
  }

  subjects=data||[];

  s.innerHTML=
    '<option value="">বিষয় নির্বাচন করুন</option>'+
    subjects.map(x=>
      `<option value="${x.id}">${esc(x.name)}</option>`
    ).join('');

  f.innerHTML=
    '<option value="">সব বিষয়</option>'+
    subjects.map(x=>
      `<option value="${x.id}">${esc(x.name)}</option>`
    ).join('');
}


/* =========================
   QUESTION BANK
========================= */

async function loadBank(){
  await loadFolders();
  await loadFilterFolders();
  await loadQuestions();
}

async function selectCategory(c){

  cat=c;

  document
    .querySelectorAll('.cats button')
    .forEach(b=>b.classList.remove('active'));

  $('cat-'+c)?.classList.add('active');

  $('currentCat').textContent=
    'বর্তমান Category: '+CATS[c];

  await loadFolders();
  await loadFilterFolders();
}


/* =========================
   FOLDERS
========================= */

async function loadFolders(){

  const{
    data,
    error
  }=await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category',CATS[cat])
    .order('id');

  if(error)
    return msg('folderMsg',error.message,true);

  folders=data||[];

  $('folder').innerHTML=
    '<option value="">Folder নির্বাচন করুন</option>'+
    folders.map(x=>
      `<option value="${x.id}">${esc(x.folder_name)}</option>`
    ).join('');

  $('mapFolder').innerHTML=
    '<option value="">Folder নির্বাচন করুন</option>'+
    folders.map(x=>
      `<option value="${x.id}">${esc(x.folder_name)}</option>`
    ).join('');

  $('filterFolder').innerHTML=
    '<option value="">সব Folder</option>'+
    folders.map(x=>
      `<option value="${x.id}">${esc(x.folder_name)}</option>`
    ).join('');

  await loadSets();
}

async function loadFilterFolders(){

  const{
    data,
    error
  }=await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category',CATS[cat])
    .order('id');

  if(error)return;

  $('filterFolder').innerHTML=
    '<option value="">সব Folder</option>'+
    (data||[]).map(x=>
      `<option value="${x.id}">${esc(x.folder_name)}</option>`
    ).join('');
}


/* =========================
   SETS
========================= */

async function loadSets(){

  const id=$('folder').value;

  if(!id){

    sets=[];

    $('set').innerHTML=
      '<option value="">Set নির্বাচন করুন</option>';

    return;
  }

  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)
    return msg('folderMsg',error.message,true);

  sets=data||[];

  $('set').innerHTML=
    '<option value="">Set নির্বাচন করুন</option>'+
    sets.map(x=>
      `<option value="${x.id}">${esc(x.set_name)}</option>`
    ).join('');
}

async function loadFilterSets(){

  const id=$('filterFolder').value;

  if(!id){

    $('filterSet').innerHTML=
      '<option value="">সব Set</option>';

    return;
  }

  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)
    return msg('qmsg',error.message,true);

  $('filterSet').innerHTML=
    '<option value="">সব Set</option>'+
    (data||[]).map(x=>
      `<option value="${x.id}">${esc(x.set_name)}</option>`
    ).join('');
}

async function loadMapSets(){

  const id=$('mapFolder').value;

  if(!id){

    $('mapSet').innerHTML=
      '<option value="">সব Set</option>';

    return;
  }

  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',Number(id))
    .order('id');

  if(error)
    return msg('mapMsg',error.message,true);

  $('mapSet').innerHTML=
    '<option value="">সব Set</option>'+
    (data||[]).map(x=>
      `<option value="${x.id}">${esc(x.set_name)}</option>`
    ).join('');
}


/* =========================
   CREATE FOLDER
========================= */

async function createFolder(){

  const name=$('newFolder').value.trim();

  if(!name)
    return msg(
      'folderMsg',
      'Folder-এর নাম দিন',
      true
    );

  const{
    data,
    error
  }=await db
    .from('question_bank_folders')
    .insert({
      sub_category:CATS[cat],
      folder_name:name
    })
    .select('id,folder_name')
    .single();

  if(error)
    return msg('folderMsg',error.message,true);

  $('newFolder').value='';

  await loadFolders();

  $('folder').value=data.id;

  await loadSets();

  msg('folderMsg','✅ Folder তৈরি হয়েছে');
}


/* =========================
   CREATE SET
========================= */

async function createSet(){

  const folderId=$('folder').value;
  const name=$('newSet').value.trim();

  if(!folderId)
    return msg(
      'folderMsg',
      'আগে Folder নির্বাচন করুন',
      true
    );

  if(!name)
    return msg(
      'folderMsg',
      'Set-এর নাম দিন',
      true
    );

  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .insert({
      folder_id:Number(folderId),
      set_name:name
    })
    .select('id,set_name')
    .single();

  if(error)
    return msg('folderMsg',error.message,true);

  $('newSet').value='';

  await loadSets();

  $('set').value=data.id;

  msg('folderMsg','✅ Set তৈরি হয়েছে');
}


/* =========================
   MANUAL QUESTION
========================= */

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

  if(!folderId||!setId)
    return msg(
      'qmsg',
      'Category, Folder ও Set নির্বাচন করুন',
      true
    );

  if(
    !subjectId||
    !text||
    !a||
    !b||
    !c||
    !d||
    !correct
  )
    return msg(
      'qmsg',
      'বিষয়, প্রশ্ন, চার অপশন ও সঠিক উত্তর পূরণ করুন',
      true
    );

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

    explanation:
      $('explanation').value.trim()||null,

    question_number:
      $('qno').value
        ?Number($('qno').value)
        :null,

    category:CATS[cat],

    source_name:
      $('source').value.trim()||null,

    source_type:cat
  };

  const{error}=await db
    .from('questions')
    .insert(p);

  if(error)
    return msg('qmsg',error.message,true);

  [
    'qno',
    'source',
    'qtext',
    'a',
    'b',
    'c',
    'd',
    'explanation'
  ].forEach(x=>$(x).value='');

  $('correct').value='';

  msg(
    'qmsg',
    '✅ প্রশ্ন Question Bank-এ যোগ হয়েছে'
  );

  await loadQuestions();
}


/* =========================
   MANUAL / IMPORT MODE
========================= */

function mode(m){

  $('manualBox')
    .classList
    .toggle('hidden',m!=='manual');

  $('importBox')
    .classList
    .toggle('hidden',m!=='import');
}


/* =========================
   EXCEL TEMPLATE
========================= */

function template(){

  const rows=[

    [
      'question',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_answer',
      'subject_id',
      'category',
      'folder',
      'set',
      'question_number',
      'source',
      'explanation'
    ],

    [
      'বাংলাদেশের রাজধানী কোনটি?',
      'ঢাকা',
      'চট্টগ্রাম',
      'রাজশাহী',
      'খুলনা',
      'A',
      '6',
      'বাংলাদেশ',
      '',
      '',
      '1',
      '',
      ''
    ]

  ];

  const ws=XLSX.utils.aoa_to_sheet(rows);

  const wb=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    'Questions'
  );

  XLSX.writeFile(
    wb,
    'question-import-template.xlsx'
  );
}


/* =========================
   PREVIEW IMPORT
========================= */

async function previewImport(){

  const f=$('file').files[0];

  if(!f)
    return msg(
      'qmsg',
      'CSV/Excel file নির্বাচন করুন',
      true
    );

  try{

    const data=XLSX.read(
      await f.arrayBuffer(),
      {
        type:'array'
      }
    );

    const sheet=
      data.Sheets[data.SheetNames[0]];

    const rows=
      XLSX.utils.sheet_to_json(
        sheet,
        {
          defval:''
        }
      );

    importData=rows;

    $('preview').innerHTML=
      `<div class="q">
        <b>${bn(rows.length)}টি row পাওয়া গেছে</b>
        <pre>${esc(
          JSON.stringify(
            rows.slice(0,5),
            null,
            2
          )
        )}</pre>
      </div>`;

    $('importBtn')
      .classList
      .remove('hidden');

    msg(
      'qmsg',
      'Preview প্রস্তুত হয়েছে'
    );

  }catch(error){

    console.error(error);

    msg(
      'qmsg',
      'Excel/CSV পড়তে সমস্যা হয়েছে: '+error.message,
      true
    );
  }
}


/* =========================
   NORMALIZE
========================= */

function norm(v){

  return String(v??'')
    .trim()
    .toLowerCase();
}


/* =========================
   IMPORT QUESTIONS
========================= */

async function importRows(){

  let ok=0;
  let fail=[];

  for(let i=0;i<importData.length;i++){

    const r=importData[i];

    const rowNo=i+2;


    /* =========================
       CATEGORY
    ========================= */

    const categoryValue=
      String(r.category??'').trim();

    const category=
      Object.values(CATS).includes(categoryValue)
        ?categoryValue
        :CATS[cat];


    /* =========================
       BASIC VALIDATION
    ========================= */

    if(
      !String(r.question??'').trim()||
      !String(r.option_a??'').trim()||
      !String(r.option_b??'').trim()||
      !String(r.option_c??'').trim()||
      !String(r.option_d??'').trim()||
      !String(r.correct_answer??'').trim()
    ){

      fail.push(
        `Row ${rowNo}: question, option_a, option_b, option_c, option_d ও correct_answer আবশ্যক`
      );

      continue;
    }


    /* =========================
       SUBJECT ID
       
       প্রথমে Excel-এর
       subject_id নেওয়া হবে।
    ========================= */

    let subjectId=null;

    const rawSubjectId=
      String(r.subject_id??'').trim();


    if(rawSubjectId){

      const parsedSubjectId=
        Number(rawSubjectId);


      if(
        !Number.isInteger(parsedSubjectId)||
        parsedSubjectId<=0
      ){

        fail.push(
          `Row ${rowNo}: Subject ID সঠিক নয়: ${rawSubjectId}`
        );

        continue;
      }


      /*
        Subject ID database-এ আছে কি না
        যাচাই করা হচ্ছে।
      */

      const subjectCheck=
        await db
          .from('subjects')
          .select('id,name')
          .eq('id',parsedSubjectId)
          .maybeSingle();


      if(subjectCheck.error){

        fail.push(
          `Row ${rowNo}: Subject যাচাই করতে সমস্যা: ${subjectCheck.error.message}`
        );

        continue;
      }


      if(!subjectCheck.data){

        fail.push(
          `Row ${rowNo}: Subject ID পাওয়া যায়নি: ${parsedSubjectId}`
        );

        continue;
      }


      subjectId=
        subjectCheck.data.id;

    }else{

      /*
        subject_id না থাকলে
        subject নাম দিয়ে খোঁজা হবে।
      */

      const subjectName=
        String(r.subject??'').trim();


      if(subjectName){

        const sub=
          subjects.find(
            x=>
              norm(x.name)===norm(subjectName)
          );


        if(!sub){

          fail.push(
            `Row ${rowNo}: Subject পাওয়া যায়নি: ${subjectName}`
          );

          continue;
        }

        subjectId=sub.id;

      }else{

        /*
          questions.subject_id NOT NULL,
          তাই Subject ছাড়া প্রশ্ন Import হবে না।
        */

        fail.push(
          `Row ${rowNo}: subject_id অথবা subject আবশ্যক`
        );

        continue;
      }
    }


    /* =========================
       FOLDER
    ========================= */

    const folderName=
      String(r.folder??'').trim();

    const setName=
      String(r.set??'').trim();

    let fid=null;
    let sid=null;


    if(folderName){

      const fr=
        await db
          .from('question_bank_folders')
          .select('id')
          .eq('sub_category',category)
          .eq('folder_name',folderName)
          .maybeSingle();


      if(fr.error){

        fail.push(
          `Row ${rowNo}: ${fr.error.message}`
        );

        continue;
      }


      fid=
        fr.data?.id||null;


      if(!fid){

        const x=
          await db
            .from('question_bank_folders')
            .insert({
              sub_category:category,
              folder_name:folderName
            })
            .select('id')
            .single();


        if(x.error){

          fail.push(
            `Row ${rowNo}: ${x.error.message}`
          );

          continue;
        }


        fid=x.data.id;
      }

    }else{

      /*
        Excel-এ Folder না থাকলে
        বর্তমানে selected Folder ব্যবহার করবে।
      */

      const selectedFolder=
        Number($('folder')?.value||0);


      if(selectedFolder){

        const check=
          await db
            .from('question_bank_folders')
            .select('id,sub_category')
            .eq('id',selectedFolder)
            .maybeSingle();


        if(check.error){

          fail.push(
            `Row ${rowNo}: ${check.error.message}`
          );

          continue;
        }


        if(
          check.data&&
          check.data.sub_category===category
        ){

          fid=check.data.id;

        }else{

          fail.push(
            `Row ${rowNo}: নির্বাচিত Folder Category-এর সাথে মিলছে না`
          );

          continue;
        }
      }
    }


    /* =========================
       SET
    ========================= */

    if(setName){

      if(!fid){

        fail.push(
          `Row ${rowNo}: Set দেওয়া হয়েছে, তাই Folder প্রয়োজন`
        );

        continue;
      }


      const sr=
        await db
          .from('question_bank_sets')
          .select('id')
          .eq('folder_id',fid)
          .eq('set_name',setName)
          .maybeSingle();


      if(sr.error){

        fail.push(
          `Row ${rowNo}: ${sr.error.message}`
        );

        continue;
      }


      sid=
        sr.data?.id||null;


      if(!sid){

        const x=
          await db
            .from('question_bank_sets')
            .insert({
              folder_id:fid,
              set_name:setName
            })
            .select('id')
            .single();


        if(x.error){

          fail.push(
            `Row ${rowNo}: ${x.error.message}`
          );

          continue;
        }


        sid=x.data.id;
      }

    }else if(fid){

      /*
        Excel-এ Set না থাকলে
        selected Set ব্যবহার করবে।
      */

      const selectedSet=
        Number($('set')?.value||0);


      if(selectedSet){

        const sr=
          await db
            .from('question_bank_sets')
            .select('id,folder_id')
            .eq('id',selectedSet)
            .maybeSingle();


        if(sr.error){

          fail.push(
            `Row ${rowNo}: ${sr.error.message}`
          );

          continue;
        }


        if(
          sr.data&&
          Number(sr.data.folder_id)===Number(fid)
        ){

          sid=sr.data.id;

        }else{

          fail.push(
            `Row ${rowNo}: নির্বাচিত Set এই Folder-এর নয়`
          );

          continue;
        }
      }
    }


    /* =========================
       QUESTION NUMBER
    ========================= */

    let questionNumber=null;

    const rawQno=
      String(r.question_number??'').trim();


    if(rawQno){

      const qno=Number(rawQno);


      if(
        !Number.isInteger(qno)||
        qno<=0
      ){

        fail.push(
          `Row ${rowNo}: question_number সঠিক নয়: ${rawQno}`
        );

        continue;
      }


      questionNumber=qno;
    }


    /* =========================
       CORRECT ANSWER
    ========================= */

    const correct=
      String(r.correct_answer??'')
        .trim()
        .toUpperCase();


    if(
      !['A','B','C','D'].includes(correct)
    ){

      fail.push(
        `Row ${rowNo}: correct_answer অবশ্যই A, B, C অথবা D হতে হবে`
      );

      continue;
    }


    /* =========================
       FINAL QUESTION OBJECT
    ========================= */

    const p={

      folder_id:fid,

      set_id:sid,

      /*
        সবচেয়ে গুরুত্বপূর্ণ:
        subject_id এখন Excel থেকে
        সরাসরি নেওয়া হচ্ছে।
      */

      subject_id:subjectId,

      category:category,

      source_name:
        String(r.source??'').trim()||null,

      source_type:cat,

      question_number:
        questionNumber,

      question_text:
        String(r.question??'').trim(),

      option_a:
        String(r.option_a??'').trim(),

      option_b:
        String(r.option_b??'').trim(),

      option_c:
        String(r.option_c??'').trim(),

      option_d:
        String(r.option_d??'').trim(),

      correct_answer:
        correct,

      explanation:
        String(r.explanation??'').trim()||null
    };


    /* =========================
       INSERT
    ========================= */

    const x=
      await db
        .from('questions')
        .insert(p);


    if(x.error){

      fail.push(
        `Row ${rowNo}: ${x.error.message}`
      );

    }else{

      ok++;
    }
  }


  /* =========================
     RESULT
  ========================= */

  msg(
    'qmsg',
    `✅ ${bn(ok)}টি Import হয়েছে${
      fail.length
        ?` | ❌ ${bn(fail.length)}টি ব্যর্থ`
        :''
    }`,
    !!fail.length
  );


  /* =========================
     FAILED ROWS
  ========================= */

  if(fail.length){

    $('preview').innerHTML+=
      '<div class="q">'+
      fail.map(esc).join('<br>')+
      '</div>';
  }


  await loadQuestions();
}


/* =========================
   CREATE EXAM
========================= */

async function createExam(){

  const name=
    $('examName').value.trim();

  if(!name)
    return msg(
      'examMsg',
      'পরীক্ষার নাম দিন',
      true
    );


  function makeISO(date,time,fallback){

    if(date&&time){

      const d=
        new Date(
          `${date}T${time}:00+06:00`
        );

      if(!Number.isNaN(d.getTime()))
        return d.toISOString();
    }

    return fallback;
  }


  const now=new Date();

  const startAt=
    makeISO(
      $('startDate')?.value||'',
      $('startTime')?.value||'',
      now.toISOString()
    );


  const defaultEnd=
    new Date(
      now.getTime()+
      365*24*60*60*1000
    );


  const endAt=
    makeISO(
      $('endDate')?.value||'',
      $('endTime')?.value||'',
      defaultEnd.toISOString()
    );


  if(
    new Date(endAt)<=
    new Date(startAt)
  )
    return msg(
      'examMsg',
      'End date/time অবশ্যই Start date/time-এর পরে হতে হবে',
      true
    );


  const{
    data:userData
  }=await db.auth.getUser();


  const examinerId=
    userData?.user?.id||null;


  const{
    data,
    error
  }=await db
    .from('exams')
    .insert({

      exam_name:name,

      examiner_id:examinerId,

      status:$('examStatus').value,

      total_questions:0,

      marks_per_question:1,

      negative_mark:0,

      pass_mark:0,

      start_at:startAt,

      end_at:endAt,

      exam_token:crypto.randomUUID()

    })
    .select('id')
    .single();


  if(error)
    return msg(
      'examMsg',
      error.message,
      true
    );


  const s=
    await db
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


  if(s.error)
    return msg(
      'examMsg',
      s.error.message,
      true
    );


  $('examName').value='';

  msg(
    'examMsg',
    '✅ Exam তৈরি হয়েছে'
  );

  await loadExams();

  $('examSelect').value=data.id;

  await loadSettings();
}


/* =========================
   EXAMS
========================= */

async function loadExams(){

  const{
    data,
    error
  }=await db
    .from('exams')
    .select(
      'id,exam_name,status,total_questions,marks_per_question,negative_mark,pass_mark'
    )
    .order('id',{
      ascending:false
    });


  if(error)
    return msg(
      'examMsg',
      error.message,
      true
    );


  exams=data||[];


  $('sExams').textContent=
    bn(exams.length);


  const active=$('sActive');


  if(active)
    active.textContent=
      bn(
        exams.filter(
          x=>x.status==='active'
        ).length
      );


  const opt=
    '<option value="">Exam নির্বাচন করুন</option>'+
    exams.map(x=>
      `<option value="${x.id}">
        ${esc(x.exam_name)} (#${x.id})
      </option>`
    ).join('');


  $('examSelect').innerHTML=opt;

  $('mapExam').innerHTML=opt;


  $('exams').innerHTML=
    exams.map(x=>
      `<div class="examrow">

        <b>${esc(x.exam_name)}</b>
        · ${esc(x.status)}
        · ${bn(x.total_questions||0)} প্রশ্ন

        <br>

        <span class="link">
          ${location.origin}
          ${location.pathname.replace(/\/[^/]*$/,'/../')}
          ?exam=${x.id}
        </span>

        <br>

        <button onclick="copyLink(${x.id})">
          🔗 Exam Link কপি
        </button>

        <button
          class="secondary"
          onclick="activate(
            ${x.id},
            '${x.status==='active'?'inactive':'active'}'
          )"
        >
          ${x.status==='active'
            ?'Inactive'
            :'Active'}
        </button>

      </div>`
    ).join('');


  const count=
    await db
      .from('questions')
      .select('id',{
        count:'exact',
        head:true
      });


  if(!$('sQuestions'))
    return;


  $('sQuestions').textContent=
    bn(count.count||0);
}


async function copyLink(id){

  const base=
    new URL(
      '../index.html',
      location.href
    ).href+
    '?exam='+id;


  try{

    await navigator.clipboard.writeText(base);

    alert('Exam Link copied');

  }catch(_){

    prompt(
      'Exam Link',
      base
    );
  }
}


async function activate(id,status){

  const{
    error
  }=await db
    .from('exams')
    .update({status})
    .eq('id',id);


  if(error)
    return msg(
      'examMsg',
      error.message,
      true
    );


  await loadExams();
}


/* =========================
   EXAM SETTINGS
========================= */

async function loadSettings(){

  const id=$('examSelect').value;

  if(!id)return;


  const{
    data,
    error
  }=await db
    .from('exam_settings')
    .select('*')
    .eq('exam_id',id)
    .maybeSingle();


  if(error)
    return msg(
      'settingsMsg',
      error.message,
      true
    );


  const s=data||{};


  $('totalQ').value=
    s.total_questions??0;

  $('totalMarks').value=
    s.total_marks??0;

  $('pass').value=
    s.pass_mark??0;

  $('duration').value=
    s.duration_minutes??20;

  $('marks').value=
    s.marks_per_question??1;

  $('negative').value=
    s.negative_mark??0;

  $('examiner').value=
    s.examiner_name??'';

  $('syllabus').value=
    s.syllabus??'';

  $('showAnswers').checked=
    !!s.show_answers;

  $('multiple').checked=
    !!s.multiple_attempts;

  $('device').checked=
    s.device_attempt_protection!==false;

  $('randomQ').checked=
    !!s.random_questions;

  $('randomO').checked=
    !!s.random_options;

  $('startDate').value=
    s.exam_date||'';

  $('startTime').value=
    s.start_time||'';

  $('endDate').value=
    s.end_date||'';

  $('endTime').value=
    s.end_time||'';
}


async function saveSettings(){

  const id=$('examSelect').value;

  if(!id)
    return msg(
      'settingsMsg',
      'Exam নির্বাচন করুন',
      true
    );


  const payload={

    exam_id:id,

    total_questions:
      Number($('totalQ').value)||0,

    total_marks:
      Number($('totalMarks').value)||0,

    pass_mark:
      Number($('pass').value)||0,

    duration_minutes:
      Number($('duration').value)||20,

    marks_per_question:
      Number($('marks').value)||1,

    negative_mark:
      Number($('negative').value)||0,

    examiner_name:
      $('examiner').value.trim()||null,

    syllabus:
      $('syllabus').value.trim()||null,

    show_answers:
      $('showAnswers').checked,

    multiple_attempts:
      $('multiple').checked,

    device_attempt_protection:
      $('device').checked,

    random_questions:
      $('randomQ').checked,

    random_options:
      $('randomO').checked,

    exam_date:
      $('startDate').value||null,

    start_time:
      $('startTime').value||null,

    end_date:
      $('endDate').value||null,

    end_time:
      $('endTime').value||null
  };


  const{
    error
  }=await db
    .from('exam_settings')
    .upsert(
      payload,
      {
        onConflict:'exam_id'
      }
    );


  if(error)
    return msg(
      'settingsMsg',
      error.message,
      true
    );


  const e=
    await db
      .from('exams')
      .update({

        total_questions:
          payload.total_questions,

        marks_per_question:
          payload.marks_per_question,

        negative_mark:
          payload.negative_mark,

        pass_mark:
          payload.pass_mark

      })
      .eq('id',id);


  if(e.error)
    return msg(
      'settingsMsg',
      e.error.message,
      true
    );


  msg(
    'settingsMsg',
    '✅ Exam Settings সংরক্ষিত হয়েছে'
  );

  await loadExams();
}


/* =========================
   QUESTION POOL
========================= */

async function loadPool(){

  const examId=$('mapExam').value;

  if(!examId)
    return msg(
      'mapMsg',
      'Exam নির্বাচন করুন',
      true
    );


  let q=
    db
      .from('questions')
      .select(
        'id,question_text,category,folder_id,set_id,question_number'
      )
      .limit(200);


  if($('mapFolder').value)
    q=q.eq(
      'folder_id',
      Number($('mapFolder').value)
    );


  if($('mapSet').value)
    q=q.eq(
      'set_id',
      Number($('mapSet').value)
    );


  const{
    data,
    error
  }=await q;


  if(error)
    return msg(
      'mapMsg',
      error.message,
      true
    );


  const existing=
    await db
      .from('exam_questions')
      .select('question_id')
      .eq('exam_id',examId);


  const ids=
    new Set(
      (existing.data||[])
        .map(x=>String(x.question_id))
    );


  $('pool').innerHTML=
    (data||[]).map(x=>
      `<label class="q">

        <input
          type="checkbox"
          class="poolq"
          value="${x.id}"
          ${ids.has(String(x.id))
            ?'checked'
            :''}
        >

        ${esc(x.question_text)}

        <span class="small">
          (${esc(x.category||'')})
        </span>

      </label>`
    ).join('')+

    `<button
      onclick="saveMapping(${examId})"
    >
      Exam-এ নির্বাচিত প্রশ্ন Save করুন
    </button>`;
}


async function saveMapping(examId){

  const ids=
    [
      ...document.querySelectorAll(
        '.poolq:checked'
      )
    ].map(
      x=>Number(x.value)
    );


  const old=
    await db
      .from('exam_questions')
      .delete()
      .eq('exam_id',examId);


  if(old.error)
    return msg(
      'mapMsg',
      old.error.message,
      true
    );


  if(ids.length){

    const{
      error
    }=await db
      .from('exam_questions')
      .insert(
        ids.map(
          (id,i)=>({
            exam_id:examId,
            question_id:id,
            question_order:i+1
          })
        )
      );


    if(error)
      return msg(
        'mapMsg',
        error.message,
        true
      );
  }


  await db
    .from('exams')
    .update({
      total_questions:ids.length
    })
    .eq('id',examId);


  await db
    .from('exam_settings')
    .update({
      total_questions:ids.length
    })
    .eq('exam_id',examId);


  msg(
    'mapMsg',
    `✅ ${bn(ids.length)}টি প্রশ্ন Exam-এ যুক্ত হয়েছে`
  );


  await loadExams();
}


/* =========================
   EVENTS
========================= */

$('folder').onchange=loadSets;

$('filterFolder').onchange=
  async()=>{
    await loadFilterSets();
    await loadQuestions();
  };

$('mapFolder').onchange=
  loadMapSets;


/* =========================
   START
========================= */

selectCategory('verification_test');

init();


/* =====================================================
   SMART EDIT MODAL
===================================================== */

function ensureEditModal(){

  if(document.getElementById('smartEditModal'))
    return;


  const st=document.createElement('style');

  st.id='smartEditModalStyle';

  st.textContent=`

    .smart-modal{
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.62);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:14px;
      z-index:9999
    }

    .smart-modal.hidden{
      display:none
    }

    .smart-modal-card{
      background:#fff;
      width:min(820px,100%);
      max-height:94vh;
      overflow:auto;
      border-radius:18px;
      box-shadow:0 24px 70px rgba(0,0,0,.25);
      padding:18px
    }

    .smart-head{
      display:flex;
      align-items:center;
      gap:10px;
      position:sticky;
      top:-18px;
      background:#fff;
      padding:4px 0 12px;
      z-index:2;
      border-bottom:1px solid #e5e7eb
    }

    .smart-head h2{
      margin:0;
      font-size:20px
    }

    .smart-close{
      width:auto!important;
      min-width:90px!important;
      background:#64748b!important;
      margin-left:auto
    }

    .smart-label{
      display:block;
      font-weight:700;
      margin:12px 0 6px
    }

    .smart-grid{
      display:grid;
      grid-template-columns:
        repeat(2,minmax(0,1fr));
      gap:10px
    }

    .smart-actions{
      display:flex;
      gap:8px;
      justify-content:flex-end;
      margin-top:15px;
      position:sticky;
      bottom:-18px;
      background:#fff;
      padding-top:12px;
      border-top:1px solid #e5e7eb
    }

    .smart-actions button{
      width:auto;
      min-width:120px
    }

    .smart-msg{
      margin-top:8px;
      padding:9px;
      border-radius:9px
    }

    .smart-ok{
      background:#ecfdf3;
      color:#166534
    }

    .smart-err{
      background:#fef2f2;
      color:#991b1b
    }

    @media(max-width:650px){

      .smart-grid{
        grid-template-columns:1fr
      }

      .smart-modal-card{
        padding:14px
      }

      .smart-actions{
        flex-direction:column
      }

      .smart-actions button{
        width:100%
      }
    }
  `;

  document.head.appendChild(st);


  const m=document.createElement('div');

  m.id='smartEditModal';

  m.className='smart-modal hidden';

  m.innerHTML=`

    <div
      class="smart-modal-card"
      role="dialog"
      aria-modal="true"
    >

      <div class="smart-head">

        <h2>✏️ প্রশ্ন Smart Edit</h2>

        <button
          type="button"
          class="smart-close"
          id="smartEditClose"
        >
          বন্ধ করুন
        </button>

      </div>


      <input
        type="hidden"
        id="smartEditId"
      >


      <label class="smart-label">
        ক্যাটাগরি
      </label>

      <select id="smartEditCategory"></select>


      <div class="smart-grid">

        <div>

          <label class="smart-label">
            Folder
          </label>

          <select id="smartEditFolder">

            <option value="">
              Folder নির্বাচন করুন
            </option>

          </select>

        </div>


        <div>

          <label class="smart-label">
            Set
          </label>

          <select id="smartEditSet">

            <option value="">
              Set নির্বাচন করুন
            </option>

          </select>

        </div>

      </div>


      <div class="smart-grid">

        <div>

          <label class="smart-label">
            বিষয়
          </label>

          <select id="smartEditSubject">

            <option value="">
              বিষয় নির্বাচন করুন
            </option>

          </select>

        </div>


        <div>

          <label class="smart-label">
            প্রশ্ন নং
          </label>

          <input
            id="smartEditQno"
            type="number"
            min="1"
          >

        </div>

      </div>


      <label class="smart-label">
        প্রশ্ন
      </label>

      <textarea
        id="smartEditQuestion"
        rows="4"
      ></textarea>


      <div class="smart-grid">

        <div>

          <label class="smart-label">
            ক
          </label>

          <textarea
            id="smartEditA"
            rows="2"
          ></textarea>

        </div>


        <div>

          <label class="smart-label">
            খ
          </label>

          <textarea
            id="smartEditB"
            rows="2"
          ></textarea>

        </div>


        <div>

          <label class="smart-label">
            গ
          </label>

          <textarea
            id="smartEditC"
            rows="2"
          ></textarea>

        </div>


        <div>

          <label class="smart-label">
            ঘ
          </label>

          <textarea
            id="smartEditD"
            rows="2"
          ></textarea>

        </div>

      </div>


      <div class="smart-grid">

        <div>

          <label class="smart-label">
            সঠিক উত্তর
          </label>

          <select id="smartEditCorrect">

            <option value="A">ক</option>
            <option value="B">খ</option>
            <option value="C">গ</option>
            <option value="D">ঘ</option>

          </select>

        </div>


        <div>

          <label class="smart-label">
            Source
          </label>

          <input
            id="smartEditSource"
            placeholder="যেমন: বিসিএস"
          >

        </div>

      </div>


      <label class="smart-label">
        ব্যাখ্যা
      </label>

      <textarea
        id="smartEditExplanation"
        rows="5"
        placeholder="প্রয়োজনে ব্যাখ্যা লিখুন..."
      ></textarea>


      <div id="smartEditMsg"></div>


      <div class="smart-actions">

        <button
          type="button"
          class="secondary"
          id="smartEditCancel"
        >
          বাতিল
        </button>

        <button
          type="button"
          id="smartEditSave"
        >
          💾 পরিবর্তন সংরক্ষণ
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(m);


  const close=()=>
    m.classList.add('hidden');


  m.querySelector(
    '#smartEditClose'
  ).onclick=close;


  m.querySelector(
    '#smartEditCancel'
  ).onclick=close;


  m.addEventListener(
    'click',
    e=>{
      if(e.target===m)
        close();
    }
  );


  m.querySelector(
    '#smartEditCategory'
  ).onchange=
    async()=>{
      await loadSmartEditFolders();
      await loadSmartEditSets();
    };


  m.querySelector(
    '#smartEditFolder'
  ).onchange=
    loadSmartEditSets;


  m.querySelector(
    '#smartEditSave'
  ).onclick=
    saveSmartEditedQuestion;
}


/* =========================
   SMART EDIT FOLDERS
========================= */

async function loadSmartEditFolders(selected=null){

  const category=
    $('smartEditCategory').value;

  const el=
    $('smartEditFolder');

  if(!el)return;

  el.innerHTML=
    '<option value="">Folder নির্বাচন করুন</option>';

  if(!category)return;


  const{
    data,
    error
  }=await db
    .from('question_bank_folders')
    .select('id,folder_name')
    .eq('sub_category',category)
    .order('id');


  if(error){

    $('smartEditMsg').innerHTML=
      `<div class="smart-msg smart-err">
        ${esc(error.message)}
      </div>`;

    return;
  }


  el.innerHTML+=
    (data||[]).map(x=>
      `<option value="${x.id}">
        ${esc(x.folder_name)}
      </option>`
    ).join('');


  if(selected!=null)
    el.value=String(selected);
}


/* =========================
   SMART EDIT SETS
========================= */

async function loadSmartEditSets(selected=null){

  const fid=
    Number(
      $('smartEditFolder').value||0
    );

  const el=
    $('smartEditSet');


  el.innerHTML=
    '<option value="">Set নির্বাচন করুন</option>';


  if(!fid)return;


  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',fid)
    .order('id');


  if(error){

    $('smartEditMsg').innerHTML=
      `<div class="smart-msg smart-err">
        ${esc(error.message)}
      </div>`;

    return;
  }


  el.innerHTML+=
    (data||[]).map(x=>
      `<option value="${x.id}">
        ${esc(x.set_name)}
      </option>`
    ).join('');


  if(selected!=null)
    el.value=String(selected);
}


/* =========================
   SMART EDIT SUBJECTS
========================= */

function fillSmartEditSubjects(selected=null){

  const el=
    $('smartEditSubject');


  el.innerHTML=
    '<option value="">বিষয় নির্বাচন করুন</option>'+
    (subjects||[]).map(x=>
      `<option value="${x.id}">
        ${esc(x.name)}
      </option>`
    ).join('');


  if(selected!=null)
    el.value=String(selected);
}


/* =========================
   EDIT QUESTION
========================= */

async function editQuestion(id){

  ensureEditModal();

  $('smartEditMsg').innerHTML='';


  const{
    data,
    error
  }=await db
    .from('questions')
    .select(
      'id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,explanation,source_name,category,folder_id,set_id,subject_id'
    )
    .eq('id',id)
    .maybeSingle();


  if(error||!data)
    return msg(
      'qmsg',
      error?.message||'প্রশ্ন পাওয়া যায়নি',
      true
    );


  $('smartEditId').value=
    data.id;

  $('smartEditQuestion').value=
    data.question_text||'';

  $('smartEditA').value=
    data.option_a||'';

  $('smartEditB').value=
    data.option_b||'';

  $('smartEditC').value=
    data.option_c||'';

  $('smartEditD').value=
    data.option_d||'';

  $('smartEditCorrect').value=
    data.correct_answer||'A';

  $('smartEditQno').value=
    data.question_number??'';

  $('smartEditSource').value=
    data.source_name||'';

  $('smartEditExplanation').value=
    data.explanation||'';


  $('smartEditCategory').innerHTML=
    Object.entries(CATS).map(
      ([k,v])=>
        `<option value="${esc(v)}">
          ${esc(v)}
        </option>`
    ).join('');


  $('smartEditCategory').value=
    data.category||
    CATS[cat]||
    '';


  fillSmartEditSubjects(
    data.subject_id
  );


  await loadSmartEditFolders(
    data.folder_id
  );


  await loadSmartEditSets(
    data.set_id
  );


  $('smartEditModal')
    .classList
    .remove('hidden');


  setTimeout(
    ()=>$('smartEditQuestion').focus(),
    50
  );
}


/* =========================
   SAVE EDITED QUESTION
========================= */

async function saveSmartEditedQuestion(){

  const id=
    Number(
      $('smartEditId').value
    );


  const category=
    $('smartEditCategory').value;


  const folderId=
    Number(
      $('smartEditFolder').value||0
    )||null;


  const setId=
    Number(
      $('smartEditSet').value||0
    )||null;


  const subjectId=
    Number(
      $('smartEditSubject').value||0
    )||null;


  const question=
    $('smartEditQuestion').value.trim();


  const a=
    $('smartEditA').value.trim();

  const b=
    $('smartEditB').value.trim();

  const c=
    $('smartEditC').value.trim();

  const d=
    $('smartEditD').value.trim();


  const correct=
    $('smartEditCorrect').value;


  if(
    !category||
    !question||
    !a||
    !b||
    !c||
    !d||
    !correct
  )
    return $('smartEditMsg').innerHTML=
      `<div class="smart-msg smart-err">
        প্রশ্ন, চারটি অপশন, সঠিক উত্তর ও ক্যাটাগরি পূরণ করুন।
      </div>`;


  if(!subjectId)
    return $('smartEditMsg').innerHTML=
      `<div class="smart-msg smart-err">
        বিষয় নির্বাচন করুন।
      </div>`;


  if(setId){

    const sr=
      await db
        .from('question_bank_sets')
        .select('folder_id')
        .eq('id',setId)
        .maybeSingle();


    if(sr.error)
      return $('smartEditMsg').innerHTML=
        `<div class="smart-msg smart-err">
          ${esc(sr.error.message)}
        </div>`;


    if(
      !folderId||
      Number(sr.data?.folder_id)!==
      folderId
    )
      return $('smartEditMsg').innerHTML=
        `<div class="smart-msg smart-err">
          নির্বাচিত Set এই Folder-এর নয়।
        </div>`;
  }


  if(folderId){

    const fr=
      await db
        .from('question_bank_folders')
        .select('sub_category')
        .eq('id',folderId)
        .maybeSingle();


    if(fr.error)
      return $('smartEditMsg').innerHTML=
        `<div class="smart-msg smart-err">
          ${esc(fr.error.message)}
        </div>`;


    if(
      fr.data?.sub_category!==category
    )
      return $('smartEditMsg').innerHTML=
        `<div class="smart-msg smart-err">
          নির্বাচিত Folder এই Category-এর নয়।
        </div>`;
  }


  const payload={

    category,

    folder_id:folderId,

    set_id:setId,

    subject_id:subjectId,

    question_text:question,

    option_a:a,

    option_b:b,

    option_c:c,

    option_d:d,

    correct_answer:correct,

    question_number:
      $('smartEditQno').value
        ?Number(
          $('smartEditQno').value
        )
        :null,

    source_name:
      $('smartEditSource')
        .value
        .trim()||null,

    explanation:
      $('smartEditExplanation')
        .value
        .trim()||null,

    source_type:
      Object.keys(CATS)
        .find(
          k=>CATS[k]===category
        )||cat
  };


  $('smartEditSave').disabled=true;

  $('smartEditSave').textContent=
    'সংরক্ষণ হচ্ছে...';


  const{
    error
  }=await db
    .from('questions')
    .update(payload)
    .eq('id',id);


  $('smartEditSave').disabled=false;

  $('smartEditSave').textContent=
    '💾 পরিবর্তন সংরক্ষণ';


  if(error)
    return $('smartEditMsg').innerHTML=
      `<div class="smart-msg smart-err">
        ${esc(error.message)}
      </div>`;


  $('smartEditMsg').innerHTML=
    `<div class="smart-msg smart-ok">
      ✅ পরিবর্তন সংরক্ষণ হয়েছে
    </div>`;


  await loadQuestions();


  setTimeout(
    ()=>$('smartEditModal')
      .classList
      .add('hidden'),
    450
  );
}


/* =========================
   REMOVE QUESTION
========================= */

async function removeQuestion(id){

  if(!confirm(
    'এই প্রশ্নটি Remove করবেন?'
  ))
    return;


  const{
    error
  }=await db
    .from('questions')
    .delete()
    .eq('id',id);


  if(error)
    return msg(
      'qmsg',
      error.message,
      true
    );


  msg(
    'qmsg',
    '✅ প্রশ্ন Remove হয়েছে'
  );


  await loadQuestions();
}


/* =========================
   LOAD QUESTIONS
========================= */

async function loadQuestions(){

  let q=
    db
      .from('questions')
      .select(
        'id,question_text,option_a,option_b,option_c,option_d,correct_answer,question_number,category,folder_id,set_id,subject_id,subjects(name),question_bank_folders(folder_name,sub_category),question_bank_sets(set_name)'
      )
      .order('id',{
        ascending:false
      })
      .limit(200);


  const ff=
    $('filterFolder')?.value||'';

  const fs=
    $('filterSet')?.value||'';

  const fsub=
    $('filterSubject')?.value||'';


  if(ff)
    q=q.eq(
      'folder_id',
      Number(ff)
    );


  if(fs)
    q=q.eq(
      'set_id',
      Number(fs)
    );


  if(fsub)
    q=q.eq(
      'subject_id',
      Number(fsub)
    );


  const term=
    $('search')?.value.trim()||'';


  if(term)
    q=q.ilike(
      'question_text',
      '%'+term+'%'
    );


  const{
    data,
    error
  }=await q;


  if(error)
    return msg(
      'qmsg',
      error.message,
      true
    );


  const subjectFiltered=!!fsub;


  const rows=
    (data||[])
      .map(x=>{

        const folder=
          x.question_bank_folders
            ?.folder_name||'—';


        const set=
          x.question_bank_sets
            ?.set_name||'—';


        const qn=
          x.question_number||'—';


        const source=
          `${x.category||CATS[cat]} / ${folder} / ${set} / প্রশ্ন ${bn(qn)}`;


        return `

          <div
            class="q"
            id="bank-question-${x.id}"
          >

            <div>

              <input
                type="checkbox"
                class="bankQuestionCheck"
                value="${x.id}"
              >

              <b>
                ${bn(x.question_number||'')}.
                ${esc(x.question_text)}
              </b>

            </div>


            <div>

              ক. ${esc(x.option_a)}
              <br>

              খ. ${esc(x.option_b)}
              <br>

              গ. ${esc(x.option_c)}
              <br>

              ঘ. ${esc(x.option_d)}

            </div>


            <div class="small">

              ${esc(x.category||'')}
              ·
              ${esc(x.subjects?.name||'')}
              ·
              সঠিক:
              ${esc(
                ({
                  A:'ক',
                  B:'খ',
                  C:'গ',
                  D:'ঘ'
                })[x.correct_answer]||
                x.correct_answer
              )}

            </div>


            <div
              class="small"
              style="margin-top:6px"
            >

              🔗

              <a
                href="#bank-question-${x.id}"
                onclick="event.preventDefault();openSourceQuestion(${x.id})"
              >
                ${esc(source)}
              </a>

            </div>


            ${
              subjectFiltered
              ?''
              :`
                <div
                  class="actions"
                  style="margin-top:8px"
                >

                  <button
                    class="secondary"
                    onclick="editQuestion(${x.id})"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    class="secondary"
                    onclick="removeQuestion(${x.id})"
                  >
                    🗑️ Remove
                  </button>

                </div>
              `
            }

          </div>
        `;
      })
      .join('');


  $('questions').innerHTML=
    rows||'কোনো প্রশ্ন নেই';


  setupQuestionMoveUI();
}


/* =========================
   SOURCE QUESTION
========================= */

async function openSourceQuestion(id){

  const{
    data,
    error
  }=await db
    .from('questions')
    .select(
      'id,folder_id,set_id,category'
    )
    .eq('id',id)
    .maybeSingle();


  if(error||!data)
    return msg(
      'qmsg',
      error?.message||
      'Source প্রশ্ন পাওয়া যায়নি',
      true
    );


  const key=
    Object.keys(CATS)
      .find(
        k=>CATS[k]===data.category
      );


  if(key){

    cat=key;


    document
      .querySelectorAll('.cats button')
      .forEach(
        b=>b.classList.remove('active')
      );


    $('cat-'+key)
      ?.classList
      .add('active');


    $('currentCat').textContent=
      'বর্তমান Category: '+
      CATS[key];


    await loadFolders();

    await loadFilterFolders();
  }


  $('filterFolder').value=
    data.folder_id||'';


  await loadFilterSets();


  $('filterSet').value=
    data.set_id||'';


  $('filterSubject').value='';


  if($('search'))
    $('search').value='';


  await loadQuestions();


  setTimeout(
    ()=>{
      const el=
        document.getElementById(
          'bank-question-'+id
        );


      el?.scrollIntoView({
        behavior:'smooth',
        block:'center'
      });


      el?.classList.add(
        'source-highlight'
      );


      setTimeout(
        ()=>el?.classList.remove(
          'source-highlight'
        ),
        1800
      );
    },
    50
  );
}


/* =========================
   MOVE QUESTION
========================= */

async function loadMoveSets(){

  const fid=
    Number(
      $('moveFolder')?.value||0
    );

  const el=$('moveSet');

  if(!el)return;


  if(!fid){

    el.innerHTML=
      '<option value="">Set নির্বাচন করুন</option>';

    return;
  }


  const{
    data,
    error
  }=await db
    .from('question_bank_sets')
    .select('id,set_name')
    .eq('folder_id',fid)
    .order('id');


  if(error)
    return msg(
      'moveMsg',
      error.message,
      true
    );


  el.innerHTML=
    '<option value="">Set নির্বাচন করুন</option>'+
    (data||[]).map(x=>
      `<option value="${x.id}">
        ${esc(x.set_name)}
      </option>`
    ).join('');
}


/* =========================
   MOVE UI
========================= */

function setupQuestionMoveUI(){

  const host=$('questions');

  if(!host)return;


  let box=
    $('questionMoveBox');


  if(!box){

    box=document.createElement('div');

    box.id='questionMoveBox';

    box.className='q';

    host.appendChild(box);
  }


  box.innerHTML=`

    <div>
      <b>
        📦 নির্বাচিত প্রশ্ন অন্য Folder/Set-এ Move করুন
      </b>
    </div>


    <div
      class="grid"
      style="margin-top:8px"
    >

      <select id="moveFolder">

        <option value="">
          Destination Folder নির্বাচন করুন
        </option>

        ${folders.map(x=>
          `<option value="${x.id}">
            ${esc(x.folder_name)}
          </option>`
        ).join('')}

      </select>


      <select id="moveSet">

        <option value="">
          Set নির্বাচন করুন
        </option>

      </select>

    </div>


    <div
      class="actions"
      style="margin-top:8px"
    >

      <button
        id="selectAllQuestionsBtn"
        class="secondary"
      >
        সব নির্বাচন
      </button>


      <button
        id="clearAllQuestionsBtn"
        class="secondary"
      >
        সব বাতিল
      </button>


      <button
        id="moveSelectedBtn"
      >
        📦 Move Selected Questions
      </button>

    </div>


    <div
      id="moveMsg"
      class="small"
    ></div>
  `;


  box.querySelector(
    '#moveFolder'
  ).onchange=
    loadMoveSets;


  box.querySelector(
    '#selectAllQuestionsBtn'
  ).onclick=
    ()=>{
      document
        .querySelectorAll(
          '.bankQuestionCheck'
        )
        .forEach(
          x=>x.checked=true
        );
    };


  box.querySelector(
    '#clearAllQuestionsBtn'
  ).onclick=
    ()=>{
      document
        .querySelectorAll(
          '.bankQuestionCheck'
        )
        .forEach(
          x=>x.checked=false
        );
    };


  box.querySelector(
    '#moveSelectedBtn'
  ).onclick=
    moveSelectedQuestions;
}


/* =========================
   MOVE QUESTIONS
========================= */

async function moveSelectedQuestions(){

  const ids=
    [
      ...document.querySelectorAll(
        '.bankQuestionCheck:checked'
      )
    ].map(
      x=>Number(x.value)
    );


  if(!ids.length)
    return msg(
      'moveMsg',
      'আগে প্রশ্ন নির্বাচন করুন',
      true
    );


  const fid=
    Number(
      $('moveFolder').value||0
    );


  const sid=
    Number(
      $('moveSet').value||0
    )||null;


  if(!fid)
    return msg(
      'moveMsg',
      'Destination Folder নির্বাচন করুন',
      true
    );


  if(sid){

    const sr=
      await db
        .from('question_bank_sets')
        .select('id,folder_id')
        .eq('id',sid)
        .maybeSingle();


    if(sr.error)
      return msg(
        'moveMsg',
        sr.error.message,
        true
      );


    if(
      !sr.data||
      Number(sr.data.folder_id)!==
      fid
    )
      return msg(
        'moveMsg',
        'নির্বাচিত Set এই Folder-এর নয়',
        true
      );
  }


  if(!confirm(
    `${bn(ids.length)}টি প্রশ্ন নির্বাচিত Folder/Set-এ Move করবেন?`
  ))
    return;


  const{
    error
  }=await db
    .from('questions')
    .update({
      folder_id:fid,
      set_id:sid
    })
    .in('id',ids);


  if(error)
    return msg(
      'moveMsg',
      error.message,
      true
    );


  msg(
    'moveMsg',
    `✅ ${bn(ids.length)}টি প্রশ্ন Move হয়েছে`
  );


  await loadFolders();

  await loadQuestions();
}
