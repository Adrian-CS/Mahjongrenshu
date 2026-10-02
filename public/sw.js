// Offline support for the installed PWA. Bump VERSION to drop old caches.
const VERSION = "v1";
const CACHE = `nanikiru-${VERSION}`;
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/tiles/1m.svg",
  "/tiles/1p.svg",
  "/tiles/1s.svg",
  "/tiles/1z.svg",
  "/tiles/2m.svg",
  "/tiles/2p.svg",
  "/tiles/2s.svg",
  "/tiles/2z.svg",
  "/tiles/3m.svg",
  "/tiles/3p.svg",
  "/tiles/3s.svg",
  "/tiles/3z.svg",
  "/tiles/4m.svg",
  "/tiles/4p.svg",
  "/tiles/4s.svg",
  "/tiles/4z.svg",
  "/tiles/5m.svg",
  "/tiles/5p.svg",
  "/tiles/5s.svg",
  "/tiles/5z.svg",
  "/tiles/6m.svg",
  "/tiles/6p.svg",
  "/tiles/6s.svg",
  "/tiles/6z.svg",
  "/tiles/7m.svg",
  "/tiles/7p.svg",
  "/tiles/7s.svg",
  "/tiles/7z.svg",
  "/tiles/8m.svg",
  "/tiles/8p.svg",
  "/tiles/8s.svg",
  "/tiles/9m.svg",
  "/tiles/9p.svg",
  "/tiles/9s.svg",
  "/tiles/front.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Network first so deploys show up; fall back to the cached shell offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets (hashed Next.js chunks, tiles, icons): cache first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
