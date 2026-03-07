import { supabase } from "./supabaseClient.js";

// ✅ Auto-redirect if already logged in
(async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "home.html";
  }
})();

const form = document.getElementById("loginForm");
const emailEl = document.getElementById("loginEmail");
const passEl = document.getElementById("loginPassword");
const forgotBtn = document.getElementById("forgotBtn");

const friendlyError = (msg) => {
  const t = String(msg || "").toLowerCase();
  if (t.includes("invalid login credentials")) return "Wrong email or password.";
  if (t.includes("email not confirmed")) return "Please confirm your email first, then log in.";
  return msg || "Login failed. Try again.";
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = passEl?.value || "";

  if (!email || !password) return alert("Enter email + password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error);
    alert(friendlyError(error.message));
    return;
  }

  window.location.href = "home.html"; // ✅ root page redirect
});

forgotBtn?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim().toLowerCase();
  if (!email) return alert("Enter your email first, then click Forgot password.");

  const redirectTo = `${window.location.origin}/reset.html`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.error(error);
    alert(error.message || "Could not send reset email.");
    return;
  }

  alert("Password reset link sent ✅ Check your email.");
});
