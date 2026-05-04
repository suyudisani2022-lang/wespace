// js/app-supabase.js
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================
  // STATE
  // =========================
  let sessionUser = null; // auth user
  let authReady = false;

  async function initAuth() {
    if (authReady) return; // prevent duplicate runs
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error("getSession error:", error);

    sessionUser = session?.user ?? null;
    authReady = true;
  }

  // ✅ Initialize auth as early as possible
  await initAuth();

  // =========================
  // ELEMENTS
  // =========================

  const sections = document.querySelectorAll(".section");
  const profileWaBtn = document.getElementById("profileWaBtn");
  const notifBtn = document.getElementById("notifBtn");

  const FEED_LIST = document.getElementById("feedList");
  const marketList = document.getElementById("marketList");
  const oppsList = document.getElementById("oppsList");
  const socialList = document.getElementById("socialList");

  const marketFilter = document.getElementById("marketFilter");
  const oppsFilter = document.getElementById("oppsFilter");
  const socialFilter = document.getElementById("socialFilter");

  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileMeta = document.getElementById("profileMeta");
  const profileUsername = document.getElementById("profileUsername");

  const goRegisterBtn = document.getElementById("goRegisterBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const visitShopBtn = document.getElementById("visitShopBtn"); // ✅ NEW
  const verifySellerBtn = document.getElementById("verifySellerBtn");

  const deleteAccountBtn =
    document.getElementById("deleteAccountBtn") || document.getElementById("resetAppBtn");

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveProfileBtn2 = document.getElementById("saveProfileBtn2");

  const pAbout = document.getElementById("pAbout");
  const pSkills = document.getElementById("pSkills");
  const pBdayDay = document.getElementById("pBdayDay");
  const pBdayMonth = document.getElementById("pBdayMonth");
  const pEdu = document.getElementById("pEdu");
  const pIG = document.getElementById("pIG");
  const pX = document.getElementById("pX");
  const pWA = document.getElementById("pWA");
  const pTT = document.getElementById("pTT");

  const changePhotoWrap = document.getElementById("changePhotoWrap");
  const changePhotoInput = document.getElementById("changePhotoInput");
  const shareShopBtn = document.getElementById("shareShopBtn");
  const myPostsWrap = document.getElementById("myPostsWrap");
  const myConnectionsWrap = document.getElementById("myConnectionsWrap");

  const visitorBackBtn = document.getElementById("visitorBackBtn");

  const createPostBtn = document.getElementById("createPostBtn");
  const postModal = document.getElementById("postModal");
  const closePostBtn = document.getElementById("closePostModal");
  const cancelPostBtn = document.getElementById("cancelPost");
  const postForm = document.getElementById("postForm");
  const applyLinkWrap = document.getElementById("applyLinkWrap");
  const applyLink = document.getElementById("applyLink");

  const postType = document.getElementById("postType");
  const postCategory = document.getElementById("postCategory");
  const priceWrap = document.getElementById("priceFieldWrap");
  const postPrice = document.getElementById("postPrice");

  const postTitle = document.getElementById("postTitle");
  const postDesc = document.getElementById("postDesc");
  const postImages = document.getElementById("postImages");
  const postWhatsApp = document.getElementById("postWhatsApp");

  const previewEmpty = document.getElementById("imagePreviewEmpty");
  const previewStrip = document.getElementById("imagePreviewStrip");

  // LIGHTBOX ELEMENTS
  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const closeLightbox = document.getElementById("closeLightbox");

  let verifiedSellerSet = new Set();

  async function loadVerifiedSellers() {
    const { data, error } = await supabase
      .from("seller_verifications")
      .select("user_id")
      .eq("status", "approved");

    if (error) {
      console.error("loadVerifiedSellers error:", error);
      verifiedSellerSet = new Set();
      return;
    }
    verifiedSellerSet = new Set((data || []).map(r => r.user_id));
  }





  verifySellerBtn?.addEventListener("click", () => {
    window.location.href = "/verify.html";
  });

  // =========================
  // SEARCH MODAL (WORKING)
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
  searchModal?.addEventListener("click", (ev) => {
    if (ev.target === searchModal) closeSearchModal();
  });

  const runSearch = () => {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const posts = cachedFeedItems || [];

    const filtered = !q
      ? posts
      : posts.filter((item) => {
        const p = item.post;
        const hay = `${p.title} ${p.description} ${p.category} ${p.type} ${p.author_name} ${p.author_campus} ${p.author_department}`
          .toLowerCase();
        return hay.includes(q);
      });

    showSection("feed");
    renderFeed(filtered);
    closeSearchModal();
  };

  applySearch?.addEventListener("click", runSearch);
  searchInput?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") runSearch();
  });
  clearSearch?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    renderFeed(cachedFeedItems);
    closeSearchModal();
  });
  const setApplyVisibility = (type) => {
    if (!applyLinkWrap) return;

    const show = type === "opportunity" || type === "social";
    applyLinkWrap.style.display = show ? "block" : "none";

    // clear when not needed
    if (!show && applyLink) applyLink.value = "";
  };

  // =========================
  // NOTIFICATIONS PANEL (WORKING TOGGLE)
  // =========================





  const notifPanel = document.getElementById("notifPanel");
  const closeNotif = document.getElementById("closeNotif");

  notifBtn?.addEventListener("click", async () => {
    notifPanel?.classList.toggle("show");

    if (!notifPanel?.classList.contains("show")) return;
    if (!sessionUser) {
      notifPanel.innerHTML = `<div class="empty-state">Log in to see notifications.</div>`;
      return;
    }

    notifPanel.innerHTML = `<div class="empty-state">Loading…</div>`;
    const list = await fetchNotifications();

    if (!list.length) {
      notifPanel.innerHTML = `<div class="empty-state">No notifications yet.</div>`;
      return;
    }

    // show simple messages (we can enhance with names later)
    notifPanel.innerHTML = list.map(n => {
      const when = new Date(n.created_at).toLocaleString();
      const unread = !n.read_at;

      const who = n.actor_name || "Someone";
      const title = n.post_title ? `“${escapeHtml(n.post_title)}”` : "";

      let msg = "Notification";
      if (n.type === "connect") msg = `${escapeHtml(who)} connected with you`;
      if (n.type === "comment") msg = `${escapeHtml(who)} commented on your post ${title}`;
      if (n.type === "reshare") msg = `${escapeHtml(who)} reshared your post ${title}`;
      if (n.type === "new_post") msg = `New post from ${escapeHtml(who)} ${title}`;
      if (n.type === "new_reshare") msg = `${escapeHtml(who)} reshared something ${title}`;


      const avatar = n.actor_photo
        ? `<img class="notif-avatar" src="${escapeHtml(n.actor_photo)}" alt="avatar" />`
        : `<div class="notif-avatar fallback">👤</div>`;

      return `
  
    <div class="notif-item ${unread ? "unread" : ""}"
         data-nid="${n.id}"
         data-postid="${n.post_id || ""}">
      ${avatar}
      <div class="notif-body">
        <div class="notif-text">${msg}</div>
        <div class="notif-time">${when}</div>
      </div>
    </div>
  `;
    }).join("");

    // mark unread as read
    const unreadIds = list.filter(x => !x.read_at).map(x => x.id);
    await markNotificationsRead(unreadIds);
    await refreshNotifBadge();
  });
  async function markNotificationsRead(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (!sessionUser || unique.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unique)
      .eq("user_id", sessionUser.id);

    if (error) console.error("markNotificationsRead error:", error);
  }
  // =========================
  // HIDE NAVS ON SCROLL DOWN, SHOW ON SCROLL UP
  // =========================
  const topbar = document.getElementById("topbar");
  const desktopTabs = document.querySelector(".desktop-tabs");
  const bottomNav = document.querySelector(".bottom-nav");

  let lastY = window.scrollY;
  const threshold = 12;

  const setNavHidden = (hidden) => {
    topbar?.classList.toggle("nav-hidden", hidden);
    desktopTabs?.classList.toggle("nav-hidden", hidden);
    bottomNav?.classList.toggle("nav-hidden", hidden);
  };

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (y <= 0) {
        setNavHidden(false);
        lastY = y;
        return;
      }

      if (delta > threshold) {
        setNavHidden(true);
        lastY = y;
        return;
      }

      if (delta < -threshold) {
        setNavHidden(false);
        lastY = y;
        return;
      }
    },
    { passive: true }
  );


  function requireUser() {
    return sessionUser?.id ? sessionUser : null;
  }
  let myProfile = null; // profiles row

  let activeSectionId = "feed";

  // cachedPosts = raw posts list for category pages
  let cachedPosts = [];

  // cachedFeedItems = mixed feed list (posts + reshares)
  let cachedFeedItems = [];

  let myConnectionSet = new Set();
  let shopOwnerSet = new Set();

  const profileView = {
    mode: "self", // "self" | "visitor"
    userId: null,
    returnSection: "profile",
    returnScrollY: 0,
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
  function setCarouselActive(mediaEl, activeIndex) {
    const dotsWrap = mediaEl?.querySelector(".carousel-dots");
    if (!dotsWrap) return;
    const dots = Array.from(dotsWrap.querySelectorAll(".dot"));
    dots.forEach((d, i) => d.classList.toggle("active", i === activeIndex));
  }
  function getShopLinkForUserId(uid) {
    const base = window.location.origin; // your domain (or localhost)
    return `${base}/shop.html?seller=${encodeURIComponent(uid)}`;
  }

  async function shareOrCopy(text) {
    // Try native share (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: "weSPACE Shop", text, url: text });
        return true;
      } catch (e) {
        // user cancelled — fallback to copy
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert("Shop link copied ✅");
      return true;
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      alert("Shop link copied ✅");
      return true;
    }
  }
  function getCarouselIndex(trackEl) {
    const width = trackEl.offsetWidth;
    if (width <= 0) return 0;
    return Math.round(trackEl.scrollLeft / width);
  }

  function scrollCarouselTo(trackEl, index) {
    const width = trackEl.offsetWidth;
    trackEl.scrollTo({
      left: index * width,
      behavior: "smooth"
    });
  }

  const formatWaNumber = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "";
    let n = v.replace(/[^\d+]/g, "");
    if (n.startsWith("+")) n = n.slice(1);
    if (n.startsWith("0")) n = "234" + n.slice(1);
    return n;
  };

  /**
   * ✅ Client-side image compression
   * Reduces file size before upload for "big tech" efficiency.
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

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error("Canvas toBlob failed"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }
  async function fetchNotifications(limit = 30) {
    if (!authReady) await initAuth();

    const user = requireUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications_view")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("fetchNotifications error:", error);
      return [];
    }

    return data || [];
  }

  async function loadShopOwners() {
    const { data, error } = await supabase.from("shop_catalogues").select("seller_id");
    if (error) {
      console.error("loadShopOwners error:", error);
      shopOwnerSet = new Set();
      return;
    }
    shopOwnerSet = new Set((data || []).map((r) => r.seller_id));
  }

  const setDisabledProfileInputs = (disabled) => {
    const ids = ["pAbout", "pSkills", "pBdayDay", "pBdayMonth", "pEdu", "pIG", "pX", "pWA", "pTT"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = disabled;
      el.readOnly = disabled;
    });

    if (saveProfileBtn) saveProfileBtn.style.display = disabled ? "none" : "";
    if (saveProfileBtn2) saveProfileBtn2.style.display = disabled ? "none" : "";

    if (changePhotoWrap) changePhotoWrap.style.display = disabled ? "none" : "inline-flex";
  };

  const setProfileMode = ({ mode, userId, returnSection, returnScrollY } = {}) => {
    if (mode) profileView.mode = mode;
    profileView.userId = userId ?? profileView.userId;
    profileView.returnSection = returnSection ?? profileView.returnSection;
    profileView.returnScrollY = returnScrollY ?? profileView.returnScrollY;

    if (visitorBackBtn) {
      visitorBackBtn.style.display = profileView.mode === "visitor" ? "inline-flex" : "none";
    }

    // ✅ ADD THIS HERE
    if (verifySellerBtn) {
      verifySellerBtn.style.display =
        profileView.mode === "visitor" ? "none" : "inline-flex";
    }
  };

  const showSection = async (id) => {
    activeSectionId = id;

    // Ensure auth is initialized before any UI that depends on sessionUser
    if (!authReady) await initAuth();

    sections.forEach((s) => s.classList.remove("active-section"));
    document.getElementById(id)?.classList.add("active-section");

    if (id === "feed") renderFeed(cachedFeedItems);
    if (id === "market") renderMarket();
    if (id === "opportunities") renderOpps();
    if (id === "socials") renderSocials();
    if (id === "profile") renderProfileUI();
  };
  function ensureNotifBadge() {
    if (!notifBtn) return null;

    // notifBtn must be position:relative for badge to sit correctly
    notifBtn.style.position = "relative";

    let badge = document.getElementById("notifBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "notifBadge";
      badge.className = "notif-badge";
      notifBtn.appendChild(badge);
    }
    return badge;
  }

  async function fetchUnreadNotifCount() {
    if (!sessionUser) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sessionUser.id)
      .is("read_at", null);

    if (error) {
      console.error("fetchUnreadNotifCount error:", error);
      return 0;
    }
    return Number(count || 0);
  }

  async function refreshNotifBadge() {
    const badge = ensureNotifBadge();
    if (!badge) return;

    if (!sessionUser) {
      badge.style.display = "none";
      return;
    }

    const unread = await fetchUnreadNotifCount();

    if (unread <= 0) {
      badge.style.display = "none";
      return;
    }

    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.style.display = "flex";
  }

  // =========================
  // NAVS
  // =========================
  const bottomButtons = document.querySelectorAll(".bottom-nav button");
  const tabButtons = document.querySelectorAll(".tab-btn");

  const setBottomActive = (btn) => {
    bottomButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  };
  const setTabActive = (btn) => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  };
  const mapSection = (label) => {
    const key = (label || "").toLowerCase().trim();
    return ({ feed: "feed", market: "market", opportunities: "opportunities", socials: "socials", shops: "socials", profile: "profile" }[
      key
    ] || "feed");
  };

  bottomButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      setBottomActive(btn);
      const target = mapSection(btn.textContent);
      if (target === "profile") setProfileMode({ mode: "self", userId: null });
      await showSection(target);
    });
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      setTabActive(btn);
      const target = btn.dataset.section;
      if (target === "profile") setProfileMode({ mode: "self", userId: null });
      await showSection(target);
    });
  });

  visitorBackBtn?.addEventListener("click", async () => {
    setProfileMode({ mode: "self", userId: null });
    const target = profileView.returnSection || "feed";
    await showSection(target);
    window.scrollTo({ top: profileView.returnScrollY || 0, behavior: "smooth" });
  });
  // =========================
  // CATEGORIES
  // =========================
  const CATEGORY_MAP = {
    market: [
      "Phones & Gadgets",
      "Fashion & Textiles",
      "Shoes & Bags",
      "Perfumes & Beauty",
      "Food & Snacks",
      "Books & Materials",
      "Services",
      "Hostel & Apartment",
      "Electronics",
      "Others",
    ],
    opportunity: ["Grants & Funding", "Scholars", "Job", "Training", "Internship", "Others"],
    social: ["kwari market", "farm centre", "singa market", "sabon gari", "wambai"],
  };

  const setCategoryOptions = (type) => {
    if (!postCategory) return;
    const list = CATEGORY_MAP[type] || [];
    postCategory.innerHTML = list.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  };

  const setPriceVisibility = (type) => {
    if (!priceWrap) return;
    if (type === "market") priceWrap.style.display = "block";
    else {
      priceWrap.style.display = "none";
      if (postPrice) postPrice.value = "";
    }
  };

  marketFilter &&
    (marketFilter.innerHTML =
      `<option value="">All categories</option>` +
      CATEGORY_MAP.market.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));
  oppsFilter &&
    (oppsFilter.innerHTML =
      `<option value="">All types</option>` +
      CATEGORY_MAP.opportunity.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));
  socialFilter &&
    (socialFilter.innerHTML =
      `<option value="">All types</option>` +
      CATEGORY_MAP.social.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));

  marketFilter?.addEventListener("change", renderMarket);
  oppsFilter?.addEventListener("change", renderOpps);
  socialFilter?.addEventListener("change", renderSocials);

  // =========================
  // UI RENDER: POSTS
  // =========================
  const badgeHTML = (type, category) => {
    const icon = type === "market" ? "🛒" : type === "opportunity" ? "🎓" : "🎉";
    const cls = type === "market" ? "market" : type === "opportunity" ? "opportunity" : "social";
    return `<span class="post-badge ${cls}">${icon} ${escapeHtml(category || type)}</span>`;
  };

  const connectBtnHTML = (authorId) => {
    return "";
  };

  // IMPORTANT: Always uses ORIGINAL author_id (even for reshared items)
  const visitShopHTML = (p) => {
    if (p.type !== "market") return "";
    if (!p.author_id) return "";

    return `
      <button class="visit-shop-btn"
              type="button"
              data-action="visit-shop"
              data-sellerid="${p.author_id}">
        🛒 Visit Shop
      </button>
    `;
  };

  const postMediaHTML = (post) => {
    const images = Array.isArray(post.image_urls) ? post.image_urls : [];
    if (!images.length) return "";

    const wa = post.type === "market" ? String(post.whatsapp || "").trim() : "";
    const hasMany = images.length > 1;

    return `
    <div class="post-media" data-carousel="1">
      <div class="post-media-track" data-carousel-track="1">
        ${images.map((src, i) => `
          <div class="post-media-item" data-idx="${i}">
            <img src="${escapeHtml(src)}" alt="Post image ${i + 1}" loading="lazy">
          </div>
        `).join("")}
      </div>

      ${wa ? `
          <button
            type="button"
            class="post-wa-icon"
            data-action="contact"
            data-phone="${escapeHtml(wa)}"
            data-title="${escapeHtml((post.description || "").slice(0, 40))}"
            aria-label="Contact on WhatsApp"
            title="Contact on WhatsApp"
          >
            <img src="/assets/whatsapp.png" alt="WhatsApp">
          </button>
        ` : ""
      }

      ${hasMany ? `
          <div class="carousel-dots" data-carousel-dots="1">
            ${images.map((_, i) => `
              <button class="dot ${i === 0 ? "active" : ""}"
                      type="button"
                      data-action="carousel-dot"
                      data-index="${i}"
                      aria-label="Photo ${i + 1}">
              </button>
            `).join("")}
          </div>

          <button class="carousel-nav prev" type="button" data-action="carousel-prev" aria-label="Previous photo">‹</button>
          <button class="carousel-nav next" type="button" data-action="carousel-next" aria-label="Next photo">›</button>
        ` : ""
      }

     ${post.type === "market" && post.price
        ? `<div class="post-price-badge">${escapeHtml(post.price)}</div>`
        : ((post.type === "opportunity" || post.type === "social") && post.apply_link
          ? `<button class="post-apply-badge"
                  type="button"
                  data-action="apply-link"
                  data-url="${escapeHtml(post.apply_link)}">Apply</button>`
          : "")
      }
  `;
  };

  // item = { kind: "post" | "reshare", sort_time, post, reshared_by, reshared_by_name, reshared_at }
  const renderPostCard = (p, opts = {}) => {
    const { showDelete = false, feedMeta = null } = opts;

    const isReshare = Boolean(feedMeta?.isReshare);
    const resharedByMe = isReshare && sessionUser && feedMeta?.reshared_by === sessionUser.id;

    const verifiedBadgeHTML = verifiedSellerSet.has(p.author_id) ? `<span class="verified-badge" title="Verified seller">✔</span>` : "";
    const fullDesc = p.description || "";
    const short = fullDesc.length > 170 ? fullDesc.slice(0, 170) + "…" : fullDesc;

    const deleteBtn =
      showDelete && sessionUser && (p.author_id === sessionUser.id || resharedByMe)
        ? `<button class="danger mini-del" data-action="delete-post" type="button">Delete</button>`
        : "";

    const likesCount = Number(p.likes_count || 0);
    const commentsCount = Number(p.comments_count || 0);
    const resharesCount = Number(p.reshares_count || 0);

    const reshareBanner = isReshare
      ? `
        <div class="reshare-banner">
          🔁 ${resharedByMe ? "You reshared" : escapeHtml(feedMeta?.reshared_by_name || "Someone reshared")}
        </div>
      `
      : "";

    return `
  <article class="post-card" 
           data-postid="${p.id}" 
           data-authorid="${p.author_id}"
           data-kind="${isReshare ? 'reshare' : 'post'}">
    ${reshareBanner}

    <div class="post-head">
      <img class="avatar-img" src="${escapeHtml(p.author_photo_url || "")}" alt="avatar" loading="lazy">

      <div class="post-meta">
        <div class="name-row">
  <div class="name-left">
    <span class="poster-name">
      ${escapeHtml(p.author_name || "User")}
      ${verifiedSellerSet.has(p.author_id) ? `<span class="verified-badge" title="Verified seller">✔</span>` : ""}
    </span>
  </div>

  <div class="name-right">
    ${connectBtnHTML(p.author_id)}
    ${visitShopHTML(p)}
    ${deleteBtn}
  </div>
</div>

        <div class="sub-row">
          ${escapeHtml(p.author_campus || "")}
          ${p.author_department ? " • " + escapeHtml(p.author_department) : ""}
        </div>
      </div>
    </div>

    <div class="post-body">
      

      <div class="post-text"
           data-full="${escapeHtml(fullDesc)}"
           data-short="${escapeHtml(short)}"
           data-expanded="0">
        ${escapeHtml(short)} <button class="more-toggle" data-action="more" type="button">…more</button>
      </div>

      ${postMediaHTML(p)}
    </div>

    <!-- ✅ Bottom actions now ONLY Like / Comment / Reshare -->
    <div class="post-actions">
      <button type="button" data-action="like" ${sessionUser ? "" : "disabled"}>👍 <span class="btn-label">Like</span> <span class="count">(${likesCount})</span></button>
      <button type="button" data-action="comment" ${sessionUser ? "" : "disabled"}>💬 <span class="btn-label">Comment</span> <span class="count">(${commentsCount})</span></button>
      <button type="button" data-action="reshare" ${sessionUser ? "" : "disabled"}>🔁 <span class="btn-label">Reshare</span> <span class="count">(${resharesCount})</span></button>
    </div>

    <div class="post-comments" style="display:none;"></div>
  </article>

      `;
  };

  function renderMarket() {
    if (!marketList) return;
    const cat = marketFilter?.value || "";
    const posts = cachedPosts.filter((p) => p.type === "market" && (!cat || p.category === cat));
    marketList.innerHTML = posts.length ? posts.map((p) => renderPostCard(p)).join("") : `<p class="empty-state">No market posts yet.</p>`;
  }

  function renderOpps() {
    if (!oppsList) return;
    const cat = oppsFilter?.value || "";
    const posts = cachedPosts.filter((p) => p.type === "opportunity" && (!cat || p.category === cat));
    oppsList.innerHTML = posts.length ? posts.map((p) => renderPostCard(p)).join("") : `<p class="empty-state">No opportunities yet.</p>`;
  }

  // ── SHOPS DIRECTORY STATE ──
  let cachedShops = [];
  let shopsLoaded = false;
  let activeShopCity = "";
  let activeShopCat = "";
 
  async function loadShopsDirectory() {
    const { data: shops, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });
 
    if (error) {
      console.error("loadShopsDirectory error:", error);
      cachedShops = [];
      return;
    }
 
    // Get product counts per seller
    const sellerIds = (shops || []).map(s => s.seller_id);
    let productCounts = {};
    if (sellerIds.length) {
      const { data: counts } = await supabase
        .from("shop_products")
        .select("seller_id")
        .in("seller_id", sellerIds);
      (counts || []).forEach(r => {
        productCounts[r.seller_id] = (productCounts[r.seller_id] || 0) + 1;
      });
    }
 
    cachedShops = (shops || []).map(s => ({
      ...s,
      productCount: productCounts[s.seller_id] || 0,
      verified: verifiedSellerSet.has(s.seller_id),
    }));
 
    shopsLoaded = true;
  }
 
  function renderShopsGrid() {
    if (!socialList) return;
 
    let list = cachedShops;
 
    if (activeShopCity) {
      list = list.filter(s => s.city === activeShopCity);
    }
    if (activeShopCat) {
      list = list.filter(s => s.category === activeShopCat);
    }
 
    if (!list.length) {
      socialList.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:40px 16px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">🏪</div>
          <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">No shops found</div>
          <div style="font-size:13px;color:#64748b;">Try a different city or category</div>
        </div>`;
      return;
    }
 
    socialList.innerHTML = list.map(shop => {
      const loc = [shop.city, shop.market].filter(Boolean).join(" • ");
      return `
        <div class="shop-dir-card"
             data-action="open-shop"
             data-sellerid="${escapeHtml(shop.seller_id)}">
          ${shop.banner_url
            ? `<img class="shop-dir-banner" src="${escapeHtml(shop.banner_url)}" alt="banner" loading="lazy" />`
            : `<div class="shop-dir-banner-placeholder">🏪</div>`}
          <div class="shop-dir-body">
            ${shop.verified
              ? `<span class="shop-dir-verified">✔ Verified</span>`
              : ""}
            ${shop.logo_url
              ? `<img class="shop-dir-logo" src="${escapeHtml(shop.logo_url)}" alt="logo" loading="lazy" />`
              : `<div class="shop-dir-logo-placeholder">🏬</div>`}
            <div class="shop-dir-name">${escapeHtml(shop.shop_name || "Shop")}</div>
            ${loc ? `<div class="shop-dir-location">📍 ${escapeHtml(loc)}</div>` : ""}
            ${shop.category ? `<div class="shop-dir-cat">${escapeHtml(shop.category)}</div>` : ""}
            <div class="shop-dir-products">${shop.productCount} product${shop.productCount !== 1 ? "s" : ""}</div>
          </div>
        </div>`;
    }).join("");
  }
 
  async function renderSocials() {
    if (!socialList) return;
    socialList.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Loading shops…</div>`;
 
    if (!shopsLoaded) {
      await loadVerifiedSellers();
      await loadShopsDirectory();
    }
 
    renderShopsGrid();
  }
 
  // City filter chips
  document.getElementById("cityFilterBar")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".shop-filter-chip");
    if (!chip) return;
    document.querySelectorAll("#cityFilterBar .shop-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeShopCity = chip.dataset.city || "";
    renderShopsGrid();
  });
 
  // Category filter chips
  document.getElementById("categoryFilterBar")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".shop-filter-chip");
    if (!chip) return;
    document.querySelectorAll("#categoryFilterBar .shop-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeShopCat = chip.dataset.cat || "";
    renderShopsGrid();
  });
 
Also find the global click handler in app-supabase.js (the big document.addEventListener("click"...) 
and add this case to handle shop card clicks. Search for:
 
  document.addEventListener("click", async (ev) => {
 
And somewhere inside that handler, add this new case (near where "visit-shop" is handled):
 
    // Open shop from directory
    if (action === "open-shop") {
      const sellerId = el.dataset.sellerid;
      if (sellerId) window.location.href = `shop.html?seller=${encodeURIComponent(sellerId)}`;
      return;
    }
 
  

  // Feed renders mixed items (posts + reshares)
  function renderFeed(items) {
    if (!FEED_LIST) return;

    const list = Array.isArray(items) ? items : [];
    FEED_LIST.innerHTML = list.length
      ? list.map((it) => renderPostCard(it.post, {
        feedMeta: it.kind === "reshare" ? {
          isReshare: true,
          reshared_by: it.reshared_by,
          reshared_by_name: it.reshared_by_name,
          reshared_at: it.reshared_at
        } : null
      })).join("")
      : `<p class="empty-state">No posts yet.</p>`;
  }

  // =========================
  // PROFILE TABS
  // =========================
  const tabsNav = document.querySelector(".profile-tabs");
  const panels = Array.from(document.querySelectorAll(".profile-panel"));

  const openPTab = (key) => {
    document.querySelectorAll(".profile-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.ptab === key);
    });
    panels.forEach((p) => p.classList.toggle("active", p.id === `ptab-${key}`));
  };

  tabsNav?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".profile-tab");
    if (!btn) return;
    openPTab(btn.dataset.ptab);

    if (btn.dataset.ptab === "connections") await renderConnectionsList();
    if (btn.dataset.ptab === "posts") await renderProfilePostsList();
  });

  function fillBirthdayDays() {
    if (!pBdayDay) return;
    if (pBdayDay.options.length > 1) return;
    pBdayDay.innerHTML =
      `<option value="">Day</option>` +
      Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  }
  fillBirthdayDays();

  async function fetchProfileById(id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) return null;
    return data;
  }

  // =========================
  // DATA: POSTS + STATS
  // =========================
  async function fetchPosts() {
    const { data: posts, error } = await supabase
      .from("posts_with_stats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.error("fetchPosts error:", error);
      return [];
    }

    const authorIds = [...new Set((posts || []).map((p) => p.author_id))];
    if (!authorIds.length) return posts || [];

    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, name, campus, department, photo_url, username")
      .in("id", authorIds);

    if (pErr) {
      console.error("profiles fetch error:", pErr);
      return posts || [];
    }

    const byId = new Map((profs || []).map((x) => [x.id, x]));

    return (posts || []).map((p) => {
      const a = byId.get(p.author_id);
      return {
        ...p,
        author_name: a?.name || "User",
        author_campus: a?.campus || "",
        author_department: a?.department || "",
        author_photo_url: a?.photo_url || "",
        author_username: a?.username || "",
      };
    });
  }

  // =========================
  async function fetchFeedItemsMixed() {
    // base posts
    const posts = cachedPosts?.length ? cachedPosts : await fetchPosts();

    // latest reshares (simple: last 80 reshares)
    const { data: rs, error: rErr } = await supabase
      .from("post_reshares")
      .select("post_id, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (rErr) {
      console.error("fetch reshares error:", rErr);
      // fallback: show only posts
      return posts.map((p) => ({
        kind: "post",
        sort_time: p.created_at,
        post: p,
        reshared_by: null,
        reshared_by_name: null,
        reshared_at: null,
      }));
    }

    const reshares = rs || [];
    if (!reshares.length) {
      return posts.map((p) => ({
        kind: "post",
        sort_time: p.created_at,
        post: p,
        reshared_by: null,
        reshared_by_name: null,
        reshared_at: null,
      }));
    }

    // Map original post_id -> post object using cached posts
    const postById = new Map(posts.map((p) => [p.id, p]));

    // We also want reshared-by name
    const resharedUserIds = [...new Set(reshares.map((r) => r.user_id))];
    const { data: resharedProfiles, error: rpErr } = await supabase
      .from("profiles")
      .select("id, name, username")
      .in("id", resharedUserIds);

    if (rpErr) console.error("resharedProfiles error:", rpErr);

    const resharedById = new Map((resharedProfiles || []).map((u) => [u.id, u]));

    const feedReshares = reshares
      .map((r) => {
        const post = postById.get(r.post_id);
        if (!post) return null;

        const u = resharedById.get(r.user_id);
        const displayName = u?.name ? u.name : u?.username ? `@${u.username}` : "Reshared";

        return {
          kind: "reshare",
          sort_time: r.created_at, // reshare time drives timeline
          post,
          reshared_by: r.user_id,
          reshared_by_name: displayName,
          reshared_at: r.created_at,
        };
      })
      .filter(Boolean);

    const feedPosts = posts.map((p) => ({
      kind: "post",
      sort_time: p.created_at,
      post: p,
      reshared_by: null,
      reshared_by_name: null,
      reshared_at: null,
    }));

    // combine + sort
    const mixed = [...feedReshares, ...feedPosts].sort((a, b) => new Date(b.sort_time) - new Date(a.sort_time));

    return mixed;
  }
  // =========================
  // PROFILE: POSTS LIST (now includes reshares)
  // =========================
  async function renderProfilePostsList() {
    if (!myPostsWrap) return;

    const whoId = profileView.mode === "visitor" ? profileView.userId : sessionUser?.id;

    if (!whoId) {
      myPostsWrap.innerHTML = `<p class="empty-state">Log in to see posts.</p>`;
      return;
    }

    // originals
    const { data: posts, error } = await supabase
      .from("posts_with_stats")
      .select("*")
      .eq("author_id", whoId)
      .order("created_at", { ascending: false });

    if (error) {
      myPostsWrap.innerHTML = `<p class="empty-state">Could not load posts.</p>`;
      return;
    }

    // reshares made by that user
    const { data: rs, error: rErr } = await supabase
      .from("post_reshares")
      .select("post_id, user_id, created_at")
      .eq("user_id", whoId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (rErr) console.error("profile reshares error:", rErr);

    const basePosts = posts || [];

    // profile info for author details mapping
    const prof =
      profileView.mode === "visitor" ? await fetchProfileById(whoId) : myProfile;

    const mapAuthor = (p) => ({
      ...p,
      author_name: p.author_name || prof?.name || "User",
      author_campus: p.author_campus || prof?.campus || "",
      author_department: p.author_department || prof?.department || "",
      author_photo_url: p.author_photo_url || prof?.photo_url || "",
    });

    const originalsMapped = basePosts.map(mapAuthor);

    // for reshared posts, we need original post rows too
    let resharedCards = [];
    const resharedIds = [...new Set((rs || []).map((x) => x.post_id))].filter(Boolean);

    if (resharedIds.length) {
      const { data: resharedPosts, error: pErr } = await supabase
        .from("posts_with_stats")
        .select("*")
        .in("id", resharedIds);

      if (pErr) {
        console.error("resharedPosts error:", pErr);
      } else {
        // add profiles of original authors
        const authorIds = [...new Set((resharedPosts || []).map((p) => p.author_id))];
        const { data: profs, error: pe } = await supabase
          .from("profiles")
          .select("id, name, campus, department, photo_url, username")
          .in("id", authorIds);

        if (pe) console.error("profile authors error:", pe);
        const byId = new Map((profs || []).map((x) => [x.id, x]));

        const postById = new Map(
          (resharedPosts || []).map((p) => {
            const a = byId.get(p.author_id);
            return [
              p.id,
              {
                ...p,
                author_name: a?.name || "User",
                author_campus: a?.campus || "",
                author_department: a?.department || "",
                author_photo_url: a?.photo_url || "",
              },
            ];
          })
        );

        resharedCards = (rs || [])
          .map((r) => {
            const post = postById.get(r.post_id);
            if (!post) return null;
            return { post, meta: { isReshare: true, reshared_by: whoId, reshared_by_name: prof?.name || "Reshared", reshared_at: r.created_at }, sort: r.created_at };
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.sort) - new Date(a.sort));
      }
    }

    // combine originals + reshares, newest first
    const combined = [
      ...originalsMapped.map((p) => ({ kind: "post", post: p, meta: null, sort: p.created_at })),
      ...resharedCards.map((x) => ({ kind: "reshare", post: x.post, meta: x.meta, sort: x.sort })),
    ].sort((a, b) => new Date(b.sort) - new Date(a.sort));

    const isSelf = profileView.mode === "self" && sessionUser && whoId === sessionUser.id;

    myPostsWrap.innerHTML = combined.length
      ? combined.map((x) => renderPostCard(x.post, { showDelete: isSelf, feedMeta: x.meta })).join("")
      : `<p class="empty-state">No posts yet.</p>`;
  }

  // =========================
  // CONNECTIONS: LOAD + TOGGLE
  // =========================
  async function loadMyConnections() {
    myConnectionSet = new Set();
    if (!sessionUser) return;

    const { data, error } = await supabase.from("connections").select("target_id").eq("user_id", sessionUser.id);
    if (error) return;
    (data || []).forEach((r) => myConnectionSet.add(r.target_id));
  }

  async function connectTo(targetId) {
    if (!sessionUser) return alert("Log in to connect ✅");
    if (!targetId) return;
    if (targetId === sessionUser.id) return alert("You can’t connect with yourself 🙂");

    const already = myConnectionSet.has(targetId);

    if (already) {
      const { error } = await supabase.from("connections").delete().eq("user_id", sessionUser.id).eq("target_id", targetId);
      if (error) return alert(error.message || "Could not disconnect.");
      myConnectionSet.delete(targetId);
    } else {
      const { error } = await supabase.from("connections").insert({ user_id: sessionUser.id, target_id: targetId });
      if (error) return alert(error.message || "Could not connect.");
      myConnectionSet.add(targetId);
    }

    // refresh UI
    cachedPosts = await fetchPosts();
    cachedFeedItems = await fetchFeedItemsMixed();

    renderFeed(cachedFeedItems);
    renderMarket();
    renderOpps();
    renderSocials();

    const activePtab = document.querySelector(".profile-tab.active")?.dataset?.ptab;
    if (activeSectionId === "profile" && profileView.mode === "self" && activePtab === "connections") {
      await renderConnectionsList();
    }
  }

  async function renderConnectionsList() {
    if (!myConnectionsWrap) return;

    const whoId = profileView.mode === "visitor" ? profileView.userId : sessionUser?.id;

    if (!whoId) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">Log in to see connections.</p>`;
      return;
    }

    const { data: rows, error } = await supabase.from("connections").select("target_id").eq("user_id", whoId);
    if (error) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">Could not load connections.</p>`;
      return;
    }

    const ids = (rows || []).map((r) => r.target_id);
    if (!ids.length) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">No connections yet.</p>`;
      return;
    }

    const { data: people, error: pErr } = await supabase
      .from("profiles")
      .select("id, name, username, campus, department, photo_url")
      .in("id", ids);

    if (pErr) {
      myConnectionsWrap.innerHTML = `<p class="empty-state">Could not load users.</p>`;
      return;
    }

    myConnectionsWrap.innerHTML = (people || [])
      .map(
        (u) => `
      <div class="connection-card">
        <div class="connection-left">
          <img src="${escapeHtml(u.photo_url || "")}" alt="avatar" loading="lazy"/>
          <div>
            <div class="connection-name">${escapeHtml(u.name || "User")}</div>
            <div class="connection-meta">@${escapeHtml(u.username || "user")} • ${escapeHtml(u.campus || "")} • ${escapeHtml(u.department || "")}</div>
          </div>
        </div>

        ${profileView.mode === "self" && sessionUser
            ? `<button class="btn ghost" type="button" data-action="disconnect" data-targetid="${u.id}">Remove</button>`
            : ``
          }
      </div>
    `
      )
      .join("");
  }

  // =========================
  // PROFILE UI
  // =========================
  function renderProfileUI() {
    // VISITOR MODE
    if (profileView.mode === "visitor" && profileView.userId) {
      setDisabledProfileInputs(true);

      if (goRegisterBtn) goRegisterBtn.style.display = "none";

      // ❌ hide logout in visitor mode
      if (logoutBtn) logoutBtn.style.display = "none";

      if (deleteAccountBtn) deleteAccountBtn.style.display = "none";

      // ✅ show WhatsApp button instead
      if (profileWaBtn) profileWaBtn.style.display = "";
      if (changePhotoWrap) changePhotoWrap.style.display = "none";
      if (visitShopBtn) visitShopBtn.style.display = "";
      if (shareShopBtn) shareShopBtn.style.display = "";

      (async () => {
        const u = await fetchProfileById(profileView.userId);
        if (!u) {
          profileName && (profileName.textContent = "User not found");
          profileMeta && (profileMeta.textContent = "Maybe deleted");
          profileUsername && (profileUsername.textContent = "@unknown");
          profileAvatar?.removeAttribute("src");
          if (myPostsWrap) myPostsWrap.innerHTML = `<p class="empty-state">No posts.</p>`;
          if (myConnectionsWrap) myConnectionsWrap.innerHTML = `<p class="empty-state">No connections.</p>`;
          return;
        }
        // WhatsApp contact button
        if (profileWaBtn) {
          if (u?.wa) {
            profileWaBtn.style.display = "";

            profileWaBtn.onclick = () => {
              const phone = formatWaNumber(u.wa);
              if (!phone) {
                alert("No WhatsApp number available.");
                return;
              }

              const msg = encodeURIComponent("Hello, I viewed your profile on weSPACE.");
              window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
            };

          } else {
            profileWaBtn.style.display = "none";
          }
        }

        profileName && (profileName.textContent = u.name || "User");
        profileMeta && (profileMeta.textContent = `${u.campus || ""} • ${u.department || ""}`);
        profileUsername && (profileUsername.textContent = `@${u.username || "user"}`);
        if (profileAvatar) {
          if (u.photo_url) {
            profileAvatar.src = u.photo_url;
            profileAvatar.removeAttribute("data-no-photo");
          } else {
            profileAvatar.removeAttribute("src");
            profileAvatar.setAttribute("data-no-photo", "1");
          }
        }

        if (pAbout) pAbout.value = u.about || "";
        if (pSkills) pSkills.value = u.skills || "";
        if (pBdayDay) pBdayDay.value = u.bday_day || "";
        if (pBdayMonth) pBdayMonth.value = u.bday_month || "";
        if (pEdu) pEdu.value = u.education || "";
        if (pIG) pIG.value = u.ig || "";
        if (pX) pX.value = u.x || "";
        if (pWA) pWA.value = u.wa || "";
        if (pTT) pTT.value = u.tt || "";
      })();

      return;
    }

    // SELF MODE
    if (!sessionUser || !myProfile) {
      profileName && (profileName.textContent = "Guest");
      profileMeta && (profileMeta.textContent = "Not registered");
      profileUsername && (profileUsername.textContent = "@guest");
      profileAvatar?.removeAttribute("src");

      setDisabledProfileInputs(true);
      if (goRegisterBtn) goRegisterBtn.style.display = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (deleteAccountBtn) deleteAccountBtn.style.display = "none";
      if (visitShopBtn) visitShopBtn.style.display = "none";
      if (shareShopBtn) shareShopBtn.style.display = "none";
      return;
    }

    if (visitShopBtn) visitShopBtn.style.display = "";

    if (profileWaBtn) profileWaBtn.style.display = "none";

    setDisabledProfileInputs(false);

    profileName && (profileName.textContent = myProfile.name || "User");
    profileMeta && (profileMeta.textContent = `${myProfile.campus || ""} • ${myProfile.department || ""}`);
    profileUsername && (profileUsername.textContent = `@${myProfile.username || "user"}`);
    if (profileAvatar) {
      // ✅ Only set src if we have a real URL; otherwise let CSS background show
      if (myProfile.photo_url) {
        profileAvatar.src = myProfile.photo_url;
        profileAvatar.removeAttribute("data-no-photo");
      } else {
        profileAvatar.removeAttribute("src");
        profileAvatar.setAttribute("data-no-photo", "1");
      }
    }

    if (pAbout) pAbout.value = myProfile.about || "";
    if (pSkills) pSkills.value = myProfile.skills || "";
    if (pBdayDay) pBdayDay.value = myProfile.bday_day || "";
    if (pBdayMonth) pBdayMonth.value = myProfile.bday_month || "";
    if (pEdu) pEdu.value = myProfile.education || "";
    if (pIG) pIG.value = myProfile.ig || "";
    if (pX) pX.value = myProfile.x || "";
    if (pWA) pWA.value = myProfile.wa || "";
    if (pTT) pTT.value = myProfile.tt || "";

    if (goRegisterBtn) goRegisterBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "";
    if (deleteAccountBtn) deleteAccountBtn.style.display = "";
  }

  async function loadMyProfile() {
    if (!sessionUser) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", sessionUser.id).single();
    if (error) return null;
    return data;
  }

  async function saveProfile() {
    if (!sessionUser) return alert("Please log in first.");
    if (profileView.mode === "visitor") return;

    const updated = {
      about: pAbout?.value?.trim() || "",
      skills: pSkills?.value?.trim() || "",
      bday_day: pBdayDay?.value || "",
      bday_month: pBdayMonth?.value || "",
      education: pEdu?.value || "",
      ig: pIG?.value?.trim() || "",
      x: pX?.value?.trim() || "",
      wa: pWA?.value?.trim() || "",
      tt: pTT?.value?.trim() || "",
    };

    const { error } = await supabase.from("profiles").update(updated).eq("id", sessionUser.id);
    if (error) return alert(error.message || "Could not save profile.");

    myProfile = { ...myProfile, ...updated };
    renderProfileUI();
    alert("Profile saved ✅");
  }

  saveProfileBtn?.addEventListener("click", saveProfile);
  saveProfileBtn2?.addEventListener("click", saveProfile);

  async function uploadAvatar(userId, file) {
    const filePath = `${userId}/avatar.jpg`;
    try {
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });

      const { error: upErr } = await supabase.storage.from("avatars").upload(filePath, compressed, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (upErr) throw upErr;
    } catch (err) {
      console.error("Avatar upload error:", err);
      throw err;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const baseUrl = data?.publicUrl || "";
    // Add cache-buster so browser always loads the new version
    return baseUrl ? `${baseUrl}?t=${Date.now()}` : "";
  }

  changePhotoInput?.addEventListener("change", async () => {
    if (!sessionUser || profileView.mode === "visitor") return;
    const file = changePhotoInput.files?.[0];
    if (!file) return;

    try {
      // ✅ Show loading state
      if (profileAvatar) profileAvatar.style.opacity = "0.4";

      const url = await uploadAvatar(sessionUser.id, file);
      if (!url) throw new Error("Upload succeeded but no URL was returned. Check storage bucket policies.");

      const { error } = await supabase.from("profiles").update({ photo_url: url }).eq("id", sessionUser.id);
      if (error) throw error;

      myProfile = { ...myProfile, photo_url: url };
      if (profileAvatar) {
        profileAvatar.src = url;
        profileAvatar.style.opacity = "";
      }

      alert("Photo updated ✅");
    } catch (err) {
      console.error("changePhotoInput error:", err);
      if (profileAvatar) profileAvatar.style.opacity = "";
      alert("Could not update photo: " + (err?.message || "Unknown error"));
    } finally {
      changePhotoInput.value = "";
    }
  });

  // =========================
  // POSTS: CREATE
  // =========================
  async function uploadPostImages(userId, files) {
    const urls = [];
    for (const file of files) {
      try {
        // ✅ Compress before upload
        const compressed = await compressImage(file);
        const ext = "jpg"; // compressed is always jpeg
        const filePath = `${userId}/${crypto.randomUUID?.() || Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from("post-images").upload(filePath, compressed, { contentType: "image/jpeg" });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
        urls.push(data?.publicUrl || "");
      } catch (err) {
        console.error("Compression/Upload error:", err);
        // Fallback or skip
      }
    }
    return urls.filter(Boolean);
  }

  const openPostModal = () => {
    if (!sessionUser) {
      alert("Please log in to create a post ✅");
      window.location.href = "index.html";
      return;
    }
    if (postType) postType.value = "market";
    setCategoryOptions("market");
    setPriceVisibility("market");
    setApplyVisibility("market");
    if (previewStrip) previewStrip.innerHTML = "";
    if (previewEmpty) previewEmpty.style.display = "block";
    if (postWhatsApp) postWhatsApp.value = "";
    postModal?.classList.add("show");
  };

  const closePostModal = () => {
    postModal?.classList.remove("show");
    postForm?.reset();
    if (previewStrip) previewStrip.innerHTML = "";
    if (previewEmpty) previewEmpty.style.display = "block";
  };

  createPostBtn?.addEventListener("click", openPostModal);
  closePostBtn?.addEventListener("click", closePostModal);
  cancelPostBtn?.addEventListener("click", closePostModal);
  postModal?.addEventListener("click", (e) => {
    if (e.target === postModal) closePostModal();
  });

  postType?.addEventListener("change", () => {
    const t = postType.value || "market";
    setCategoryOptions(t);
    setPriceVisibility(t);
    setApplyVisibility(t);
  });

  postImages?.addEventListener("change", () => {

    const files = Array.from(postImages.files || []);

    console.log("Selected files:", files.length); // debug

    if (previewStrip) previewStrip.innerHTML = "";

    if (!files.length) {

      if (previewEmpty) previewEmpty.style.display = "block";

      return;

    }

    if (previewEmpty) previewEmpty.style.display = "none";

    files.forEach((file) => {

      const reader = new FileReader();

      reader.onload = () => {

        const img = document.createElement("img");

        img.src = reader.result;

        img.style.width = "70px";

        img.style.height = "70px";

        img.style.objectFit = "cover";

        img.style.borderRadius = "6px";

        previewStrip.appendChild(img);

      };

      reader.readAsDataURL(file);

    });

  });
  async function applyProfileVerifiedBadge(userId) {
    const badge = document.getElementById("profileVerifiedBadge");
    if (!badge) return;

    if (!userId) {
      badge.style.display = "none";
      return;
    }

    const { data, error } = await supabase
      .from("seller_verifications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      badge.style.display = "none";
      return;
    }

    badge.style.display = (data?.status === "approved") ? "inline-block" : "none";
  }

  postForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sessionUser || !myProfile) return alert("Please log in first.");

    const type = postType?.value || "market";
    const category = postCategory?.value || "";

    const description = postDesc?.value.trim();
    const price = type === "market" ? postPrice?.value.trim() || "" : "";
    const apply_link =
      (type === "opportunity" || type === "social")
        ? (applyLink?.value || "").trim()
        : "";
    const files = Array.from(postImages?.files || []);

    if (!description) return alert("Please enter a description.");
    if (!files.length) return alert("Please select at least one image.");

    const waRaw = (postWhatsApp?.value || "").trim() || (myProfile.wa || "").trim();
    const whatsapp = waRaw ? waRaw : "";

    const btn = document.getElementById("submitPostBtn");
    const oldText = btn ? btn.textContent : "Post";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Posting...";
      }

      const image_urls = await uploadPostImages(sessionUser.id, files.slice(0, 5));
      if ((type === "opportunity" || type === "social") && !apply_link) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText;
        }
        return alert("Please paste an apply link.");
      }

      const { error } = await supabase.from("posts").insert({
        author_id: sessionUser.id,
        type,
        category,

        description,
        price,
        apply_link,
        whatsapp,
        image_urls,
      });

      if (error) throw error;

      closePostModal();

      cachedPosts = await fetchPosts();
      cachedFeedItems = await fetchFeedItemsMixed();

      renderFeed(cachedFeedItems);
      renderMarket();
      renderOpps();
      renderSocials();

      window.scrollTo({ top: 0, behavior: "smooth" });
      alert("Posted ✅");
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    } catch (err) {
      console.error("post submit error:", err);
      alert(err.message || "Could not create post.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
  });

  // =========================
  // RESHARE: TOGGLE (post_reshares)
  // =========================
  async function toggleReshare(postId) {
    if (!sessionUser) return alert("Log in first ✅");
    if (!postId) return;

    const { data: existing, error: exErr } = await supabase
      .from("post_reshares")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    if (exErr) {
      console.error("reshare check error:", exErr);
      return alert(exErr.message || "Could not reshare.");
    }

    if (existing) {
      const { error } = await supabase
        .from("post_reshares")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", sessionUser.id);

      if (error) {
        console.error("un-reshare error:", error);
        return alert(error.message || "Could not undo reshare.");
      }
      alert("Reshare removed ✅");
    } else {
      const { error } = await supabase.from("post_reshares").insert({ post_id: postId, user_id: sessionUser.id });
      if (error) {
        console.error("reshare insert error:", error);
        return alert(error.message || "Could not reshare.");
      }
      alert("Reshared ✅");
    }

    // refresh everything including mixed feed
    cachedPosts = await fetchPosts();
    cachedFeedItems = await fetchFeedItemsMixed();

    renderFeed(cachedFeedItems);
    renderMarket();
    renderOpps();
    renderSocials();

    // if profile tab open
    const activePtab = document.querySelector(".profile-tab.active")?.dataset?.ptab;
    if (activeSectionId === "profile" && activePtab === "posts") {
      await renderProfilePostsList();
    }
  }
  /* ✅ Redundant scroll listener removed to prevent "movable" artifacting */

  // =========================
  // GLOBAL CLICKS (ONE CLEAN HANDLER)
  // =========================
  document.addEventListener("click", async (e) => {
    const applyBtn = e.target.closest("[data-action='apply-link']");
    if (applyBtn) {
      let url = applyBtn.getAttribute("data-url") || "";
      url = url.trim();
      if (!url) return;

      // add https:// if user pasted without it
      const safe = url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

      window.open(safe, "_blank", "noopener");
      return;
    }
    // Carousel dot/nav controls
    const dotBtn = e.target.closest("[data-action='carousel-dot']");
    const prevBtn = e.target.closest("[data-action='carousel-prev']");
    const nextBtn = e.target.closest("[data-action='carousel-next']");

    if (dotBtn || prevBtn || nextBtn) {
      const media = e.target.closest(".post-media");
      const track = media?.querySelector("[data-carousel-track='1']");
      if (!media || !track) return;

      const max = track.children.length - 1;
      let idx = getCarouselIndex(track);

      if (dotBtn) idx = Number(dotBtn.getAttribute("data-index") || "0");
      if (prevBtn) idx = Math.max(0, idx - 1);
      if (nextBtn) idx = Math.min(max, idx + 1);

      scrollCarouselTo(track, idx);
      setCarouselActive(media, idx);
      return;
    }
    shareShopBtn?.addEventListener("click", async () => {
      // visitor profile → share that user's shop
      if (profileView.mode === "visitor" && profileView.userId) {
        const link = getShopLinkForUserId(profileView.userId);
        await shareOrCopy(link);
        return;
      }

      // self → share my shop
      if (sessionUser?.id) {
        const link = getShopLinkForUserId(sessionUser.id);
        await shareOrCopy(link);
        return;
      }

      alert("Log in to share your shop link.");
    });
    // WhatsApp icon
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
    // ✅ Carousel dots click: jump to image (updated for transform)
    const dot = e.target.closest(".dot");
    if (dot) {
      const dotsWrap = dot.closest(".carousel-dots");
      const media = dot.closest(".post-media");
      const track = media?.querySelector(".post-media-track");
      if (!track || !dotsWrap) return;

      const idx = Number(dot.getAttribute("data-index") || 0);
      scrollCarouselTo(track, idx);
      setCarouselActive(media, idx);
      return;
    }

    // Visit shop button
    const shopBtn = e.target.closest("[data-action='visit-shop']");
    if (shopBtn) {
      const sellerId = shopBtn.getAttribute("data-sellerid");
      if (!sellerId) return;
      window.location.href = `shop.html?seller=${encodeURIComponent(sellerId)}`;
      return;
    }

    // More toggle
    const moreBtn = e.target.closest("[data-action='more']");
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

    // Connect button
    const cBtn = e.target.closest("[data-action='connect']");
    if (cBtn) {
      const targetId = cBtn.getAttribute("data-authorid") || "";
      await connectTo(targetId);
      return;
    }

    // Disconnect in connections list
    const dBtn = e.target.closest("[data-action='disconnect']");
    if (dBtn) {
      const targetId = dBtn.getAttribute("data-targetid") || "";
      await connectTo(targetId);
      return;
    }
    const nItem = e.target.closest(".notif-item");
    if (nItem) {
      const postId = nItem.getAttribute("data-postid");
      if (postId) {
        showSection("feed");
        // optional: scroll to post
        setTimeout(() => {
          const card = document.querySelector(`.post-card[data-postid="${postId}"]`);
          card?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
    // Delete post
    const delBtn = e.target.closest("[data-action='delete-post']");
    if (delBtn) {
      if (!sessionUser) return alert("Log in first ✅");
      if (profileView.mode === "visitor") return;

      const card = delBtn.closest(".post-card");
      const postId = card?.getAttribute("data-postid");
      const authorId = card?.getAttribute("data-authorid");
      const kind = card?.getAttribute("data-kind") || "post";

      if (!postId) return;

      const ok = confirm(`Delete this ${kind}? This cannot be undone.`);
      if (!ok) return;

      let error;
      if (kind === "reshare") {
        const { error: err } = await supabase
          .from("post_reshares")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", sessionUser.id);
        error = err;
      } else {
        if (authorId !== sessionUser.id) return alert("You can only delete your own post.");
        const { error: err } = await supabase.from("posts").delete().eq("id", postId);
        error = err;
      }

      if (error) return alert(error.message || `Could not delete ${kind}.`);

      cachedPosts = await fetchPosts();
      cachedFeedItems = await fetchFeedItemsMixed();

      renderFeed(cachedFeedItems);
      renderMarket();
      renderOpps();
      renderSocials();

      await renderProfilePostsList();
      alert("Deleted ✅");
      return;
    }

    // Like / Comment / Reshare
    const likeBtn = e.target.closest("[data-action='like']");
    const commentBtn = e.target.closest("[data-action='comment']");
    const reshareBtn = e.target.closest("[data-action='reshare']");

    const card = e.target.closest(".post-card");
    const postId = card?.getAttribute("data-postid");

    if ((likeBtn || commentBtn || reshareBtn) && !sessionUser) {
      alert("Log in first ✅");
      return;
    }

    if (likeBtn && postId) {
      // Guard: prevent double-tap firing
      if (likeBtn.dataset.liking === "1") return;
      likeBtn.dataset.liking = "1";

      // ── Optimistic instant UI update ─────────────────────────────
      // Read current state from the button itself (no network wait)
      const countEl = likeBtn.querySelector(".count");
      const isLiked = likeBtn.classList.contains("active");
      const currentCount = parseInt((countEl?.textContent || "").replace(/[()]/g, "") || "0", 10);
      const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

      // Flip state immediately — feels instant on mobile
      likeBtn.classList.toggle("active", !isLiked);
      if (countEl) countEl.textContent = `(${newCount})`;
      // ─────────────────────────────────────────────────────────────

      // Now do the real DB call (user never sees a wait)
      try {
        if (isLiked) {
          const { error } = await supabase.from("post_likes").delete()
            .eq("post_id", postId).eq("user_id", sessionUser.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("post_likes").insert(
            { post_id: postId, user_id: sessionUser.id }
          );
          if (error) throw error;
        }

        // Silently refresh cache in background — no DOM re-render
        fetchPosts().then(posts => {
          cachedPosts = posts;
          return fetchFeedItemsMixed();
        }).then(items => {
          cachedFeedItems = items;
        }).catch(() => { });

      } catch (err) {
        // Roll back the optimistic update on failure
        likeBtn.classList.toggle("active", isLiked);
        if (countEl) countEl.textContent = `(${currentCount})`;
        console.error("like error:", err);
      } finally {
        likeBtn.dataset.liking = "0";
      }
      return;
    }

    if (reshareBtn && postId) {
      await toggleReshare(postId);
      return;
    }

    if (commentBtn && postId) {
      const wrap = card.querySelector(".post-comments");
      if (!wrap) return;

      const isOpen = wrap.style.display !== "none";
      if (isOpen) {
        wrap.style.display = "none";
        wrap.innerHTML = "";
        return;
      }

      wrap.style.display = "block";
      wrap.innerHTML = `<div class="empty-state">Loading comments…</div>`;

      const { data: comments, error } = await supabase
        .from("post_comments")
        .select("id, text, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        wrap.innerHTML = `<div class="empty-state">Could not load comments.</div>`;
        return;
      }

      const listHtml = (comments || [])
        .map(
          (c) => `
        <div class="comment-row">
          <div class="comment-text">${escapeHtml(c.text)}</div>
          <div class="comment-time">${new Date(c.created_at).toLocaleString()}</div>
        </div>
      `
        )
        .join("");

      wrap.innerHTML = `
        <div class="comment-box">
          <input class="comment-input" type="text" placeholder="Write a comment…" />
          <button class="btn primary comment-send" type="button">Send</button>
        </div>
        <div class="comment-list">
          ${listHtml || `<div class="empty-state">No comments yet.</div>`}
        </div>
      `;

      const input = wrap.querySelector(".comment-input");
      const send = wrap.querySelector(".comment-send");

      send?.addEventListener("click", async () => {
        const text = (input?.value || "").trim();
        if (!text) return;

        const { error: cErr } = await supabase.from("post_comments").insert({ post_id: postId, user_id: sessionUser.id, text });
        if (cErr) return alert(cErr.message || "Could not comment.");

        input.value = "";

        cachedPosts = await fetchPosts();
        cachedFeedItems = await fetchFeedItemsMixed();

        renderFeed(cachedFeedItems);
        renderMarket();
        renderOpps();
        renderSocials();

        alert("Comment added ✅");
      });

      return;
    }

    // Visitor profile open by clicking avatar/name
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
          returnScrollY: window.scrollY || 0,
        });
        showSection("profile");
        openPTab("about");
      }
      return;
    }
  });

visitShopBtn?.addEventListener("click", () => {
    // visitor profile: always view-only
    if (profileView.mode === "visitor" && profileView.userId) {
      window.location.href = `shop.html?seller=${encodeURIComponent(profileView.userId)}`;
      return;
    }
    // owner: open in manage mode
    if (profileView.mode === "self" && sessionUser) {
      window.location.href = `shop.html?seller=${encodeURIComponent(sessionUser.id)}&mode=manage`;
      return;
    }
    verifySellerBtn?.addEventListener("click", (e) => {

      if (profileView.mode === "visitor") {
        e.preventDefault();
        return;
      }

      window.location.href = "/verify.html";

    });

    // self profile: open manage mode
    if (sessionUser?.id) {
      window.location.href = `shop.html?seller=${encodeURIComponent(sessionUser.id)}&mode=manage`;
      return;
    }

    alert("Log in to view your shop.");
  });

  // =========================
  // AUTH ACTIONS
  // =========================
  goRegisterBtn?.addEventListener("click", () => (window.location.href = "register/"));

  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    sessionUser = null;
    myProfile = null;
    myConnectionSet = new Set();
    setProfileMode({ mode: "self", userId: null });
    renderProfileUI();
    alert("Logged out ✅");
  });

  deleteAccountBtn?.addEventListener("click", async () => {
    if (!sessionUser) return alert("Log in first ✅");

    const ok = confirm("Delete your account? This cannot be undone.");
    if (!ok) return;

    let shouldRedirect = false;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData?.session?.access_token;
      if (!access) return alert("Session expired. Please log in again.");

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${access}` },
      });

      console.log("delete-account:", { data, error });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Delete failed.");

      shouldRedirect = true;

      // Try sign out (but don't allow it to block redirect)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("signOut failed (ignoring):", e);
      }

      // reset app state
      sessionUser = null;
      myProfile = null;
      myConnectionSet = new Set();
      if (typeof myResharedSet !== "undefined") myResharedSet = new Set();
      cachedPosts = [];
      cachedFeedItems = [];
      setProfileMode({ mode: "self", userId: null });

      alert("Account deleted ✅");
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + (err?.message || "Unknown error"));
    } finally {
      if (shouldRedirect) {
        // ✅ guaranteed redirect
        setTimeout(() => window.location.replace("index.html"), 50);
      }
    }
  });

  // =========================
  // INIT (REPLACE your whole current init block with this)
  // =========================

  let notifChannel = null;
  let bootInProgress = false;
  let pendingBoot = false;

  function setupNotifRealtime() {
    if (!sessionUser) return;

    if (notifChannel) {
      supabase.removeChannel(notifChannel);
      notifChannel = null;
    }

    notifChannel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${sessionUser.id}`,
        },
        () => refreshNotifBadge()
      )
      .subscribe();
  }

  async function bootForCurrentSession() {
    // if a boot is already running, schedule one more run and exit
    if (bootInProgress) {
      pendingBoot = true;
      return;
    }

    bootInProgress = true;

    try {
      // 0) If logged in, load minimal identity FIRST so UI won't show Guest
      if (sessionUser) {
        try {
          myProfile = await loadMyProfile(); // this is the key fix
        } catch (e) {
          console.warn("loadMyProfile failed:", e);
          // still continue; at least sessionUser exists
        }
      } else {
        myProfile = null;
        myConnectionSet = new Set();
        setProfileMode({ mode: "self", userId: null });
      }

      // 1) Render immediately (now it should show logged-in correctly)
      setProfileMode({ mode: "self", userId: null });
      renderProfileUI();

      showSection("feed");
      if (bottomButtons.length) setBottomActive(bottomButtons[0]);
      if (tabButtons.length) setTabActive(tabButtons[0]);

      if (postType) {
        postType.value = "market";
        setCategoryOptions("market");
        setPriceVisibility("market");
      }

      // 2) Load FEED first
      try {
        cachedFeedItems = await fetchFeedItemsMixed();
        renderFeed(cachedFeedItems);

        cachedPosts = await fetchPosts();   // ✅ add
      } catch (e) {
        console.warn("fetchFeedItemsMixed failed:", e);
      }

      // 3) Defer the rest
      queueMicrotask(async () => {
        try {
          if (sessionUser) {
            await Promise.allSettled([
              loadMyConnections(),
              loadShopOwners(),
              loadVerifiedSellers(),
            ]);
          } else {
            await Promise.allSettled([
              loadShopOwners(),
              loadVerifiedSellers(),
            ]);
          }

          renderProfileUI();
          renderMarket();
          renderOpps();
          renderSocials();

          setupNotifRealtime();
          await refreshNotifBadge();
        } catch (e) {
          console.warn("deferred boot failed:", e);
        }
      });
    } finally {
      bootInProgress = false;

      // if something changed while booting (login/logout), run once more
      if (pendingBoot) {
        pendingBoot = false;
        bootForCurrentSession();
      }
    }
  }


  async function init() {
    // initial session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.warn("getSession error:", error);

    sessionUser = session?.user || null;
    authReady = true; // explicitly mark as ready

    await bootForCurrentSession();

    // keep synced on login/logout
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      sessionUser = newSession?.user || null;
      await bootForCurrentSession();
    });
  }

  // call once to start everything
  init();

  // ==========================================
  // 🚀 TAB SUSPENSION / WAKE UP FIX (V2)
  // ==========================================
  // Using getSession() directly on wake can freeze the UI if the client is corrupted.
  // Instead, use Supabase's non-blocking auto-refresh toggles.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("Tab resumed: Starting Supabase Auto-Refresh...");
      supabase.auth.startAutoRefresh();

      // If logged in, safely reconnect the realtime sockets if they dropped
      if (sessionUser) {
        setupNotifRealtime();
      }
    } else {
      console.log("Tab hidden: Stopping Supabase Auto-Refresh to prevent hanging...");
      supabase.auth.stopAutoRefresh();
    }
  });

  // Also trigger a refresh when the device regains network connection
  window.addEventListener("online", () => {
    supabase.auth.startAutoRefresh();
    if (sessionUser) setupNotifRealtime();
  });

  // Desktop fix: sometimes switching windows doesn't trigger visibilitychange
  window.addEventListener("focus", () => {
    console.log("Window focused: Starting Supabase Auto-Refresh...");
    supabase.auth.startAutoRefresh();
    if (sessionUser) setupNotifRealtime();
  });

  // LIGHTBOX LOGIC
  const openLightbox = (src) => {
    if (!imageLightbox || !lightboxImg) return;
    lightboxImg.src = src;
    imageLightbox.classList.add("show");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // disable scroll
  };

  const closeLightboxFunc = () => {
    if (!imageLightbox) return;
    imageLightbox.classList.remove("show");
    imageLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // enable scroll
  };

  // Delegate click on FEED_LIST for images
  FEED_LIST?.addEventListener("click", (ev) => {
    const img = ev.target.closest(".post-media-item img");
    if (img) {
      openLightbox(img.src);
    }
  });

  // Delegate click on other lists for images (Market, Opps, Socials, Profile)
  [marketList, oppsList, socialList, myPostsWrap, document.getElementById("visitorProfileBody")].forEach(list => {
    list?.addEventListener("click", (ev) => {
      const img = ev.target.closest(".post-media-item img");
      if (img) {
        openLightbox(img.src);
      }
    });
  });

  closeLightbox?.addEventListener("click", closeLightboxFunc);
  imageLightbox?.addEventListener("click", (ev) => {
    if (ev.target === imageLightbox) closeLightboxFunc();
  });

  // Escape key to close
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeLightboxFunc();
  });

})

