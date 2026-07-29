const CACHE_NAME = 'bingo-pro-v3';
const ARQUIVOS_APP_SHELL = [
    './',
    './index.html',
    './guia.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable.png',
    './og-image.png',
    './favicon.ico'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ARQUIVOS_APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(chaves =>
            Promise.all(chaves.filter(chave => chave !== CACHE_NAME).map(chave => caches.delete(chave)))
        )
    );
    self.clients.claim();
});

// Stale-while-revalidate: responde rápido com o cache (funciona offline) e
// atualiza o cache em segundo plano sempre que houver internet disponível.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(respostaCache => {
            const buscaRede = fetch(event.request)
                .then(respostaRede => {
                    if (respostaRede.ok) {
                        const copia = respostaRede.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
                    }
                    return respostaRede;
                })
                .catch(() => respostaCache);

            return respostaCache || buscaRede;
        })
    );
});
