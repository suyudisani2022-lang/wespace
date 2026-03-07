import { supabase } from "./supabaseClient.js";

// ✅ Auto-redirect if already logged in
(async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "../home.html";
  }
})();

const form = document.getElementById("registerForm");

const regUsername = document.getElementById("regUsername");
const regName = document.getElementById("regName");
const regCampus = document.getElementById("regCampus");
const regDept = document.getElementById("regDept");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regPassword2 = document.getElementById("regPassword2");
const regPhoto = document.getElementById("regPhoto");

function cleanUsername(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
]);

function isDisposable(email) {
  const domain = String(email || "").toLowerCase().split("@")[1] || "";
  if (!domain) return false;
  return DISPOSABLE.has(domain);
}

function friendlyError(msg) {
  const t = String(msg || "").toLowerCase();
  if (t.includes("user already registered") || (t.includes("already") && t.includes("email"))) {
    return "This email is already registered. Please log in instead.";
  }
  if (t.includes("invalid email")) return "Please enter a valid email address.";
  if (t.includes("password") && (t.includes("6") || t.includes("least")))
    return "Password must be at least 6 characters.";
  if (t.includes("duplicate") && t.includes("username")) return "That username is taken. Try another.";
  return msg || "Something went wrong. Please try again.";
}

/**
 * ✅ Client-side image compression
 */
async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        }, "image/jpeg", quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

async function uploadAvatar(userId, file) {
  if (!userId || !file) return "";

  try {
    const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
    const filePath = `${userId}/avatar.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(filePath, compressed, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadErr) throw uploadErr;
  } catch (err) {
    console.error("Avatar upload error:", err);
    throw err;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data?.publicUrl || "";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (regEmail?.value || "").trim().toLowerCase();
  const username = cleanUsername(regUsername?.value);
  const name = (regName?.value || "").trim();
  const campus = (regCampus?.value || "").trim();
  const department = (regDept?.value || "").trim();
  const password = regPassword?.value || "";
  const password2 = regPassword2?.value || "";
  const photoFile = regPhoto?.files?.[0];

  if (!email || !username || !name || !campus || !department) {
    alert("Please fill all fields.");
    return;
  }

  if (isDisposable(email)) {
    alert("Please use a real email address (no temporary emails).");
    return;
  }

  if (!photoFile) {
    alert("Please choose a profile photo.");
    return;
  }

  if (password !== password2) {
    alert("Passwords do not match.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const emailRedirectTo = `${window.location.origin}/home.html`;

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (signUpErr) throw signUpErr;

    const userId = signUpData?.user?.id;
    const session = signUpData?.session; // IMPORTANT

    if (!userId) {
      alert("Account created. Please check your email to confirm, then log in.");
      window.location.href = "../index.html";
      return;
    }

    // 1) Always create profile first (no avatar yet)
    const { error: profErr1 } = await supabase.from("profiles").upsert(
      { id: userId, username, name, campus, department, photo_url: "" },
      { onConflict: "id" }
    );
    if (profErr1) throw profErr1;

    // 2) Upload avatar ONLY if we have a session (i.e., email confirmation is OFF)
    if (session) {
      const photo_url = await uploadAvatar(userId, photoFile);

      const { error: profErr2 } = await supabase.from("profiles").upsert(
        { id: userId, photo_url },
        { onConflict: "id" }
      );
      if (profErr2) throw profErr2;
    }

    alert(
      session
        ? "Account created ✅"
        : "Account created ✅ Please check your email to confirm, then log in."
    );

    window.location.href = "../index.html";
  } catch (err) {
    console.error(err);
    alert(friendlyError(err?.message));
  }
});
