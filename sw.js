// SARPBC service worker
// - Page (HTML): network-first so new deployments show up, cached copy when offline.
// - Everything else (images, audio): cache-first, filled on first use.
// - Audio Range requests are answered with proper 206 responses (Safari/iOS need this).
// - Cache writes can never break a response: failures are swallowed.
const CACHE_PREFIX = 'sarpbc-';
const CACHE_VERSION = 'sarpbc-v5-20261126';   // bump this on every release
const APP_SHELL = [
  './', './index.html', './logo.png', './loading.png',
  './theme.mp3', './goal.mp3', './boost.mp3', './countdown.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Add one by one so a single missing file can't abort the whole install.
    await Promise.allSettled(APP_SHELL.map(async url => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (res.ok && res.status === 200) await cache.put(url, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const old = names.filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE_VERSION);
    await Promise.all(old.map(n => caches.delete(n)));
    await self.clients.claim();
    // Upgrading from an older release: reload open tabs once so nobody keeps playing a stale page.
    if (old.length) {
      const tabs = await self.clients.matchAll({ type: 'window' });
      tabs.forEach(t => { try { t.navigate(t.url); } catch (e) { /* ignore */ } });
    }
  })());
});

async function putSafe(cache, request, response) {
  try { if (response && response.ok && response.status === 200) await cache.put(request, response); } catch (e) { /* quota etc. - ignore */ }
}

// Turn a full cached response into a 206 for a Range request.
async function rangeResponse(request, full) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!m) return full;
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes'
    }
  });
}

async function handlePage(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    putSafe(cache, request, fresh.clone());        // not awaited: never delays or breaks the page
    return fresh;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./index.html')) ||
           new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_VERSION);
  const isRange = request.headers.has('range');
  // Range requests must be matched against the plain (non-Range) URL.
  const key = isRange ? request.url : request;
  let cached = await cache.match(key, { ignoreSearch: true });
  if (!cached) {
    try {
      // Always fetch the full file so it can be cached and sliced later.
      const full = await fetch(request.url, { cache: 'reload' });
      if (full.ok && full.status === 200) { putSafe(cache, request.url, full.clone()); cached = full; }
      else return isRange ? fetch(request) : full;
    } catch (e) {
      try { return await fetch(request); } catch (e2) { return new Response('', { status: 504 }); }
    }
  }
  return isRange ? rangeResponse(request, cached.clone()) : cached;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;       // leave PeerJS / CDN alone
  if (url.pathname.endsWith('/sw.js')) return;
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) event.respondWith(handlePage(request));
  else event.respondWith(handleAsset(request));
});
