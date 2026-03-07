const CACHE_NAME = "wespace-shell-v8";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/css/landing.css",
  "/css/style.css",
  "/js/app-supabase.js",
  "/js/supabaseClient.js",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/site.webmanifest"
];

// Install: cache shell only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isLocal = url.origin === self.location.origin;
  const isSupabaseImage = url.hostname.includes("supabase.co") && /\.(png|jpg|jpeg|webp)$/i.test(url.pathname);

  if (!isLocal && !isSupabaseImage) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  const isImage = /\.(png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
  const isJS = url.pathname.endsWith(".js");
  const isCSS = url.pathname.endsWith(".css");

  // ✅ HTML: network-first, fallback to index.html for offline support
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ✅ JS/CSS: fetch from network for latest code, fallback to cache
  if (isJS || isCSS) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ✅ Images/Icons (Local & Supabase): Cache-first for performance
  if (isImage || isSupabaseImage) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Default: network
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
