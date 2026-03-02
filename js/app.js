document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // STORAGE KEYS
  // =========================
  const USER_KEY  = "weSPACE_user_v1";    // current logged in user
  const USERS_KEY = "weSPACE_users_v1";   // all accounts on device
  const POSTS_KEY = "weSPACE_posts_v1";   // all posts
  const MAX_POSTS = 20;                  // keep latest 20 posts (storage safety)
  const MAX_IMAGES = 5;                  // cap images per post (storage safety)

  // =========================
  // VISITOR / PROFILE STATE
  // =========================
  const profileView = {
    mode: "self",               // "self" | "visitor"
    userId: null,               // visitor user id
    returnSection: "feed",
    returnScrollY: 0
  };

  // =========================
  // HELPERS
  // =========================
  const escapeHtml = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const safeSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.error(err);
      alert(
        "Storage is full (because images are saved).\n\nFix:\n1) Delete old posts\n2) Use smaller images\n3) Reset Everything\n\nBackend will remove this limit."
      );
      return false;
    }
  };

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { return null; }
  };

  const setUser = (u) => safeSet(USER_KEY, JSON.stringify(u));
  const clearUser = () => localStorage.removeItem(USER_KEY);

  const loadUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
    catch { return []; }
  };

  const saveUsers = (users) => safeSet(USERS_KEY, JSON.stringify(users));

  const loadPosts = () => {
    try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]"); }
    catch { return []; }
  };

  const savePosts = (posts) => safeSet(POSTS_KEY, JSON.stringify(posts));

  // Make sure session user is always the latest version from USERS list
  const refreshSessionUserFromUsersList = () => {
    const session = getUser();
    if (!session?.id) return null;

    const users = loadUsers();
    const latest = users.find(u => u.id === session.id);
    if (latest) setUser(latest);
    return latest || session;
  };

  // Update user in both current session and users list
  const updateUserEverywhere = (updatedUser) => {
    if (!updatedUser?.id) return false;

    if (!setUser(updatedUser)) return false;

    let users = loadUsers();
    users = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    if (!saveUsers(users)) return false;

    return true;
  };

  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

  // Read file(s) as dataURL
  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // Format WhatsApp number to wa.me format
  const formatWaNumber = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "";

    // remove spaces, dashes, parentheses
    let n = v.replace(/[^\d+]/g, "");

    if (n.startsWith("+")) n = n.slice(1);

    // If starts with 0 => Nigeria
    if (n.startsWith("0")) n = "234" + n.slice(1);

    // If already 234... ok
    // If something else, leave it
    return n;
  
  // SUPABASE (Auth + Storage)
// =========================

const SUPABASE_URL = "https://koizoxsnxshbmpnfotpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocHltbnlwcGpvc3Zsc2Rnd2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjEzNTUsImV4cCI6MjA4Njk5NzM1NX0.T1fbJ4chdSqhjnZrWsximVcQrsNB2c-KerN3BPURpzQ"; // keep same anon key you shared

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const getSessionUser = async () => {
  const { data } = await sb.auth.getSession();
  return data?.session?.user || null;
};

const getMyProfile = async () => {
  const u = await getSessionUser();
  if (!u) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", u.id).single();
  if (error) return null;
  return data;
};

// =========================
// PROFILE PHOTO UPDATE (SELF ONLY)
// =========================
const changePhotoBtn = document.getElementById("changePhotoBtn");
const changePhotoInput = document.getElementById("changePhotoInput");

// Helper: show button only when in self mode + logged in
const updateChangePhotoVisibility = async () => {
  const u = await getSessionUser();
  const isSelfMode = profileView?.mode === "self";
  if (changePhotoBtn) changePhotoBtn.style.display = (u && isSelfMode) ? "inline-flex" : "none";
};

// Click button -> open file picker
changePhotoBtn?.addEventListener("click", async () => {
  const u = await getSessionUser();
  if (!u) return alert("Please log in first.");
  if (profileView.mode !== "self") return; // extra safety
  changePhotoInput?.click();
});

// When file chosen -> upload + update profile
changePhotoInput?.addEventListener("change", async () => {
  const u = await getSessionUser();
  if (!u) return alert("Please log in first.");
  if (profileView.mode !== "self") return;

  const file = changePhotoInput.files?.[0];
  if (!file) return;

  // Optional: basic size guard (prevents huge uploads)
  const maxMB = 2.5;
  if (file.size > maxMB * 1024 * 1024) {
    changePhotoInput.value = "";
    return alert(`Please use an image smaller than ${maxMB}MB.`);
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${u.id}/avatar.${ext}`;

  // 1) Upload to storage
  const { error: upErr } = await sb.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) {
    console.error(upErr);
    return alert(upErr.message);
  }

  // 2) Public URL
  const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
  const photo_url = pub?.publicUrl || "";
  if (!photo_url) return alert("Could not get photo URL.");

  // 3) Update DB (RLS ensures only owner can update)
  const { error: dbErr } = await sb.from("profiles").update({ photo_url }).eq("id", u.id);
  if (dbErr) {
    console.error(dbErr);
    return alert(dbErr.message);
  }

  // 4) Update UI immediately
  if (profileAvatar) profileAvatar.src = photo_url;

  // If you still store a local user object for old UI, update it too (safe)
  try {
    const sessionUser = JSON.parse(localStorage.getItem("weSPACE_user_v1") || "null");
    if (sessionUser?.id) {
      sessionUser.photoDataUrl = photo_url; // can be url too, img src supports it
      localStorage.setItem("weSPACE_user_v1", JSON.stringify(sessionUser));
    }
  } catch {}

  alert("Profile photo updated ✅");
  changePhotoInput.value = "";
});
  updateChangePhotoVisibility();
  };

  // =========================
  // POST TYPES + CATEGORIES
  // =========================
  const CATEGORY_MAP = {
    market: [
      "Phones & Gadgets",
      "Fashion & Clothing",
      "Shoes & Bags",
      "Perfumes & Beauty",
      "Food & Snacks",
      "Books & Materials",
      "Services",
      "Hostel & Apartment",
      "Electronics",
      "Others"
    ],
    opportunity: [
      "Scholarship",
      "Job",
      "Training",
      "Internship",
      "Volunteer",
      "Others"
    ],
    social: [
      "Event",
      "Hangout",
      "Sports",
      "Conference",
      "Club / Community",
      "Others"
    ]
  };
  // =========================



  // =====================
  // LOGIN PAGE (index.html)
  // =====================
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("loginUsername")?.value.trim();
      const password = document.getElementById("loginPassword")?.value;

      const users = loadUsers();
      const found = users.find(u => u.username === username && u.password === password);

      if (!found) return alert("Invalid username or password");
      setUser(found);
      window.location.href = "home.html";
    });

    return;
  }

  // =========================
  // REGISTER PAGE (/register/index.html)
  // =========================
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const regPhoto = document.getElementById("regPhoto");
    const regPreview = document.getElementById("regPreview");
    const regPreviewEmpty = document.getElementById("regPreviewEmpty");

    regPhoto?.addEventListener("change", () => {
      const file = regPhoto.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (regPreview) {
          regPreview.src = String(reader.result);
          regPreview.style.display = "block";
        }
        if (regPreviewEmpty) regPreviewEmpty.style.display = "none";
      };
      reader.readAsDataURL(file);
    });

    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("regUsername")?.value.trim();
      const name = document.getElementById("regName")?.value.trim();
      const campus = document.getElementById("regCampus")?.value.trim();
      const department = document.getElementById("regDept")?.value.trim();
      const password = document.getElementById("regPassword")?.value;
      const password2 = document.getElementById("regPassword2")?.value;
      const file = document.getElementById("regPhoto")?.files?.[0];

      if (!username || !name || !campus || !department || !password || !password2 || !file) {
        return alert("Please fill all fields.");
      }
      if (password !== password2) return alert("Passwords do not match.");

      let users = loadUsers();
      if (users.some(u => u.username === username)) {
        return alert("Username already exists. Choose another.");
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newUser = {
          id: uid(),
          username,
          name,
          campus,
          department,
          password, // demo only (not secure)
          photoDataUrl: String(reader.result),
          createdAt: new Date().toISOString(),

          // profile extras
          about: "",
          skills: "",
          bdayDay: "",
          bdayMonth: "",
          education: "",
          ig: "",
          x: "",
          wa: "",
          tt: "",
          connections: []
        };

        users.push(newUser);
        if (!saveUsers(users)) return;
        if (!setUser(newUser)) return;

        window.location.href = "../home.html";
      };
      reader.readAsDataURL(file);
    });

    return;
  }

  // =====================
  // HOME PAGE (home.html)
  // =====================

  // =========================
  // SECTIONS + TRACK CURRENT TAB
  // =========================
  let activeSectionId = "feed";

  const sections = document.querySelectorAll(".section");

  // =========================
  // PROFILE ELEMENTS
  // =========================
  const profileSection = document.getElementById("profile");

  const profileAvatar = document.getElementById("profileAvatar");
  // =========================

  const changePhotoWrap = document.getElementById("changePhotoWrap");
const changePhotoInput = document.getElementById("changePhotoInput");



  const profileName = document.getElementById("profileName");
  const profileMeta = document.getElementById("profileMeta");
  const profileUsername = document.getElementById("profileUsername");

  const goRegisterBtn = document.getElementById("goRegisterBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const openSwitchBtn = document.getElementById("openSwitchBtn");
  const resetAppBtn = document.getElementById("resetAppBtn");

  // Profile actions wrapper
  const profileActions =
    document.getElementById("profileActions") || document.querySelector("#profile .profile-actions");
  changePhotoInput?.addEventListener("change", async () => {
  const me = refreshSessionUserFromUsersList() || getUser();

  // ✅ must be logged in + must be self profile
  if (!me || profileView.mode !== "self") {
    alert("You can only change your own profile photo.");
    changePhotoInput.value = "";
    return;
  }

  const file = changePhotoInput.files?.[0];
  if (!file) return;

  const MAX_MB = 2.5;
  if (file.size > MAX_MB * 1024 * 1024) {
    alert("Image too large. Please use an image under 2.5MB.");
    changePhotoInput.value = "";
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);

    // update user everywhere
    const updatedUser = { ...me, photoDataUrl: dataUrl };
    const ok = updateUserEverywhere(updatedUser);
    if (!ok) return;

    // update all posts authored by this user
    let posts = loadPosts();
    posts = posts.map(p => (p.authorId === updatedUser.id ? { ...p, authorPhoto: dataUrl } : p));
    savePosts(posts);

    // update UI
    updateProfileHeaderUI();
    if (profileAvatar) profileAvatar.src = dataUrl;

    // rerender lists
    renderFeed();
    renderMarket();
    renderOpps();
    renderSocials();

    // keep delete visibility logic
    const postsTabActive = document.querySelector(".profile-tab.active")?.dataset?.ptab === "posts";
    renderMyPosts(!!postsTabActive);

    alert("Profile photo updated ✅");
  } catch (e) {
    console.error(e);
    alert("Failed to update photo.");
  } finally {
    changePhotoInput.value = "";
  }
});

  // Create back button if missing
  const ensureVisitorBackBtn = () => {
    let btn = document.getElementById("visitorBackBtn");
    if (btn) return btn;

    if (!profileSection) return null;

    btn = document.createElement("button");
    btn.id = "visitorBackBtn";
    btn.type = "button";
    btn.className = "btn ghost visitor-back-btn";
    btn.textContent = "← Back";

    // put it under the <h2>Profile</h2>
    const h2 = profileSection.querySelector("h2");
    if (h2) h2.insertAdjacentElement("afterend", btn);
    else profileSection.prepend(btn);

    return btn;
  };

  const setProfileMode = ({ mode, userId, returnSection, returnScrollY } = {}) => {
    if (mode) profileView.mode = mode;
    profileView.userId = userId ?? profileView.userId;
    profileView.returnSection = returnSection ?? profileView.returnSection;
    profileView.returnScrollY = returnScrollY ?? profileView.returnScrollY;

    const isVisitor = profileView.mode === "visitor";
    const backBtn = ensureVisitorBackBtn();
    // ✅ Only show Change Photo in SELF mode (logged-in user)
if (changePhotoWrap) {
  const me = getUser();
  changePhotoWrap.style.display = (!isVisitor && !!me) ? "inline-flex" : "none";
}


    // show/hide back button
    if (backBtn) backBtn.style.display = isVisitor ? "inline-flex" : "none";

    // show/hide actions area
    if (profileActions) profileActions.style.display = isVisitor ? "none" : "";

    // disable editing when visitor
    const ids = ["pAbout","pSkills","pBdayDay","pBdayMonth","pEdu","pIG","pX","pWA","pTT"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = isVisitor;
      el.readOnly = isVisitor;
    });

    // hide save buttons in visitor mode
    const save1 = document.getElementById("saveProfileBtn");
    const save2 = document.getElementById("saveProfileBtn2");
    if (save1) save1.style.display = isVisitor ? "none" : "";
    if (save2) save2.style.display = isVisitor ? "none" : "";
  };

  const updateProfileHeaderUI = () => {
    const user = getUser();

    if (!user) {
      profileName && (profileName.textContent = "Guest");
      profileMeta && (profileMeta.textContent = "Not registered");
      profileUsername && (profileUsername.textContent = "@guest");
      profileAvatar?.removeAttribute("src");
      return;
    }

    profileName && (profileName.textContent = user.name);
    profileMeta && (profileMeta.textContent = `${user.campus} • ${user.department}`);
    profileUsername && (profileUsername.textContent = `@${user.username || "user"}`);
    profileAvatar && (profileAvatar.src = user.photoDataUrl);
  };

  // ====== SHOW SECTION ======
  const showSection = (id) => {
    activeSectionId = id;

    sections.forEach(s => s.classList.remove("active-section"));
    document.getElementById(id)?.classList.add("active-section");

    // refresh lists
    if (id === "feed") renderFeed();
    if (id === "market") renderMarket();
    if (id === "opportunities") renderOpps();
    if (id === "socials") renderSocials();

    if (id === "profile") {
      refreshSessionUserFromUsersList();

      // visitor mode
      if (profileView.mode === "visitor" && profileView.userId) {
        renderProfileAsVisitor(profileView.userId);
      } else {
        setProfileMode({ mode: "self", userId: null });
        updateProfileHeaderUI();
        loadProfileIntoUI(getUser());

        // don't show delete buttons by default
        renderMyPosts(false);
        renderMyConnections();
      }
    }
  };

  // =========================
  // NAVS (MOBILE + DESKTOP)
  // IMPORTANT: When user taps Profile nav, ALWAYS reset to own profile
  // =========================
  const bottomButtons = document.querySelectorAll(".bottom-nav button");
  const setBottomActive = (btn) => {
    bottomButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
  const mapSection = (label) => {
    const key = (label || "").toLowerCase().trim();
    return ({ feed:"feed", market:"market", opportunities:"opportunities", socials:"socials", profile:"profile" }[key] || "feed");
  };
  bottomButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      setBottomActive(btn);
      const target = mapSection(btn.textContent);

      // FORCE SELF PROFILE
      if (target === "profile") setProfileMode({ mode: "self", userId: null });

      showSection(target);
    });
    btn.addEventListener("focus", () => setBottomActive(btn));
  });

  const tabButtons = document.querySelectorAll(".tab-btn");
  const setTabActive = (btn) => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      setTabActive(btn);
      const target = btn.dataset.section;

      // FORCE SELF PROFILE
      if (target === "profile") setProfileMode({ mode: "self", userId: null });

      showSection(target);
    });
  });

  // =========================
  // HIDE TOPBAR + TABS ON SCROLL
  // =========================
  const topbar = document.getElementById("topbar");
  const desktopTabs = document.querySelector(".desktop-tabs");
  let lastY = window.scrollY;
  const threshold = 12;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const delta = y - lastY;

    if (y <= 0) {
      topbar?.classList.remove("hidden");
      desktopTabs?.classList.remove("hidden");
      lastY = y;
      return;
    }

    if (delta > threshold) {
      topbar?.classList.add("hidden");
      desktopTabs?.classList.add("hidden");
      lastY = y;
    } else if (delta < -threshold) {
      topbar?.classList.remove("hidden");
      desktopTabs?.classList.remove("hidden");
      lastY = y;
    }
  }, { passive: true });

  // =========================
  // BACK BUTTON BEHAVIOR
  // =========================
  const backBtn = ensureVisitorBackBtn();
  backBtn?.addEventListener("click", () => {
    setProfileMode({ mode: "self", userId: null });
    updateChangePhotoVisibility();

    const target = profileView.returnSection || "feed";
    showSection(target);

    window.scrollTo({ top: profileView.returnScrollY || 0, behavior: "smooth" });
  });

  // =========================
  // PROFILE ACTIONS
  // =========================
  goRegisterBtn?.addEventListener("click", () => (window.location.href = "register/"));

  logoutBtn?.addEventListener("click", () => {
    clearUser();
    setProfileMode({ mode: "self", userId: null });
    updateProfileHeaderUI();
    loadProfileIntoUI(null);
    alert("Logged out ✅");
  });

  resetAppBtn?.addEventListener("click", () => {
    const ok = confirm("Delete ALL accounts and posts?\n\nThis cannot be undone.");
    if (!ok) return;

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(POSTS_KEY);

    alert("weSPACE reset complete ✅");
    window.location.href = "index.html";
  });

  // =========================
  // SWITCH ACCOUNT MODAL
  // =========================
  const switchModal = document.getElementById("switchModal");
  const closeSwitchModal = document.getElementById("closeSwitchModal");
  const closeSwitchBtn = document.getElementById("closeSwitchBtn");
  const accountsList = document.getElementById("accountsList");

  const openSwitch = () => {
    if (!switchModal) return;
    switchModal.classList.add("show");
    switchModal.setAttribute("aria-hidden", "false");
    renderAccounts();
  };

  const closeSwitch = () => {
    if (!switchModal) return;
    switchModal.classList.remove("show");
    switchModal.setAttribute("aria-hidden", "true");
  };

  openSwitchBtn?.addEventListener("click", openSwitch);
  closeSwitchModal?.addEventListener("click", closeSwitch);
  closeSwitchBtn?.addEventListener("click", closeSwitch);
  switchModal?.addEventListener("click", (e) => { if (e.target === switchModal) closeSwitch(); });

  const renderAccounts = () => {
    if (!accountsList) return;
    const users = loadUsers();
    const current = getUser();

    if (!users.length) {
      accountsList.innerHTML = `<div class="empty-state">No saved accounts yet. Create one.</div>`;
      return;
    }

    accountsList.innerHTML = users.map(u => {
      const isCurrent = current?.id && current.id === u.id;
      return `
        <div class="account-row">
          <div class="account-left">
            <img class="account-avatar" src="${u.photoDataUrl}" alt="avatar">
            <div>
              <div class="account-name">${escapeHtml(u.name)} ${isCurrent ? "• (current)" : ""}</div>
              <div class="account-meta">@${escapeHtml(u.username)} • ${escapeHtml(u.campus)} • ${escapeHtml(u.department)}</div>
            </div>
          </div>
          <div class="account-actions">
            <button class="primary" type="button" data-login="${u.id}">Log in</button>
            <button class="danger" type="button" data-del="${u.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  };

  accountsList?.addEventListener("click", (e) => {
    const loginId = e.target?.getAttribute?.("data-login");
    const delId = e.target?.getAttribute?.("data-del");

    if (loginId) {
      const users = loadUsers();
      const latest = users.find(u => u.id === loginId);
      if (!latest) return;

      setUser(latest);
      refreshSessionUserFromUsersList();
      setProfileMode({ mode: "self", userId: null });

      updateProfileHeaderUI();
      loadProfileIntoUI(getUser());
      renderMyPosts(false);
      renderMyConnections();
      closeSwitch();
      alert("Logged in ✅");
      return;
    }

    if (delId) {
      if (!confirm("Delete this saved account from this device?")) return;

      let users = loadUsers();
      users = users.filter(u => u.id !== delId);
      if (!saveUsers(users)) return;

      const current = getUser();
      if (current?.id === delId) {
        clearUser();
        updateProfileHeaderUI();
        loadProfileIntoUI(null);
      }

      renderAccounts();
    }
  });

  // =========================
  // PROFILE TABS (CLICKABLE)
  // =========================
  const tabsNav = document.querySelector(".profile-tabs");
  const panels = Array.from(document.querySelectorAll(".profile-panel"));

  const openPTab = (key) => {
    document.querySelectorAll(".profile-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.ptab === key);
    });
    panels.forEach(p => {
      p.classList.toggle("active", p.id === `ptab-${key}`);
    });

    // ✅ Only show delete buttons when user opens POSTS tab (and only in self mode)
    if (key === "posts") {
      if (profileView.mode === "self") renderMyPosts(true);
    } else {
      if (profileView.mode === "self") renderMyPosts(false);
    }
  };

  tabsNav?.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-tab");
    if (!btn) return;
    openPTab(btn.dataset.ptab);
  });

  // =========================
  // PROFILE FORM LOAD + SAVE
  // =========================
  const fillBirthdayDays = () => {
    const pBdayDay = document.getElementById("pBdayDay");
    if (!pBdayDay) return;
    if (pBdayDay.options.length > 1) return;

    pBdayDay.innerHTML =
      `<option value="">Day</option>` +
      Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  };
  fillBirthdayDays();

  const loadProfileIntoUI = (user) => {
    const ids = ["pAbout","pSkills","pBdayDay","pBdayMonth","pEdu","pIG","pX","pWA","pTT"];
    const exists = ids.some(id => document.getElementById(id));
    if (!exists) return;

    if (!user) {
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
      return;
    }

    document.getElementById("pAbout")     && (document.getElementById("pAbout").value = user.about || "");
    document.getElementById("pSkills")    && (document.getElementById("pSkills").value = user.skills || "");
    document.getElementById("pBdayDay")   && (document.getElementById("pBdayDay").value = user.bdayDay || "");
    document.getElementById("pBdayMonth") && (document.getElementById("pBdayMonth").value = user.bdayMonth || "");
    document.getElementById("pEdu")       && (document.getElementById("pEdu").value = user.education || "");
    document.getElementById("pIG")        && (document.getElementById("pIG").value = user.ig || "");
    document.getElementById("pX")         && (document.getElementById("pX").value = user.x || "");
    document.getElementById("pWA")        && (document.getElementById("pWA").value = user.wa || "");
    document.getElementById("pTT")        && (document.getElementById("pTT").value = user.tt || "");
  };

  const saveProfile = () => {
    const user = refreshSessionUserFromUsersList() || getUser();
    if (!user) return alert("Please log in first.");

    if (profileView.mode === "visitor") return;

    const updated = {
      ...user,
      about: document.getElementById("pAbout")?.value.trim() || "",
      skills: document.getElementById("pSkills")?.value.trim() || "",
      bdayDay: document.getElementById("pBdayDay")?.value || "",
      bdayMonth: document.getElementById("pBdayMonth")?.value || "",
      education: document.getElementById("pEdu")?.value || "",
      ig: document.getElementById("pIG")?.value.trim() || "",
      x: document.getElementById("pX")?.value.trim() || "",
      wa: document.getElementById("pWA")?.value.trim() || "",
      tt: document.getElementById("pTT")?.value.trim() || "",
    };

    const ok = updateUserEverywhere(updated);
    if (!ok) return;

    updateProfileHeaderUI();
    loadProfileIntoUI(updated);
    alert("Profile saved ✅");
  };

  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
  document.getElementById("saveProfileBtn2")?.addEventListener("click", saveProfile);

  // =========================
  // CREATE POST MODAL
  // =========================
  const postModal = document.getElementById("postModal");
  const openPostBtn = document.getElementById("createPostBtn");
  const closePostBtn = document.getElementById("closePostModal");
  const cancelPostBtn = document.getElementById("cancelPost");
  const postForm = document.getElementById("postForm");

  const postType = document.getElementById("postType");
  const postCategory = document.getElementById("postCategory");
  const priceWrap = document.getElementById("priceFieldWrap");
  const postPrice = document.getElementById("postPrice");

  const postTitle = document.getElementById("postTitle");
  const postDesc = document.getElementById("postDesc");
  const postImages = document.getElementById("postImages");

  // ✅ OPTIONAL input (if you add it in HTML)
  const postWhatsApp = document.getElementById("postWhatsApp");

  const previewEmpty = document.getElementById("imagePreviewEmpty");
  const previewStrip = document.getElementById("imagePreviewStrip");

  const setCategoryOptions = (type) => {
    if (!postCategory) return;
    const list = CATEGORY_MAP[type] || [];
    postCategory.innerHTML = list.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  };

  const setPriceVisibility = (type) => {
    if (!priceWrap) return;
    if (type === "market") {
      priceWrap.style.display = "block";
    } else {
      priceWrap.style.display = "none";
      if (postPrice) postPrice.value = "";
    }
  };

  postType?.addEventListener("change", () => {
    const t = postType.value || "market";
    setCategoryOptions(t);
    setPriceVisibility(t);
  });

  const openPostModal = () => {
    const user = getUser();
    if (!user) {
      alert("Create an account first to post ✅");
      window.location.href = "register/";
      return;
    }
    if (profileView.mode === "visitor") return;

    if (postType) postType.value = "market";
    setCategoryOptions("market");
    setPriceVisibility("market");

    if (previewStrip) previewStrip.innerHTML = "";
    if (previewEmpty) previewEmpty.style.display = "block";

    if (postWhatsApp) postWhatsApp.value = ""; // reset optional

    postModal?.classList.add("show");
  };

  const closePostModal = () => {
    postModal?.classList.remove("show");
    postForm?.reset();
    if (previewStrip) previewStrip.innerHTML = "";
    if (previewEmpty) previewEmpty.style.display = "block";
  };

  openPostBtn?.addEventListener("click", openPostModal);
  closePostBtn?.addEventListener("click", closePostModal);
  cancelPostBtn?.addEventListener("click", closePostModal);
  postModal?.addEventListener("click", (e) => { if (e.target === postModal) closePostModal(); });

  postImages?.addEventListener("change", () => {
    const files = Array.from(postImages.files || []);
    if (previewStrip) previewStrip.innerHTML = "";

    if (!files.length) {
      if (previewEmpty) previewEmpty.style.display = "block";
      return;
    }

    if (previewEmpty) previewEmpty.style.display = "none";

    files.slice(0, 6).forEach((file) => {
      const r = new FileReader();
      r.onload = () => {
        const img = document.createElement("img");
        img.src = String(r.result);
        img.alt = "preview";
        img.style.display = "block";
        previewStrip?.appendChild(img);
      };
      r.readAsDataURL(file);
    });
  });

  // =========================
  // RENDER POST CARDS
  // =========================
  const badgeHTML = (type, category) => {
    const icon = type === "market" ? "🛒" : type === "opportunity" ? "🎓" : "🎉";
    const cls  = type === "market" ? "market" : type === "opportunity" ? "opportunity" : "social";
    return `<span class="post-badge ${cls}">${icon} ${escapeHtml(category || type)}</span>`;
  };

  const postMediaHTML = (post) => {
    const images = Array.isArray(post.images) ? post.images : [];
    if (!images.length) return "";

    const wa = String(post.whatsapp || "").trim();

    return `
      <div class="post-media">
        <div class="post-media-track">
          ${images.map(src => `
            <div class="post-media-item">
              <img src="${src}" alt="Post image">

              ${
                wa
                  ? `
                    <button
                      type="button"
                      class="post-wa-icon"
                      data-action="contact"
                      data-phone="${escapeHtml(wa)}"
                      data-title="${escapeHtml(post.title || "")}"
                      aria-label="Contact on WhatsApp"
                      title="Contact on WhatsApp"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp">
                    </button>
                  `
                  : ""
              }
            </div>
          `).join("")}
        </div>
        ${post.type === "market" && post.price ? `<div class="post-price-badge">${escapeHtml(post.price)}</div>` : ""}
      </div>
    `;
  };

  const renderPostCard = (p, opts = {}) => {
    const { hideConnect = false, showDelete = false } = opts;

    const time = new Date(p.createdAt).toLocaleString();
    const short = (p.desc || "").length > 170 ? p.desc.slice(0, 170) + "…" : (p.desc || "");

    const likesCount = Number(p.likesCount || 0);
    const commentsCount = Array.isArray(p.comments) ? p.comments.length : 0;
    const resharesCount = Number(p.resharesCount || 0);

    return `
      <article class="post-card" data-postid="${p.id}" data-authorid="${p.authorId || ""}">
        <div class="post-head">
          <img class="avatar-img" src="${p.authorPhoto}" alt="avatar">
          <div class="post-meta">
            <div class="name-row">
              <span class="poster-name">${escapeHtml(p.authorName)}</span>
              ${badgeHTML(p.type, p.category)}
              ${hideConnect ? "" : `<button class="connect-btn" data-action="connect" type="button">Connect</button>`}
              ${showDelete ? `<button class="danger mini-del" data-action="delete-post" type="button">Delete</button>` : ""}
            </div>
            <div class="sub-row">${escapeHtml(p.authorCampus)} • ${escapeHtml(p.authorDept)} • ${time}</div>
            ${p.resharedBy ? `<div class="sub-row">🔁 Reshared by ${escapeHtml(p.resharedByName || "someone")}</div>` : ""}
          </div>
        </div>

       <div class="post-body">

  <div class="post-text"
       data-full="${escapeHtml(p.desc)}"
       data-short="${escapeHtml(short)}"
       data-expanded="0">
    ${escapeHtml(short)} 
    <button class="more-toggle" data-action="more" type="button">…more</button>
  </div>

  ${postMediaHTML(p)}
</div>

        <div class="post-actions">
          <button type="button" data-action="like">👍 Like <span class="count">(${likesCount})</span></button>
          <button type="button" data-action="comment">💬 Comment <span class="count">(${commentsCount})</span></button>
          <button type="button" data-action="reshare">🔁 Reshare <span class="count">(${resharesCount})</span></button>
        </div>

        <div class="post-comments" style="display:none;"></div>
      </article>
    `;
  };

  // =========================
  // VISITOR PROFILE (INSIDE PROFILE TAB)
  // =========================
  const renderProfileAsVisitor = (authorId) => {
    const users = loadUsers();
    const u = users.find(x => x.id === authorId);

    setProfileMode({ mode: "visitor", userId: authorId });

    if (!u) {
      profileName && (profileName.textContent = "User not found");
      profileMeta && (profileMeta.textContent = "Maybe deleted");
      profileUsername && (profileUsername.textContent = "@unknown");
      profileAvatar?.removeAttribute("src");

      loadProfileIntoUI(null);

      const myPostsWrap = document.getElementById("myPostsWrap");
      const myConnectionsWrap = document.getElementById("myConnectionsWrap");
      myPostsWrap && (myPostsWrap.innerHTML = `<p class="empty-state">No posts.</p>`);
      myConnectionsWrap && (myConnectionsWrap.innerHTML = `<p class="empty-state">No connections.</p>`);
      return;
    }

    profileName && (profileName.textContent = u.name);
    profileMeta && (profileMeta.textContent = `${u.campus} • ${u.department}`);
    profileUsername && (profileUsername.textContent = `@${u.username || "user"}`);
    profileAvatar && (profileAvatar.src = u.photoDataUrl);

    loadProfileIntoUI(u);

    const myPostsWrap = document.getElementById("myPostsWrap");
    if (myPostsWrap) {
      const their = loadPosts().filter(p => p.authorId === u.id);
      myPostsWrap.innerHTML = their.length
        ? their.map(p => renderPostCard(p, { hideConnect: true, showDelete: false })).join("")
        : `<p class="empty-state">No posts yet.</p>`;
    }

    const myConnectionsWrap = document.getElementById("myConnectionsWrap");
    if (myConnectionsWrap) {
      const ids = Array.isArray(u.connections) ? u.connections : [];
      if (!ids.length) {
        myConnectionsWrap.innerHTML = `<p class="empty-state">No connections yet.</p>`;
      } else {
        const allUsers = loadUsers();
        const list = ids.map(id => allUsers.find(x => x.id === id)).filter(Boolean);
        myConnectionsWrap.innerHTML = list.map(x => `
          <div class="connection-card">
            <div class="connection-left">
              <img src="${x.photoDataUrl}" alt="avatar" />
              <div>
                <div class="connection-name">${escapeHtml(x.name)}</div>
                <div class="connection-meta">@${escapeHtml(x.username)} • ${escapeHtml(x.campus)} • ${escapeHtml(x.department)}</div>
              </div>
            </div>
          </div>
        `).join("");
      }
    }

    openPTab("about");
  };

  // =========================
  // LIST RENDERING (FEED + SECTIONS)
  // =========================
  const FEED_SECTION = document.getElementById("feed");

  const marketList = document.getElementById("marketList");
  const oppsList = document.getElementById("oppsList");
  const socialList = document.getElementById("socialList");

  const marketFilter = document.getElementById("marketFilter");
  const oppsFilter = document.getElementById("oppsFilter");
  const socialFilter = document.getElementById("socialFilter");

  if (marketFilter) {
    marketFilter.innerHTML = `<option value="">All categories</option>` +
      CATEGORY_MAP.market.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }
  if (oppsFilter) {
    oppsFilter.innerHTML = `<option value="">All types</option>` +
      CATEGORY_MAP.opportunity.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }
  if (socialFilter) {
    socialFilter.innerHTML = `<option value="">All types</option>` +
      CATEGORY_MAP.social.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }

  const renderFeed = (forcedPosts = null) => {
    if (!FEED_SECTION) return;
    const header = FEED_SECTION.querySelector("h2");
    FEED_SECTION.innerHTML = "";
    if (header) FEED_SECTION.appendChild(header);

    const posts = forcedPosts || loadPosts();
    posts.forEach(p => {
      FEED_SECTION.insertAdjacentHTML("beforeend", renderPostCard(p, { hideConnect: false, showDelete: false }));
    });
  };

  const renderMarket = () => {
    if (!marketList) return;
    const cat = marketFilter?.value || "";
    const posts = loadPosts().filter(p => p.type === "market" && (!cat || p.category === cat));
    marketList.innerHTML = posts.length
      ? posts.map(p => renderPostCard(p, { hideConnect: false, showDelete: false })).join("")
      : `<p class="empty-state">No market posts yet.</p>`;
  };

  const renderOpps = () => {
    if (!oppsList) return;
    const cat = oppsFilter?.value || "";
    const posts = loadPosts().filter(p => p.type === "opportunity" && (!cat || p.category === cat));
    oppsList.innerHTML = posts.length
      ? posts.map(p => renderPostCard(p, { hideConnect: false, showDelete: false })).join("")
      : `<p class="empty-state">No opportunities yet.</p>`;
  };

  const renderSocials = () => {
    if (!socialList) return;
    const cat = socialFilter?.value || "";
    const posts = loadPosts().filter(p => p.type === "social" && (!cat || p.category === cat));
    socialList.innerHTML = posts.length
      ? posts.map(p => renderPostCard(p, { hideConnect: false, showDelete: false })).join("")
      : `<p class="empty-state">No socials yet.</p>`;
  };

  marketFilter?.addEventListener("change", renderMarket);
  oppsFilter?.addEventListener("change", renderOpps);
  socialFilter?.addEventListener("change", renderSocials);

  // =========================
  // POST SUBMIT (MULTI IMAGES)
  // =========================
  postForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = refreshSessionUserFromUsersList() || getUser();
    if (!user) return alert("Please log in first.");

    const type = postType?.value || "market";
    const category = postCategory?.value || "";
    const title = postTitle?.value.trim();
    const desc = postDesc?.value.trim();
    const price = (type === "market") ? (postPrice?.value.trim() || "") : "";

    // ✅ WhatsApp per post (optional). If missing, fallback to user profile wa.
    const waRaw = (postWhatsApp?.value || "").trim() || (user.wa || "").trim();
    const whatsapp = waRaw ? waRaw : "";

    const files = Array.from(postImages?.files || []);
    if (!title) return alert("Please enter a title.");
    if (!desc) return alert("Please enter a description.");
    if (!files.length) return alert("Please select at least one image.");

    try {
      const images = await Promise.all(files.slice(0, MAX_IMAGES).map(readFileAsDataUrl));

      let posts = loadPosts();
      posts.unshift({
        id: uid(),
        type,
        category,
        price,
        title,
        desc,
        images,
        createdAt: new Date().toISOString(),

        authorId: user.id,
        authorUsername: user.username,
        authorName: user.name,
        authorCampus: user.campus,
        authorDept: user.department,
        authorPhoto: user.photoDataUrl,

        // ✅ new field
        whatsapp,

        likesCount: 0,
        likedBy: [],
        comments: [],
        resharesCount: 0
      });

      posts = posts.slice(0, MAX_POSTS);
      if (!savePosts(posts)) return;

      closePostModal();
      renderFeed();
      renderMarket();
      renderOpps();
      renderSocials();
      renderMyPosts(false);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Could not read images. Try again.");
    }
  });

  // =========================
  // MY POSTS + CONNECTIONS (PROFILE SELF)
  // =========================
  const myPostsWrap = document.getElementById("myPostsWrap");
  const myConnectionsWrap = document.getElementById("myConnectionsWrap");

  const renderMyPosts = (showDeleteButtons = false) => {
    if (!myPostsWrap) return;

    const user = getUser();
    if (!user) {
      myPostsWrap.innerHTML = `<p class="empty-state">Log in to see your posts.</p>`;
      return;
    }

    const my = loadPosts().filter(p => p.authorId === user.id);
    if (!my.length) {
      myPostsWrap.innerHTML = `<p class="empty-state">You haven’t posted yet.</p>`;
      return;
    }

    myPostsWrap.innerHTML = my.map(p => renderPostCard(p, {
      hideConnect: false,
      showDelete: !!showDeleteButtons
    })).join("");
  };

  const renderMyConnections = () => {
    if (!myConnectionsWrap) return;

    const user = getUser();
    if (!user) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">Log in to see your connections.</p>`;
      return;
    }

    const ids = Array.isArray(user.connections) ? user.connections : [];
    if (!ids.length) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">No connections yet. Use “Connect” on a post.</p>`;
      return;
    }

    const users = loadUsers();
    const list = ids.map(id => users.find(u => u.id === id)).filter(Boolean);

    myConnectionsWrap.innerHTML = list.map(u => `
      <div class="connection-card">
        <div class="connection-left">
          <img src="${u.photoDataUrl}" alt="avatar" />
          <div>
            <div class="connection-name">${escapeHtml(u.name)}</div>
            <div class="connection-meta">@${escapeHtml(u.username)} • ${escapeHtml(u.campus)} • ${escapeHtml(u.department)}</div>
          </div>
        </div>
        <button class="btn ghost" type="button" data-action="remove-conn" data-uid="${u.id}">Remove</button>
      </div>
    `).join("");
  };

  // =========================
  // SEARCH MODAL
  // =========================
  const searchModal = document.getElementById("searchModal");
  const openSearch = document.getElementById("openSearch");
  const closeSearch = document.getElementById("closeSearch");
  const applySearch = document.getElementById("applySearch");
  const clearSearch = document.getElementById("clearSearch");
  const searchInput = document.getElementById("searchInput");

  const openSearchModal = () => {
    if (!searchModal) return;
    searchModal.classList.add("show");
    searchModal.setAttribute("aria-hidden", "false");
    setTimeout(() => searchInput?.focus(), 50);
  };
  const closeSearchModal = () => {
    if (!searchModal) return;
    searchModal.classList.remove("show");
    searchModal.setAttribute("aria-hidden", "true");
  };

  openSearch?.addEventListener("click", openSearchModal);
  closeSearch?.addEventListener("click", closeSearchModal);
  searchModal?.addEventListener("click", (ev) => { if (ev.target === searchModal) closeSearchModal(); });

  const runSearch = () => {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const posts = loadPosts();

    const filtered = !q ? posts : posts.filter(p => {
      const hay = `${p.title} ${p.desc} ${p.category} ${p.type} ${p.authorName} ${p.authorCampus} ${p.authorDept}`.toLowerCase();
      return hay.includes(q);
    });

    showSection("feed");
    if (bottomButtons.length) setBottomActive(bottomButtons[0]);
    if (tabButtons.length) setTabActive(tabButtons[0]);

    renderFeed(filtered);
    closeSearchModal();
  };

  applySearch?.addEventListener("click", runSearch);
  searchInput?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") runSearch(); });
  clearSearch?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    renderFeed();
    closeSearchModal();
  });

  // =========================
  // NOTIFICATIONS PANEL
  // =========================
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const closeNotif = document.getElementById("closeNotif");

  notifBtn?.addEventListener("click", () => {
    if (!notifPanel) return;
    notifPanel.classList.toggle("show");
  });

  closeNotif?.addEventListener("click", () => notifPanel?.classList.remove("show"));

  document.addEventListener("click", (ev) => {
    if (!notifPanel?.classList.contains("show")) return;
    const inside = ev.target.closest("#notifPanel") || ev.target.closest("#notifBtn");
    if (!inside) notifPanel.classList.remove("show");
  });

  // =========================
  // INTERACTIONS: LIKE/COMMENT/RESHARE/CONNECT/MORE + OPEN VISITOR + DELETE + WHATSAPP
  // =========================
  const updatePostInStorage = (postId, mutatorFn) => {
    let posts = loadPosts();
    const idx = posts.findIndex(p => p.id === postId);
    if (idx < 0) return null;
    const updated = mutatorFn({ ...posts[idx] });
    posts[idx] = updated;
    savePosts(posts);
    return updated;
  };

  const deletePostFromStorage = (postId) => {
    let posts = loadPosts();
    const before = posts.length;
    posts = posts.filter(p => p.id !== postId);
    if (posts.length === before) return false;
    savePosts(posts);
    return true;
  };

  const rerenderAll = () => {
    renderFeed();
    renderMarket();
    renderOpps();
    renderSocials();

    if (activeSectionId === "profile" && profileView.mode === "visitor" && profileView.userId) {
      renderProfileAsVisitor(profileView.userId);
      return;
    }

    renderMyPosts(false);
    renderMyConnections();
  };

  document.addEventListener("click", (e) => {
    // ✅ WhatsApp icon click
    const waBtn = e.target.closest("[data-action='contact']");
    if (waBtn) {
      const phoneRaw = waBtn.getAttribute("data-phone") || "";
      const title = waBtn.getAttribute("data-title") || "";
      const phone = formatWaNumber(phoneRaw);

      if (!phone) return alert("No WhatsApp number for this post.");

      const msg = encodeURIComponent(`Hello, I saw your post on weSPACE: ${title}`);
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      return;
    }

    // Open visitor profile by clicking avatar or name on a post
    const avatarTap = e.target.closest(".avatar-img");
    const nameTap = e.target.closest(".poster-name");
    if (avatarTap || nameTap) {
      const cardTap = e.target.closest(".post-card");
      const authorIdTap = cardTap?.getAttribute("data-authorid");
      if (authorIdTap) {
        setProfileMode({
          mode: "visitor",
          userId: authorIdTap,
          returnSection: activeSectionId || "feed",
          returnScrollY: window.scrollY || 0
        });
        showSection("profile");
      }
      return;
    }

    const likeBtn = e.target.closest("[data-action='like']");
    const commentBtn = e.target.closest("[data-action='comment']");
    const reshareBtn = e.target.closest("[data-action='reshare']");
    const connectBtn = e.target.closest("[data-action='connect']");
    const moreBtn = e.target.closest("[data-action='more']");
    const removeConnBtn = e.target.closest("[data-action='remove-conn']");
    const deletePostBtn = e.target.closest("[data-action='delete-post']");

    const card = e.target.closest(".post-card");
    const postId = card?.getAttribute("data-postid") || null;

    // delete post (self only)
    if (deletePostBtn && postId) {
      const me = refreshSessionUserFromUsersList() || getUser();
      if (!me) return alert("Log in first ✅");
      if (profileView.mode === "visitor") return;

      const posts = loadPosts();
      const p = posts.find(x => x.id === postId);
      if (!p) return;

      if (p.authorId !== me.id) return alert("You can only delete your own post.");

      const ok = confirm("Delete this post? This cannot be undone.");
      if (!ok) return;

      const done = deletePostFromStorage(postId);
      if (!done) return;

      // Keep delete buttons visible if currently in Posts tab
      const postsTabActive = document.querySelector(".profile-tab.active")?.dataset?.ptab === "posts";
      rerenderAll();
      if (activeSectionId === "profile" && profileView.mode === "self") {
        renderMyPosts(!!postsTabActive);
      }
      return;
    }

    // remove connection (self only)
    if (removeConnBtn) {
      if (profileView.mode === "visitor") return;

      const user = refreshSessionUserFromUsersList() || getUser();
      if (!user) return;

      const uidToRemove = removeConnBtn.getAttribute("data-uid");
      if (!uidToRemove) return;

      const conns = Array.isArray(user.connections) ? user.connections : [];
      const updated = { ...user, connections: conns.filter(id => id !== uidToRemove) };
      if (!updateUserEverywhere(updated)) return;

      renderMyConnections();
      return;
    }

    // more toggle
    if (moreBtn) {
      const wrap = moreBtn.closest(".post-text");
      if (!wrap) return;

      const full = wrap.getAttribute("data-full") || "";
      const short = wrap.getAttribute("data-short") || "";
      const expanded = wrap.getAttribute("data-expanded") === "1";

      if (expanded) {
        wrap.innerHTML = `${short} <button class="more-toggle" data-action="more" type="button">…more</button>`;
        wrap.setAttribute("data-expanded", "0");
      } else {
        wrap.innerHTML = `${full} <button class="more-toggle" data-action="more" type="button">less</button>`;
        wrap.setAttribute("data-expanded", "1");
      }
      return;
    }

    // like
    if (likeBtn && postId) {
      const user = refreshSessionUserFromUsersList() || getUser();
      if (!user) return alert("Log in to like ✅");

      const updated = updatePostInStorage(postId, (p) => {
        p.likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
        const has = p.likedBy.includes(user.id);

        if (has) {
          p.likedBy = p.likedBy.filter(id => id !== user.id);
          p.likesCount = Math.max(0, Number(p.likesCount || 0) - 1);
        } else {
          p.likedBy = [user.id, ...p.likedBy];
          p.likesCount = Number(p.likesCount || 0) + 1;
        }
        return p;
      });

      if (!updated) return;

      // Keep delete buttons visible if currently in Posts tab
      const postsTabActive = document.querySelector(".profile-tab.active")?.dataset?.ptab === "posts";
      rerenderAll();
      if (activeSectionId === "profile" && profileView.mode === "self") {
        renderMyPosts(!!postsTabActive);
      }
      return;
    }

    // comment
    if (commentBtn && postId) {
      const user = refreshSessionUserFromUsersList() || getUser();
      if (!user) return alert("Log in to comment ✅");

      const text = prompt("Write a comment:");
      if (!text || !text.trim()) return;

      const updated = updatePostInStorage(postId, (p) => {
        p.comments = Array.isArray(p.comments) ? p.comments : [];
        p.comments.push({
          id: uid(),
          userId: user.id,
          userName: user.name,
          text: text.trim(),
          createdAt: new Date().toISOString()
        });
        return p;
      });

      if (!updated) return;

      const postsTabActive = document.querySelector(".profile-tab.active")?.dataset?.ptab === "posts";
      rerenderAll();
      if (activeSectionId === "profile" && profileView.mode === "self") {
        renderMyPosts(!!postsTabActive);
      }
      alert("Comment added ✅");
      return;
    }

    // reshare
    if (reshareBtn && postId) {
      const user = refreshSessionUserFromUsersList() || getUser();
      if (!user) return alert("Log in to reshare ✅");

      const original = updatePostInStorage(postId, (p) => {
        p.resharesCount = Number(p.resharesCount || 0) + 1;
        return p;
      });
      if (!original) return;

      let posts = loadPosts();
      const reshared = {
        ...original,
        id: uid(),
        createdAt: new Date().toISOString(),
        resharedBy: user.id,
        resharedByName: user.name,
        resharedFromId: original.id,

        likesCount: 0,
        likedBy: [],
        comments: [],
        resharesCount: 0
      };

      posts.unshift(reshared);
      posts = posts.slice(0, MAX_POSTS);
      if (!savePosts(posts)) return;

      rerenderAll();
      alert("Reshared ✅");
      return;
    }

    // connect
    if (connectBtn && postId) {
      const user = refreshSessionUserFromUsersList() || getUser();
      if (!user) return alert("Log in to connect ✅");

      const authorId = card?.getAttribute("data-authorid");
      if (!authorId) return;

      if (authorId === user.id) return alert("You can’t connect with yourself 🙂");

      const conns = Array.isArray(user.connections) ? user.connections : [];
      const isConnected = conns.includes(authorId);

      const updated = {
        ...user,
        connections: isConnected ? conns.filter(id => id !== authorId) : [authorId, ...conns]
      };

      if (!updateUserEverywhere(updated)) return;

      connectBtn.classList.toggle("connected", !isConnected);
      connectBtn.textContent = !isConnected ? "Connected" : "Connect";

      renderMyConnections();
      return;
    }
  });

  // =========================
  // INITIALIZE
  // =========================
  refreshSessionUserFromUsersList();
  setProfileMode({ mode: "self", userId: null });
  updateProfileHeaderUI();
  loadProfileIntoUI(getUser());

  if (postType) {
    postType.value = "market";
    setCategoryOptions("market");
    setPriceVisibility("market");
  }

  showSection("feed");
  if (bottomButtons.length) setBottomActive(bottomButtons[0]);
  if (tabButtons.length) setTabActive(tabButtons[0]);

  renderFeed();
  renderMarket();
  renderOpps();
  renderSocials();
  renderMyPosts(false);
  renderMyConnections();
});
// ===== Landing page rotator (safe: runs only if elements exist) =====
(function () {
  const rotator = document.getElementById("heroRotator");
  const accent = document.getElementById("heroAccent");
  if (!rotator || !accent) return;

  const lines = [
    "Buy & sell within your community",
    "Share notes & textbooks easily",
    "Find jobs, scholarships & internships",
    "Meet safely in verified spots",
    "Connect with real people fast"
  ];

  const accents = [
    "in one app",
    "with verified users",
    "without stress",
    "faster",
    "safely"
  ];

  let i = 0;
  let j = 0;

  const swap = (el, text) => {
    el.classList.remove("fade-slide-in");
    void el.offsetWidth; // restart animation
    el.textContent = text;
    el.classList.add("fade-slide-in");
  };

  setInterval(() => {
    i = (i + 1) % lines.length;
    swap(rotator, lines[i]);
  }, 2600);

  setInterval(() => {
    j = (j + 1) % accents.length;
    swap(accent, accents[j]);
  }, 3200);
})();


