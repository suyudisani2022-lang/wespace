// js/shop.js — weSPACE Shop v3 (tabbed management)
import { supabase } from "./supabaseClient.js";

// ─── HELPERS ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const BUCKET = "shop-products";

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function getParam(key) {
  return new URL(location.href).searchParams.get(key);
}

function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function formatWa(raw) {
  let n = String(raw || "").replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "234" + n.slice(1);
  return n;
}

async function compressImage(file, maxW = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob
            ? resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }))
            : reject(new Error("toBlob failed")),
          "image/jpeg", quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

async function uploadFile(uid, file, folder) {
  const compressed = await compressImage(file);
  const path = `${uid}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

async function removeFiles(paths) {
  const clean = (paths || []).filter(Boolean);
  if (!clean.length) return;
  await supabase.storage.from(BUCKET).remove(clean);
}

// ─── STATE ───────────────────────────────────────────────
let sellerId    = null;
let currentUid  = null;
let isOwner     = false;
let shopData    = null;
let addingToCatalogueId   = null;
let addingToCatalogueName = "";

// ─── IMAGE LIGHTBOX ──────────────────────────────────────
const imgModal      = $("imgModal");
const imgModalImg   = $("imgModalImg");
const imgModalClose = $("imgModalClose");

function openLightbox(src) {
  if (!imgModal || !imgModalImg) return;
  imgModalImg.src = src;
  imgModal.classList.add("show");
  imgModal.setAttribute("aria-hidden", "false");
}
function closeLightbox() {
  if (!imgModal) return;
  imgModal.classList.remove("show");
  imgModal.setAttribute("aria-hidden", "true");
  imgModalImg.src = "";
}
imgModalClose?.addEventListener("click", closeLightbox);
imgModal?.addEventListener("click", (e) => { if (e.target === imgModal) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLightbox(); closeAddProdModal(); } });

// ─── COPY SHOP LINK ──────────────────────────────────────
$("copyShopLinkBtn")?.addEventListener("click", async () => {
  const url = `${location.origin}/shop.html?seller=${sellerId}`;
  if (navigator.share) {
    try { await navigator.share({ title: shopData?.shop_name || "weSPACE Shop", url }); return; } catch {}
  }
  try { await navigator.clipboard.writeText(url); } catch {
    const ta = document.createElement("textarea");
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
  alert("Shop link copied ✅");
});

// ─── BACK BUTTON ─────────────────────────────────────────
$("shopBackBtn")?.addEventListener("click", () => history.back());

// ─── MANAGEMENT TABS ─────────────────────────────────────
document.querySelectorAll(".mgmt-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".mgmt-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".mgmt-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    $(`panel-${tab.dataset.panel}`)?.classList.add("active");
  });
});

// ─── RENDER SHOP HEADER ──────────────────────────────────
function renderShopHeader(shop, verified) {
  // Banner
  const bannerImg = $("shopBannerImg");
  const bannerPH  = $("shopBannerPlaceholder");
  if (shop?.banner_url && bannerImg) {
    bannerImg.src = shop.banner_url;
    bannerImg.style.display = "block";
    if (bannerPH) bannerPH.style.display = "none";
  }

  // Logo
  const logoImg = $("shopLogoImg");
  const logoPH  = $("shopLogoPlaceholder");
  if (shop?.logo_url && logoImg) {
    logoImg.src = shop.logo_url;
    logoImg.style.display = "block";
    if (logoPH) logoPH.style.display = "none";
  }

  // Name + topbar
  const titleEl  = $("shopTitle");
  const topbarEl = $("topbarTitle");
  if (titleEl)  titleEl.textContent  = shop?.shop_name || "Shop";
  if (topbarEl) topbarEl.textContent = shop?.shop_name || "Shop";

  // Verified badge
  if (verified) $("shopVerifiedBadge")?.style && ($("shopVerifiedBadge").style.display = "inline-flex");

  // Meta (city, market, category)
  const metaEl = $("shopMeta");
  if (metaEl) {
    const parts = [
      shop?.city && shop?.market ? `📍 ${shop.city} • ${shop.market}` : shop?.city ? `📍 ${shop.city}` : "",
      shop?.category ? `🏷️ ${shop.category}` : "",
    ].filter(Boolean);
    metaEl.textContent = parts.join("  ");
  }
}

// ─── VISITOR: LOAD CATALOGUES ────────────────────────────
async function loadVisitorCatalogues() {
  const grid = $("catalogueGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Loading…</div>`;

  const { data, error } = await supabase
    .from("shop_catalogues")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div style="font-size:36px;">📂</div><p>No catalogues yet.</p></div>`;
    return;
  }

  grid.innerHTML = data.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    return `
      <div class="catalogue-card" data-catid="${c.id}" data-catname="${esc(c.name)}" style="cursor:pointer;">
        ${cover
          ? `<img class="catalogue-card-img" src="${esc(cover)}" alt="${esc(c.name)}" loading="lazy" />`
          : `<div class="catalogue-card-img-placeholder">📦</div>`}
        <div class="catalogue-card-name">${esc(c.name)}</div>
      </div>`;
  }).join("");

  // Clicks on catalogue cards → show products
  grid.querySelectorAll(".catalogue-card").forEach(card => {
    card.addEventListener("click", () => {
      loadVisitorProducts(card.dataset.catid, card.dataset.catname || "Catalogue");
    });
  });
}

// ─── VISITOR: LOAD PRODUCTS ──────────────────────────────
async function loadVisitorProducts(catalogueId, catalogueName) {
  $("catalogueGrid").style.display  = "none";
  const view = $("catalogueView");
  if (view) view.style.display = "block";
  const titleEl = $("catalogueNameTitle");
  if (titleEl) titleEl.textContent = catalogueName;

  const grid = $("productGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Loading…</div>`;

  const wa = formatWa(shopData?.whatsapp || "");

  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div style="font-size:36px;">📦</div><p>No products in this catalogue yet.</p></div>`;
    return;
  }

  grid.innerHTML = data.map(p => {
    const imgs = Array.isArray(p.image_paths) && p.image_paths.length
      ? p.image_paths : p.image_path ? [p.image_path] : [];
    const imgUrl = imgs.length ? publicUrl(imgs[0]) : "";
    return `
      <div class="product-card">
        ${imgUrl
          ? `<img class="product-card-img" src="${esc(imgUrl)}" alt="${esc(p.product_name)}" loading="lazy" data-action="view-img" data-src="${esc(imgUrl)}" />`
          : `<div class="product-card-img-placeholder">🖼️</div>`}
        <div class="product-card-body">
          <div class="product-card-name">${esc(p.product_name)}</div>
          <div class="product-card-price">${esc(p.price_text || "")}</div>
          ${p.description ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${esc(p.description)}</div>` : ""}
          <button class="product-card-wa" data-action="contact-wa"
            data-phone="${esc(wa)}" data-product="${esc(p.product_name)}"
            ${wa ? "" : "disabled"} style="margin-top:8px;width:100%;background:#25d366;color:#fff;border:none;padding:8px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WA" style="width:14px;"> Chat Seller
          </button>
        </div>
      </div>`;
  }).join("");
}

// Back button in visitor product view
$("backToCatalogues")?.addEventListener("click", () => {
  $("catalogueView").style.display  = "none";
  $("catalogueGrid").style.display  = "";
});

// ─── OWNER: LOAD CATALOGUE MANAGEMENT LIST ───────────────
async function loadOwnerCatalogueList() {
  const wrap = $("catalogueMgmtList");
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:24px;color:#64748b;">Loading…</div>`;

  const { data: catalogues, error } = await supabase
    .from("shop_catalogues")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    wrap.innerHTML = `<div style="color:#dc2626;padding:12px;">Could not load catalogues.</div>`;
    return;
  }

  if (!catalogues?.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:24px;color:#64748b;"><div style="font-size:36px;">📂</div><p style="margin-top:8px;">No catalogues yet. Create your first one above.</p></div>`;
    return;
  }

  // For each catalogue, get product count
  const catIds = catalogues.map(c => c.id);
  const { data: prodRows } = await supabase
    .from("shop_products").select("catalogue_id").in("catalogue_id", catIds);

  const countMap = {};
  (prodRows || []).forEach(r => { countMap[r.catalogue_id] = (countMap[r.catalogue_id] || 0) + 1; });

  wrap.innerHTML = catalogues.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    const count = countMap[c.id] || 0;
    return `
      <div class="cat-mgmt-card" data-catid="${c.id}">
        <div class="cat-mgmt-card-head">
          <div>
            <div class="cat-mgmt-card-name">
              ${cover ? `<img src="${esc(cover)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:6px;" loading="lazy">` : "📦 "}
              ${esc(c.name)}
            </div>
            <div class="cat-mgmt-card-count">${count} product${count !== 1 ? "s" : ""}</div>
          </div>
          <div class="cat-mgmt-card-actions">
            <button class="cat-mgmt-expand-btn" data-action="toggle-cat-products" data-catid="${c.id}" data-catname="${esc(c.name)}" type="button">View Products</button>
            <button class="cat-mgmt-add-btn" data-action="open-add-prod" data-catid="${c.id}" data-catname="${esc(c.name)}" type="button">+ Add</button>
          </div>
        </div>
        <div class="cat-mgmt-products" id="catprods-${c.id}">
          <!-- Loaded on expand -->
        </div>
        <div style="margin-top:8px;border-top:1px solid #f1f5f9;padding-top:8px;">
          <button class="btn danger" data-action="del-cat" data-catid="${c.id}" data-coverpath="${esc(c.cover_image_path || "")}" type="button" style="font-size:11px;padding:5px 10px;">🗑️ Delete Catalogue</button>
        </div>
      </div>`;
  }).join("");
}

// ─── OWNER: LOAD PRODUCTS INLINE IN CATALOGUE CARD ───────
async function loadInlineProducts(catalogueId) {
  const wrap = $(`catprods-${catalogueId}`);
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:8px;color:#64748b;font-size:12px;">Loading…</div>`;

  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    wrap.innerHTML = `<div style="padding:8px;color:#64748b;font-size:12px;">No products yet. Tap "+ Add" to add one.</div>`;
    return;
  }

  wrap.innerHTML = data.map(p => {
    const imgs = Array.isArray(p.image_paths) && p.image_paths.length
      ? p.image_paths : p.image_path ? [p.image_path] : [];
    const imgUrl = imgs.length ? publicUrl(imgs[0]) : "";
    return `
      <div class="cat-prod-row">
        ${imgUrl
          ? `<img class="cat-prod-thumb" src="${esc(imgUrl)}" alt="${esc(p.product_name)}" loading="lazy" />`
          : `<div class="cat-prod-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;">🖼️</div>`}
        <div class="cat-prod-info">
          <div class="cat-prod-name">${esc(p.product_name)}</div>
          <div class="cat-prod-price">${esc(p.price_text || "")}</div>
          ${p.description ? `<div style="font-size:10px;color:#94a3b8;">${esc(p.description)}</div>` : ""}
        </div>
        <button class="cat-prod-del" data-action="del-prod" data-prodid="${p.id}" data-imgpath="${esc(p.image_path || "")}" data-catid="${catalogueId}" type="button">Delete</button>
      </div>`;
  }).join("");
}

// ─── ADD PRODUCT MODAL ───────────────────────────────────
function openAddProdModal(catId, catName) {
  addingToCatalogueId   = catId;
  addingToCatalogueName = catName;
  const nameEl = $("addProdCatName");
  if (nameEl) nameEl.textContent = catName;
  // Clear form
  ["productName", "prodPrice", "prodDesc", "prodImage"].forEach(id => {
    const el = $(id); if (el) el.value = "";
  });
  const overlay = $("addProdModal");
  if (overlay) { overlay.classList.add("show"); overlay.setAttribute("aria-hidden", "false"); }
}

function closeAddProdModal() {
  const overlay = $("addProdModal");
  if (overlay) { overlay.classList.remove("show"); overlay.setAttribute("aria-hidden", "true"); }
  addingToCatalogueId   = null;
  addingToCatalogueName = "";
}

$("closeAddProdModal")?.addEventListener("click", closeAddProdModal);
$("addProdModal")?.addEventListener("click", (e) => { if (e.target === $("addProdModal")) closeAddProdModal(); });

// ─── ADD PRODUCT SUBMIT ──────────────────────────────────
$("addProductBtn")?.addEventListener("click", async () => {
  if (!addingToCatalogueId) return alert("No catalogue selected.");
  const name  = $("productName")?.value.trim();
  const price = $("prodPrice")?.value.trim();
  const desc  = $("prodDesc")?.value.trim();
  const files = Array.from($("prodImage")?.files || []);

  if (!name)  return alert("Enter a product name.");
  if (!price) return alert("Enter a price.");
  if (!files.length) return alert("Select at least one image.");

  const btn = $("addProductBtn");
  btn.textContent = "Adding…"; btn.disabled = true;

  try {
    // Upload up to 5 images
    const imagePaths = [];
    for (const file of files.slice(0, 5)) {
      const path = await uploadFile(currentUid, file, "products");
      imagePaths.push(path);
    }

    const { error } = await supabase.from("shop_products").insert({
      seller_id:    currentUid,
      catalogue_id: addingToCatalogueId,
      product_name: name,
      price_text:   price,
      description:  desc || null,
      image_path:   imagePaths[0] || null,    // backwards compat
      image_paths:  imagePaths,               // multi-image
    });
    if (error) throw error;

    closeAddProdModal();
    alert("Product added ✅");
    // Refresh the inline product list for that catalogue
    const prodsWrap = $(`catprods-${addingToCatalogueId || ""}`);
    if (prodsWrap?.classList.contains("open")) {
      await loadInlineProducts(addingToCatalogueId);
    }
    // Refresh the catalogue list to update product count
    await loadOwnerCatalogueList();
  } catch (e) {
    alert("Error: " + (e.message || "Could not add product."));
  } finally {
    btn.textContent = "Add Product"; btn.disabled = false;
  }
});

// ─── CREATE CATALOGUE ────────────────────────────────────
$("createCatalogueBtn")?.addEventListener("click", async () => {
  const name = $("catName")?.value.trim();
  const file = $("catCover")?.files?.[0];
  if (!name) return alert("Enter a catalogue name.");

  const btn = $("createCatalogueBtn");
  btn.textContent = "Creating…"; btn.disabled = true;

  try {
    let coverPath = null;
    if (file) coverPath = await uploadFile(currentUid, file, "covers");

    const { error } = await supabase.from("shop_catalogues").insert({
      seller_id: currentUid,
      name,
      cover_image_path: coverPath,
    });
    if (error) throw error;

    if ($("catName"))  $("catName").value  = "";
    if ($("catCover")) $("catCover").value = "";
    alert("Catalogue created ✅");
    await loadOwnerCatalogueList();
  } catch (e) {
    alert("Error: " + (e.message || "Could not create catalogue."));
  } finally {
    btn.textContent = "Create Catalogue"; btn.disabled = false;
  }
});

// ─── SAVE SHOP SETUP ─────────────────────────────────────
$("saveSetupBtn")?.addEventListener("click", async () => {
  const name     = $("setupShopName")?.value.trim();
  const city     = $("setupCity")?.value;
  const market   = $("setupMarket")?.value.trim();
  const category = $("setupCategory")?.value;
  const whatsapp = $("setupWhatsApp")?.value.trim();

  if (!name)     return alert("Enter your shop name.");
  if (!city)     return alert("Select your city.");
  if (!category) return alert("Select a category.");
  if (!whatsapp) return alert("Enter your WhatsApp number.");

  const btn = $("saveSetupBtn");
  btn.textContent = "Saving…"; btn.disabled = true;

  try {
    let logoUrl   = shopData?.logo_url   || null;
    let bannerUrl = shopData?.banner_url || null;

    const logoFile   = $("setupLogo")?.files?.[0];
    const bannerFile = $("setupBanner")?.files?.[0];

    if (logoFile)   { const p = await uploadFile(currentUid, logoFile,   "logos");   logoUrl   = publicUrl(p); }
    if (bannerFile) { const p = await uploadFile(currentUid, bannerFile, "banners"); bannerUrl = publicUrl(p); }

    const payload = {
      seller_id:  currentUid,
      shop_name:  name,
      city, market, category, whatsapp,
      logo_url:   logoUrl,
      banner_url: bannerUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("shops")
      .upsert(payload, { onConflict: "seller_id" });
    if (error) throw error;

    shopData = { ...shopData, ...payload };
    renderShopHeader(shopData, $("shopVerifiedBadge")?.style.display !== "none");

    // Clear file inputs
    if ($("setupLogo"))   $("setupLogo").value   = "";
    if ($("setupBanner")) $("setupBanner").value = "";

    alert("Shop settings saved ✅");
  } catch (e) {
    alert("Error: " + (e.message || "Could not save."));
  } finally {
    btn.textContent = "💾 Save Shop Settings"; btn.disabled = false;
  }
});

// ─── IMAGE PREVIEWS FOR SETUP ────────────────────────────
$("setupBanner")?.addEventListener("change", () => {
  const f = $("setupBanner").files?.[0];
  const prev = $("setupBannerPreview");
  if (!f || !prev) return;
  prev.src = URL.createObjectURL(f);
  prev.style.display = "block";
});

$("setupLogo")?.addEventListener("change", () => {
  const f = $("setupLogo").files?.[0];
  const prev = $("setupLogoPreview");
  if (!f || !prev) return;
  prev.src = URL.createObjectURL(f);
  prev.style.display = "block";
});

// ─── GLOBAL CLICK DELEGATE ───────────────────────────────
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  const action = target?.dataset?.action;

  // Full image view
  if (action === "view-img") {
    openLightbox(target.dataset.src || target.src || "");
    return;
  }

  // WhatsApp contact
  if (action === "contact-wa") {
    const phone = target.dataset.phone;
    const prod  = target.dataset.product;
    if (!phone) return alert("No WhatsApp number available for this seller.");
    const msg = encodeURIComponent(`Assalamu alaikum! I saw *${prod}* on weSPACE. Is it still available?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    return;
  }

  // Toggle inline products expand/collapse
  if (action === "toggle-cat-products") {
    const catId   = target.dataset.catid;
    const catName = target.dataset.catname;
    const wrap    = $(`catprods-${catId}`);
    if (!wrap) return;
    const isOpen = wrap.classList.toggle("open");
    target.textContent = isOpen ? "Hide Products" : "View Products";
    if (isOpen) await loadInlineProducts(catId);
    return;
  }

  // Open add product modal for a specific catalogue
  if (action === "open-add-prod") {
    openAddProdModal(target.dataset.catid, target.dataset.catname || "Catalogue");
    return;
  }

  // Delete product
  if (action === "del-prod") {
    if (!isOwner) return;
    if (!confirm("Delete this product?")) return;
    const pid     = target.dataset.prodid;
    const imgPath = target.dataset.imgpath;
    const catId   = target.dataset.catid;
    const { error } = await supabase.from("shop_products").delete().eq("id", pid);
    if (error) return alert("Error: " + error.message);
    if (imgPath) await removeFiles([imgPath]);
    // Reload the inline list for this catalogue
    await loadInlineProducts(catId);
    await loadOwnerCatalogueList();
    return;
  }

  // Delete catalogue
  if (action === "del-cat") {
    if (!isOwner) return;
    if (!confirm("Delete this entire catalogue and all its products? This cannot be undone.")) return;
    const cid       = target.dataset.catid;
    const coverPath = target.dataset.coverpath;
    const { data: prods } = await supabase.from("shop_products")
      .select("image_path, image_paths").eq("catalogue_id", cid);
    const imgPaths = (prods || []).flatMap(p => [
      p.image_path,
      ...(Array.isArray(p.image_paths) ? p.image_paths : []),
    ]).filter(Boolean);
    await supabase.from("shop_products").delete().eq("catalogue_id", cid);
    await supabase.from("shop_catalogues").delete().eq("id", cid);
    await removeFiles([...imgPaths, coverPath]);
    await loadOwnerCatalogueList();
    return;
  }
});

// ─── PRE-FILL SETUP FORM FROM shopData ───────────────────
function fillSetupForm(shop) {
  if (!shop) return;
  if ($("setupShopName"))  $("setupShopName").value  = shop.shop_name  || "";
  if ($("setupWhatsApp"))  $("setupWhatsApp").value  = shop.whatsapp   || "";
  if ($("setupCity"))      $("setupCity").value      = shop.city       || "";
  if ($("setupMarket"))    $("setupMarket").value    = shop.market     || "";
  if ($("setupCategory"))  $("setupCategory").value  = shop.category   || "";
}

// ─── INIT ────────────────────────────────────────────────
(async function init() {
  sellerId = getParam("seller");
  if (!sellerId) {
    $("shopTitle") && ($("shopTitle").textContent = "No shop found");
    return;
  }

  // Auth
  const { data: { session } } = await supabase.auth.getSession();
  currentUid = session?.user?.id || null;
  isOwner    = currentUid === sellerId;

  // Load shop row
  const { data: shop } = await supabase.from("shops")
    .select("*").eq("seller_id", sellerId).maybeSingle();
  shopData = shop;

  // Verified status
  const { data: verif } = await supabase.from("seller_verifications")
    .select("status").eq("user_id", sellerId).maybeSingle();
  const verified = verif?.status === "approved";

  // Render header (even if no shop data yet)
  renderShopHeader(shop, verified);

  if (isOwner) {
    // Owner view: show management tabs
    const ownerPanel   = $("ownerPanel");
    const visitorPanel = $("visitorPanel");
    if (ownerPanel)   ownerPanel.style.display   = "block";
    if (visitorPanel) visitorPanel.style.display = "none";

    // Pre-fill setup form
    fillSetupForm(shop);

    // Load catalogue management
    await loadOwnerCatalogueList();

    // If owner came from profile with ?mode=manage, default to catalogues tab (it's already first)
  } else {
    // Visitor view: show public catalogues
    const ownerPanel   = $("ownerPanel");
    const visitorPanel = $("visitorPanel");
    if (ownerPanel)   ownerPanel.style.display   = "none";
    if (visitorPanel) visitorPanel.style.display = "block";

    if (!shop) {
      $("catalogueGrid").innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div style="font-size:40px;">🏪</div>
          <p style="color:#64748b;margin-top:8px;">This shop hasn't been set up yet.</p>
        </div>`;
      return;
    }

    await loadVisitorCatalogues();
  }
})();
