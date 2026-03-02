// js/reset-password.js
import { supabase } from "./supabaseClient.js";

const form = document.getElementById("resetForm");
const p1 = document.getElementById("newPass");
const p2 = document.getElementById("newPass2");

async function ensureRecoverySession() {
  // Supabase sets a session when user arrives via reset link.
  // This listens for that and ensures user is authenticated for the update.
  const { data } = await supabase.auth.getSession();
  if (data?.session) return true;

  // Wait briefly for auth state change
  return new Promise((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sub.subscription.unsubscribe();
      resolve(!!session);
    });
    setTimeout(() => resolve(false), 2500);
  });
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const a = p1?.value || "";
  const b = p2?.value || "";
  if (a.length < 6) return alert("Password must be at least 6 characters.");
  if (a !== b) return alert("Passwords do not match.");

  const ok = await ensureRecoverySession();
  if (!ok) return alert("Reset session not found. Please open the reset link from your email again.");

  try {
    const { error } = await supabase.auth.updateUser({ password: a });
    if (error) throw error;

    alert("Password updated ✅ Please log in.");
    await supabase.auth.signOut();
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert(err?.message || "Could not update password.");
  }
});
