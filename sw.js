/* ══════════════════════════════════════════════════════════════
   VeloTrack — Service Worker
   Mude o CACHE_VERSION a cada deploy para forçar atualização
══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'velotrack-v12';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/state.js',
    '/js/storage.js',
    '/js/timer.js',
    '/js/chart.js',
    '/js/scene.js',
    '/js/bluetooth.js',
    '/js/som.js',
    '/js/training.js',
    '/js/spotify.js',
    '/js/app.js',
];

/* ── Install: pré-cacheia assets ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
    );
    // Força ativação imediata sem esperar abas fecharem
    self.skipWaiting();
});

/* ── Activate: limpa caches antigos e toma controle imediato ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim()) // assume controle imediato de todas as abas
    );
});

/* ── Fetch: Network First para HTML/JS/CSS, Cache First para imagens ── */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // POST e Apps Script nunca passam pelo cache
    if (request.method === 'POST' || url.hostname.includes('script.google.com')) return;

    // Spotify SDK e API — sempre rede
    if (url.hostname.includes('spotify.com') || url.hostname.includes('scdn.co')) return;

    // HTML, JS e CSS — Network First (garante sempre versão mais recente)
    if (
        request.destination === 'document' ||
        request.destination === 'script' ||
        request.destination === 'style'
    ) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request)) // fallback offline
        );
        return;
    }

    // Imagens e fontes — Cache First
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
