/* Lightweight heartbeat tracker for active site visitors.
   Include after js/supabase.js. Active means seen within the last 2 minutes. */
(function () {
  function getClient() {
    if (window.db && window.db.from) return window.db;
    if (!window.supabase || !window.supabase.createClient) return null;
    const url = window.FBPATHSHALA_SUPABASE_URL || 'https://ydvbnalhcnfqpxkkmywr.supabase.co';
    const key = window.FBPATHSHALA_SUPABASE_KEY || 'sb_publishable_xCbSWDkASsbUPl-WmygyMw_eVrJY_9a';
    window.db = window.supabase.createClient(url, key, {
      auth: { storageKey: 'sb-ydvbnalhcnfqpxkkmywr-auth-token', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return window.db;
  }
  const db = getClient();
  if (!db || !db.from) {
    console.warn('Live visitor tracker: Supabase client unavailable.');
    return;
  }
  let visitorId = '';
  try {
    visitorId = localStorage.getItem('fbpathshala_live_visitor_id') || '';
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(visitorId)) {
      visitorId = (crypto.randomUUID ? crypto.randomUUID() : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('fbpathshala_live_visitor_id', visitorId);
    }
  } catch (_) {
    visitorId = 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  }
  async function heartbeat() {
    try {
      const row = { visitor_id: visitorId, last_seen_at: new Date().toISOString(), page_path: location.pathname.slice(0, 300) };
      const { error } = await db.rpc('record_live_visitor', { p_visitor_id: visitorId, p_page_path: row.page_path });
      if (error) console.warn('Live visitor heartbeat unavailable:', error.message);
    } catch (e) { console.warn('Live visitor heartbeat failed.'); }
  }
  heartbeat();
  window.setInterval(heartbeat, 45000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') heartbeat();
  });
  window.FBPATHSHALA_LIVE_VISITORS = {
    async count() {
      const { data, error } = await db.rpc('get_live_visitor_count');
      if (error) throw error;
      return Number(data || 0);
    }
  };
})();