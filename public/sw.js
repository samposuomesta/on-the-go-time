const CACHE_NAME = 'timetrack-v10';
const OFFLINE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  // Do NOT skipWaiting automatically — wait for user to accept update
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
  );
});

// Web Push notification handler
self.addEventListener('push', (event) => {
  // Always provide non-empty defaults so iOS/Safari never drops the notification
  let data = {
    title: 'TAika',
    body: 'You have a new notification',
    type: 'general',
    icon: '/manifest-icon-192.maskable.png',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: typeof parsed.title === 'string' && parsed.title ? parsed.title : data.title,
        body: typeof parsed.body === 'string' && parsed.body ? parsed.body : data.body,
        type: typeof parsed.type === 'string' && parsed.type ? parsed.type : data.type,
        icon: typeof parsed.icon === 'string' && parsed.icon ? parsed.icon : data.icon,
      };
    } catch (e) {
      const txt = event.data.text();
      if (txt) data.body = txt;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/manifest-icon-192.maskable.png',
    vibrate: [100, 50, 100],
    data: { type: data.type },
    actions: [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
