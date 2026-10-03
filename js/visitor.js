/* Facebook Pathshala — unique-browser visitor tracking. */
(function(){
  if(!window.supabase || !window.FACEBOOK_PATHSHALA_CONFIG) return;
  const key='fbpathshala_visitor_id'; let id=localStorage.getItem(key);
  if(!id){ id=crypto.randomUUID?crypto.randomUUID():'v-'+Date.now()+'-'+Math.random().toString(36).slice(2); localStorage.setItem(key,id); }
  const db=window.supabase.createClient(window.FACEBOOK_PATHSHALA_CONFIG.SUPABASE_URL,window.FACEBOOK_PATHSHALA_CONFIG.SUPABASE_KEY);
  db.from('site_visitors').upsert({visitor_key:id,last_seen:new Date().toISOString()},{onConflict:'visitor_key',ignoreDuplicates:false}).then(({error})=>{if(error)console.warn('Visitor tracking:',error.message)});
})();
