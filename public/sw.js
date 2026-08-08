/* eslint-disable no-restricted-globals */
/**
 * Service worker for push notifications.
 *
 * Notifications shown from here carry OUR icon and badge. Once the site is
 * installed as an app, the OS also shows OUR name instead of the browser's.
 */

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";

self.addEventListener("install", () => {
  // Take over immediately so the first subscription works without a reload
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New activity", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "New activity";
  const options = {
    body: data.body || "",
    icon: data.icon || ICON,
    badge: BADGE,
    image: data.image || undefined,
    // Same tag replaces an existing notification instead of stacking
    tag: data.tag || `n-${Date.now()}`,
    renotify: !!data.tag,
    requireInteraction: !!data.requireInteraction,
    silent: false,
    timestamp: data.timestamp || Date.now(),
    data: { url: data.url || "/dashboard", id: data.id || null },
    actions: data.actions || [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
    vibrate: [90, 40, 90],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const target = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // Reuse an open tab on this origin when there is one
        for (const client of list) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(target).catch(() => {});
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});

/** Lets the page raise a notification through the SW (own icon, actions). */
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type !== "SHOW_NOTIFICATION") return;

  const options = {
    body: msg.body || "",
    icon: msg.icon || ICON,
    badge: BADGE,
    tag: msg.tag || `local-${Date.now()}`,
    renotify: !!msg.tag,
    data: { url: msg.url || "/dashboard" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
    vibrate: [90, 40, 90],
  };

  const done = self.registration
    .showNotification(msg.title || "Notification", options)
    .then(() => ({ ok: true, title: msg.title, options }))
    .catch((err) => ({ ok: false, error: String(err) }));

  // Reply when the caller opened a MessageChannel (used by diagnostics)
  const port = event.ports && event.ports[0];
  if (port) {
    event.waitUntil(done.then((result) => port.postMessage(result)));
  } else {
    event.waitUntil(done);
  }
});
