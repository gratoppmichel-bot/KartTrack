const CACHE = "karttrack-v2";
const PRECACHE = ["/offline"];
// Pages that are kept for offline use after the first online visit
const OFFLINE_PAGES = ["/", "/sessions/new"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
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

// The login page asks us to forget cached (user specific) pages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-pages") {
    event.waitUntil(
      caches.open(CACHE).then((cache) => Promise.all(OFFLINE_PAGES.map((p) => cache.delete(p)))),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first; remember the whole-app pages, fall back to cache, then to /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (OFFLINE_PAGES.includes(url.pathname) && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(url.pathname)) || (await cache.match("/offline")) || Response.error();
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        return cached || network;
      }),
    );
  }
});

// Web Push: show the notification and open the app when it is clicked
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "KartTrack", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
