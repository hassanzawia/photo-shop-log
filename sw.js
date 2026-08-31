// Service Worker for Photo Shop Log — Network-First Strategy
// This version prioritizes fetching the LATEST files from the network first,
// and only falls back to the cache if the device is offline.
// This prevents the "phone shows update but web doesn't" problem caused by
// aggressive caching in the previous version.

// IMPORTANT: Increment this version number every time you update index.html
// and re-upload sw.js to GitHub. This forces all browsers/devices to fetch
// the new files instead of continuing to use an old cached copy.
const CACHE_VERSION = "v2";
const CACHE_NAME = "photo-shop-log-cache-" + CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install: pre-cache the app shell, then activate immediately (skip waiting)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches from previous versions, then take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST strategy.
// Always try to get the freshest file from the network first.
// Only use the cached copy if the network request fails (i.e. offline).
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Save a fresh copy to cache for offline use later
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: serve from cache if available
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("./index.html");
        });
      })
  );
});
