const CACHE_NAME = "lily-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API or HTML pages — always use network
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") return;

  if (request.method !== "GET") return;

  // Only handle static assets (icons, manifest)
  if (!url.pathname.startsWith("/icons/") && url.pathname !== "/manifest.json") return;

  // Network-first strategy for manifest and icons so updates propagate immediately
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
