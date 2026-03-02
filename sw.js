const CACHE_NAME = "wespace-shell-v5";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/css/landing.css",
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
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

  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  const isImage = /\.(png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
  const isJS = url.pathname.endsWith(".js");
  const isCSS = url.pathname.endsWith(".css");

  // ✅ HTML: network-first, but DO NOT cache per-page HTML
  // fallback only to cached index.html so the app still opens
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ✅ JS/CSS: ALWAYS network (prevents stale code issues)
  if (isJS || isCSS) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ Images/icons: cache-first
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

  // Default: network
  event.respondWith(fetch(req));

});

