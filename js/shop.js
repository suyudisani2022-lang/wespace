// js/shop.js
import { supabase } from "./supabaseClient.js";

const qs = (id) => document.getElementById(id);

// --------------------
// ELEMENTS
// --------------------
const shopBackBtn = qs("shopBackBtn");
const shopTitle = qs("shopTitle");
const shopHint = qs("shopHint");
const copyShopLinkBtn = qs("copyShopLinkBtn");

// ✅ NEW: badge element from updated shop.html
const shopVerifiedBadge = qs("shopVerifiedBadge");

const ownerCatalogueBox = qs("ownerCatalogueBox");
const catName = qs("catName");
const catCover = qs("catCover");
const createCatalogueBtn = qs("createCatalogueBtn");
const catalogueGrid = qs("catalogueGrid");

const catalogueView = qs("catalogueView");
const catalogueNameTitle = qs("catalogueNameTitle");

const ownerProductBox = qs("ownerProductBox");
const prodName = qs("prodName"); // (must exist in shop.html)
const prodPrice = qs("prodPrice");
const prodImage = qs("prodImage");
const productName = qs("productName");
const addProductBtn = qs("addProductBtn");
const productGrid = qs("productGrid");

// Fullscreen modal (must exist in shop.html)
const imgModal = qs("imgModal");
const imgModalImg = qs("imgModalImg");
const imgModalClose = qs("imgModalClose");

// --------------------
// CONFIG
// --------------------
const BUCKET = "shop-products";

// --------------------
// STATE
// --------------------
let sellerId = null;
let isOwner = false;
let selectedCatalogueId = null;
let selectedCatalogueName = "";
let sellerWa = "";

// --------------------
// HELPERS
// --------------------
const escapeHtml = (str) =>
  String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function getSellerIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("seller");
}

function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function getModeFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("mode") || "view").toLowerCase(); // default = view
}
function formatWaNumber(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  let n = v.replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "234" + n.slice(1);
  return n;
}

async function getUidOrNull() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("getSession error:", error);
    return null;
  }
  return session?.user?.id || null;
}

async function uploadToBucket(uid, file, folder) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filePath = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (upErr) throw upErr;
  return filePath;
}

async function removeFilesFromBucket(paths) {
  const clean = (paths || []).filter(Boolean);
  if (!clean.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(clean);
  if (error) console.warn("storage.remove warning:", error);
}

// Option A: WhatsApp from seller profile
async function loadSellerWa() {
  sellerWa = "";
  if (!sellerId) return "";

  const { data, error } = await supabase
    .from("profiles")
    .select("wa")
    .eq("id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("loadSellerWa error:", error);
    return "";
  }

  sellerWa = (data?.wa || "").trim();
  return sellerWa;
}

// --------------------
// ✅ VERIFIED BADGE (SHOP)
// --------------------
async function applyShopVerifiedBadge(ownerId) {
  if (!shopVerifiedBadge || !ownerId) return;

  const { data, error } = await supabase
    .from("seller_verifications")
    .select("status")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (error) {
    console.warn("applyShopVerifiedBadge error:", error);
    shopVerifiedBadge.style.display = "none";
    return;
  }

  shopVerifiedBadge.style.display = (data?.status === "approved") ? "inline-block" : "none";
}

// --------------------
// FULLSCREEN MODAL
// --------------------
function openImageModal(src) {
  if (!imgModal || !imgModalImg) return;
  imgModalImg.src = src;
  imgModal.classList.add("show");
  imgModal.setAttribute("aria-hidden", "false");
}

function closeImageModal() {
  if (!imgModal || !imgModalImg) return;
  imgModal.classList.remove("show");
  imgModal.setAttribute("aria-hidden", "true");
  imgModalImg.src = "";
}

imgModalClose?.addEventListener("click", closeImageModal);

imgModal?.addEventListener("click", (e) => {
  if (e.target === imgModal) closeImageModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImageModal();
});

// --------------------
// LOAD CATALOGUES
// --------------------
async function loadCatalogues() {
  if (!sellerId) return;

  if (catalogueView) catalogueView.style.display = "none";
  selectedCatalogueId = null;
  selectedCatalogueName = "";

  const { data, error } = await supabase
    .from("shop_catalogues")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    catalogueGrid.innerHTML = `<p class="empty-state">Could not load catalogues.</p>`;
    return;
  }

  const list = data || [];
  if (!list.length) {
    catalogueGrid.innerHTML = `<p class="empty-state">No catalogues yet.</p>`;
    return;
  }

  catalogueGrid.innerHTML = list.map(c => {
    const cover = c.cover_image_path ? publicUrl(c.cover_image_path) : "";
    return `
      <div class="shop-card-wrap">
        <button class="shop-card" data-catid="${c.id}" data-coverpath="${escapeHtml(c.cover_image_path || "")}" type="button">
          <div class="shop-card-img">
            ${cover ? `<img src="${escapeHtml(cover)}" alt="cover" />` : `<div class="empty-state">No cover</div>`}
          </div>
          <div class="shop-card-title">${escapeHtml(c.name)}</div>
        </button>

        ${isOwner ? `
          <button class="shop-del-cat" type="button"
            data-action="delete-catalogue"
            data-catid="${c.id}"
            data-coverpath="${escapeHtml(c.cover_image_path || "")}"
            title="Delete catalogue">🗑️</button>
        ` : ``}
      </div>
    `;
  }).join("");
}

// --------------------
// LOAD PRODUCTS
// --------------------
async function loadProducts(catalogueId, catalogueName) {
  selectedCatalogueId = catalogueId;
  selectedCatalogueName = catalogueName || "Catalogue";

  if (catalogueNameTitle) catalogueNameTitle.textContent = selectedCatalogueName;
  if (catalogueView) catalogueView.style.display = "block";

  if (!sellerWa) await loadSellerWa();
  const wa = formatWaNumber(sellerWa);

  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("catalogue_id", catalogueId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    productGrid.innerHTML = `<p class="empty-state">Could not load products.</p>`;
    return;
  }

  const list = data || [];
  if (!list.length) {
    productGrid.innerHTML = `<p class="empty-state">No products yet.</p>`;
    return;
  }

  productGrid.innerHTML = list.map(p => {
    const img = p.image_path ? publicUrl(p.image_path) : "";
    const name = (p.product_name || "").trim();

    return `
      <div class="shop-tile" data-prodid="${p.id}">
        <div class="shop-tile-img">
          ${img ? `<img src="${escapeHtml(img)}" alt="product" data-action="view-image" />` : `<div class="empty-state">No image</div>`}
          <div class="shop-tile-name">${p.product_name || ""}</div>
          <div class="shop-tile-price">${escapeHtml(p.price_text || "")}</div>
          ${isOwner ? `<button class="delete-product" data-id="${p.id}">🗑️</button>` : ""}

          <button
            type="button"
            class="shop-wa-icon"
            data-action="shop-contact"
            data-phone="${escapeHtml(wa)}"
            data-product="${escapeHtml(name || "a product")}"
            ${wa ? "" : "disabled"}
            title="Contact on WhatsApp"
            aria-label="Contact on WhatsApp"
          >
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp">
          </button>

          ${isOwner ? `
            <button class="shop-del-prod" type="button"
              data-action="delete-product"
              data-prodid="${p.id}"
              data-imgpath="${escapeHtml(p.image_path || "")}"
              title="Delete product">🗑️</button>
          ` : ``}
        </div>

        <div class="shop-tile-name">${escapeHtml(name || "Unnamed product")}</div>
      </div>
    `;
  }).join("");
}

// --------------------
// OWNER: CREATE CATALOGUE
// --------------------
createCatalogueBtn?.addEventListener("click", async () => {
  const name = (catName.value || "").trim();
  const file = catCover.files?.[0];

  if (!name) return alert("Enter catalogue name.");
  if (!file) return alert("Select a cover image.");

  try {
    const uid = await getUidOrNull();
    if (!uid) return alert("Please log in again.");

    if (uid !== sellerId) return alert("You can only create catalogues in your own shop.");

    const coverPath = await uploadToBucket(uid, file, "covers");

    const { error } = await supabase
      .from("shop_catalogues")
      .insert({ seller_id: uid, name, cover_image_path: coverPath });

    if (error) throw error;

    catName.value = "";
    catCover.value = "";

    alert("Catalogue created ✅");
    await loadCatalogues();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Could not create catalogue.");
  }
});

// --------------------
// OWNER: ADD PRODUCT
// --------------------
addProductBtn?.addEventListener("click", async () => {
  if (!selectedCatalogueId) return alert("Open a catalogue first.");

  const name = (productName.value || "").trim();
  const price = (prodPrice.value || "").trim();
  const file = prodImage.files?.[0];

  if (!name) return alert("Enter product name.");
  if (!price) return alert("Enter price.");
  if (!file) return alert("Select product image.");

  try {
    const uid = await getUidOrNull();
    if (!uid) return alert("Please log in again.");

    if (uid !== sellerId) return alert("You can only add products in your own shop.");

    const imgPath = await uploadToBucket(uid, file, "products");

    const { error } = await supabase
      .from("shop_products")
      .insert({
        seller_id: uid,
        catalogue_id: selectedCatalogueId,
        product_name: name,
        price_text: price,
        image_path: imgPath,
      });

    if (error) throw error;

    if (prodName) prodName.value = "";
    prodPrice.value = "";
    prodImage.value = "";

    alert("Product added ✅");
    await loadProducts(selectedCatalogueId, selectedCatalogueName);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Could not add product.");
  }
});

// --------------------
// DELETE PRODUCT
// --------------------
async function deleteProduct(productId, imagePath) {
  if (!isOwner) return;
  const ok = confirm("Delete this product?");
  if (!ok) return;

  try {
    const { error } = await supabase.from("shop_products").delete().eq("id", productId);
    if (error) throw error;

    if (imagePath) await removeFilesFromBucket([imagePath]);

    alert("Product deleted ✅");
    if (selectedCatalogueId) await loadProducts(selectedCatalogueId, selectedCatalogueName);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Could not delete product.");
  }
}

// --------------------
// DELETE CATALOGUE (and its products)
// --------------------
async function deleteCatalogue(catalogueId, coverPath) {
  if (!isOwner) return;
  const ok = confirm("Delete this catalogue and all products inside it?");
  if (!ok) return;

  try {
    const { data: prods, error: pErr } = await supabase
      .from("shop_products")
      .select("id, image_path")
      .eq("catalogue_id", catalogueId);

    if (pErr) throw pErr;

    const imgPaths = (prods || []).map(x => x.image_path).filter(Boolean);

    const { error: delProdErr } = await supabase
      .from("shop_products")
      .delete()
      .eq("catalogue_id", catalogueId);

    if (delProdErr) throw delProdErr;

    const { error: delCatErr } = await supabase
      .from("shop_catalogues")
      .delete()
      .eq("id", catalogueId);

    if (delCatErr) throw delCatErr;

    await removeFilesFromBucket(imgPaths);
    if (coverPath) await removeFilesFromBucket([coverPath]);

    alert("Catalogue deleted ✅");

    if (selectedCatalogueId === catalogueId) {
      selectedCatalogueId = null;
      selectedCatalogueName = "";
      if (catalogueView) catalogueView.style.display = "none";
      if (productGrid) productGrid.innerHTML = "";
    }

    await loadCatalogues();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Could not delete catalogue.");
  }
}

// --------------------
// GLOBAL CLICKS
// --------------------
document.addEventListener("click", async (e) => {
  const card = e.target.closest(".shop-card");
  if (card) {
    const id = card.getAttribute("data-catid");
    const name = card.querySelector(".shop-card-title")?.textContent || "Catalogue";
    if (id) await loadProducts(id, name);
    return;
  }

  const delBtn = e.target.closest(".delete-product");
  if (delBtn) {
    e.preventDefault();

    const productId =
      delBtn.getAttribute("data-id") ||
      delBtn.dataset.id ||
      delBtn.closest(".shop-tile")?.dataset?.id;

    const imagePath =
      delBtn.getAttribute("data-img") ||
      delBtn.dataset.img ||
      delBtn.closest(".shop-tile")?.dataset?.img;

    if (!productId) {
      alert("Missing product id (data-id).");
      return;
    }

    const ok = confirm("Delete this product?");
    if (!ok) return;

    const { error: dbErr } = await supabase
      .from("shop_products")
      .delete()
      .eq("id", productId);

    if (dbErr) {
      console.error("DB delete error:", dbErr);
      alert("Delete failed: " + (dbErr.message || "DB error"));
      return;
    }

    if (imagePath) {
      const { error: stErr } = await supabase.storage
        .from("shop-products")
        .remove([imagePath]);

      if (stErr) console.warn("Storage remove warning:", stErr);
    }

    const tile = delBtn.closest(".shop-tile");
    if (tile) tile.remove();

    alert("Product deleted ✅");
    return;
  }

  const img = e.target.closest("[data-action='view-image']");
  if (img) {
    const src = img.getAttribute("src");
    if (src) openImageModal(src);
    return;
  }

  const waBtn = e.target.closest("[data-action='shop-contact']");
  if (waBtn) {
    const phoneRaw = waBtn.getAttribute("data-phone") || "";
    const product = waBtn.getAttribute("data-product") || "a product";
    const phone = formatWaNumber(phoneRaw);

    if (!phone) return alert("No WhatsApp number available for this seller.");

    const msg = encodeURIComponent(`Hello, I saw your product on weSPACE Shop: ${product}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    return;
  }

  const delProdBtn = e.target.closest("[data-action='delete-product']");
  if (delProdBtn) {
    const pid = delProdBtn.getAttribute("data-prodid");
    const imgPath = delProdBtn.getAttribute("data-imgpath") || "";
    if (pid) await deleteProduct(pid, imgPath);
    return;
  }

  const delCatBtn = e.target.closest("[data-action='delete-catalogue']");
  if (delCatBtn) {
    const cid = delCatBtn.getAttribute("data-catid");
    const coverPath = delCatBtn.getAttribute("data-coverpath") || "";
    if (cid) await deleteCatalogue(cid, coverPath);
    return;
  }
});

// --------------------
// BACK
// --------------------
shopBackBtn?.addEventListener("click", () => history.back());

// --------------------
// INIT
// --------------------
(async function init() {
  sellerId = getSellerIdFromUrl();

  if (!sellerId) {
    shopTitle.textContent = "Shop";
    shopHint.textContent = "No seller selected";
    catalogueGrid.innerHTML = `<p class="empty-state">Missing seller id.</p>`;
    ownerCatalogueBox.style.display = "none";
    ownerProductBox.style.display = "none";
    return;
  }

  // ✅ Show Verified badge on shop header
  await applyShopVerifiedBadge(sellerId);

  await loadSellerWa();

  const first = await supabase.auth.getSession();
  let session = first.data?.session || null;

  if (!session) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data?.session || null;
  }

  const uid = session?.user?.id || null;

  shopTitle.textContent = isOwner ? "My Shop" : "Shop";
  shopHint.textContent = isOwner ? "Create catalogues and add products" : "Browse catalogues";
  const mode = getModeFromUrl(); // "view" | "manage"

  const ownerMatch = uid === sellerId;

  isOwner = ownerMatch && mode === "manage";

  ownerCatalogueBox.style.display = isOwner ? "" : "none";
  ownerProductBox.style.display = isOwner ? "" : "none";

  shopTitle.textContent = ownerMatch ? (isOwner ? "My Shop (Manage)" : "My Shop") : "Shop";
  shopHint.textContent = isOwner
    ? "Manage your catalogues and products"
    : "Browse catalogues";

  await loadCatalogues();
})();