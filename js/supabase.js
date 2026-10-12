/* Shared Supabase client. Uses a window property to avoid global lexical-name conflicts. */
window.FBPATHSHALA_SUPABASE_URL = 'https://ydvbnalhcnfqpxkkmywr.supabase.co';
window.FBPATHSHALA_SUPABASE_KEY = 'sb_publishable_xCbSWDkASsbUPl-WmygyMw_eVrJY_9a';
window.db = window.supabase.createClient(
  window.FBPATHSHALA_SUPABASE_URL,
  window.FBPATHSHALA_SUPABASE_KEY,
  { auth: { storageKey: 'sb-ydvbnalhcnfqpxkkmywr-auth-token', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
