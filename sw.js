// service-worker.js (REPLACE your whole file with this)

const CACHE_NAME = "wespace-shell-v7"; // bump version whenever you deploy

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/home.html",              // keep if you use it (safe even if 404; but better if it exists)
  "/css/landing.css",
  "/css/style.css",

  // your app modules (from your folder screenshot)
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

// Install: cache shell
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

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  const isImage = /\.(png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
  const isJS = url.pathname.endsWith(".js");
  const isCSS = url.pathname.endsWith(".css");

  // HTML: network-first, fallback to cached index.html (app still opens offline)
  if (isHTML) {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  // JS/CSS: cache-first for FAST PWA start
  if (isJS || isCSS) {
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

  // Images/icons: cache-first
  if (isImage) {
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

  // Default: network, fallback to cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});


