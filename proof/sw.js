// Offline support: the app shell is cached so Proof opens without signal.
// Bump VERSION whenever you change any file below, so phones get the update.
const VERSION = 'proof-v14';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/auth.js', 'js/billing.js', 'js/coach.js', 'js/install.js', 'js/capture.js', 'js/club.js', 'js/config.js', 'js/data.js', 'js/db.js',
  'js/icons.js', 'js/onboarding.js', 'js/planner.js', 'js/speech.js', 'js/proff.js', 'js/proff-qa.js', 'js/reminders.js', 'js/proofview.js', 'js/sheet.js', 'js/state.js', 'js/stats.js',
  'js/statsview.js', 'js/today.js', 'js/util.js', 'js/vault.js', 'js/welcome.js',
  'vendor/supabase-2.45.4.js', 'icons/icon.svg', 'icons/favicon.svg', 'icons/icon-32.png', 'icons/icon-maskable-512.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first for our own files (fresh when online), cache when offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

// Reminders from Proff, sent by the server even when Proof is closed.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Proff', {
    body: d.body || 'Time to post proof.',
    tag: d.tag || 'proof',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: d.url || './' },
  }));
});

// Tapping a reminder opens Proof (or brings it to the front).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
