const APP_CACHE = "cetmaps-shell-v1";
const DATA_CACHE = "cetmaps-data-v1";
const TILE_CACHE = "cetmaps-tiles-v1";
const APP_ASSETS = [
  "/",
  "/index.html",
  "/src/styles.css",
  "/src/app.js",
  "/manifest.webmanifest",
  "/data/buildings.geojson",
  "/data/landmarks.geojson",
  "/data/hostels.geojson",
  "/data/paths.geojson",
  "/data/cet_loc_v1.geojson",
  "/public/icons/icon-192.svg",
  "/public/icons/icon-512.svg",
  "/public/logo.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_CACHE, DATA_CACHE, TILE_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (url.hostname.includes("tile.openstreetmap.org")) {
    event.respondWith(cacheFirstLimit(TILE_CACHE, request, 180));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/data/")) {
    event.respondWith(staleWhileRevalidate(DATA_CACHE, request));
    return;
  }

  const normalizedPath = sameOrigin ? url.pathname : request.url;
  const isPrecachedAsset = APP_ASSETS.includes(normalizedPath);

  if (request.mode === "navigate" || isPrecachedAsset || sameOrigin) {
    event.respondWith(networkFirst(APP_CACHE, request));
    return;
  }
});

async function cacheFirstLimit(cacheName, request, maxEntries = 120) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.status === 200) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await cache.delete(keys[0]);
    }
  }
  return response;
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response.clone();
    })
    .catch(() => cached);

  return cached || networkFetch;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}
