const CACHE_NAME = 'bingo-pro-v15';
const ARQUIVOS_APP_SHELL = [
    './',
    './index.html',
    './cartelas.html',
    './guia.html',
    './como-organizar-bingo.html',
    './probabilidades-matematica-bingo.html',
    './regras-padroes-bingo.html',
    './bingo-educativo-sala-de-aula.html',
    './cantadas.html',
    './sobre.html',
    './contato.html',
    './privacidade.html',
    './termos.html',
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

// Stale-while-revalidate APENAS para recursos locais da própria aplicação
// NUNCA interceptar ou armazenar requisições do Google AdSense, DoubleClick ou analíticas
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    try {
        const url = new URL(event.request.url);
        // Ignora domínios externos (especialmente Google AdSense, Google Syndication e DoubleClick)
        if (
            url.origin !== self.location.origin ||
            url.hostname.includes('google') ||
            url.hostname.includes('googlesyndication') ||
            url.hostname.includes('doubleclick')
        ) {
            return;
        }
    } catch (e) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(respostaCache => {
            const buscaRede = fetch(event.request)
                .then(respostaRede => {
                    if (respostaRede.ok) {
                        const copia = respostaRede.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia)).catch(() => {});
                    }
                    return respostaRede;
                })
                .catch(() => respostaCache || Response.error());

            return respostaCache || buscaRede;
        })
    );
});
