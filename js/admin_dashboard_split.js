const $=id=>document.getElementById(id);
function setLoginMsg(t,e=false){const x=$('loginMsg');x.textContent=t;x.className='msg '+(e?'error':'success')}
async function init(){const{data,error}=await db.auth.getSession();if(error)return setLoginMsg(error.message,true);if(!data.session){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}const section=new URLSearchParams(location.search).get('section');if(section==='exam')return location.replace('exam-manager.html');if(section==='bank')return location.replace('question_bank.html');$('login').classList.add('hidden');$('app').classList.remove('hidden')}
$('loginBtn').onclick=async()=>{setLoginMsg('Login হচ্ছে...');const{error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return setLoginMsg(error.message,true);await init()};
$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};
$('adminMenuBtn').onclick=e=>{e.stopPropagation();$('adminMenuPanel').classList.toggle('hidden')};document.addEventListener('click',e=>{if(!e.target.closest('.admin-menu'))$('adminMenuPanel').classList.add('hidden')});init();
