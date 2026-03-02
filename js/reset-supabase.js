// js/reset-supabase.js
import { supabase } from "./supabaseClient.js";

const form = document.getElementById("resetForm");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("newPass")?.value;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return alert(error.message);

  alert("Password updated ✅ Now login.");
  window.location.href = "index.html";
});
