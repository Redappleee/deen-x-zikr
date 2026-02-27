const CACHE_NAME = "deenxzikr-v4";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", OFFLINE_URL, "/manifest.webmanifest"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Never cache auth/api endpoints. OAuth/session requests must always hit network.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  // Do not cache auth pages/routes to avoid stale OAuth state.
  if (url.origin === self.location.origin && url.pathname.startsWith("/auth")) {
    return;
  }

  // Avoid caching dev HMR traffic.
  if (url.pathname.includes("/_next/webpack-hmr")) {
    return;
  }

  // For navigation requests, use network-first without page caching so session/account state stays fresh.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Cache static assets only.
  const isStaticAsset =
    (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) ||
    (url.origin === self.location.origin && url.pathname.startsWith("/icons/")) ||
    (url.origin === self.location.origin && url.pathname === "/manifest.webmanifest");

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && (response.type === "basic" || response.type === "default")) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title ?? "Deen X Zikr";
  const options = {
    body: payload.body ?? "Prayer reminder",
    icon: "/icons/icon.svg",
    badge: "/icons/icon-maskable.svg",
    tag: payload.tag ?? "prayer-reminder",
    data: {
      url: payload.url ?? "/salah"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/salah";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url.includes(targetUrl));
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
