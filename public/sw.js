// A propósito sin manejar "fetch" — eso lo volvería offline-first, con
// riesgo de mostrar catálogo/stock viejo como si fuera actual. Este service
// worker existe solo para dos cosas: que Chrome considere el sitio
// instalable, y poder recibir notificaciones push (que necesitan sí o sí un
// service worker activo, incluso con la app cerrada).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ModaShop", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "ModaShop", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
