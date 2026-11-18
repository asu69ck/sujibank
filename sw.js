/* 酥雞銀行：離線快取
   打開時先用存起來的版本（很快），同時在背景抓最新版，下次打開就會是新的。 */
const CACHE = 'sujibank-v2';
const SHELL = ['./', './index.html'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(req, {ignoreSearch: true}))
      || (req.mode === 'navigate' && ((await cache.match('./index.html')) || (await cache.match('./'))));
    const net = fetch(req.url, {cache: 'no-cache'}).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    if (cached) {
      e.waitUntil(net.catch(() => {}));
      return cached;
    }
    try { return await net; } catch (err) { return Response.error(); }
  })());
});
