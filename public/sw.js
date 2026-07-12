const CACHE_NAME = "my-vault-v2";

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

  // Only cache static assets (icons, manifest)
  if (!url.pathname.startsWith("/icons/") && url.pathname !== "/manifest.json") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
