/* eslint-disable no-restricted-globals */
/**
 * Service worker for push notifications.
 *
 * Notifications shown from here carry OUR icon and badge. Once the site is
 * installed as an app, the OS also shows OUR name instead of the browser's.
 */

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";
const CACHE = "portfolio-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE_URL, ICON, BADGE]))
      .catch(() => {}),
  );
  // Take over immediately so the first subscription works without a reload
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
        ),
    ]),
  );
});

/**
 * A fetch handler is what makes the browser treat this site as installable,
 * and it also means a lost connection shows our own offline page instead of
 * the browser's dinosaur. Everything is network-first: the app is dynamic,
 * so a stale cache would be worse than a spinner.
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || Response.error()),
      ),
    );
    return;
  }

  // Icons and the badge must survive offline so notifications still look right
  if (req.url.includes("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req)),
    );
  }
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

  // The server decides where each notification type belongs for that role
  const target = event.notification.data?.url || "/";
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // Already looking at the right page? Just focus it.
        const exact = list.find((c) => c.url === absolute);
        if (exact) return exact.focus();

        for (const client of list) {
          if ("focus" in client) {
            return Promise.resolve(client.focus()).then((c) => {
              const win = c || client;
              if ("navigate" in win) return win.navigate(absolute).catch(() => {});
            });
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(absolute);
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
    data: { url: msg.url || "/" },
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
