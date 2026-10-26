/* Lightweight heartbeat tracker for active site visitors.
   Include after js/supabase.js. Active means seen within the last 2 minutes. */
(function () {
  const db = window.db;
  if (!db || !db.from) return;
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
      const { error } = await db.from('site_live_visitors').upsert(row, { onConflict: 'visitor_id' });
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