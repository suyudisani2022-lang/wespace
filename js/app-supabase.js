// js/app-supabase.js
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================
  // STATE
  // =========================
  let sessionUser = null;
  let authReady = false;

  async function initAuth() {
    if (authReady) return;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error("getSession error:", error);
    sessionUser = session?.user ?? null;
    authReady = true;
  }

  await initAuth();

  // =========================
  // ELEMENTS
  // =========================
  const sections = document.querySelectorAll(".section");
  const profileWaBtn = document.getElementById("profileWaBtn");
  const notifBtn = document.getElementById("notifBtn");
  const catBtn = document.getElementById("catBtn");
  const catModal = document.getElementById("catModal");
  const catActiveDot = document.getElementById("catActiveDot");

  const FEED_LIST = document.getElementById("feedList");
  const marketList = document.getElementById("marketList");
  const oppsList = document.getElementById("oppsList");
  const socialList = document.getElementById("socialList");

  const marketFilter = document.getElementById("marketFilter");
  const oppsFilter = document.getElementById("oppsFilter");

  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileMeta = document.getElementById("profileMeta");
  const profileUsername = document.getElementById("profileUsername");

  const goRegisterBtn = document.getElementById("goRegisterBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const visitShopBtn = document.getElementById("visitShopBtn");
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

  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const closeLightbox = document.getElementById("closeLightbox");

  let verifiedSellerSet = new Set();

  async function loadVerifiedSellers() {
    const { data, error } = await supabase
      .from("seller_verifications")
      .select("user_id")
      .eq("status", "approved");
    if (error) { verifiedSellerSet = new Set(); return; }
    verifiedSellerSet = new Set((data || []).map(r => r.user_id));
  }

  verifySellerBtn?.addEventListener("click", () => {
    if (profileView.mode === "visitor") return;
    window.location.href = "/verify.html";
  });

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
    showSection("feed");
    if (!q) { renderFeedProductGrid(); closeSearchModal(); return; }
    const filtered = cachedFeedProducts.filter(p => {
      const hay = `${p.product_name} ${p.description} ${p.shop?.shop_name} ${p.shop?.category} ${p.shop?.city}`.toLowerCase();
      return hay.includes(q);
    });
    if (!FEED_LIST) { closeSearchModal(); return; }
    if (!filtered.length) {
      FEED_LIST.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;">No products found for "${escapeHtml(q)}"</div>`;
    } else {
      FEED_LIST.innerHTML = filtered.map(p => {
        let imgUrl = "";
        if (Array.isArray(p.image_paths) && p.image_paths.length) imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_paths[0]).data.publicUrl;
        else if (p.image_path) imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_path).data.publicUrl;
        return `<div class="feed-prod-card" data-action="open-product" data-productid="${escapeHtml(p.id)}">
          <div class="feed-prod-img-wrap">
            ${imgUrl ? `<img class="feed-prod-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.product_name)}" loading="lazy" />` : `<div class="feed-prod-img" style="display:flex;align-items:center;justify-content:center;font-size:32px;">🖼️</div>`}
            ${p.price_text ? `<span class="feed-prod-price-badge">${escapeHtml(p.price_text)}</span>` : ""}
            ${p.verified ? `<span class="feed-prod-verified">✔ Verified</span>` : ""}
          </div>
          <div class="feed-prod-body">
            <div class="feed-prod-name">${escapeHtml(p.product_name || "")}</div>
            <div class="feed-prod-shop">🏪 ${escapeHtml(p.shop?.shop_name || "Shop")}</div>
          </div>
        </div>`;
      }).join("");
    }
    closeSearchModal();
  };

  applySearch?.addEventListener("click", runSearch);
  searchInput?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") runSearch(); });
  clearSearch?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    renderFeedProductGrid();
    closeSearchModal();
  });

  const setApplyVisibility = (type) => {
    if (!applyLinkWrap) return;
    const show = type === "opportunity" || type === "social";
    applyLinkWrap.style.display = show ? "block" : "none";
    if (!show && applyLink) applyLink.value = "";
  };

  // =========================
  // NOTIFICATIONS
  // =========================
  const notifPanel = document.getElementById("notifPanel");
  const closeNotif = document.getElementById("closeNotif");

  notifBtn?.addEventListener("click", async () => {
    notifPanel?.classList.toggle("show");
    if (!notifPanel?.classList.contains("show")) return;
    if (!sessionUser) { notifPanel.innerHTML = `<div class="empty-state">Log in to see notifications.</div>`; return; }
    notifPanel.innerHTML = `<div class="empty-state">Loading…</div>`;
    const list = await fetchNotifications();
    if (!list.length) { notifPanel.innerHTML = `<div class="empty-state">No notifications yet.</div>`; return; }
    notifPanel.innerHTML = list.map(n => {
      const when = new Date(n.created_at).toLocaleString();
      const unread = !n.read_at;
      const who = n.actor_name || "Someone";
      const title = n.post_title ? `"${escapeHtml(n.post_title)}"` : "";
      let msg = "Notification";
      if (n.type === "connect") msg = `${escapeHtml(who)} connected with you`;
      if (n.type === "comment") msg = `${escapeHtml(who)} commented on your post ${title}`;
      if (n.type === "reshare") msg = `${escapeHtml(who)} reshared your post ${title}`;
      if (n.type === "new_post") msg = `New post from ${escapeHtml(who)} ${title}`;
      if (n.type === "new_reshare") msg = `${escapeHtml(who)} reshared something ${title}`;
      const avatar = n.actor_photo
        ? `<img class="notif-avatar" src="${escapeHtml(n.actor_photo)}" alt="avatar" />`
        : `<div class="notif-avatar fallback">👤</div>`;
      return `<div class="notif-item ${unread ? "unread" : ""}" data-nid="${n.id}" data-postid="${n.post_id || ""}">
        ${avatar}<div class="notif-body"><div class="notif-text">${msg}</div><div class="notif-time">${when}</div></div></div>`;
    }).join("");
    const unreadIds = list.filter(x => !x.read_at).map(x => x.id);
    await markNotificationsRead(unreadIds);
    await refreshNotifBadge();
  });

  async function markNotificationsRead(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (!sessionUser || unique.length === 0) return;
    const { error } = await supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unique).eq("user_id", sessionUser.id);
    if (error) console.error("markNotificationsRead error:", error);
  }

  // =========================
  // SCROLL HIDE/SHOW NAV
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

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (y <= 0) { setNavHidden(false); lastY = y; return; }
    if (delta > threshold) { setNavHidden(true); lastY = y; return; }
    if (delta < -threshold) { setNavHidden(false); lastY = y; return; }
  }, { passive: true });

  // =========================
  // STATE VARS
  // =========================
  function requireUser() { return sessionUser?.id ? sessionUser : null; }
  let myProfile = null;
  let activeSectionId = "feed";
  let cachedPosts = [];
  let cachedFeedItems = [];
  let myConnectionSet = new Set();
  let shopOwnerSet = new Set();

  const profileView = { mode: "self", userId: null, returnSection: "profile", returnScrollY: 0 };

  // =========================
  // HELPERS
  // =========================
  const escapeHtml = (str) =>
    String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function setCarouselActive(mediaEl, activeIndex) {
    const dotsWrap = mediaEl?.querySelector(".carousel-dots");
    if (!dotsWrap) return;
    Array.from(dotsWrap.querySelectorAll(".dot")).forEach((d, i) => d.classList.toggle("active", i === activeIndex));
  }

  function getShopLinkForUserId(uid) {
    return `${window.location.origin}/shop.html?seller=${encodeURIComponent(uid)}`;
  }

  async function shareOrCopy(text) {
    if (navigator.share) {
      try { await navigator.share({ title: "weSPACE Shop", text, url: text }); return true; } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Shop link copied ✅");
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
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
    trackEl.scrollTo({ left: index * trackEl.offsetWidth, behavior: "smooth" });
  }

  const formatWaNumber = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "";
    let n = v.replace(/[^\d+]/g, "");
    if (n.startsWith("+")) n = n.slice(1);
    if (n.startsWith("0")) n = "234" + n.slice(1);
    return n;
  };

  async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width, height = img.height;
          if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
          else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            else reject(new Error("Canvas toBlob failed"));
          }, "image/jpeg", quality);
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
    const { data, error } = await supabase.from("notifications_view").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
    if (error) { console.error("fetchNotifications error:", error); return []; }
    return data || [];
  }

  async function loadShopOwners() {
    const { data, error } = await supabase.from("shop_catalogues").select("seller_id");
    if (error) { shopOwnerSet = new Set(); return; }
    shopOwnerSet = new Set((data || []).map((r) => r.seller_id));
  }

  const setDisabledProfileInputs = (disabled) => {
    ["pAbout","pSkills","pBdayDay","pBdayMonth","pEdu","pIG","pX","pWA","pTT"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = disabled; el.readOnly = disabled;
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
    if (visitorBackBtn) visitorBackBtn.style.display = profileView.mode === "visitor" ? "inline-flex" : "none";
    if (verifySellerBtn) verifySellerBtn.style.display = profileView.mode === "visitor" ? "none" : "inline-flex";
  };

  const showSection = async (id) => {
    activeSectionId = id;
    if (!authReady) await initAuth();
    sections.forEach((s) => s.classList.remove("active-section"));
    document.getElementById(id)?.classList.add("active-section");
    if (id === "feed") renderFeed();
    if (id === "market") renderMarket();
    if (id === "opportunities") renderOpps();
    if (id === "socials") renderSocials();
    if (id === "profile") renderProfileUI();
  };

  function ensureNotifBadge() {
    if (!notifBtn) return null;
    notifBtn.style.position = "relative";
    let badge = document.getElementById("notifBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "notifBadge"; badge.className = "notif-badge";
      notifBtn.appendChild(badge);
    }
    return badge;
  }

  async function fetchUnreadNotifCount() {
    if (!sessionUser) return 0;
    const { count, error } = await supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sessionUser.id).is("read_at", null);
    if (error) return 0;
    return Number(count || 0);
  }

  async function refreshNotifBadge() {
    const badge = ensureNotifBadge();
    if (!badge) return;
    if (!sessionUser) { badge.style.display = "none"; return; }
    const unread = await fetchUnreadNotifCount();
    if (unread <= 0) { badge.style.display = "none"; return; }
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.style.display = "flex";
  }

  // =========================
  // NAVS
  // =========================
  const bottomButtons = document.querySelectorAll(".bottom-nav button");
  const tabButtons = document.querySelectorAll(".tab-btn");

  const setBottomActive = (btn) => { bottomButtons.forEach((b) => b.classList.remove("active")); btn.classList.add("active"); };
  const setTabActive = (btn) => { tabButtons.forEach((b) => b.classList.remove("active")); btn.classList.add("active"); };

  const mapSection = (label) => {
    const key = (label || "").toLowerCase().trim();
    return ({ feed: "feed", market: "market", opportunities: "opportunities", socials: "socials", shops: "socials", profile: "profile" }[key] || "feed");
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
    market: ["Phones & Gadgets","Fashion & Textiles","Shoes & Bags","Perfumes & Beauty","Food & Snacks","Books & Materials","Services","Hostel & Apartment","Electronics","Others"],
    opportunity: ["Grants & Funding","Scholars","Job","Training","Internship","Others"],
    social: ["kwari market","farm centre","singa market","sabon gari","wambai"],
  };

  const setCategoryOptions = (type) => {
    if (!postCategory) return;
    postCategory.innerHTML = (CATEGORY_MAP[type] || []).map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  };

  const setPriceVisibility = (type) => {
    if (!priceWrap) return;
    if (type === "market") priceWrap.style.display = "block";
    else { priceWrap.style.display = "none"; if (postPrice) postPrice.value = ""; }
  };

  marketFilter && (marketFilter.innerHTML = `<option value="">All categories</option>` +
    CATEGORY_MAP.market.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));
  oppsFilter && (oppsFilter.innerHTML = `<option value="">All types</option>` +
    CATEGORY_MAP.opportunity.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));

  marketFilter?.addEventListener("change", renderMarket);
  oppsFilter?.addEventListener("change", renderOpps);

  // =========================
  // POST CARD RENDER
  // =========================
  const connectBtnHTML = (authorId) => "";

  const visitShopHTML = (p) => {
    if (p.type !== "market") return "";
    if (!p.author_id) return "";
    return `<button class="visit-shop-btn" type="button" data-action="visit-shop" data-sellerid="${p.author_id}">🛒 Visit Shop</button>`;
  };

  const postMediaHTML = (post) => {
    const images = Array.isArray(post.image_urls) ? post.image_urls : [];
    if (!images.length) return "";
    const wa = post.type === "market" ? String(post.whatsapp || "").trim() : "";
    const hasMany = images.length > 1;
    return `
    <div class="post-media" data-carousel="1">
      <div class="post-media-track" data-carousel-track="1">
        ${images.map((src, i) => `<div class="post-media-item" data-idx="${i}"><img src="${escapeHtml(src)}" alt="Post image ${i + 1}" loading="lazy"></div>`).join("")}
      </div>
      ${wa ? `<button type="button" class="post-wa-icon" data-action="contact" data-phone="${escapeHtml(wa)}" data-title="${escapeHtml((post.description || "").slice(0, 40))}" aria-label="Contact on WhatsApp" title="Contact on WhatsApp"><img src="/assets/whatsapp.png" alt="WhatsApp"></button>` : ""}
      ${hasMany ? `<div class="carousel-dots" data-carousel-dots="1">${images.map((_, i) => `<button class="dot ${i === 0 ? "active" : ""}" type="button" data-action="carousel-dot" data-index="${i}" aria-label="Photo ${i + 1}"></button>`).join("")}</div>
        <button class="carousel-nav prev" type="button" data-action="carousel-prev" aria-label="Previous photo">‹</button>
        <button class="carousel-nav next" type="button" data-action="carousel-next" aria-label="Next photo">›</button>` : ""}
      ${post.type === "market" && post.price ? `<div class="post-price-badge">${escapeHtml(post.price)}</div>`
        : ((post.type === "opportunity" || post.type === "social") && post.apply_link
          ? `<button class="post-apply-badge" type="button" data-action="apply-link" data-url="${escapeHtml(post.apply_link)}">Apply</button>` : "")}
    `;
  };

  const renderPostCard = (p, opts = {}) => {
    const { showDelete = false, feedMeta = null } = opts;
    const isReshare = Boolean(feedMeta?.isReshare);
    const resharedByMe = isReshare && sessionUser && feedMeta?.reshared_by === sessionUser.id;
    const fullDesc = p.description || "";
    const short = fullDesc.length > 170 ? fullDesc.slice(0, 170) + "…" : fullDesc;
    const deleteBtn = showDelete && sessionUser && (p.author_id === sessionUser.id || resharedByMe)
      ? `<button class="danger mini-del" data-action="delete-post" type="button">Delete</button>` : "";
    const likesCount = Number(p.likes_count || 0);
    const commentsCount = Number(p.comments_count || 0);
    const resharesCount = Number(p.reshares_count || 0);
    const reshareBanner = isReshare
      ? `<div class="reshare-banner">🔁 ${resharedByMe ? "You reshared" : escapeHtml(feedMeta?.reshared_by_name || "Someone reshared")}</div>` : "";
    return `
  <article class="post-card" data-postid="${p.id}" data-authorid="${p.author_id}" data-kind="${isReshare ? 'reshare' : 'post'}">
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
          <div class="name-right">${connectBtnHTML(p.author_id)}${visitShopHTML(p)}${deleteBtn}</div>
        </div>
        <div class="sub-row">${escapeHtml(p.author_campus || "")}${p.author_department ? " • " + escapeHtml(p.author_department) : ""}</div>
      </div>
    </div>
    <div class="post-body">
      <div class="post-text" data-full="${escapeHtml(fullDesc)}" data-short="${escapeHtml(short)}" data-expanded="0">
        ${escapeHtml(short)} <button class="more-toggle" data-action="more" type="button">…more</button>
      </div>
      ${postMediaHTML(p)}
    </div>
    <div class="post-actions">
      <button type="button" data-action="like" ${sessionUser ? "" : "disabled"}>👍 <span class="btn-label">Like</span> <span class="count">(${likesCount})</span></button>
      <button type="button" data-action="comment" ${sessionUser ? "" : "disabled"}>💬 <span class="btn-label">Comment</span> <span class="count">(${commentsCount})</span></button>
      <button type="button" data-action="reshare" ${sessionUser ? "" : "disabled"}>🔁 <span class="btn-label">Reshare</span> <span class="count">(${resharesCount})</span></button>
    </div>
    <div class="post-comments" style="display:none;"></div>
  </article>`;
  };

  // ── FLASH SALES ──
  let activeFlashCat = "";

  function renderFlashCard(p) {
    let imgUrl = "";
    if (Array.isArray(p.image_paths) && p.image_paths.length) imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_paths[0]).data.publicUrl;
    else if (p.image_path) imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_path).data.publicUrl;
    else if (Array.isArray(p.image_urls) && p.image_urls.length) imgUrl = p.image_urls[0];

    const salePrice = p.price_text || p.price || "";
    const origPrice = p.original_price || "";
    const discount = origPrice && salePrice ? Math.round((1 - parseFloat(String(salePrice).replace(/[^\d.]/g,"")) / parseFloat(String(origPrice).replace(/[^\d.]/g,""))) * 100) : 0;
    const endsAt = p.flash_ends_at ? new Date(p.flash_ends_at) : null;
    const hoursLeft = endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 3600000)) : null;
    const shopName = p.shop?.shop_name || p.author_name || "Shop";

    return `
      <div class="flash-card" data-action="open-product" data-productid="${escapeHtml(p.id)}">
        <div class="flash-img-wrap">
          ${imgUrl ? `<img class="flash-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.product_name || p.description || "")}" loading="lazy" />` : `<div class="flash-img" style="display:flex;align-items:center;justify-content:center;font-size:32px;">⚡</div>`}
          ${discount > 0 ? `<span class="flash-discount-badge">-${discount}%</span>` : ""}
          ${hoursLeft !== null ? `<span class="flash-timer">⏱ ${hoursLeft}h left</span>` : ""}
        </div>
        <div class="flash-body">
          <div class="flash-name">${escapeHtml(p.product_name || p.description || "Flash Deal")}</div>
          <div class="flash-prices">
            <span class="flash-sale-price">${escapeHtml(salePrice)}</span>
            ${origPrice ? `<span class="flash-orig-price">${escapeHtml(origPrice)}</span>` : ""}
          </div>
          <div class="flash-shop">🏪 ${escapeHtml(shopName)}</div>
        </div>
      </div>`;
  }

  function renderMarket() {
    if (!marketList) return;

    // Filter: flash sale posts (type=market) + shop products marked as flash
    let flashItems = [];

    // From posts (type=market with price)
    const marketPosts = cachedPosts.filter(p => p.type === "market" && p.price);
    flashItems = marketPosts.map(p => ({
      id: p.id, product_name: p.description?.slice(0, 60), description: p.description,
      price_text: p.price, original_price: p.original_price || "",
      image_urls: p.image_urls, image_paths: null, image_path: null,
      flash_ends_at: p.flash_ends_at || null,
      author_name: p.author_name, shop: null,
    }));

    // Also from feed products marked as flash
    const flashProds = cachedFeedProducts.filter(p => p.is_flash || p.original_price);
    flashItems = [...flashItems, ...flashProds.map(p => ({ ...p }))];

    if (activeFlashCat) flashItems = flashItems.filter(p => p.category === activeFlashCat || p.shop?.category === activeFlashCat);

    if (!flashItems.length) {
      marketList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 16px;color:#64748b;"><div style="font-size:40px;margin-bottom:10px;">⚡</div><div style="font-weight:700;color:#0f172a;margin-bottom:4px;">No flash sales right now</div><div style="font-size:13px;">Check back soon for deals</div></div>`;
      return;
    }
    marketList.innerHTML = flashItems.map(p => renderFlashCard(p)).join("");
  }

  // Flash filter chips
  document.getElementById("flashFilterBar")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".flash-chip");
    if (!chip) return;
    document.querySelectorAll(".flash-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeFlashCat = chip.dataset.cat || "";
    renderMarket();
  });

  // ── COMMUNITY ──
  function renderOpps() {
    if (!oppsList) return;

    // Show all post types except market — social posts, opportunities, announcements
    const posts = cachedPosts.filter(p => p.type !== "market");

    if (!posts.length) {
      oppsList.innerHTML = `<div style="text-align:center;padding:60px 16px;color:#64748b;"><div style="font-size:40px;margin-bottom:10px;">📢</div><div style="font-weight:700;color:#0f172a;margin-bottom:4px;">No community posts yet</div><div style="font-size:13px;">Be the first to post!</div></div>`;
      return;
    }

    oppsList.innerHTML = posts.map(p => {
      const typeLabels = { opportunity: "💼 Opportunity", social: "📣 Announcement", community: "📢 Community", event: "📅 Event", tip: "💡 Tip" };
      const label = typeLabels[p.type] || p.type || "Post";
      const img = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : "";
      const wa = formatWaNumber(p.whatsapp || "");
      return `
        <div class="comm-card">
          <span class="comm-card-type">${label}</span>
          <div class="comm-card-desc">${escapeHtml(p.description || "")}</div>
          ${img ? `<img class="comm-card-img" src="${escapeHtml(img)}" alt="Post" loading="lazy" />` : ""}
          <div class="comm-card-footer">
            <span class="comm-card-author">📍 ${escapeHtml(p.author_name || "Community")} • ${new Date(p.created_at).toLocaleDateString()}</span>
            ${wa ? `<button class="comm-card-wa" data-action="contact" data-phone="${escapeHtml(wa)}" data-title="${escapeHtml((p.description||"").slice(0,40))}">WhatsApp</button>` : ""}
          </div>
          ${p.apply_link ? `<a href="${escapeHtml(p.apply_link)}" target="_blank" rel="noopener" style="display:block;margin-top:8px;background:#eff6ff;color:#2563eb;padding:8px;border-radius:8px;text-align:center;font-size:13px;font-weight:700;text-decoration:none;">🔗 Learn More / Apply</a>` : ""}
        </div>`;
    }).join("");
  }

  // =========================
  // CATEGORIES MODAL
  // =========================
  let activeFeedCat = "";

  function openCatModal() {
    if (!catModal) return;
    catModal.classList.add("show");
    catModal.setAttribute("aria-hidden", "false");
    // highlight active
    catModal.querySelectorAll(".cat-item").forEach(item => {
      item.classList.toggle("active", item.dataset.cat === activeFeedCat);
    });
  }
  function closeCatModal() {
    if (!catModal) return;
    catModal.classList.remove("show");
    catModal.setAttribute("aria-hidden", "true");
  }

  catBtn?.addEventListener("click", openCatModal);
  catModal?.addEventListener("click", (e) => { if (e.target === catModal) closeCatModal(); });

  catModal?.querySelectorAll(".cat-item").forEach(item => {
    item.addEventListener("click", () => {
      activeFeedCat = item.dataset.cat || "";
      catActiveDot?.classList.toggle("show", !!activeFeedCat);
      closeCatModal();
      renderFeedProductGrid();
      showSection("feed");
    });
  });

  document.getElementById("catClear")?.addEventListener("click", () => {
    activeFeedCat = "";
    catActiveDot?.classList.remove("show");
    closeCatModal();
    renderFeedProductGrid();
    showSection("feed");
  });

  // =========================
  // FEED PRODUCT GRID
  // =========================
  let cachedFeedProducts = [];
  let feedProductsLoaded = false;

  async function loadFeedProducts() {
    const { data: products, error } = await supabase
      .from("shop_products").select("*")
      .order("created_at", { ascending: false }).limit(120);
    if (error) { console.error("loadFeedProducts error:", error); cachedFeedProducts = []; return; }

    const sellerIds = [...new Set((products || []).map(p => p.seller_id))];
    let shopMap = {};
    if (sellerIds.length) {
      const { data: shops } = await supabase.from("shops").select("*").in("seller_id", sellerIds);
      (shops || []).forEach(s => { shopMap[s.seller_id] = s; });
    }

    cachedFeedProducts = (products || []).map(p => ({
      ...p,
      shop: shopMap[p.seller_id] || null,
      verified: verifiedSellerSet.has(p.seller_id),
    }));
    feedProductsLoaded = true;
  }

  function renderFeedProductGrid() {
    if (!FEED_LIST) return;
    let list = activeFeedCat
      ? cachedFeedProducts.filter(p => p.shop?.category === activeFeedCat)
      : cachedFeedProducts;

    // Shuffle for discovery
    list = [...list].sort(() => Math.random() - 0.5);

    if (!list.length) {
      FEED_LIST.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 16px;color:#64748b;"><div style="font-size:40px;margin-bottom:10px;">🛍️</div><div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${activeFeedCat ? "No products in this category yet" : "No products yet"}</div></div>`;
      return;
    }

    FEED_LIST.innerHTML = list.map(p => {
      let imgUrl = "";
      if (Array.isArray(p.image_paths) && p.image_paths.length) {
        imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_paths[0]).data.publicUrl;
      } else if (p.image_path) {
        imgUrl = supabase.storage.from("shop-products").getPublicUrl(p.image_path).data.publicUrl;
      }
      const shopName = p.shop?.shop_name || "Shop";
      return `
        <div class="feed-prod-card" data-action="open-product" data-productid="${escapeHtml(p.id)}">
          <div class="feed-prod-img-wrap">
            ${imgUrl ? `<img class="feed-prod-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.product_name)}" loading="lazy" />` : `<div class="feed-prod-img" style="display:flex;align-items:center;justify-content:center;font-size:32px;">🖼️</div>`}
            ${p.price_text ? `<span class="feed-prod-price-badge">${escapeHtml(p.price_text)}</span>` : ""}
            ${p.verified ? `<span class="feed-prod-verified">✔ Verified</span>` : ""}
          </div>
          <div class="feed-prod-body">
            <div class="feed-prod-name">${escapeHtml(p.product_name || "")}</div>
            <div class="feed-prod-shop">🏪 ${escapeHtml(shopName)}</div>
          </div>
        </div>`;
    }).join("");
  }

  async function renderFeed() {
    if (!FEED_LIST) return;
    if (!feedProductsLoaded) {
      FEED_LIST.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;">Loading products…</div>`;
      await loadVerifiedSellers();
      await loadFeedProducts();
    }
    renderFeedProductGrid();
  }

  // =========================
  // SHOPS DIRECTORY
  // =========================
  let cachedShops = [];
  let shopsLoaded = false;
  let activeShopCity = "";
  let activeShopCat = "";

  async function loadShopsDirectory() {
    const { data: shops, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
    if (error) { console.error("loadShopsDirectory error:", error); cachedShops = []; return; }
    const sellerIds = (shops || []).map(s => s.seller_id);
    let productCounts = {};
    if (sellerIds.length) {
      const { data: counts } = await supabase.from("shop_products").select("seller_id").in("seller_id", sellerIds);
      (counts || []).forEach(r => { productCounts[r.seller_id] = (productCounts[r.seller_id] || 0) + 1; });
    }
    cachedShops = (shops || []).map(s => ({ ...s, productCount: productCounts[s.seller_id] || 0, verified: verifiedSellerSet.has(s.seller_id) }));
    shopsLoaded = true;
  }

  function renderShopsGrid() {
    if (!socialList) return;
    let list = cachedShops;
    if (activeShopCity) list = list.filter(s => s.city === activeShopCity);
    if (activeShopCat) list = list.filter(s => s.category === activeShopCat);
    if (!list.length) {
      socialList.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px 16px;text-align:center;"><div style="font-size:36px;margin-bottom:8px;">🏪</div><div style="font-weight:700;color:#0f172a;margin-bottom:4px;">No shops found</div><div style="font-size:13px;color:#64748b;">Try a different city or category</div></div>`;
      return;
    }
    socialList.innerHTML = list.map(shop => {
      const loc = [shop.city, shop.market].filter(Boolean).join(" • ");
      return `
        <div class="shop-dir-card">
          <div data-action="open-shop" data-sellerid="${escapeHtml(shop.seller_id)}" style="cursor:pointer;">
            ${shop.banner_url ? `<img class="shop-dir-banner" src="${escapeHtml(shop.banner_url)}" alt="banner" loading="lazy" />` : `<div class="shop-dir-banner-placeholder">🏪</div>`}
            <div class="shop-dir-body">
              ${shop.verified ? `<span class="shop-dir-verified">✔ Verified</span>` : ""}
              ${shop.logo_url ? `<img class="shop-dir-logo" src="${escapeHtml(shop.logo_url)}" alt="logo" loading="lazy" />` : `<div class="shop-dir-logo-placeholder">🏬</div>`}
              <div class="shop-dir-name">${escapeHtml(shop.shop_name || "Shop")}</div>
              ${loc ? `<div class="shop-dir-location">📍 ${escapeHtml(loc)}</div>` : ""}
              ${shop.category ? `<div class="shop-dir-cat">${escapeHtml(shop.category)}</div>` : ""}
              <div class="shop-dir-footer">
                <div class="shop-dir-products">${shop.productCount} product${shop.productCount !== 1 ? "s" : ""}</div>
                <button class="shop-visit-profile-btn" data-action="view-seller-profile" data-sellerid="${escapeHtml(shop.seller_id)}" type="button">👤 Profile</button>
              </div>
            </div>
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

  document.getElementById("cityFilterBar")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".shop-filter-chip");
    if (!chip) return;
    document.querySelectorAll("#cityFilterBar .shop-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeShopCity = chip.dataset.city || "";
    renderShopsGrid();
  });

  document.getElementById("categoryFilterBar")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".shop-filter-chip");
    if (!chip) return;
    document.querySelectorAll("#categoryFilterBar .shop-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeShopCat = chip.dataset.cat || "";
    renderShopsGrid();
  });

  // =========================
  // =========================
  // PROFILE TABS
  // =========================
  const tabsNav = document.querySelector(".profile-tabs");
  const panels = Array.from(document.querySelectorAll(".profile-panel"));

  const openPTab = (key) => {
    document.querySelectorAll(".profile-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.ptab === key));
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
    pBdayDay.innerHTML = `<option value="">Day</option>` +
      Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  }
  fillBirthdayDays();

  async function fetchProfileById(id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) return null;
    return data;
  }

  // =========================
  // DATA: POSTS
  // =========================
  async function fetchPosts() {
    const { data: posts, error } = await supabase.from("posts_with_stats").select("*")
      .order("created_at", { ascending: false }).limit(80);
    if (error) { console.error("fetchPosts error:", error); return []; }
    const authorIds = [...new Set((posts || []).map((p) => p.author_id))];
    if (!authorIds.length) return posts || [];
    const { data: profs, error: pErr } = await supabase.from("profiles")
      .select("id, name, campus, department, photo_url, username").in("id", authorIds);
    if (pErr) { console.error("profiles fetch error:", pErr); return posts || []; }
    const byId = new Map((profs || []).map((x) => [x.id, x]));
    return (posts || []).map((p) => {
      const a = byId.get(p.author_id);
      return { ...p, author_name: a?.name || "User", author_campus: a?.campus || "", author_department: a?.department || "", author_photo_url: a?.photo_url || "", author_username: a?.username || "" };
    });
  }

  async function fetchFeedItemsMixed() {
    const posts = cachedPosts?.length ? cachedPosts : await fetchPosts();
    const { data: rs, error: rErr } = await supabase.from("post_reshares").select("post_id, user_id, created_at")
      .order("created_at", { ascending: false }).limit(80);
    if (rErr || !rs?.length) return posts.map((p) => ({ kind: "post", sort_time: p.created_at, post: p, reshared_by: null, reshared_by_name: null, reshared_at: null }));
    const postById = new Map(posts.map((p) => [p.id, p]));
    const resharedUserIds = [...new Set(rs.map((r) => r.user_id))];
    const { data: resharedProfiles } = await supabase.from("profiles").select("id, name, username").in("id", resharedUserIds);
    const resharedById = new Map((resharedProfiles || []).map((u) => [u.id, u]));
    const feedReshares = rs.map((r) => {
      const post = postById.get(r.post_id);
      if (!post) return null;
      const u = resharedById.get(r.user_id);
      const displayName = u?.name ? u.name : u?.username ? `@${u.username}` : "Reshared";
      return { kind: "reshare", sort_time: r.created_at, post, reshared_by: r.user_id, reshared_by_name: displayName, reshared_at: r.created_at };
    }).filter(Boolean);
    const feedPosts = posts.map((p) => ({ kind: "post", sort_time: p.created_at, post: p, reshared_by: null, reshared_by_name: null, reshared_at: null }));
    return [...feedReshares, ...feedPosts].sort((a, b) => new Date(b.sort_time) - new Date(a.sort_time));
  }

  // =========================
  // PROFILE POSTS LIST
  // =========================
  async function renderProfilePostsList() {
    if (!myPostsWrap) return;
    const whoId = profileView.mode === "visitor" ? profileView.userId : sessionUser?.id;
    if (!whoId) { myPostsWrap.innerHTML = `<p class="empty-state">Log in to see posts.</p>`; return; }
    const { data: posts, error } = await supabase.from("posts_with_stats").select("*").eq("author_id", whoId).order("created_at", { ascending: false });
    if (error) { myPostsWrap.innerHTML = `<p class="empty-state">Could not load posts.</p>`; return; }
    const { data: rs } = await supabase.from("post_reshares").select("post_id, user_id, created_at").eq("user_id", whoId).order("created_at", { ascending: false }).limit(100);
    const prof = profileView.mode === "visitor" ? await fetchProfileById(whoId) : myProfile;
    const mapAuthor = (p) => ({ ...p, author_name: p.author_name || prof?.name || "User", author_campus: p.author_campus || prof?.campus || "", author_department: p.author_department || prof?.department || "", author_photo_url: p.author_photo_url || prof?.photo_url || "" });
    const originalsMapped = (posts || []).map(mapAuthor);
    let resharedCards = [];
    const resharedIds = [...new Set((rs || []).map((x) => x.post_id))].filter(Boolean);
    if (resharedIds.length) {
      const { data: resharedPosts } = await supabase.from("posts_with_stats").select("*").in("id", resharedIds);
      if (resharedPosts) {
        const authorIds = [...new Set(resharedPosts.map((p) => p.author_id))];
        const { data: profs } = await supabase.from("profiles").select("id, name, campus, department, photo_url, username").in("id", authorIds);
        const byId = new Map((profs || []).map((x) => [x.id, x]));
        const postById = new Map(resharedPosts.map((p) => { const a = byId.get(p.author_id); return [p.id, { ...p, author_name: a?.name || "User", author_campus: a?.campus || "", author_department: a?.department || "", author_photo_url: a?.photo_url || "" }]; }));
        resharedCards = (rs || []).map((r) => {
          const post = postById.get(r.post_id);
          if (!post) return null;
          return { post, meta: { isReshare: true, reshared_by: whoId, reshared_by_name: prof?.name || "Reshared", reshared_at: r.created_at }, sort: r.created_at };
        }).filter(Boolean).sort((a, b) => new Date(b.sort) - new Date(a.sort));
      }
    }
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
  // CONNECTIONS
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
    if (!targetId || targetId === sessionUser.id) return;
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
    cachedPosts = await fetchPosts();
    
    renderFeed(); renderMarket(); renderOpps(); renderSocials();
    const activePtab = document.querySelector(".profile-tab.active")?.dataset?.ptab;
    if (activeSectionId === "profile" && profileView.mode === "self" && activePtab === "connections") await renderConnectionsList();
  }

  async function renderConnectionsList() {
    if (!myConnectionsWrap) return;
    const whoId = profileView.mode === "visitor" ? profileView.userId : sessionUser?.id;
    if (!whoId) { myConnectionsWrap.innerHTML = `<p class="empty-state">Log in to see connections.</p>`; return; }
    const { data: rows, error } = await supabase.from("connections").select("target_id").eq("user_id", whoId);
    if (error) { myConnectionsWrap.innerHTML = `<p class="empty-state">Could not load connections.</p>`; return; }
    const ids = (rows || []).map((r) => r.target_id);
    if (!ids.length) { myConnectionsWrap.innerHTML = `<p class="empty-state">No connections yet.</p>`; return; }
    const { data: people, error: pErr } = await supabase.from("profiles").select("id, name, username, campus, department, photo_url").in("id", ids);
    if (pErr) { myConnectionsWrap.innerHTML = `<p class="empty-state">Could not load users.</p>`; return; }
    myConnectionsWrap.innerHTML = (people || []).map((u) => `
      <div class="connection-card">
        <div class="connection-left">
          <img src="${escapeHtml(u.photo_url || "")}" alt="avatar" loading="lazy"/>
          <div>
            <div class="connection-name">${escapeHtml(u.name || "User")}</div>
            <div class="connection-meta">@${escapeHtml(u.username || "user")} • ${escapeHtml(u.campus || "")} • ${escapeHtml(u.department || "")}</div>
          </div>
        </div>
        ${profileView.mode === "self" && sessionUser ? `<button class="btn ghost" type="button" data-action="disconnect" data-targetid="${u.id}">Remove</button>` : ""}
      </div>`).join("");
  }

  // =========================
  // PROFILE UI
  // =========================
  function renderProfileUI() {
    if (profileView.mode === "visitor" && profileView.userId) {
      setDisabledProfileInputs(true);
      if (goRegisterBtn) goRegisterBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (deleteAccountBtn) deleteAccountBtn.style.display = "none";
      if (profileWaBtn) profileWaBtn.style.display = "";
      if (changePhotoWrap) changePhotoWrap.style.display = "none";
      if (visitShopBtn) visitShopBtn.style.display = "";
      if (shareShopBtn) shareShopBtn.style.display = "";
      (async () => {
        const u = await fetchProfileById(profileView.userId);
        if (!u) {
          if (profileName) profileName.textContent = "User not found";
          if (profileMeta) profileMeta.textContent = "Maybe deleted";
          if (profileUsername) profileUsername.textContent = "@unknown";
          profileAvatar?.removeAttribute("src");
          return;
        }
        if (profileWaBtn) {
          if (u?.wa) {
            profileWaBtn.style.display = "";
            profileWaBtn.onclick = () => {
              const phone = formatWaNumber(u.wa);
              if (!phone) { alert("No WhatsApp number available."); return; }
              window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Hello, I viewed your profile on weSPACE.")}`, "_blank");
            };
          } else { profileWaBtn.style.display = "none"; }
        }
        if (profileName) profileName.textContent = u.name || "User";
        if (profileMeta) profileMeta.textContent = `${u.campus || ""} • ${u.department || ""}`;
        if (profileUsername) profileUsername.textContent = `@${u.username || "user"}`;
        if (profileAvatar) {
          if (u.photo_url) { profileAvatar.src = u.photo_url; profileAvatar.removeAttribute("data-no-photo"); }
          else { profileAvatar.removeAttribute("src"); profileAvatar.setAttribute("data-no-photo", "1"); }
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
    if (!sessionUser || !myProfile) {
      if (profileName) profileName.textContent = "Guest";
      if (profileMeta) profileMeta.textContent = "Not registered";
      if (profileUsername) profileUsername.textContent = "@guest";
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
    if (profileName) profileName.textContent = myProfile.name || "User";
    if (profileMeta) profileMeta.textContent = `${myProfile.campus || ""} • ${myProfile.department || ""}`;
    if (profileUsername) profileUsername.textContent = `@${myProfile.username || "user"}`;
    if (profileAvatar) {
      if (myProfile.photo_url) { profileAvatar.src = myProfile.photo_url; profileAvatar.removeAttribute("data-no-photo"); }
      else { profileAvatar.removeAttribute("src"); profileAvatar.setAttribute("data-no-photo", "1"); }
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
      about: pAbout?.value?.trim() || "", skills: pSkills?.value?.trim() || "",
      bday_day: pBdayDay?.value || "", bday_month: pBdayMonth?.value || "",
      education: pEdu?.value || "", ig: pIG?.value?.trim() || "",
      x: pX?.value?.trim() || "", wa: pWA?.value?.trim() || "", tt: pTT?.value?.trim() || "",
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
    const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
    const { error: upErr } = await supabase.storage.from("avatars").upload(filePath, compressed, { upsert: true, contentType: "image/jpeg" });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const baseUrl = data?.publicUrl || "";
    return baseUrl ? `${baseUrl}?t=${Date.now()}` : "";
  }

  changePhotoInput?.addEventListener("change", async () => {
    if (!sessionUser || profileView.mode === "visitor") return;
    const file = changePhotoInput.files?.[0];
    if (!file) return;
    try {
      if (profileAvatar) profileAvatar.style.opacity = "0.4";
      const url = await uploadAvatar(sessionUser.id, file);
      if (!url) throw new Error("Upload succeeded but no URL returned.");
      const { error } = await supabase.from("profiles").update({ photo_url: url }).eq("id", sessionUser.id);
      if (error) throw error;
      myProfile = { ...myProfile, photo_url: url };
      if (profileAvatar) { profileAvatar.src = url; profileAvatar.style.opacity = ""; }
      alert("Photo updated ✅");
    } catch (err) {
      if (profileAvatar) profileAvatar.style.opacity = "";
      alert("Could not update photo: " + (err?.message || "Unknown error"));
    } finally { changePhotoInput.value = ""; }
  });

  // =========================
  // POSTS: CREATE
  // =========================
  async function uploadPostImages(userId, files) {
    const urls = [];
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const filePath = `${userId}/${crypto.randomUUID?.() || Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(filePath, compressed, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
        urls.push(data?.publicUrl || "");
      } catch (err) { console.error("Upload error:", err); }
    }
    return urls.filter(Boolean);
  }

  const openPostModal = () => {
    if (!sessionUser) { alert("Please log in to create a post ✅"); window.location.href = "index.html"; return; }
    // Reset to feed post type
    document.querySelectorAll(".post-type-pill").forEach(p => p.classList.remove("active"));
    document.querySelector(".post-type-pill[data-type='feed']")?.classList.add("active");
    const postTypeInput = document.getElementById("postType");
    if (postTypeInput) postTypeInput.value = "feed";
    document.getElementById("flashSaleFields").style.display = "none";
    document.getElementById("communityFields").style.display = "none";
    const previewStrip = document.getElementById("imagePreviewStrip");
    const previewEmpty = document.getElementById("imagePreviewEmpty");
    if (previewStrip) { previewStrip.innerHTML = ""; previewStrip.style.display = "none"; }
    if (previewEmpty) previewEmpty.style.display = "block";
    const postWhatsApp = document.getElementById("postWhatsApp");
    if (postWhatsApp) postWhatsApp.value = "";
    postModal?.classList.add("show");
    postModal?.setAttribute("aria-hidden", "false");
  };

  const closePostModal = () => {
    postModal?.classList.remove("show");
    postModal?.setAttribute("aria-hidden", "true");
    postForm?.reset();
    const previewStrip = document.getElementById("imagePreviewStrip");
    const previewEmpty = document.getElementById("imagePreviewEmpty");
    if (previewStrip) { previewStrip.innerHTML = ""; previewStrip.style.display = "none"; }
    if (previewEmpty) previewEmpty.style.display = "block";
  };

  createPostBtn?.addEventListener("click", openPostModal);
  closePostBtn?.addEventListener("click", closePostModal);
  cancelPostBtn?.addEventListener("click", closePostModal);
  postModal?.addEventListener("click", (e) => { if (e.target === postModal) closePostModal(); });

  // Post type pills
  document.querySelectorAll(".post-type-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".post-type-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const type = pill.dataset.type;
      const postTypeInput = document.getElementById("postType");
      if (postTypeInput) postTypeInput.value = type;
      document.getElementById("flashSaleFields").style.display = type === "flash" ? "block" : "none";
      document.getElementById("communityFields").style.display = type === "community" ? "block" : "none";
      // Show apply link for community opportunity type
      const commType = document.getElementById("communityType");
      commType?.addEventListener("change", () => {
        const applyWrap = document.getElementById("applyLinkWrap");
        if (applyWrap) applyWrap.style.display = commType.value === "opportunity" ? "block" : "none";
      });
    });
  });

  // Image upload with preview
  const postImagesInput = document.getElementById("postImages");
  document.getElementById("postImgUpload")?.addEventListener("click", (e) => {
    if (e.target.closest("#imagePreviewStrip")) return;
    postImagesInput?.click();
  });

  postImagesInput?.addEventListener("change", () => {
    const files = Array.from(postImagesInput.files || []);
    const previewStrip = document.getElementById("imagePreviewStrip");
    const previewEmpty = document.getElementById("imagePreviewEmpty");
    if (!files.length) { if (previewEmpty) previewEmpty.style.display = "block"; if (previewStrip) previewStrip.style.display = "none"; return; }
    if (previewEmpty) previewEmpty.style.display = "none";
    if (previewStrip) { previewStrip.style.display = "flex"; previewStrip.innerHTML = ""; }
    files.slice(0, 5).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement("img");
        img.src = reader.result;
        previewStrip.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  postForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sessionUser || !myProfile) return alert("Please log in first.");
    const postTypeVal = document.getElementById("postType")?.value || "feed";
    const description = document.getElementById("postDesc")?.value.trim();
    const files = Array.from(document.getElementById("postImages")?.files || []);
    if (!description && !files.length) return alert("Add a caption or at least one image.");
    const waRaw = (document.getElementById("postWhatsApp")?.value || "").trim() || (myProfile.wa || "").trim();

    // Map pill types to DB post types
    let dbType = "social";
    let price = "";
    let original_price = "";
    let flash_ends_at = null;
    let category = "";
    let apply_link = "";

    if (postTypeVal === "flash") {
      dbType = "market";
      price = document.getElementById("postPrice")?.value.trim() || "";
      original_price = document.getElementById("postOriginalPrice")?.value.trim() || "";
      category = document.getElementById("flashCategory")?.value || "";
      const hours = parseInt(document.getElementById("flashDuration")?.value || "0");
      if (hours > 0) flash_ends_at = new Date(Date.now() + hours * 3600000).toISOString();
    } else if (postTypeVal === "community") {
      dbType = document.getElementById("communityType")?.value || "social";
      apply_link = document.getElementById("applyLink")?.value.trim() || "";
    }

    const btn = document.getElementById("submitPostBtn");
    const oldText = btn?.textContent || "Post";
    try {
      if (btn) { btn.disabled = true; btn.textContent = "Posting..."; }
      const image_urls = files.length ? await uploadPostImages(sessionUser.id, files.slice(0, 5)) : [];
      const { error } = await supabase.from("posts").insert({
        author_id: sessionUser.id, type: dbType, category,
        description: description || "", price, apply_link, whatsapp: waRaw,
        image_urls, original_price, flash_ends_at,
      });
      if (error) throw error;
      closePostModal();
      cachedPosts = await fetchPosts();
      renderFeed(); renderMarket(); renderOpps(); renderSocials();
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert("Posted ✅");
    } catch (err) {
      console.error("post submit error:", err);
      alert(err.message || "Could not create post.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
  });

  // =========================
  // RESHARE
  // =========================
  async function toggleReshare(postId) {
    if (!sessionUser) return alert("Log in first ✅");
    if (!postId) return;
    const { data: existing, error: exErr } = await supabase.from("post_reshares").select("post_id").eq("post_id", postId).eq("user_id", sessionUser.id).maybeSingle();
    if (exErr) return alert(exErr.message || "Could not reshare.");
    if (existing) {
      const { error } = await supabase.from("post_reshares").delete().eq("post_id", postId).eq("user_id", sessionUser.id);
      if (error) return alert(error.message || "Could not undo reshare.");
      alert("Reshare removed ✅");
    } else {
      const { error } = await supabase.from("post_reshares").insert({ post_id: postId, user_id: sessionUser.id });
      if (error) return alert(error.message || "Could not reshare.");
      alert("Reshared ✅");
    }
    cachedPosts = await fetchPosts();
    
    renderFeed(); renderMarket(); renderOpps(); renderSocials();
    const activePtab = document.querySelector(".profile-tab.active")?.dataset?.ptab;
    if (activeSectionId === "profile" && activePtab === "posts") await renderProfilePostsList();
  }

  // =========================
  // GLOBAL CLICK HANDLER
  // =========================
  document.addEventListener("click", async (e) => {
    // Apply link
    const applyBtn = e.target.closest("[data-action='apply-link']");
    if (applyBtn) {
      let url = (applyBtn.getAttribute("data-url") || "").trim();
      if (!url) return;
      window.open(url.startsWith("http") ? url : `https://${url}`, "_blank", "noopener");
      return;
    }

    // Carousel controls
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

    // WhatsApp contact
    const waBtn = e.target.closest("[data-action='contact']");
    if (waBtn) {
      const phone = formatWaNumber(waBtn.getAttribute("data-phone") || "");
      const title = waBtn.getAttribute("data-title") || "";
      if (!phone) return alert("No WhatsApp number for this post.");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, I saw your post on weSPACE: ${title}`)}`, "_blank");
      return;
    }

    // Carousel dot
    const dot = e.target.closest(".dot");
    if (dot) {
      const media = dot.closest(".post-media");
      const track = media?.querySelector(".post-media-track");
      if (!track) return;
      scrollCarouselTo(track, Number(dot.getAttribute("data-index") || 0));
      setCarouselActive(media, Number(dot.getAttribute("data-index") || 0));
      return;
    }

    // Visit shop from post
    const shopBtn = e.target.closest("[data-action='visit-shop']");
    if (shopBtn) {
      const sellerId = shopBtn.getAttribute("data-sellerid");
      if (sellerId) window.location.href = `shop.html?seller=${encodeURIComponent(sellerId)}`;
      return;
    }

    // View seller profile from shop card
    const profBtn = e.target.closest("[data-action='view-seller-profile']");
    if (profBtn) {
      e.stopPropagation();
      const sellerId = profBtn.dataset.sellerid;
      if (!sellerId) return;
      const modal = document.getElementById("visitorProfileModal");
      const body = document.getElementById("visitorProfileBody");
      if (!modal || !body) return;
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
      body.innerHTML = `<div style="text-align:center;padding:30px;color:#64748b;">Loading…</div>`;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", sellerId).maybeSingle();
      const { data: shop } = await supabase.from("shops").select("*").eq("seller_id", sellerId).maybeSingle();
      const { data: verif } = await supabase.from("seller_verifications").select("status").eq("user_id", sellerId).maybeSingle();
      const verified = verif?.status === "approved";
      const wa = formatWaNumber(shop?.whatsapp || prof?.wa || "");
      body.innerHTML = `
        <div class="visitor-profile-card">
          <div class="visitor-prof-head">
            ${prof?.photo_url ? `<img class="visitor-prof-avatar" src="${escapeHtml(prof.photo_url)}" alt="avatar" />` : `<div class="visitor-prof-avatar" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:#f1f5f9;">👤</div>`}
            <div>
              <div class="visitor-prof-name">${escapeHtml(prof?.name || "Shop Owner")} ${verified ? `<span style="background:#dcfce7;color:#15803d;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:700;">✔ Verified</span>` : ""}</div>
              <div class="visitor-prof-username">@${escapeHtml(prof?.username || "user")}</div>
              ${shop?.shop_name ? `<div style="font-size:12px;color:#2563eb;font-weight:700;margin-top:2px;">🏪 ${escapeHtml(shop.shop_name)}</div>` : ""}
            </div>
          </div>
          ${prof?.about ? `<div class="visitor-prof-about">${escapeHtml(prof.about)}</div>` : ""}
          <div class="visitor-prof-socials">
            ${prof?.ig ? `<a class="visitor-social-link" href="https://instagram.com/${prof.ig.replace('@','')}" target="_blank">📸 ${escapeHtml(prof.ig)}</a>` : ""}
            ${prof?.x ? `<a class="visitor-social-link" href="https://x.com/${prof.x.replace('@','')}" target="_blank">🐦 ${escapeHtml(prof.x)}</a>` : ""}
            ${prof?.tt ? `<a class="visitor-social-link" href="https://tiktok.com/@${prof.tt.replace('@','')}" target="_blank">🎵 ${escapeHtml(prof.tt)}</a>` : ""}
          </div>
          ${wa ? `<button class="visitor-wa-btn" onclick="window.open('https://wa.me/${wa}?text=${encodeURIComponent('Hello! I saw your shop on weSPACE.')}','_blank')">
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" style="width:18px;" alt="WA"> Chat on WhatsApp
          </button>` : ""}
          <button style="width:100%;margin-top:8px;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;"
            onclick="window.location.href='shop.html?seller=${sellerId}'">
            🛒 Visit Shop
          </button>
        </div>`;
      return;
    }

    // Close visitor profile modal
    document.getElementById("closeVisitorProfile")?.addEventListener("click", () => {
      const modal = document.getElementById("visitorProfileModal");
      modal?.classList.remove("show");
      modal?.setAttribute("aria-hidden", "true");
    });

    // Open product detail page
    const prodCard = e.target.closest("[data-action='open-product']");
    if (prodCard) {
      const productId = prodCard.dataset.productid;
      if (productId) window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
      return;
    }

    // Open shop from directory
    const shopCard = e.target.closest("[data-action='open-shop']");
    if (shopCard) {
      const sellerId = shopCard.dataset.sellerid;
      if (sellerId) window.location.href = `shop.html?seller=${encodeURIComponent(sellerId)}`;
      return;
    }

    // More toggle
    const moreBtn = e.target.closest("[data-action='more']");
    if (moreBtn) {
      const wrap = moreBtn.closest(".post-text");
      if (!wrap) return;
      const expanded = wrap.getAttribute("data-expanded") === "1";
      if (expanded) {
        wrap.innerHTML = `${wrap.getAttribute("data-short")} <button class="more-toggle" data-action="more" type="button">…more</button>`;
        wrap.setAttribute("data-expanded", "0");
      } else {
        wrap.innerHTML = `${wrap.getAttribute("data-full")} <button class="more-toggle" data-action="more" type="button">less</button>`;
        wrap.setAttribute("data-expanded", "1");
      }
      return;
    }

    // Connect
    const cBtn = e.target.closest("[data-action='connect']");
    if (cBtn) { await connectTo(cBtn.getAttribute("data-authorid") || ""); return; }

    // Disconnect
    const dBtn = e.target.closest("[data-action='disconnect']");
    if (dBtn) { await connectTo(dBtn.getAttribute("data-targetid") || ""); return; }

    // Notification click
    const nItem = e.target.closest(".notif-item");
    if (nItem) {
      const postId = nItem.getAttribute("data-postid");
      if (postId) {
        showSection("feed");
        setTimeout(() => { document.querySelector(`.post-card[data-postid="${postId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      }
      return;
    }

    // Delete post
    const delBtn = e.target.closest("[data-action='delete-post']");
    if (delBtn) {
      if (!sessionUser || profileView.mode === "visitor") return;
      const card = delBtn.closest(".post-card");
      const postId = card?.getAttribute("data-postid");
      const authorId = card?.getAttribute("data-authorid");
      const kind = card?.getAttribute("data-kind") || "post";
      if (!postId || !confirm(`Delete this ${kind}?`)) return;
      let error;
      if (kind === "reshare") {
        ({ error } = await supabase.from("post_reshares").delete().eq("post_id", postId).eq("user_id", sessionUser.id));
      } else {
        if (authorId !== sessionUser.id) return alert("You can only delete your own post.");
        ({ error } = await supabase.from("posts").delete().eq("id", postId));
      }
      if (error) return alert(error.message || `Could not delete ${kind}.`);
      cachedPosts = await fetchPosts();
      
      renderFeed(); renderMarket(); renderOpps(); renderSocials();
      await renderProfilePostsList();
      alert("Deleted ✅");
      return;
    }

    // Like
    const likeBtn = e.target.closest("[data-action='like']");
    const commentBtn = e.target.closest("[data-action='comment']");
    const reshareBtn = e.target.closest("[data-action='reshare']");
    const card = e.target.closest(".post-card");
    const postId = card?.getAttribute("data-postid");

    if ((likeBtn || commentBtn || reshareBtn) && !sessionUser) { alert("Log in first ✅"); return; }

    if (likeBtn && postId) {
      if (likeBtn.dataset.liking === "1") return;
      likeBtn.dataset.liking = "1";
      const countEl = likeBtn.querySelector(".count");
      const isLiked = likeBtn.classList.contains("active");
      const currentCount = parseInt((countEl?.textContent || "").replace(/[()]/g, "") || "0", 10);
      const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
      likeBtn.classList.toggle("active", !isLiked);
      if (countEl) countEl.textContent = `(${newCount})`;
      try {
        if (isLiked) {
          const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", sessionUser.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: sessionUser.id });
          if (error) throw error;
        }
        fetchPosts().then(posts => { cachedPosts = posts; }).catch(() => {});
      } catch (err) {
        likeBtn.classList.toggle("active", isLiked);
        if (countEl) countEl.textContent = `(${currentCount})`;
        console.error("like error:", err);
      } finally { likeBtn.dataset.liking = "0"; }
      return;
    }

    if (reshareBtn && postId) { await toggleReshare(postId); return; }

    if (commentBtn && postId) {
      const wrap = card.querySelector(".post-comments");
      if (!wrap) return;
      if (wrap.style.display !== "none") { wrap.style.display = "none"; wrap.innerHTML = ""; return; }
      wrap.style.display = "block";
      wrap.innerHTML = `<div class="empty-state">Loading comments…</div>`;
      const { data: comments, error } = await supabase.from("post_comments").select("id, text, created_at, user_id").eq("post_id", postId).order("created_at", { ascending: true });
      if (error) { wrap.innerHTML = `<div class="empty-state">Could not load comments.</div>`; return; }
      wrap.innerHTML = `
        <div class="comment-box"><input class="comment-input" type="text" placeholder="Write a comment…" /><button class="btn primary comment-send" type="button">Send</button></div>
        <div class="comment-list">${(comments || []).map((c) => `<div class="comment-row"><div class="comment-text">${escapeHtml(c.text)}</div><div class="comment-time">${new Date(c.created_at).toLocaleString()}</div></div>`).join("") || `<div class="empty-state">No comments yet.</div>`}</div>`;
      const input = wrap.querySelector(".comment-input");
      wrap.querySelector(".comment-send")?.addEventListener("click", async () => {
        const text = (input?.value || "").trim();
        if (!text) return;
        const { error: cErr } = await supabase.from("post_comments").insert({ post_id: postId, user_id: sessionUser.id, text });
        if (cErr) return alert(cErr.message || "Could not comment.");
        input.value = "";
        cachedPosts = await fetchPosts(); 
        renderFeed(); renderMarket(); renderOpps(); renderSocials();
        alert("Comment added ✅");
      });
      return;
    }

    // Visitor profile open
    const avatarTap = e.target.closest(".avatar-img");
    const nameTap = e.target.closest(".poster-name");
    if (avatarTap || nameTap) {
      const cardTap = e.target.closest(".post-card");
      const authorIdTap = cardTap?.getAttribute("data-authorid");
      if (authorIdTap) {
        setProfileMode({ mode: "visitor", userId: authorIdTap, returnSection: activeSectionId || "feed", returnScrollY: window.scrollY || 0 });
        showSection("profile");
        openPTab("about");
      }
      return;
    }
  });

  // =========================
  // VISIT SHOP & SHARE SHOP
  // =========================
  visitShopBtn?.addEventListener("click", () => {
    if (profileView.mode === "visitor" && profileView.userId) {
      window.location.href = `shop.html?seller=${encodeURIComponent(profileView.userId)}`;
      return;
    }
    if (profileView.mode === "self" && sessionUser) {
      window.location.href = `shop.html?seller=${encodeURIComponent(sessionUser.id)}&mode=manage`;
      return;
    }
    alert("Log in to view your shop.");
  });

  shareShopBtn?.addEventListener("click", async () => {
    if (profileView.mode === "visitor" && profileView.userId) {
      await shareOrCopy(getShopLinkForUserId(profileView.userId)); return;
    }
    if (sessionUser?.id) { await shareOrCopy(getShopLinkForUserId(sessionUser.id)); return; }
    alert("Log in to share your shop link.");
  });

  // =========================
  // AUTH ACTIONS
  // =========================
  goRegisterBtn?.addEventListener("click", () => (window.location.href = "register/"));

  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    sessionUser = null; myProfile = null; myConnectionSet = new Set();
    setProfileMode({ mode: "self", userId: null });
    renderProfileUI();
    alert("Logged out ✅");
  });

  deleteAccountBtn?.addEventListener("click", async () => {
    if (!sessionUser) return alert("Log in first ✅");
    if (!confirm("Delete your account? This cannot be undone.")) return;
    let shouldRedirect = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData?.session?.access_token;
      if (!access) return alert("Session expired. Please log in again.");
      const { data, error } = await supabase.functions.invoke("delete-account", { headers: { Authorization: `Bearer ${access}` } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Delete failed.");
      shouldRedirect = true;
      try { await supabase.auth.signOut(); } catch (e) {}
      sessionUser = null; myProfile = null; myConnectionSet = new Set();
      cachedPosts = []; cachedFeedItems = [];
      setProfileMode({ mode: "self", userId: null });
      alert("Account deleted ✅");
    } catch (err) {
      alert("Delete failed: " + (err?.message || "Unknown error"));
    } finally {
      if (shouldRedirect) setTimeout(() => window.location.replace("index.html"), 50);
    }
  });

  // =========================
  // INIT
  // =========================
  let notifChannel = null;
  let bootInProgress = false;
  let pendingBoot = false;

  function setupNotifRealtime() {
    if (!sessionUser) return;
    if (notifChannel) { supabase.removeChannel(notifChannel); notifChannel = null; }
    notifChannel = supabase.channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${sessionUser.id}` }, () => refreshNotifBadge())
      .subscribe();
  }

  async function bootForCurrentSession() {
    if (bootInProgress) { pendingBoot = true; return; }
    bootInProgress = true;
    try {
      if (sessionUser) {
        try { myProfile = await loadMyProfile(); } catch (e) { console.warn("loadMyProfile failed:", e); }
      } else { myProfile = null; myConnectionSet = new Set(); setProfileMode({ mode: "self", userId: null }); }
      setProfileMode({ mode: "self", userId: null });
      renderProfileUI();
      showSection("feed");
      if (bottomButtons.length) setBottomActive(bottomButtons[0]);
      if (tabButtons.length) setTabActive(tabButtons[0]);
      if (postType) { postType.value = "market"; setCategoryOptions("market"); setPriceVisibility("market"); }
      try {
        cachedPosts = await fetchPosts();
        await loadVerifiedSellers();
        await loadFeedProducts();
        renderFeed();
      } catch (e) { console.warn("boot feed load failed:", e); }
      queueMicrotask(async () => {
        try {
          await Promise.allSettled([loadShopOwners(), ...(sessionUser ? [loadMyConnections()] : [])]);
          renderProfileUI(); renderMarket(); renderOpps(); renderSocials();
          setupNotifRealtime();
          await refreshNotifBadge();
        } catch (e) { console.warn("deferred boot failed:", e); }
      });
    } finally {
      bootInProgress = false;
      if (pendingBoot) { pendingBoot = false; bootForCurrentSession(); }
    }
  }

  async function init() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.warn("getSession error:", error);
    sessionUser = session?.user || null;
    authReady = true;
    await bootForCurrentSession();
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      sessionUser = newSession?.user || null;
      await bootForCurrentSession();
    });
  }

  init();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { supabase.auth.startAutoRefresh(); if (sessionUser) setupNotifRealtime(); }
    else supabase.auth.stopAutoRefresh();
  });
  window.addEventListener("online", () => { supabase.auth.startAutoRefresh(); if (sessionUser) setupNotifRealtime(); });
  window.addEventListener("focus", () => { supabase.auth.startAutoRefresh(); if (sessionUser) setupNotifRealtime(); });

  // =========================
  // LIGHTBOX
  // =========================
  const openLightbox = (src) => {
    if (!imageLightbox || !lightboxImg) return;
    lightboxImg.src = src;
    imageLightbox.classList.add("show");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeLightboxFunc = () => {
    if (!imageLightbox) return;
    imageLightbox.classList.remove("show");
    imageLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  FEED_LIST?.addEventListener("click", (ev) => { const img = ev.target.closest(".post-media-item img"); if (img) openLightbox(img.src); });
  [marketList, oppsList, socialList, myPostsWrap, document.getElementById("visitorProfileBody")].forEach(list => {
    list?.addEventListener("click", (ev) => { const img = ev.target.closest(".post-media-item img"); if (img) openLightbox(img.src); });
  });
  closeLightbox?.addEventListener("click", closeLightboxFunc);
  imageLightbox?.addEventListener("click", (ev) => { if (ev.target === imageLightbox) closeLightboxFunc(); });
  window.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeLightboxFunc(); });

});
