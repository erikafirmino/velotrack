/* ══════════════════════════════════════════════════════════
   VeloTrack — Service Worker
   Estratégia: Cache First para assets, Network First para API
══════════════════════════════════════════════════════════ */

const CACHE_NAME    = 'velotrack-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

/* ── Install: pré-cacheia os assets estáticos ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

/* ── Activate: limpa caches antigos ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

/* ── Fetch: Cache First para arquivos locais, bypass para API externa ── */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Requisições para Apps Script (POST) nunca passam pelo cache
    if (request.method === 'POST' || url.hostname.includes('script.google.com')) {
        return; // Deixa o browser lidar diretamente
    }

    // Para recursos locais: Cache First com fallback de rede
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;

            return fetch(request).then(response => {
                // Cacheia a resposta se for bem-sucedida e for um recurso local
                if (
                    response.ok &&
                    response.type !== 'opaque' &&
                    url.origin === self.location.origin
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Fallback: retorna o index.html para navegação offline
            if (request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});
