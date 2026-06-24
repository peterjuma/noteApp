/* eslint-disable no-restricted-globals */
const CACHE_NAME = "noteapp-v4";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
];

// Install: precache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Don't skipWaiting automatically — let the app control when to activate
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Listen for skipWaiting message from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// --- Caching Strategies ---

// Stale-while-revalidate: serve cached, fetch update in background
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
}

// Cache-first: serve from cache, fallback to network (and cache the response)
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  });
}

// Fetch: network-first for navigation, stale-while-revalidate for JS/JSON, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets (fonts, images): cache-first
  if (
    request.url.endsWith(".svg") ||
    request.url.endsWith(".ico") ||
    request.url.endsWith(".woff2") ||
    request.url.endsWith(".woff") ||
    request.url.endsWith(".png") ||
    request.url.endsWith(".jpg")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // JS, CSS, JSON: stale-while-revalidate (serve fast, update in background)
  if (
    request.url.includes("/static/") ||
    request.url.endsWith(".js") ||
    request.url.endsWith(".css") ||
    request.url.endsWith(".json")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// --- Background Sync ---
// Queue failed sync operations and retry when connectivity is restored
self.addEventListener("sync", (event) => {
  if (event.tag === "noteapp-gist-sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "BACKGROUND_SYNC", tag: "noteapp-gist-sync" });
        });
      })
    );
  }
});

// --- Periodic Background Sync ---
// Refresh content periodically so the app is fresh when opened
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "noteapp-periodic-sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PERIODIC_SYNC", tag: "noteapp-periodic-sync" });
        });
      })
    );
  }
});
