// ads-consent.js - Inicialização Segura do Google AdSense e Consentimento LGPD/GDPR

(function () {
    'use strict';

    // 1. Suprime erros assíncronos conhecidos do AdSense (como ResizeObserver ou availableWidth=0 em redimensionamento)
    window.addEventListener('error', function (e) {
        var msg = (e && (e.message || (e.error && e.error.message))) || '';
        if (typeof msg === 'string' && (msg.includes('ResizeObserver') || msg.includes('adsbygoogle') || msg.includes('availableWidth'))) {
            if (e.preventDefault) e.preventDefault();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return true;
        }
    }, true);

    window.onerror = function (m, s, l, c, err) {
        var msg = (typeof m === 'string' ? m : '') + (err && err.message ? err.message : '');
        if (msg.includes('ResizeObserver') || msg.includes('adsbygoogle') || msg.includes('availableWidth')) {
            return true;
        }
    };

    // 2. Carregamento seguro dos blocos de anúncio manual
    function carregarSlotAnuncio(slot) {
        if (!slot || slot.dataset.adLoaded === 'true' || slot.getAttribute('data-adsbygoogle-status')) return;

        const parent = slot.parentElement || slot;
        const rect = slot.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const larguraDisponivel = Math.max(rect.width, parentRect.width, slot.offsetWidth, parent.offsetWidth);

        // Só executa o push se o contêiner tiver largura real calculada pelo navegador
        if (larguraDisponivel >= 200 && window.getComputedStyle(slot).display !== 'none' && window.getComputedStyle(parent).display !== 'none') {
            try {
                slot.dataset.adLoaded = 'true';
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                // Silencia se a biblioteca ainda estiver carregando assincronamente
            }
        }
    }

    function inicializarAnuncios() {
        const slots = document.querySelectorAll('ins.adsbygoogle');
        if (!slots.length) return;

        const tentar = () => {
            slots.forEach(slot => carregarSlotAnuncio(slot));
        };

        tentar();
        setTimeout(tentar, 400);
        setTimeout(tentar, 1200);
        window.addEventListener('load', tentar);
        window.addEventListener('resize', () => {
            setTimeout(tentar, 250);
        });
    }

    // 3. Banner de Consentimento de Cookies e Privacidade (LGPD / GDPR)
    function inicializarBannerCookies() {
        if (localStorage.getItem('bingo_pro_cookie_consent') === 'accepted') {
            return;
        }

        // Aguarda 800ms para entrada suave sem impactar LCP/FID
        setTimeout(() => {
            if (document.getElementById('bannerCookies')) return;

            const banner = document.createElement('div');
            banner.id = 'bannerCookies';
            banner.className = 'banner-cookies-lgpd';
            banner.setAttribute('role', 'dialog');
            banner.setAttribute('aria-live', 'polite');
            banner.innerHTML = `
                <div class="conteudo-banner-cookies">
                    <div class="texto-banner-cookies">
                        🍪 <strong>Privacidade & Cookies:</strong> Usamos cookies e parceiros do Google AdSense para manter este jogo e gerador 100% gratuitos. Ao navegar, você concorda com nossos <a href="termos.html">Termos</a> e <a href="privacidade.html">Política de Privacidade (LGPD)</a>.
                    </div>
                    <div class="botoes-banner-cookies">
                        <button type="button" id="btnAceitarCookies" class="btn-aceitar-cookie">Aceitar e Continuar ✓</button>
                    </div>
                </div>
            `;

            document.body.appendChild(banner);

            const btnAceitar = document.getElementById('btnAceitarCookies');
            if (btnAceitar) {
                btnAceitar.addEventListener('click', function () {
                    try {
                        localStorage.setItem('bingo_pro_cookie_consent', 'accepted');
                    } catch (e) {}
                    banner.style.opacity = '0';
                    banner.style.transform = 'translate(-50%, 20px)';
                    setTimeout(() => {
                        banner.remove();
                    }, 300);
                });
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            inicializarAnuncios();
            inicializarBannerCookies();
        });
    } else {
        inicializarAnuncios();
        inicializarBannerCookies();
    }
})();
