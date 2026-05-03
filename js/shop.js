// js/shop.js — weSPACE E-Commerce Storefront v2
import { supabase } from "./supabaseClient.js";

// ─── ELEMENTS ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const shopBackBtn     = $("shopBackBtn");
const topbarTitle     = $("topbarTitle");
const bannerPlaceholder = $("bannerPlaceholder");
const bannerImg       = $("bannerImg");
const logoPlaceholder = $("logoPlaceholder");
const logoImg         = $("logoImg");
const shopName        = $("shopName");
const verifiedBadge   = $("verifiedBadge");
const shopLocation    = $("shopLocation");
const shopCategoryBadge = $("shopCategoryBadge");
const shopAbout       = $("shopAbout");
const statCatalogues  = $("statCatalogues");
const statProducts    = $("statProducts");
const waBtn           = $("waBtn");
const shareBtn        = $("shareBtn");
const manageBtn       = $("manageBtn");

// Sections
const setupSection    = $("setupSection");
const manageSection   = $("manageSection");
const publicSection   = $("publicSection");
const cataloguesSection = $("cataloguesSection");
const productsSection = $("productsSection");

// Manage fields
const mShopName    = $("mShopName");
const mCity        = $("mCity");
const mMarket      = $("mMarket");
const mCategory    = $("mCategory");
const mWhatsapp    = $("mWhatsapp");
const mAbout       = $("mAbout");
const mLogo        = $("mLogo");
const mBanner      = $("mBanner");
const mCatName     = $("mCatName");
const mCatCover    = $("mCatCover");
const mProdName    = $("mProdName");
const mProdPrice   = $("mProdPrice");
const mProdDesc    = $("mProdDesc");
const mProdImage   = $("mProdImage");
const addingToCat  = $("addingToCat");
const addProductPanel = $("addProductPanel");

// Grids
const catalogueGrid = $("catalogueGrid");
const productGrid   = $("productGrid");
const productsTitle = $("productsTitle");

// Image modal
const imgModal      = $("imgModal");
const imgModalImg   = $("imgModalImg");
const imgModalClose = $("imgModalClose");

// ─── STATE ───────────────────────────────────────────────
const BUCKET = "shop-products";
let sellerId = null;
let currentUid = null;
let isOwner = false;
let shopData = null;          // shops row
let selectedCatalogueId = null;
let selectedCatalogueName = "";

// ─── HELPERS ─────────────────────────────────────────────
const esc = (s) => String(s ?? "")
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

async function uploadFile(uid, file, folder) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

async function removeFiles(paths) {
  const clean = (paths || []).filter(Boolean);
  if (!clean.length) return;
  await supabase.storage.from(BUCKET).remove(clean);
}

function showLoading(el, msg = "Loading…") {
  if (el) el.innerHTML = `<div class="empty-state">${msg}</div>`;
}

// ─── IMAGE MODAL ─────────────────────────────────────────
function openModal(src) {
  imgModalImg.src = src;
  imgModal.classList.add("show");
  imgModal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  imgModal.classList.remove("show");
  imgModal.setAttribute("aria-hidden", "true");
  imgModalImg.src = "";
}
imgModalClose?.addEventListener("click", closeModal);
imgModal?.addEventListener("click", (e) => { if (e.target === imgModal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ─── RENDER SHOP HEADER ──────────────────────────────────
async function renderShopHeader(shop, verified) {
  // Banner
  if (shop?.banner_url) {
    bannerImg.src = shop.banner_url;
    bannerImg.style.display = "block";
    bannerPlaceholder.style.display = "none";
  }

  // Logo
  if (shop?.logo_url) {
    logoImg.src = shop.logo_url;
    logoImg.style.display = "block";
    logoPlaceholder.style.display = "none";
  }

  // Name
  shopName.textContent = shop?.shop_name || "weSPACE Shop";
  topbarTitle.textContent = shop?.shop_name || "Shop";

  // Verified
  if (verified) verifiedBadge.style.display = "inline-flex";

  // Location
  const loc = [shop?.city, shop?.market].filter(Boolean).join(" • ");
  shopLocation.textContent = loc || "";

  // Category
  if (shop?.category) {
    shopCategoryBadge.textContent = shop.category;
    shopCategoryBadge.style.display = "inline-block";
  }

  // About
  if (shop?.about) {
    shopAbout.textContent = shop.about;
    shopAbout.style.display = "block";
  }

  // WhatsApp
  const wa = formatWa(shop?.whatsapp || "");
  if (wa) {
    waBtn.style.display = "flex";
    waBtn.onclick = () => {
      const msg = encodeURIComponent(`Assalamu alaikum! I found your shop on weSPACE. I'd like to enquire about your products.`);
      window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
    };
  }

  // Owner controls
  if (isOwner) {
    manageBtn.style.display = "flex";
    // Pre-fill manage form
    if (mShopName) mShopName.value = shop?.shop_name || "";
    if (mCity) mCity.value = shop?.city || "";
    if (mMarket) mMarket.value = shop?.market || "";
    if (mCategory) mCategory.value = shop?.category || "";
    if (mWhatsapp) mWhatsapp.value = shop?.whatsapp || "";
    if (mAbout) mAbout.value = shop?.about || "";
  }
}

// ─── LOAD STATS ──────────────────────────────────────────
async function loadStats() {
  const { count: catCount } = await supabase
    .from("shop_catalogues").select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId);

  const { count: prodCount } = await supabase
    .from("shop_products").select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId);

  statCatalogues.textContent = catCount || 0;
  statProducts.textContent = prodCount || 0;
}

// ─── LOAD CATALOGUES ─────────────────────────────────────
async function loadCatalogues() {
  productsSection.style.display = "none";
  cataloguesSection.style.display = "block";
  selectedCatalogueId = null;

  if (addProductPanel) addProductPanel.style.display = "none";

  showLoading(catalogueGrid);

  const { data, error } = await supabase
    .from("shop_catalogues")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    catalogueGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">📂</div>
        ${isOwner ? "No catalogues yet. Create your first one above." : "No catalogues yet."}
      </div>`;
    return;
  }

  catalogueGrid.innerHTML = data.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    return `
      <div class="catalogue-card" data-catid="${c.id}" data-catname="${esc(c.name)}"
           data-coverpath="${esc(c.cover_image_path || "")}">
        ${cover
          ? `<img class="catalogue-card-img" src="${esc(cover)}" alt="${esc(c.name)}" loading="lazy" />`
          : `<div class="catalogue-card-img-placeholder">📦</div>`}
        <div class="catalogue-card-name">${esc(c.name)}</div>
        ${isOwner ? `<button class="catalogue-del-btn" data-action="del-cat"
          data-catid="${c.id}" data-coverpath="${esc(c.cover_image_path || "")}"
          title="Delete catalogue">🗑️</button>` : ""}
      </div>`;
  }).join("");
}

// ─── LOAD PRODUCTS ───────────────────────────────────────
async function loadProducts(catalogueId, catalogueName) {
  selectedCatalogueId = catalogueId;
  selectedCatalogueName = catalogueName;

  cataloguesSection.style.display = "none";
  productsSection.style.display = "block";
  productsTitle.textContent = catalogueName;

  if (isOwner && addProductPanel) {
    addProductPanel.style.display = "block";
    addingToCat.textContent = catalogueName;
  }

  showLoading(productGrid);

  // Load seller WA if not loaded
  if (!shopData?.whatsapp) {
    const { data: prof } = await supabase.from("profiles")
      .select("wa").eq("id", sellerId).maybeSingle();
    if (prof?.wa) shopData = { ...shopData, whatsapp: prof.wa };
  }

  const wa = formatWa(shopData?.whatsapp || "");

  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    productGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">📦</div>
        ${isOwner ? "No products yet. Add your first product above." : "No products in this catalogue yet."}
      </div>`;
    return;
  }

  productGrid.innerHTML = data.map(p => {
    const img = p.image_path ? publicUrl(p.image_path) : "";
    return `
      <div class="product-card" data-prodid="${p.id}" data-imgpath="${esc(p.image_path || "")}">
        ${img
          ? `<img class="product-card-img" src="${esc(img)}" alt="${esc(p.product_name)}"
               loading="lazy" data-action="view-img" />`
          : `<div class="product-card-img-placeholder">🖼️</div>`}
        ${isOwner ? `<button class="product-del-btn" data-action="del-prod"
          data-prodid="${p.id}" data-imgpath="${esc(p.image_path || "")}"
          title="Delete">🗑️</button>` : ""}
        <div class="product-card-body">
          <div class="product-card-name">${esc(p.product_name)}</div>
          <div class="product-card-price">${esc(p.price_text || "")}</div>
          ${p.description ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${esc(p.description)}</div>` : ""}
          <button class="product-card-wa" data-action="contact-wa"
            data-phone="${esc(wa)}" data-product="${esc(p.product_name)}"
            ${wa ? "" : "disabled"}>
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WA">
            Chat Seller
          </button>
        </div>
      </div>`;
  }).join("");
}

// ─── GLOBAL CLICK HANDLER ────────────────────────────────
document.addEventListener("click", async (e) => {
  // Catalogue card click → open products
  const catCard = e.target.closest(".catalogue-card");
  if (catCard && !e.target.closest("[data-action]")) {
    const id = catCard.dataset.catid;
    const name = catCard.dataset.catname || "Catalogue";
    if (id) await loadProducts(id, name);
    return;
  }

  const action = e.target.closest("[data-action]")?.dataset?.action;
  if (!action) return;

  // View full image
  if (action === "view-img") {
    openModal(e.target.closest("[data-action]").src);
    return;
  }

  // WhatsApp contact
  if (action === "contact-wa") {
    const btn = e.target.closest("[data-action]");
    const phone = btn.dataset.phone;
    const product = btn.dataset.product;
    if (!phone) return alert("No WhatsApp number available for this seller.");
    const msg = encodeURIComponent(`Assalamu alaikum! I saw *${product}* on weSPACE. Is it still available?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    return;
  }

  // Delete product
  if (action === "del-prod") {
    if (!isOwner) return;
    const btn = e.target.closest("[data-action]");
    if (!confirm("Delete this product?")) return;
    const pid = btn.dataset.prodid;
    const imgPath = btn.dataset.imgpath;
    const { error } = await supabase.from("shop_products").delete().eq("id", pid);
    if (error) return alert("Error: " + error.message);
    if (imgPath) await removeFiles([imgPath]);
    await loadProducts(selectedCatalogueId, selectedCatalogueName);
    await loadStats();
    return;
  }

  // Delete catalogue
  if (action === "del-cat") {
    if (!isOwner) return;
    const btn = e.target.closest("[data-action]");
    if (!confirm("Delete this catalogue and all its products?")) return;
    const cid = btn.dataset.catid;
    const coverPath = btn.dataset.coverpath;
    const { data: prods } = await supabase.from("shop_products")
      .select("image_path").eq("catalogue_id", cid);
    const imgPaths = (prods || []).map(x => x.image_path).filter(Boolean);
    await supabase.from("shop_products").delete().eq("catalogue_id", cid);
    await supabase.from("shop_catalogues").delete().eq("id", cid);
    await removeFiles([...imgPaths, coverPath]);
    await loadCatalogues();
    await loadStats();
    return;
  }
});

// ─── BACK TO CATALOGUES ──────────────────────────────────
$("backToCatalogues")?.addEventListener("click", () => {
  loadCatalogues();
  if (addProductPanel) addProductPanel.style.display = "none";
});

// ─── SHARE ───────────────────────────────────────────────
shareBtn?.addEventListener("click", async () => {
  const url = `${location.origin}/shop.html?seller=${sellerId}`;
  if (navigator.share) {
    try { await navigator.share({ title: shopData?.shop_name || "weSPACE Shop", url }); return; }
    catch {}
  }
  await navigator.clipboard.writeText(url).catch(() => {});
  alert("Shop link copied! ✅");
});

// ─── MANAGE TOGGLE ───────────────────────────────────────
manageBtn?.addEventListener("click", () => {
  publicSection.style.display = "none";
  setupSection.style.display = "none";
  manageSection.style.display = "block";
});

$("doneManageBtn")?.addEventListener("click", () => {
  manageSection.style.display = "none";
  publicSection.style.display = "block";
  loadCatalogues();
  loadStats();
});

$("openSetupBtn")?.addEventListener("click", () => {
  setupSection.style.display = "none";
  manageSection.style.display = "block";
});

// ─── SAVE SHOP ───────────────────────────────────────────
$("saveShopBtn")?.addEventListener("click", async () => {
  const name = mShopName.value.trim();
  const city = mCity.value;
  const category = mCategory.value;
  const whatsapp = mWhatsapp.value.trim();

  if (!name) return alert("Enter shop name.");
  if (!city) return alert("Select your city.");
  if (!category) return alert("Select a category.");
  if (!whatsapp) return alert("Enter your WhatsApp number.");

  const btn = $("saveShopBtn");
  btn.textContent = "Saving…";
  btn.disabled = true;

  try {
    let logoUrl = shopData?.logo_url || null;
    let bannerUrl = shopData?.banner_url || null;

    // Upload logo if selected
    if (mLogo.files?.[0]) {
      const path = await uploadFile(currentUid, mLogo.files[0], "logos");
      logoUrl = publicUrl(path);
    }
    // Upload banner if selected
    if (mBanner.files?.[0]) {
      const path = await uploadFile(currentUid, mBanner.files[0], "banners");
      bannerUrl = publicUrl(path);
    }

    const payload = {
      seller_id: currentUid,
      shop_name: name,
      city,
      market: mMarket.value.trim(),
      category,
      whatsapp,
      about: mAbout.value.trim(),
      logo_url: logoUrl,
      banner_url: bannerUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("shops")
      .upsert(payload, { onConflict: "seller_id" });

    if (error) throw error;

    shopData = { ...shopData, ...payload };
    alert("Shop saved ✅");

    // Refresh header
    await renderShopHeader(shopData, verifiedBadge.style.display !== "none");
    mLogo.value = "";
    mBanner.value = "";

  } catch (e) {
    alert("Error: " + (e.message || "Could not save shop."));
  } finally {
    btn.textContent = "💾 Save Shop";
    btn.disabled = false;
  }
});

// ─── CREATE CATALOGUE ────────────────────────────────────
$("createCatBtn")?.addEventListener("click", async () => {
  const name = mCatName.value.trim();
  const file = mCatCover.files?.[0];
  if (!name) return alert("Enter catalogue name.");
  if (!file) return alert("Select a cover image.");

  const btn = $("createCatBtn");
  btn.textContent = "Creating…";
  btn.disabled = true;

  try {
    const coverPath = await uploadFile(currentUid, file, "covers");
    const { error } = await supabase.from("shop_catalogues").insert({
      seller_id: currentUid,
      name,
      cover_image_path: coverPath,
    });
    if (error) throw error;
    mCatName.value = "";
    mCatCover.value = "";
    alert("Catalogue created ✅");
    await loadCatalogues();
    await loadStats();
  } catch (e) {
    alert("Error: " + (e.message || "Could not create catalogue."));
  } finally {
    btn.textContent = "➕ Create Catalogue";
    btn.disabled = false;
  }
});

// ─── ADD PRODUCT ─────────────────────────────────────────
$("addProdBtn")?.addEventListener("click", async () => {
  if (!selectedCatalogueId) return alert("Select a catalogue first.");
  const name = mProdName.value.trim();
  const price = mProdPrice.value.trim();
  const desc = mProdDesc.value.trim();
  const file = mProdImage.files?.[0];

  if (!name) return alert("Enter product name.");
  if (!price) return alert("Enter price.");
  if (!file) return alert("Select product image.");

  const btn = $("addProdBtn");
  btn.textContent = "Adding…";
  btn.disabled = true;

  try {
    const imgPath = await uploadFile(currentUid, file, "products");
    const { error } = await supabase.from("shop_products").insert({
      seller_id: currentUid,
      catalogue_id: selectedCatalogueId,
      product_name: name,
      price_text: price,
      description: desc,
      image_path: imgPath,
    });
    if (error) throw error;
    mProdName.value = "";
    mProdPrice.value = "";
    mProdDesc.value = "";
    mProdImage.value = "";
    alert("Product added ✅");
    await loadProducts(selectedCatalogueId, selectedCatalogueName);
    await loadStats();
  } catch (e) {
    alert("Error: " + (e.message || "Could not add product."));
  } finally {
    btn.textContent = "➕ Add Product";
    btn.disabled = false;
  }
});

// ─── BACK BUTTON ─────────────────────────────────────────
shopBackBtn?.addEventListener("click", () => history.back());

// ─── INIT ────────────────────────────────────────────────
(async function init() {
  sellerId = getParam("seller");

  if (!sellerId) {
    shopName.textContent = "No shop found";
    catalogueGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Missing seller ID.</div>`;
    return;
  }

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  currentUid = session?.user?.id || null;
  isOwner = currentUid === sellerId;

  // Check mode param (manage mode from profile link)
  const mode = getParam("mode");
  if (isOwner && mode === "manage") {
    // Will show manage after setup check below
  }

  // Load shop data
  const { data: shop } = await supabase.from("shops")
    .select("*").eq("seller_id", sellerId).maybeSingle();

  shopData = shop;

  // Check verified
  const { data: verif } = await supabase.from("seller_verifications")
    .select("status").eq("user_id", sellerId).maybeSingle();
  const verified = verif?.status === "approved";

  if (!shop) {
    // No shop profile yet
    shopName.textContent = "Shop";
    shopLocation.textContent = "";

    if (isOwner) {
      // Show setup prompt
      setupSection.style.display = "block";
      publicSection.style.display = "none";
    } else {
      catalogueGrid.innerHTML = `
        <div class="no-shop-card" style="grid-column:1/-1;">
          <div style="font-size:40px;">🏪</div>
          <p style="color:#64748b;margin-top:8px;">This shop hasn't been set up yet.</p>
        </div>`;
    }
    return;
  }

  // Render header
  await renderShopHeader(shop, verified);
  await loadStats();
  await loadCatalogues();

  // Auto-open manage mode if owner came from profile
  if (isOwner && mode === "manage") {
    publicSection.style.display = "none";
    manageSection.style.display = "block";
  }

})();
