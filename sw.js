// Service worker: shows the "order ready" notification even when the
// browser is in the background or closed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "طلبك جاهز!";
  const options = {
    body: data.body || "تفضّل للكاونتر واستلم طلبك.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "order-" + (data.no || "ready"),
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 800],
    data: { url: data.url || "/" },
    lang: "ar",
    dir: "rtl"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.split("#")[0] === new URL(url, self.location.origin).href) { return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
