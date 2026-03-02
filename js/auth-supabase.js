// js/auth-supabase.js
import { supabase } from "./supabaseClient.js";

const form = document.getElementById("loginForm");
const forgotBtn = document.getElementById("forgotBtn");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  window.location.href = "home.html";
});

forgotBtn?.addEventListener("click", async () => {
  const email = prompt("Enter your email to reset password:");
  if (!email) return;

  // For Live Server, either localhost or 127.0.0.1 can work.
  // Use the current origin automatically:
  const redirectTo = `${window.location.origin}/reset-password.html`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) return alert(error.message);

  alert("Password reset link sent ✅ Check your email inbox/spam.");
});
