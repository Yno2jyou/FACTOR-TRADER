/* FACTOR/TRADER Service Worker — offline shell + CDN cache */
const CACHE_VERSION = "ft-pwa-v1";
const SHELL_CACHE = CACHE_VERSION + "-shell";
const CDN_CACHE = CACHE_VERSION + "-cdn";

const SHELL_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-32x32.png",
  "./favicon-16x16.png",
  "./favicon-48x48.png",
  "./apple-touch-icon.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
];

const CDN_HOSTS = [
  "cdnjs.cloudflare.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort precache; missing files must not fail install
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res && res.ok) await cache.put(url, res);
          } catch (e) {
            /* ignore */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ft-pwa-") && k !== SHELL_CACHE && k !== CDN_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isCdnRequest(url) {
  try {
    const u = new URL(url);
    return CDN_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch (e) {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = req.url;

  // Navigation: network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          try {
            await cache.put("./", net.clone());
            await cache.put("./index.html", net.clone());
          } catch (e) {
            /* ignore */
          }
          return net;
        } catch (e) {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match("./index.html")) ||
            (await cache.match("./")) ||
            (await cache.match(req)) ||
            new Response("オフラインです。ネットワーク接続を確認してください。", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  // Same-origin assets: cache-first
  try {
    const u = new URL(url);
    if (u.origin === self.location.origin) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(SHELL_CACHE);
          const hit = await cache.match(req);
          if (hit) return hit;
          try {
            const net = await fetch(req);
            if (net && net.ok) {
              try {
                await cache.put(req, net.clone());
              } catch (e) {
                /* ignore */
              }
            }
            return net;
          } catch (e) {
            return (
              hit ||
              new Response("", { status: 504, statusText: "Offline" })
            );
          }
        })()
      );
      return;
    }
  } catch (e) {
    /* fall through */
  }

  // CDN (React / Babel / PeerJS): stale-while-revalidate
  if (isCdnRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CDN_CACHE);
        const hit = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(async (net) => {
            if (net && net.ok) {
              try {
                await cache.put(req, net.clone());
              } catch (e) {
                /* ignore */
              }
            }
            return net;
          })
          .catch(() => null);
        if (hit) {
          event.waitUntil(fetchPromise);
          return hit;
        }
        const net = await fetchPromise;
        if (net) return net;
        return new Response("", { status: 504, statusText: "Offline CDN" });
      })()
    );
  }
});
