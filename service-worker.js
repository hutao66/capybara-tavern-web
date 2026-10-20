// Binary caches are release-specific; immutable portrait URLs survive updates.
const RELEASE = 'c68571ef2a3102fb';
const APP_CACHE = 'capybara-app-' + RELEASE;
const ART_CACHE = 'capybara-portraits-v1';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('capybara-app-') && name !== APP_CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const base = new URL(self.registration.scope).pathname;
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname.slice(base.length);
  const portrait = /^StreamingAssets\/Portraits\/[a-f0-9]{64}-1024-q85-v1\.jpg$/.test(path);
  const binary = path.startsWith('Build/') && url.searchParams.get('v') === RELEASE;
  const model = /^StreamingAssets\/Models\/[a-z0-9_]+$/.test(path);
  if (!portrait && !binary && !model) return;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(portrait ? ART_CACHE : APP_CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
    } catch (_) { /* Private browsing or quota restrictions must not block play. */ }
    const response = await fetch(request);
    if (cache && response.ok) event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    return response;
  })());
});
