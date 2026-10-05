const $=id=>document.getElementById(id);
function setLoginMsg(t,e=false){const x=$('loginMsg');if(!x)return;x.textContent=t;x.className='msg '+(e?'error':'success')}
async function login(){
 setLoginMsg('Login হচ্ছে...');
 const{error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 if(error)return setLoginMsg(error.message,true);
 await init();
}
async function logout(){await db.auth.signOut();location.reload()}
function closeAdminMenu(){$('adminMenuPanel')?.classList.add('hidden')}
function showPage(section){
 closeAdminMenu();
 if(section==='exam')return location.href='exam-manager.html';
 if(section==='bank')return location.href='question_bank.html';
}
async function init(){
 const{data,error}=await db.auth.getSession();
 if(error)return setLoginMsg(error.message,true);
 if(!data.session){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}
 $('login').classList.add('hidden');$('app').classList.remove('hidden');
}
$('adminMenuBtn')?.addEventListener('click',e=>{e.stopPropagation();$('adminMenuPanel')?.classList.toggle('hidden')});
document.addEventListener('click',e=>{if(!e.target.closest('.admin-menu'))closeAdminMenu()});
init();
