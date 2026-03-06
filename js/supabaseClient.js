// js/supabaseClient.js
// js/supabaseClient.js
// js/supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?v=bust-cache-2";

const SUPABASE_URL = "https://ahpymnyppjosvlsdgwks.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocHltbnlwcGpvc3Zsc2Rnd2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjEzNTUsImV4cCI6MjA4Njk5NzM1NX0.T1fbJ4chdSqhjnZrWsximVcQrsNB2c-KerN3BPURpzQ"; // keep yours

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});


