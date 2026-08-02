/* ==========================================================
   Recipes PWA Service Worker
   App: ریسپیز - M Ijaz GHS 124/NB
   Version: v1.0.0
   ========================================================== */

const CACHE_VERSION = "recipes-v1";
const STATIC_CACHE = CACHE_VERSION;
const FONT_CACHE = "recipes-fonts-v1";
const IMAGE_CACHE = "recipes-images-v1";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./data.js",
  "./manifest.json",

  "./icons/icon-96.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png",

  "./screenshots/screenshot-narrow-1.png",
  "./screenshots/screenshot-wide-1.png",

  "./offline.html"
];

const FONT_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

/* ===========================
   INSTALL
=========================== */

self.addEventListener("install", (event) => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(STATIC_CACHE).then(async (cache) => {

      for (const asset of APP_ASSETS) {

        try {

          await cache.add(asset);

        } catch (e) {

          console.warn("[SW] Skip:", asset);

        }

      }

    })

  );

});

/* ===========================
   ACTIVATE
=========================== */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    (async () => {

      const keys = await caches.keys();

      await Promise.all(

        keys
          .filter((key) =>
            ![
              STATIC_CACHE,
              FONT_CACHE,
              IMAGE_CACHE
            ].includes(key)
          )
          .map((key) => caches.delete(key))

      );

      if ("navigationPreload" in self.registration) {

        await self.registration.navigationPreload.enable();

      }

      await self.clients.claim();

    })()

  );

});

/* ===========================
   MESSAGE
=========================== */

self.addEventListener("message", (event) => {

  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

});

/* ===========================
   HELPERS
=========================== */

function isFont(url) {

  return FONT_HOSTS.includes(url.hostname);

}

function isImage(request) {

  return request.destination === "image";

}
/* ==========================================================
   FETCH EVENT
========================================================== */

self.addEventListener("fetch", (event) => {

  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  /* ---------- Google Fonts ---------- */

  if (isFont(url)) {

    event.respondWith(

      caches.open(FONT_CACHE).then(async (cache) => {

        const cached = await cache.match(request);

        if (cached) return cached;

        try {

          const response = await fetch(request);

          if (response.ok) {
            cache.put(request, response.clone());
          }

          return response;

        } catch {

          return cached || Response.error();

        }

      })

    );

    return;

  }

  /* ---------- Images (Cache First) ---------- */

  if (isImage(request)) {

    event.respondWith(

      caches.open(IMAGE_CACHE).then(async (cache) => {

        const cached = await cache.match(request, {
          ignoreSearch: true
        });

        if (cached) return cached;

        try {

          const response = await fetch(request);

          if (response.ok) {

            cache.put(request, response.clone());

            trimCache(IMAGE_CACHE, 80);

          }

          return response;

        } catch {

          return caches.match("./icons/icon-192.png");

        }

      })

    );

    return;

  }

  /* ---------- HTML Pages (Network First) ---------- */

  if (request.mode === "navigate") {

    event.respondWith(

      (async () => {

        try {

          const network = await fetch(request);

          const cache = await caches.open(STATIC_CACHE);

          cache.put(request, network.clone());

          return network;

        } catch {

          return (
            await caches.match(request) ||
            await caches.match("./offline.html") ||
            await caches.match("./index.html")
          );

        }

      })()

    );

    return;

  }

  /* ---------- CSS / JS / JSON ---------- */

  event.respondWith(

    caches.match(request, {
      ignoreSearch: true
    }).then(async (cached) => {

      const fetchPromise = fetch(request)
        .then(async (response) => {

          if (response.ok) {

            const cache = await caches.open(STATIC_CACHE);

            cache.put(request, response.clone());

          }

          return response;

        })
        .catch(() => cached);

      return cached || fetchPromise;

    })

  );

});
/* ==========================================================
   CACHE CLEANUP
========================================================== */

async function trimCache(cacheName, maxItems = 80) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  while (keys.length > maxItems) {
    await cache.delete(keys[0]);
    keys.shift();
  }
}

/* ==========================================================
   OPTIONAL BACKGROUND SYNC
========================================================== */

self.addEventListener("sync", (event) => {
  if (event.tag === "recipes-sync") {
    event.waitUntil(Promise.resolve());
  }
});

/* ==========================================================
   OPTIONAL PUSH NOTIFICATIONS
========================================================== */

self.addEventListener("push", (event) => {

  const data = event.data
    ? event.data.json()
    : {
        title: "ریسپیز",
        body: "نئی ریسپی دستیاب ہے۔"
      };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-96.png"
    })
  );

});

/* ==========================================================
   NOTIFICATION CLICK
========================================================== */

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {

      for (const client of clientList) {
        if (client.url.includes("./") && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("./");
      }

    })

  );

});

/* ==========================================================
   END OF SERVICE WORKER
========================================================== */
