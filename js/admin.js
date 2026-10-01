/*
  ফেইসবুক পাঠশালা — corrected Admin JS loader
  মূল Question Bank / Exam logic GitHub-এর বর্তমান admin.js থেকেই চালানো হয়,
  যাতে বিদ্যমান Supabase logic ও database workflow অক্ষুণ্ণ থাকে।
  এই layer শুধু student-count fix যোগ করে।
*/
(async function(){
  const ORIGINAL='https://raw.githubusercontent.com/fbpathshala/exam/main/js/admin.js';
  async function updateStudentCount(){
    try{
      const session=(await db.auth.getSession()).data?.session;
      if(!session)return;
      const {data:examRows,error}=await db.from('exams').select('id');
      if(error)throw error;
      const people=new Set();
      for(const exam of (examRows||[])){
        const {data,error}=await db.rpc('get_exam_results',{p_exam_id:Number(exam.id)});
        if(error)continue;
        for(const row of (data||[])){
          const name=String(row.student_name||'').trim().toLowerCase();
          const facebook=String(row.facebook_name||'').trim().toLowerCase();
          const district=String(row.district||'').trim().toLowerCase();
          const key=[name,facebook,district].join('|');
          if(key!=='||')people.add(key);
        }
      }
      const el=document.getElementById('sStudents');
      if(el)el.textContent=String(people.size).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
    }catch(e){console.warn('Student count update skipped:',e)}
  }
  try{
    const r=await fetch(ORIGINAL,{cache:'no-store'});
    if(!r.ok)throw new Error('মূল admin.js লোড করা যায়নি: HTTP '+r.status);
    const source=await r.text();
    (0,eval)(source);
    setTimeout(updateStudentCount,1500);
    setInterval(updateStudentCount,15000);
  }catch(error){
    console.error(error);
    const el=document.getElementById('loginMsg');
    if(el){el.textContent='Admin system load হয়নি। GitHub-এর মূল admin.js পাওয়া যাচ্ছে না।';el.style.color='#b91c1c'}
  }
})();
