// Shared Supabase connection for the admin and exam pages.
const SUPABASE_URL = "https://ydvbnalhcnfqpxkkmywr.supabase.co";
const SUPABASE_KEY = "sb_publishable_xCbSWDkASsbUPl-WmygyMw_eVrJY_9a";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  throw new Error("Supabase library load হয়নি।");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
