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
