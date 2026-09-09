// Service Worker for Photo Shop Log — Network-First with Offline Fallback
// -----------------------------------------------------------------------------
// Strategy: always try the network first so the app never serves a stale
// index.html, but keep a full offline copy in cache as a safety net.
//
// IMPORTANT: Increment CACHE_VERSION every time you update index.html and
// re-upload sw.js to GitHub. This forces all devices to fetch the new files.
// -----------------------------------------------------------------------------
const CACHE_VERSION = "v11";
const CACHE_NAME = "photo-shop-log-cache-" + CACHE_VERSION;

// Core files needed to boot the app with no connection at all.
// Note: the logo is embedded as a base64 data URI directly inside index.html,
// so it needs no separate cache entry — it can never fail to load or go missing.
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Third-party libraries the app depends on (XLSX, html2pdf, Chart.js, Firebase).
// Pre-cached at install so Excel/PDF export and charts keep working offline.
const VENDOR_ASSETS = [
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js",
  "https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore-compat.js"
];

// Requests that must NEVER be intercepted: Firestore uses long-lived streaming
// connections; caching or wrapping them breaks real-time sync.
const BYPASS_HOSTS = [
  "firestore.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "identitytoolkit.googleapis.com",
  "www.googleapis.com"
];

// How long to wait for the network before falling back to cache (ms).
const NETWORK_TIMEOUT_MS = 4000;

// -----------------------------------------------------------------------------
// INSTALL — pre-cache app shell + vendor libraries.
// Each file is cached individually so ONE missing file cannot abort the whole
// install and leave the app with no offline support.
// -----------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.concat(VENDOR_ASSETS).map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("[SW] تعذّر تخزين الملف مسبقًا:", url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// -----------------------------------------------------------------------------
// ACTIVATE — delete all caches from previous versions, then take control.
// -----------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Race the network against a timeout so a stalled connection still falls back.
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network-timeout")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// -----------------------------------------------------------------------------
// FETCH — network-first, cache fallback.
// -----------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (BYPASS_HOSTS.some((host) => url.hostname.endsWith(host))) return;
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    fetchWithTimeout(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.ok &&
          (networkResponse.type === "basic" || networkResponse.type === "cors")
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("./index.html").then(
              (shell) =>
                shell ||
                new Response(
                  "<h1 style='font-family:sans-serif;direction:rtl;text-align:center;margin-top:40px'>التطبيق غير متاح دون اتصال — يرجى الاتصال بالإنترنت مرة واحدة لتحميله.</h1>",
                  { headers: { "Content-Type": "text/html; charset=utf-8" } }
                )
            );
          }
          return new Response("", { status: 504, statusText: "Offline" });
        })
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
