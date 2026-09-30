/* Question Bank Folder / Set Rename + Delete */
(function(){
  const $ = id => document.getElementById(id);

  function addActionButtons(){
    const folder = $('folder'), set = $('set');
    if(!folder || !set) return;
    if(!$('folderActions')){
      const wrap=document.createElement('div'); wrap.id='folderActions';
      wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
      wrap.innerHTML='<button class="secondary" type="button" onclick="renameSelectedFolder()">✏️ Folder Rename</button><button class="secondary" type="button" onclick="deleteSelectedFolder()">🗑️ Folder Delete</button>';
      folder.parentElement.appendChild(wrap);
    }
    if(!$('setActions')){
      const wrap=document.createElement('div'); wrap.id='setActions';
      wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
      wrap.innerHTML='<button class="secondary" type="button" onclick="renameSelectedSet()">✏️ Set Rename</button><button class="secondary" type="button" onclick="deleteSelectedSet()">🗑️ Set Delete</button>';
      set.parentElement.appendChild(wrap);
    }
  }

  async function renameSelectedFolder(){
    const id=$('folder')?.value;
    if(!id) return msg('folderMsg','আগে Folder নির্বাচন করুন',true);
    const old=$('folder').selectedOptions[0]?.textContent||'';
    const name=prompt('নতুন Folder-এর নাম লিখুন:',old);
    if(name===null) return;
    const value=name.trim();
    if(!value) return msg('folderMsg','Folder-এর নাম খালি রাখা যাবে না',true);
    if(value===old) return;
    msg('folderMsg','Folder Rename হচ্ছে...');
    const r=await db.from('question_bank_folders').update({folder_name:value}).eq('id',Number(id));
    if(r.error) return msg('folderMsg',r.error.message,true);
    await loadFolders(); $('folder').value=String(id); await loadSets();
    msg('folderMsg','✅ Folder-এর নাম পরিবর্তন হয়েছে');
  }

  async function deleteSelectedFolder(){
    const id=$('folder')?.value;
    if(!id) return msg('folderMsg','আগে Folder নির্বাচন করুন',true);
    const name=$('folder').selectedOptions[0]?.textContent||'এই Folder';
    const check=await db.from('question_bank_sets').select('id',{count:'exact',head:true}).eq('folder_id',Number(id));
    if(check.error) return msg('folderMsg',check.error.message,true);
    const count=check.count||0;
    const text=count?`"${name}" Folder-এর ভিতরে ${count}টি Set আছে। Delete করলে Set-গুলোও মুছে যাবে। নিশ্চিত?`:`"${name}" Folder Delete করবেন?`;
    if(!confirm(text)) return;
    msg('folderMsg','Folder Delete হচ্ছে...');
    const r=await db.from('question_bank_folders').delete().eq('id',Number(id));
    if(r.error) return msg('folderMsg',r.error.message,true);
    await loadFolders(); $('set').innerHTML='<option value="">Set নির্বাচন করুন</option>';
    msg('folderMsg','✅ Folder Delete হয়েছে');
  }

  async function renameSelectedSet(){
    const id=$('set')?.value;
    if(!id) return msg('folderMsg','আগে Set নির্বাচন করুন',true);
    const old=$('set').selectedOptions[0]?.textContent||'';
    const name=prompt('নতুন Set-এর নাম লিখুন:',old);
    if(name===null) return;
    const value=name.trim();
    if(!value) return msg('folderMsg','Set-এর নাম খালি রাখা যাবে না',true);
    if(value===old) return;
    msg('folderMsg','Set Rename হচ্ছে...');
    const r=await db.from('question_bank_sets').update({set_name:value}).eq('id',Number(id));
    if(r.error) return msg('folderMsg',r.error.message,true);
    await loadSets(); $('set').value=String(id);
    msg('folderMsg','✅ Set-এর নাম পরিবর্তন হয়েছে');
  }

  async function deleteSelectedSet(){
    const id=$('set')?.value;
    if(!id) return msg('folderMsg','আগে Set নির্বাচন করুন',true);
    const name=$('set').selectedOptions[0]?.textContent||'এই Set';
    const check=await db.from('questions').select('id',{count:'exact',head:true}).eq('set_id',Number(id));
    if(check.error) return msg('folderMsg',check.error.message,true);
    const count=check.count||0;
    const text=count?`"${name}" Set-এর মধ্যে ${count}টি প্রশ্ন আছে। Delete করলে প্রশ্নগুলোও মুছে যাবে। নিশ্চিত?`:`"${name}" Set Delete করবেন?`;
    if(!confirm(text)) return;
    msg('folderMsg','Set Delete হচ্ছে...');
    const r=await db.from('question_bank_sets').delete().eq('id',Number(id));
    if(r.error) return msg('folderMsg',r.error.message,true);
    await loadSets(); msg('folderMsg','✅ Set Delete হয়েছে');
  }

  window.renameSelectedFolder=renameSelectedFolder;
  window.deleteSelectedFolder=deleteSelectedFolder;
  window.renameSelectedSet=renameSelectedSet;
  window.deleteSelectedSet=deleteSelectedSet;

  const timer=setInterval(()=>{
    if($('folder') && $('set')){ addActionButtons(); clearInterval(timer); }
  },300);
})();
