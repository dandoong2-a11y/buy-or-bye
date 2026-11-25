/* BUY or BYE? 서비스 워커: 오프라인에서도 열리게 하고, 기기 알림 클릭을 처리해요. */
const V = 'bob-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // 페이지: 인터넷이 되면 항상 최신, 안 되면 저장된 것
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => { const copy = res.clone(); caches.open(V).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // 글꼴·아이콘 등: 저장된 것을 먼저 보여주고 뒤에서 새로 받아 둬요
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
