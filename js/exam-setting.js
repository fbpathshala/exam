const $=id=>document.getElementById(id);const id=Number(new URLSearchParams(location.search).get('exam'));const msg=(t,e=false)=>{$('msg').textContent=t;$('msg').style.color=e?'#b91c1c':'#166534'};
async function init(){const{data}=await db.auth.getSession();if(!data.session)return location.href='admin.html';if(!id)return msg('Exam ID পাওয়া যায়নি।',true);const e=await db.from('exams').select('id,exam_name,total_questions,marks_per_question,negative_mark,pass_mark').eq('id',id).single();if(e.error)return msg(e.error.message,true);$('title').textContent=e.data.exam_name;const r=await db.from('exam_settings').select('*').eq('exam_id',id).maybeSingle();if(r.error)return msg(r.error.message,true);const s=r.data||{};$('totalQ').value=s.total_questions??e.data.total_questions??0;$('totalMarks').value=s.total_marks??((Number(s.total_questions??e.data.total_questions)||0)*(Number(s.marks_per_question??e.data.marks_per_question)||1));$('pass').value=s.pass_mark??e.data.pass_mark??0;$('duration').value=s.duration_minutes??20;$('marks').value=s.marks_per_question??e.data.marks_per_question??1;$('negative').value=s.negative_mark??e.data.negative_mark??0;$('examiner').value=s.examiner_name??'';$('syllabus').value=s.syllabus??'';$('showAnswers').checked=!!s.show_answers;$('multiple').checked=!!s.multiple_attempts;$('device').checked=s.device_attempt_protection!==false;$('randomQ').checked=!!s.random_questions;$('randomO').checked=!!s.random_options;$('showResult').checked=s.show_result!==false;$('showRank').checked=s.show_rank!==false;$('thankYou').value=s.thank_you_message??'পরীক্ষায় অংশগ্রহণ করার জন্য ধন্যবাদ।';$('fbPage').value=s.facebook_page_url??'https://www.facebook.com/facebookpathshala';$('fbGroup').value=s.facebook_group_url??'https://www.facebook.com/groups/facebookpathshala';$('displayMode').value=String(s.question_display_mode||'all')==='single'?'single':'all';$('examDate').value=s.exam_date||'';$('startTime').value=s.start_time||'';$('endDate').value=s.end_date||'';$('endTime').value=s.end_time||''}
$('save').onclick=async()=>{
  if(!id)return;
  const p={
    exam_id:id,
    total_questions:Number($('totalQ').value)||0,
    total_marks:Number($('totalMarks').value)||0,
    pass_mark:Number($('pass').value)||0,
    duration_minutes:Number($('duration').value)||0,
    marks_per_question:Number($('marks').value),
    negative_mark:Number($('negative').value)||0,
    examiner_name:$('examiner').value.trim()||null,
    syllabus:$('syllabus').value.trim()||null,
    show_answers:$('showAnswers').checked,
    multiple_attempts:$('multiple').checked,
    device_attempt_protection:$('device').checked,
    random_questions:$('randomQ').checked,
    random_options:$('randomO').checked,
    show_result:$('showResult').checked,
    show_rank:$('showRank').checked,
    thank_you_message:$('thankYou').value.trim()||null,
    facebook_page_url:$('fbPage').value.trim()||null,
    facebook_group_url:$('fbGroup').value.trim()||null,
    question_display_mode:$('displayMode').value,
    exam_date:$('examDate').value||null,
    start_time:$('startTime').value||null,
    end_date:$('endDate').value||null,
    end_time:$('endTime').value||null
  };
  const numeric=[
    ['মোট প্রশ্ন',p.total_questions,true],
    ['মোট নম্বর',p.total_marks,false],
    ['পাস নম্বর',p.pass_mark,false],
    ['পরীক্ষার সময়',p.duration_minutes,true],
    ['প্রতি প্রশ্নের নম্বর',p.marks_per_question,false],
    ['নেগেটিভ মার্ক',p.negative_mark,false]
  ];
  for(const [label,value,integer] of numeric){
    if(!Number.isFinite(value)||value<0||(integer&&!Number.isInteger(value))){
      return msg(label+' সঠিকভাবে দিন। মান ঋণাত্মক হতে পারবে না।',true);
    }
  }
  if(p.duration_minutes<1)return msg('পরীক্ষার সময় অন্তত ১ মিনিট হতে হবে।',true);
  if(p.pass_mark>0&&p.total_marks>0&&p.pass_mark>p.total_marks)return msg('পাস নম্বর মোট নম্বরের চেয়ে বেশি হতে পারবে না।',true);
  for(const [label,value] of [['Facebook Page',p.facebook_page_url],['Facebook Group',p.facebook_group_url]]){
    if(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Error();}catch(_){return msg(label+'-এর সঠিক http/https URL দিন।',true);}}
  }
  const button=$('save');
  button.disabled=true;
  try{
    const r=await db.from('exam_settings').upsert(p,{onConflict:'exam_id'});
    if(r.error)throw r.error;
    const e=await db.from('exams').update({
      total_questions:p.total_questions,
      marks_per_question:p.marks_per_question,
      negative_mark:p.negative_mark,
      pass_mark:p.pass_mark
    }).eq('id',id);
    if(e.error)throw e.error;
    msg('✅ Settings সংরক্ষিত হয়েছে। শিক্ষার্থীদের আগের Attempt/Answer রেকর্ড পরিবর্তন করা হয়নি।');
  }catch(error){
    msg('Settings সংরক্ষণে সমস্যা: '+(error.message||error),true);
  }finally{
    button.disabled=false;
  }
};init();
