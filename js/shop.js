// js/shop.js — weSPACE Shop v4
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

// Signal home feed to reload products next time it's shown
function signalFeedReload() {
  try { localStorage.setItem("wespace_feed_stale", "1"); } catch {}
}

// ─── STATE ───────────────────────────────────────────────
let sellerId              = null;
let currentUid            = null;
let isOwner               = false;
let shopData              = null;
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
  if (imgModalImg) imgModalImg.src = "";
}
imgModalClose?.addEventListener("click", closeLightbox);
imgModal?.addEventListener("click", (e) => { if (e.target === imgModal) closeLightbox(); });

// ─── PRODUCT DETAIL SHEET (for flash/feed items) ─────────
function openProdDetail({ imgUrl, name, salePrice, origPrice, desc, wa, shopName }) {
  const overlay = $("prodDetailModal");
  const body    = $("prodDetailBody");
  if (!overlay || !body) return;
  const waNum = formatWa(wa || "");
  body.innerHTML = `
    ${imgUrl ? `<img class="prod-detail-img" src="${esc(imgUrl)}" alt="${esc(name)}" />` : ""}
    <div class="prod-detail-name">${esc(name || "Product")}</div>
    <div class="prod-detail-prices">
      ${salePrice ? `<span class="prod-detail-sale">${esc(salePrice)}</span>` : ""}
      ${origPrice ? `<span class="prod-detail-orig">${esc(origPrice)}</span>` : ""}
    </div>
    ${desc ? `<div class="prod-detail-desc">${esc(desc)}</div>` : ""}
    ${shopName ? `<div style="font-size:12px;color:#64748b;margin-bottom:12px;">🏪 ${esc(shopName)}</div>` : ""}
    ${waNum
      ? `<button class="prod-detail-wa" onclick="window.open('https://wa.me/${waNum}?text=${encodeURIComponent(`Assalamu alaikum! I saw *${name}* on weSPACE. Is it available?`)}','_blank')">
           <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" style="width:18px;" alt="WA"> Chat Seller on WhatsApp
         </button>`
      : `<div style="text-align:center;color:#94a3b8;font-size:13px;">No WhatsApp number available</div>`}`;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
}
function closeProdDetail() {
  const overlay = $("prodDetailModal");
  if (!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}
$("closeProdDetail")?.addEventListener("click", closeProdDetail);
$("prodDetailModal")?.addEventListener("click", (e) => { if (e.target === $("prodDetailModal")) closeProdDetail(); });

// ─── SHARE / COPY LINK ───────────────────────────────────
$("copyShopLinkBtn")?.addEventListener("click", shareShop);
$("shopShareBtn")?.addEventListener("click", shareShop);

async function shareShop() {
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
}

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
  const bannerImg = $("shopBannerImg");
  const bannerPH  = $("shopBannerPlaceholder");
  if (shop?.banner_url && bannerImg) {
    bannerImg.src = shop.banner_url;
    bannerImg.style.display = "block";
    if (bannerPH) bannerPH.style.display = "none";
  }

  const logoImg = $("shopLogoImg");
  const logoPH  = $("shopLogoPlaceholder");
  if (shop?.logo_url && logoImg) {
    logoImg.src = shop.logo_url;
    logoImg.style.display = "block";
    if (logoPH) logoPH.style.display = "none";
  }

  const titleEl  = $("shopTitle");
  const topbarEl = $("topbarTitle");
  if (titleEl)  titleEl.textContent  = shop?.shop_name || "Shop";
  if (topbarEl) topbarEl.textContent = shop?.shop_name || "Shop";

  const badge = $("shopVerifiedBadge");
  if (verified && badge) badge.style.display = "inline-flex";

  const metaEl = $("shopMeta");
  if (metaEl) {
    const loc = [shop?.city, shop?.market].filter(Boolean).join(" • ");
    const parts = [loc ? `📍 ${loc}` : "", shop?.category ? `🏷️ ${shop.category}` : ""].filter(Boolean);
    metaEl.textContent = parts.join("  ");
  }

  // WhatsApp button
  const waBtn = $("shopWaBtn");
  const wa = formatWa(shop?.whatsapp || "");
  if (waBtn && wa) {
    waBtn.style.display = "flex";
    waBtn.onclick = () => {
      const msg = encodeURIComponent("Assalamu alaikum! I found your shop on weSPACE. I'd like to enquire.");
      window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
    };
  }
}

// ─── VISITOR: LOAD CATALOGUES ────────────────────────────
// Uses original .shop-card / .shop-card-img / .shop-card-title CSS classes
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
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div style="font-size:36px;margin-bottom:8px;">📂</div>
        <p>No catalogues in this shop yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    return `
      <div class="shop-card" data-catid="${c.id}" data-catname="${esc(c.name)}" style="cursor:pointer;">
        <div class="shop-card-img">
          ${cover
            ? `<img src="${esc(cover)}" alt="${esc(c.name)}" loading="lazy" />`
            : `<span style="font-size:32px;">📦</span>`}
        </div>
        <div class="shop-card-title">${esc(c.name)}</div>
      </div>`;
  }).join("");

  grid.querySelectorAll(".shop-card[data-catid]").forEach(card => {
    card.addEventListener("click", () =>
      loadVisitorProducts(card.dataset.catid, card.dataset.catname || "Catalogue")
    );
  });
}

// ─── VISITOR: LOAD PRODUCTS ──────────────────────────────
// Uses original .shop-tile / .shop-tile-img / .shop-tile-name CSS classes
async function loadVisitorProducts(catalogueId, catalogueName) {
  const catGrid = $("catalogueGrid");
  const view    = $("catalogueView");
  if (catGrid) catGrid.style.display = "none";
  if (view)    view.style.display    = "block";

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
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div style="font-size:36px;margin-bottom:8px;">📦</div>
        <p>No products in this catalogue yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map(p => {
    // Safely parse image_paths (may be jsonb array or legacy string)
    let imgPaths = p.image_paths;
    if (typeof imgPaths === "string") { try { imgPaths = JSON.parse(imgPaths); } catch { imgPaths = []; } }
    if (!Array.isArray(imgPaths) || !imgPaths.length) imgPaths = p.image_path ? [p.image_path] : [];
    const allUrls = imgPaths.map(i => publicUrl(i));
    const pid = `prod-${p.id}`;

    // Build image swiper dots only if >1 image
    const dotsHtml = allUrls.length > 1
      ? `<div style="position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:center;gap:4px;z-index:2;">
          ${allUrls.map((_, i) => `<span class="swiper-dot${i===0?' active':''}" data-prodid="${pid}" data-idx="${i}"
            style="width:6px;height:6px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,.5)'};cursor:pointer;transition:background .2s;display:inline-block;"></span>`).join('')}
         </div>`
      : "";

    const imagesHtml = allUrls.map((url, i) =>
      `<img src="${esc(url)}" alt="${esc(p.product_name)}" loading="${i===0?'eager':'lazy'}"
        data-action="view-img" data-src="${esc(url)}"
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in;transition:opacity .25s;opacity:${i===0?1:0};pointer-events:${i===0?'auto':'none'};" />`
    ).join("");

    const descHtml = p.description ? `
      <div style="padding:4px 10px 0;">
        <div class="prod-desc-collapsed" id="desc-${pid}"
          style="font-size:11px;color:#64748b;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;"
          data-action="expand-desc" data-descid="desc-${pid}">
          ${esc(p.description)}
        </div>
      </div>` : "";

    return `
      <div style="border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.09);display:flex;flex-direction:column;" id="${pid}">
        <!-- IMAGE SWIPER -->
        <div style="position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:#f1f5f9;flex-shrink:0;">
          ${allUrls.length ? imagesHtml : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#cbd5e1;">🖼️</div>`}
          <!-- gradient + price -->
          ${allUrls.length ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:22px 10px ${allUrls.length>1?'22':'8'}px;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 100%);pointer-events:none;z-index:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              ${p.price_text ? `<span style="font-size:14px;font-weight:900;color:#fff;">${esc(p.price_text)}</span>` : ""}
              ${p.original_price ? `<span style="font-size:11px;color:rgba(255,255,255,.65);text-decoration:line-through;">${esc(p.original_price)}</span>` : ""}
            </div>
          </div>` : ""}
          ${dotsHtml}
          <!-- swipe arrows if multiple images -->
          ${allUrls.length > 1 ? `
            <button data-action="swipe-prev" data-prodid="${pid}" data-total="${allUrls.length}"
              style="position:absolute;left:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.35);color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:13px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;padding:0;">‹</button>
            <button data-action="swipe-next" data-prodid="${pid}" data-total="${allUrls.length}"
              style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.35);color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:13px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;padding:0;">›</button>` : ""}
        </div>
        <!-- NAME + DESCRIPTION -->
        <div style="padding:8px 10px 4px;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.product_name)}</div>
        </div>
        ${descHtml}
        <!-- CONTACT SELLER -->
        ${wa ? `<button data-action="contact-wa" data-phone="${esc(wa)}" data-product="${esc(p.product_name)}"
          style="margin:6px 10px 10px;background:#25d366;color:#fff;border:none;border-radius:10px;padding:10px 8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;width:calc(100% - 20px);">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" style="width:14px;filter:brightness(10);" alt="WA"> Contact Seller
        </button>` : ""}
      </div>`;
  }).join("");
}

// Back to catalogues
$("backToCatalogues")?.addEventListener("click", () => {
  $("catalogueView").style.display  = "none";
  $("catalogueGrid").style.display  = "";
});

// ─── OWNER: CATALOGUE MANAGEMENT LIST ────────────────────
async function loadOwnerCatalogueList() {
  const wrap = $("catalogueMgmtList");
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:24px;color:#64748b;">Loading catalogues…</div>`;

  const { data: catalogues, error } = await supabase
    .from("shop_catalogues")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    wrap.innerHTML = `<div style="color:#dc2626;padding:12px;">Could not load catalogues: ${error.message}</div>`;
    return;
  }
  if (!catalogues?.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:24px;color:#64748b;">
        <div style="font-size:36px;">📂</div>
        <p style="margin-top:8px;">No catalogues yet. Create your first one above.</p>
      </div>`;
    return;
  }

  // Get product counts per catalogue
  const catIds = catalogues.map(c => c.id);
  const { data: prodRows } = await supabase
    .from("shop_products").select("catalogue_id").in("catalogue_id", catIds);
  const countMap = {};
  (prodRows || []).forEach(r => { countMap[r.catalogue_id] = (countMap[r.catalogue_id] || 0) + 1; });

  wrap.innerHTML = catalogues.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    const count = countMap[c.id] || 0;
    return `
      <div class="mgmt-cat-card" data-catid="${c.id}">
        <div class="mgmt-cat-head">
          <div class="mgmt-cat-left">
            ${cover
              ? `<img class="mgmt-cat-cover" src="${esc(cover)}" alt="${esc(c.name)}" loading="lazy" />`
              : `<div class="mgmt-cat-cover-ph">📦</div>`}
            <div>
              <div class="mgmt-cat-name">${esc(c.name)}</div>
              <div class="mgmt-cat-count">${count} product${count !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div class="mgmt-cat-btns">
            <button class="mgmt-cat-expand" data-action="toggle-products"
              data-catid="${c.id}" type="button">View</button>
            <button class="mgmt-cat-add" data-action="open-add-prod"
              data-catid="${c.id}" data-catname="${esc(c.name)}" type="button">+ Add</button>
            <button class="mgmt-cat-del" data-action="del-cat"
              data-catid="${c.id}" data-coverpath="${esc(c.cover_image_path || "")}" type="button">🗑️</button>
          </div>
        </div>
        <div class="mgmt-prod-list" id="catprods-${c.id}"></div>
      </div>`;
  }).join("");
}

// ─── OWNER: INLINE PRODUCT LIST ──────────────────────────
async function loadInlineProducts(catalogueId) {
  const wrap = $(`catprods-${catalogueId}`);
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:10px;color:#64748b;font-size:12px;">Loading…</div>`;

  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    wrap.innerHTML = `<div style="padding:10px 0;color:#94a3b8;font-size:12px;">No products yet — tap "+ Add" to add one.</div>`;
    return;
  }

  wrap.innerHTML = data.map(p => {
    const imgs = Array.isArray(p.image_paths) && p.image_paths.length
      ? p.image_paths : p.image_path ? [p.image_path] : [];
    const imgUrl = imgs.length ? publicUrl(imgs[0]) : "";
    return `
      <div class="mgmt-prod-row">
        ${imgUrl
          ? `<img class="mgmt-prod-thumb" src="${esc(imgUrl)}" alt="${esc(p.product_name)}" loading="lazy" />`
          : `<div class="mgmt-prod-thumb-ph">🖼️</div>`}
        <div class="mgmt-prod-info">
          <div class="mgmt-prod-name">${esc(p.product_name)}</div>
          <div class="mgmt-prod-price">${esc(p.price_text || "")}</div>
          ${p.description ? `<div style="font-size:10px;color:#94a3b8;">${esc(p.description)}</div>` : ""}
        </div>
        <button class="mgmt-prod-del" data-action="del-prod"
          data-prodid="${p.id}" data-imgpath="${esc(p.image_path || "")}"
          data-catid="${catalogueId}" type="button">Delete</button>
      </div>`;
  }).join("");
}

// ─── ADD PRODUCT MODAL ───────────────────────────────────
function openAddProdModal(catId, catName) {
  addingToCatalogueId   = catId;
  addingToCatalogueName = catName;
  const nameEl = $("addProdCatName");
  if (nameEl) nameEl.textContent = catName;
  ["productName", "prodPrice", "prodOrigPrice", "prodDesc", "prodImage"].forEach(id => {
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeLightbox(); closeAddProdModal(); closeProdDetail(); }
});

// ─── ADD PRODUCT SUBMIT ──────────────────────────────────
$("addProductBtn")?.addEventListener("click", async () => {
  if (!addingToCatalogueId) return alert("No catalogue selected.");
  const name      = $("productName")?.value.trim();
  const price     = $("prodPrice")?.value.trim();
  const origPrice = $("prodOrigPrice")?.value.trim();
  const desc      = $("prodDesc")?.value.trim();
  const files     = Array.from($("prodImage")?.files || []);

  if (!name)        return alert("Enter a product name.");
  if (!price)       return alert("Enter a price.");
  if (!files.length) return alert("Select at least one product image.");

  const btn = $("addProductBtn");
  btn.textContent = "Adding…"; btn.disabled = true;

  try {
    const imagePaths = [];
    for (const file of files.slice(0, 5)) {
      const path = await uploadFile(currentUid, file, "products");
      imagePaths.push(path);
    }

    const { error } = await supabase.from("shop_products").insert({
      seller_id:      currentUid,
      catalogue_id:   addingToCatalogueId,
      product_name:   name,
      price_text:     price,
      original_price: origPrice || null,
      description:    desc || null,
      image_path:     imagePaths[0] || null,
      image_paths:    imagePaths,
    });
    if (error) throw error;

    // Signal home feed to refresh so new product appears immediately
    signalFeedReload();

    closeAddProdModal();
    alert("Product added ✅ It will appear in the home feed automatically.");

    // Reload inline list if it was open
    const prodsWrap = $(`catprods-${addingToCatalogueId}`);
    if (prodsWrap?.classList.contains("open")) {
      await loadInlineProducts(addingToCatalogueId);
    }
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
      seller_id: currentUid,
      shop_name: name, city, market, category, whatsapp,
      logo_url: logoUrl, banner_url: bannerUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("shops")
      .upsert(payload, { onConflict: "seller_id" });
    if (error) throw error;

    shopData = { ...shopData, ...payload };
    renderShopHeader(shopData, $("shopVerifiedBadge")?.style.display !== "none");
    if ($("setupLogo"))   $("setupLogo").value   = "";
    if ($("setupBanner")) $("setupBanner").value = "";
    // Clear preview images
    const lp = $("setupLogoPreview");   if (lp)  { lp.style.display  = "none"; lp.src  = ""; }
    const bp = $("setupBannerPreview"); if (bp)  { bp.style.display  = "none"; bp.src  = ""; }

    alert("Shop settings saved ✅");
  } catch (e) {
    alert("Error: " + (e.message || "Could not save."));
  } finally {
    btn.textContent = "💾 Save Shop Settings"; btn.disabled = false;
  }
});

// Setup image previews
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

// Pre-fill setup form from shopData
function fillSetupForm(shop) {
  if (!shop) return;
  if ($("setupShopName"))  $("setupShopName").value  = shop.shop_name  || "";
  if ($("setupWhatsApp"))  $("setupWhatsApp").value  = shop.whatsapp   || "";
  if ($("setupCity"))      $("setupCity").value      = shop.city       || "";
  if ($("setupMarket"))    $("setupMarket").value    = shop.market     || "";
  if ($("setupCategory"))  $("setupCategory").value  = shop.category   || "";
}

  // ── IMAGE SWIPER ─────────────────────────────────────────
  function getSwipeState(prodId) {
    if (!getSwipeState._map) getSwipeState._map = {};
    if (!getSwipeState._map[prodId]) getSwipeState._map[prodId] = { idx: 0 };
    return getSwipeState._map[prodId];
  }

  function goToSlide(prodId, newIdx, total) {
    const card = document.getElementById(prodId);
    if (!card) return;
    const imgs = card.querySelectorAll("img[data-action='view-img']");
    const dots = card.querySelectorAll(".swiper-dot");
    const state = getSwipeState(prodId);
    state.idx = ((newIdx % total) + total) % total;
    imgs.forEach((img, i) => {
      img.style.opacity        = i === state.idx ? "1" : "0";
      img.style.pointerEvents  = i === state.idx ? "auto" : "none";
    });
    dots.forEach((dot, i) => {
      dot.style.background = i === state.idx ? "#fff" : "rgba(255,255,255,.5)";
    });
  }

  document.addEventListener("click", (e) => {
    // Swipe next
    const nextBtn = e.target.closest("[data-action='swipe-next']");
    if (nextBtn) {
      const pid   = nextBtn.dataset.prodid;
      const total = parseInt(nextBtn.dataset.total);
      goToSlide(pid, getSwipeState(pid).idx + 1, total);
      return;
    }
    // Swipe prev
    const prevBtn = e.target.closest("[data-action='swipe-prev']");
    if (prevBtn) {
      const pid   = prevBtn.dataset.prodid;
      const total = parseInt(prevBtn.dataset.total);
      goToSlide(pid, getSwipeState(pid).idx - 1, total);
      return;
    }
    // Dot click
    const dot = e.target.closest(".swiper-dot");
    if (dot) {
      const pid   = dot.dataset.prodid;
      const idx   = parseInt(dot.dataset.idx);
      const total = document.getElementById(pid)?.querySelectorAll("img[data-action='view-img']").length || 1;
      goToSlide(pid, idx, total);
      return;
    }
    // Expand description
    const descEl = e.target.closest("[data-action='expand-desc']");
    if (descEl) {
      const isExpanded = descEl.dataset.expanded === "1";
      if (isExpanded) {
        descEl.style.webkitLineClamp = "2";
        descEl.style.overflow = "hidden";
        descEl.dataset.expanded = "0";
      } else {
        descEl.style.webkitLineClamp = "unset";
        descEl.style.overflow = "visible";
        descEl.dataset.expanded = "1";
      }
      return;
    }
  }, true); // capture phase so it fires before other handlers
  const target = e.target.closest("[data-action]");
  const action = target?.dataset?.action;
  if (!action) return;

  // Full image lightbox
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

  // Toggle inline product list expand/collapse (owner)
  if (action === "toggle-products") {
    const catId = target.dataset.catid;
    const wrap  = $(`catprods-${catId}`);
    if (!wrap) return;
    const isOpen = wrap.classList.toggle("open");
    target.textContent = isOpen ? "Hide" : "View";
    if (isOpen) await loadInlineProducts(catId);
    return;
  }

  // Open add product modal (owner)
  if (action === "open-add-prod") {
    openAddProdModal(target.dataset.catid, target.dataset.catname || "Catalogue");
    return;
  }

  // Delete product (owner)
  if (action === "del-prod") {
    if (!isOwner) return;
    if (!confirm("Delete this product?")) return;
    const pid     = target.dataset.prodid;
    const imgPath = target.dataset.imgpath;
    const catId   = target.dataset.catid;
    const { error } = await supabase.from("shop_products").delete().eq("id", pid);
    if (error) return alert("Error: " + error.message);
    if (imgPath) await removeFiles([imgPath]);
    signalFeedReload();
    await loadInlineProducts(catId);
    await loadOwnerCatalogueList();
    return;
  }

  // Delete catalogue (owner)
  if (action === "del-cat") {
    if (!isOwner) return;
    if (!confirm("Delete this entire catalogue and all its products?\nThis cannot be undone.")) return;
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
    signalFeedReload();
    await loadOwnerCatalogueList();
    return;
  }
});

// ─── INIT ────────────────────────────────────────────────
(async function init() {
  sellerId = getParam("seller");
  if (!sellerId) {
    const t = $("shopTitle"); if (t) t.textContent = "No shop found";
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  currentUid = session?.user?.id || null;
  isOwner    = currentUid === sellerId;

  const { data: shop } = await supabase.from("shops")
    .select("*").eq("seller_id", sellerId).maybeSingle();
  shopData = shop;

  const { data: verif } = await supabase.from("seller_verifications")
    .select("status").eq("user_id", sellerId).maybeSingle();
  const verified = verif?.status === "approved";

  renderShopHeader(shop, verified);

  if (isOwner) {
    const ownerPanel   = $("ownerPanel");
    const visitorPanel = $("visitorPanel");
    if (ownerPanel)   ownerPanel.style.display   = "block";
    if (visitorPanel) visitorPanel.style.display = "none";

    if (shop) {
      fillSetupForm(shop);
      await loadOwnerCatalogueList();
    } else {
      // No shop yet — nudge owner to fill setup tab
      document.querySelectorAll(".mgmt-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".mgmt-panel").forEach(p => p.classList.remove("active"));
      const setupTab   = document.querySelector(".mgmt-tab[data-panel='setup']");
      const setupPanel = $("panel-setup");
      if (setupTab)   setupTab.classList.add("active");
      if (setupPanel) setupPanel.classList.add("active");
      const mgmtList = $("catalogueMgmtList");
      if (mgmtList) mgmtList.innerHTML = "";
    }
  } else {
    const ownerPanel   = $("ownerPanel");
    const visitorPanel = $("visitorPanel");
    if (ownerPanel)   ownerPanel.style.display   = "none";
    if (visitorPanel) visitorPanel.style.display = "block";

    if (!shop) {
      const grid = $("catalogueGrid");
      if (grid) grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div style="font-size:40px;">🏪</div>
          <p style="color:#64748b;margin-top:8px;">This shop hasn't been set up yet.</p>
        </div>`;
      return;
    }
    await loadVisitorCatalogues();
  }
})();
