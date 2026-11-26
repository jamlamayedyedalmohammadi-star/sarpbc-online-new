const CACHE = 'sarpbc-v1';
const ASSETS = ['./', './index.html', './logo.png', './loading.png', './theme.mp3', './goal.mp3', './boost.mp3', './countdown.mp3'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))));
