// js/supabaseClient.js
// js/supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?v=bust-cache-1";

const SUPABASE_URL = "https://ahpymnyppjosvlsdgwks.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocHltbnlwcGpvc3Zsc2Rnd2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjEzNTUsImV4cCI6MjA4Njk5NzM1NX0.T1fbJ4chdSqhjnZrWsximVcQrsNB2c-KerN3BPURpzQ"; // keep yours

// (NEW) DUMMY LOCK TO PREVENT TAB SUSPENSION FREEZES 
// Supabase uses Web Locks for auth state syncing. When a tab is suspended by Windows/Android, 
// the browser frequently "orphans" these locks. This completely freezes the Supabase client 
// upon waking. Providing a "dummy" lock bypasses this feature, preventing the permanent hang.
const dummyLock = {
  acquire: async (name, callback) => {
    return await callback();
  },
  release: async (name) => { }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    lock: dummyLock
  },
});


