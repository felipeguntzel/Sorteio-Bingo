let rodada = 1;
let numeros = [];
let sorteados = [];
let audioCtx = null;

let modoJogo = 'manual';
let totalBolas = 75;
let somAtual = 'classico';
let temaAtual = 'ambar';
let repetirNumeros = false;
let intervaloAutomaticoSegundos = 15;

let autoRodando = false;
let autoTimeoutId = null;
let contagemTickId = null;
let proximoSorteioEm = null;

const DOM = {};
const initDOM = () => {
    DOM.numeroSorteado = document.getElementById('numeroSorteado');
    DOM.rodadaTexto = document.getElementById('rodadaTexto');
    DOM.contadorRestante = document.getElementById('contadorRestante');
    DOM.numerosFaltando = document.getElementById('numerosFaltando');
    DOM.statusAnimacao = document.getElementById('statusAnimacao');
    DOM.historicoContainer = document.getElementById('historicoContainer');
    DOM.areaControles = document.getElementById('areaControles');
    DOM.btnAcao = document.getElementById('btnAcao');
    DOM.modalConfiguracoes = document.getElementById('modalConfiguracoes');
    DOM.seletorQuantidade = document.getElementById('seletorQuantidade');
    DOM.inputQuantidadeManual = document.getElementById('inputQuantidadeManual');
    DOM.seletorSom = document.getElementById('seletorSom');
    DOM.seletorTema = document.getElementById('seletorTema');
};

const CHAVE_PREFS = 'bingoPro.preferencias';
const PRESETS_INTERVALO = [5, 15, 30, 60];

const perfisSom = {
    classico: { tipo: 'sine',     freq: 523.25 },
    cassino:  { tipo: 'square',   freq: 587.33 },
    suave:    { tipo: 'triangle', freq: 440.00 },
    retro:    { tipo: 'sawtooth', freq: 349.23 },
    mudo:     null
};

const temas = {
    ambar:    { primary: '#d97706', primaryHover: '#b45309', accent: '#f59e0b' },
    azul:     { primary: '#2563eb', primaryHover: '#1d4ed8', accent: '#3b82f6' },
    verde:    { primary: '#059669', primaryHover: '#047857', accent: '#10b981' },
    roxo:     { primary: '#7c3aed', primaryHover: '#6d28d9', accent: '#a78bfa' },
    vermelho: { primary: '#dc2626', primaryHover: '#b91c1c', accent: '#ef4444' }
};

const rotulosModo = { manual: 'Manual', automatico: 'Automático' };
const rotulosSom = { classico: 'Clássico', cassino: 'Cassino', suave: 'Suave', retro: 'Retrô', mudo: 'Mudo' };
const rotulosTema = { ambar: 'Âmbar', azul: 'Azul', verde: 'Verde', roxo: 'Roxo', vermelho: 'Vermelho' };

function aplicarTema(nome) {
    const t = temas[nome] || temas.ambar;
    document.documentElement.style.setProperty('--primary', t.primary);
    document.documentElement.style.setProperty('--primary-hover', t.primaryHover);
    document.documentElement.style.setProperty('--accent', t.accent);
}

// Gerador de som nativo do navegador (Web Audio API)
function tocarSom(frequencia, tipo, duracao, delay = 0) {
    if (somAtual === 'mudo') return;

    setTimeout(() => {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            let oscilador = audioCtx.createOscillator();
            let ganho = audioCtx.createGain();

            oscilador.type = tipo; // 'sine', 'square', 'sawtooth', 'triangle'
            oscilador.frequency.setValueAtTime(frequencia, audioCtx.currentTime);

            ganho.gain.setValueAtTime(0.1, audioCtx.currentTime);
            ganho.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracao);

            oscilador.connect(ganho);
            ganho.connect(audioCtx.destination);

            oscilador.start();
            oscilador.stop(audioCtx.currentTime + duracao);
        } catch (e) {
            console.log("Áudio bloqueado ou não suportado:", e);
        }
    }, delay);
}

function tocarSomInicio() {
    const p = perfisSom[somAtual];
    if (!p) return;
    tocarSom(p.freq * 0.57, p.tipo, 0.15, 0);
    tocarSom(p.freq * 0.86, p.tipo, 0.15, 100);
    tocarSom(p.freq * 1.15, p.tipo, 0.3, 200);
}

function tocarSomRodada() {
    const p = perfisSom[somAtual];
    if (!p) return;
    tocarSom(p.freq, p.tipo, 0.1, 0);
}

function tocarSomFinal() {
    const p = perfisSom[somAtual];
    if (!p) return;
    // Fanfarra triunfal (tríade maior + oitava) na afinação do som escolhido
    tocarSom(p.freq, p.tipo, 0.2, 0);
    tocarSom(p.freq * 1.26, p.tipo, 0.2, 150);
    tocarSom(p.freq * 1.5, p.tipo, 0.2, 300);
    tocarSom(p.freq * 2, p.tipo, 0.5, 450);
}

function obterQuantidadeSelecionada() {
    const select = document.getElementById('seletorQuantidade');
    const ehManual = select.value === 'manual';
    const bruto = ehManual ? document.getElementById('inputQuantidadeManual').value : select.value;

    let valor = parseInt(bruto, 10);
    if (isNaN(valor)) valor = 75;
    valor = Math.min(200, Math.max(10, valor));

    if (ehManual) document.getElementById('inputQuantidadeManual').value = valor;
    return valor;
}

function salvarPreferencias() {
    const ehManual = document.getElementById('seletorQuantidade').value === 'manual';
    try {
        localStorage.setItem(CHAVE_PREFS, JSON.stringify({
            modo: modoJogo,
            quantidade: totalBolas,
            quantidadeManual: ehManual,
            som: somAtual,
            tema: temaAtual,
            repetir: repetirNumeros,
            intervalo: intervaloAutomaticoSegundos
        }));
    } catch (e) {
        // localStorage indisponível (ex.: modo privado) - segue sem salvar
    }
}

// Só aceita o valor salvo se ele bater com uma <option> existente,
// evitando que o select fique em branco com dados corrompidos ou desatualizados.
function definirSelectSeValido(select, valor) {
    const existe = Array.from(select.options).some(opt => opt.value === String(valor));
    if (existe) select.value = valor;
    return existe;
}

function carregarPreferencias() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS));
        if (!salvo) { atualizarChipsRadio('grupoModo'); atualizarChipsRadio('grupoRepetir'); return; }

        if (salvo.modo) {
            const radio = document.querySelector(`input[name="modo"][value="${salvo.modo}"]`);
            if (radio) radio.checked = true;
        }

        const seletorQuantidade = document.getElementById('seletorQuantidade');
        const inputManual = document.getElementById('inputQuantidadeManual');
        if (salvo.quantidadeManual && Number.isFinite(salvo.quantidade)) {
            seletorQuantidade.value = 'manual';
            inputManual.classList.remove('oculto');
            inputManual.value = Math.min(200, Math.max(10, salvo.quantidade));
        } else if (salvo.quantidade) {
            definirSelectSeValido(seletorQuantidade, salvo.quantidade);
        }

        if (salvo.som) definirSelectSeValido(document.getElementById('seletorSom'), salvo.som);

        if (salvo.tema && definirSelectSeValido(document.getElementById('seletorTema'), salvo.tema)) {
            temaAtual = salvo.tema;
            aplicarTema(temaAtual);
        }

        if (typeof salvo.repetir === 'boolean') {
            const radio = document.querySelector(`input[name="repetir"][value="${salvo.repetir ? 'sim' : 'nao'}"]`);
            if (radio) radio.checked = true;
        }

        if (Number.isFinite(salvo.intervalo)) {
            intervaloAutomaticoSegundos = Math.min(120, Math.max(1, salvo.intervalo));
        }
    } catch (e) {
        // preferências corrompidas - ignora e usa os padrões
    }
    atualizarChipsRadio('grupoModo');
    atualizarChipsRadio('grupoRepetir');
}

function atualizarChipsRadio(idGrupo) {
    document.querySelectorAll(`#${idGrupo} .radio-chip`).forEach(chip => {
        const input = chip.querySelector('input');
        chip.classList.toggle('selecionado', input.checked);
    });
}

function lerConfiguracoesDosCampos() {
    modoJogo = document.querySelector('input[name="modo"]:checked').value;
    totalBolas = obterQuantidadeSelecionada();
    somAtual = document.getElementById('seletorSom').value;
    temaAtual = document.getElementById('seletorTema').value;
    repetirNumeros = document.querySelector('input[name="repetir"]:checked').value === 'sim';
    aplicarTema(temaAtual);
    salvarPreferencias();
}

function aplicarConfiguracoes() {
    lerConfiguracoesDosCampos();
    prepararNovaPartida();
    fecharModal('modalConfiguracoes');
}

function prepararNovaPartida() {
    rodada = 1;
    sorteados = [];
    numeros = [];
    for (let i = 1; i <= totalBolas; i++) numeros.push(i);
    autoRodando = false;
    clearTimeout(autoTimeoutId);
    pararContagemRegressiva();

    tocarSomInicio();

    DOM.rodadaTexto.innerText = 'Globo pronto!';
    DOM.numeroSorteado.innerText = '--';
    DOM.numeroSorteado.classList.toggle('tres-digitos', totalBolas >= 100);
    DOM.statusAnimacao.innerText = '';
    DOM.historicoContainer.innerHTML =
        '<div id="itemVazio" class="historico-vazio">Nenhuma bola sorteada neste painel ainda.</div>';

    atualizarContador();
    atualizarResumo();
    renderizarControles();
}

function atualizarResumo() {
    document.getElementById('resumoModo').innerText = rotulosModo[modoJogo] || modoJogo;
    document.getElementById('resumoQuantidade').innerText = totalBolas;
    document.getElementById('resumoSom').innerText = rotulosSom[somAtual] || somAtual;
    document.getElementById('resumoTema').innerText = rotulosTema[temaAtual] || temaAtual;
    document.getElementById('resumoRepetir').innerText = repetirNumeros ? 'Sim' : 'Não';
}

function atualizarContador() {
    if (repetirNumeros) {
        DOM.contadorRestante.innerHTML = `Sorteios: <span id="numerosFaltando">${sorteados.length}</span>`;
    } else {
        DOM.contadorRestante.innerHTML = `Restam: <span id="numerosFaltando">${numeros.length}</span> / <span id="totalBolasLabel">${totalBolas}</span>`;
    }
    DOM.numerosFaltando = document.getElementById('numerosFaltando');
}

function renderizarControles() {
    const controles = document.getElementById('areaControles');

    if (modoJogo === 'automatico') {
        controles.innerHTML = `
            <div class="controles-auto">
                <div class="linha-intervalo">
                    <label class="config-label" for="seletorIntervaloAoVivo">Intervalo entre sorteios</label>
                    <select id="seletorIntervaloAoVivo" class="config-select">
                        <option value="5">5 segundos</option>
                        <option value="15">15 segundos</option>
                        <option value="30">30 segundos</option>
                        <option value="60">60 segundos</option>
                        <option value="manual">Personalizado</option>
                    </select>
                    <input type="number" id="inputIntervaloAoVivo" class="config-select oculto" min="1" max="120" step="1" placeholder="Digite de 1 a 120 segundos" aria-label="Intervalo personalizado, de 1 a 120 segundos">
                </div>
                <div class="contagem-proxima" id="contagemProxima">Próximo sorteio em: <strong id="segundosRestantes">--</strong>s</div>
                <div class="botoes-auto">
                    <button id="btnPlay" class="btn-icone" type="button" title="Iniciar">▶</button>
                    <button id="btnPause" class="btn-icone" type="button" title="Pausar" disabled>⏸</button>
                    <button id="btnReiniciarAuto" class="btn-icone" type="button" title="Reiniciar sorteio">⟲</button>
                </div>
                ${repetirNumeros ? '<button id="btnEncerrarSorteio" class="btn-secundario" type="button">Encerrar sorteio</button>' : ''}
            </div>
        `;

        const seletorIntervalo = document.getElementById('seletorIntervaloAoVivo');
        const inputIntervalo = document.getElementById('inputIntervaloAoVivo');
        if (PRESETS_INTERVALO.includes(intervaloAutomaticoSegundos)) {
            seletorIntervalo.value = String(intervaloAutomaticoSegundos);
        } else {
            seletorIntervalo.value = 'manual';
            inputIntervalo.classList.remove('oculto');
            inputIntervalo.value = intervaloAutomaticoSegundos;
        }

        seletorIntervalo.addEventListener('change', () => {
            inputIntervalo.classList.toggle('oculto', seletorIntervalo.value !== 'manual');
            if (seletorIntervalo.value !== 'manual') {
                definirIntervalo(parseInt(seletorIntervalo.value, 10));
            }
        });
        inputIntervalo.addEventListener('change', () => definirIntervalo(parseInt(inputIntervalo.value, 10)));

        document.getElementById('btnPlay').addEventListener('click', iniciarAuto);
        document.getElementById('btnPause').addEventListener('click', pausarAuto);
        document.getElementById('btnReiniciarAuto').addEventListener('click', prepararNovaPartida);
        if (repetirNumeros) {
            document.getElementById('btnEncerrarSorteio').addEventListener('click', encerrarSorteioManual);
        }
    } else {
        controles.innerHTML = `
            <button id="btnAcao" type="button">Sortear Número</button>
            ${repetirNumeros ? '<button id="btnEncerrarSorteio" class="btn-secundario" type="button">Encerrar sorteio</button>' : ''}
        `;
        document.getElementById('btnAcao').addEventListener('click', sortearNumero);
        if (repetirNumeros) {
            document.getElementById('btnEncerrarSorteio').addEventListener('click', encerrarSorteioManual);
        }
    }
}

function definirIntervalo(segundos) {
    if (!Number.isFinite(segundos)) return;
    intervaloAutomaticoSegundos = Math.min(120, Math.max(1, segundos));
    salvarPreferencias();
}

function iniciarAuto() {
    if (autoRodando) return;
    autoRodando = true;
    atualizarBotoesAuto();
    cicloAutomatico();
}

function pausarAuto() {
    if (!autoRodando) return;
    autoRodando = false;
    clearTimeout(autoTimeoutId);
    pararContagemRegressiva();
    atualizarBotoesAuto();
}

function atualizarBotoesAuto() {
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');
    if (btnPlay) btnPlay.disabled = autoRodando;
    if (btnPause) btnPause.disabled = !autoRodando;
}

function cicloAutomatico() {
    pararContagemRegressiva();
    if (!autoRodando) return;
    if (!repetirNumeros && numeros.length === 0) return;
    sortearNumero();
}

function agendarProximoCicloAutomatico() {
    const ms = intervaloAutomaticoSegundos * 1000;
    proximoSorteioEm = Date.now() + ms;
    autoTimeoutId = setTimeout(cicloAutomatico, ms);
    atualizarContagemRegressiva();
    clearInterval(contagemTickId);
    contagemTickId = setInterval(atualizarContagemRegressiva, 250);
}

function atualizarContagemRegressiva() {
    const el = document.getElementById('segundosRestantes');
    if (!el || !proximoSorteioEm) return;
    const restante = Math.max(0, Math.ceil((proximoSorteioEm - Date.now()) / 1000));
    el.innerText = restante;
}

function pararContagemRegressiva() {
    clearInterval(contagemTickId);
    contagemTickId = null;
    proximoSorteioEm = null;
    const el = document.getElementById('segundosRestantes');
    if (el) el.innerText = '--';
}

function formatarNumero(num) {
    const largura = Math.max(2, String(totalBolas).length);
    return String(num).padStart(largura, '0');
}

function sortearNumero() {
    if (!repetirNumeros && numeros.length === 0) return;

    const btnManual = DOM.btnAcao;
    const status = DOM.statusAnimacao;
    const bola = DOM.numeroSorteado;

    if (btnManual) btnManual.disabled = true;
    bola.classList.add('animando');
    status.innerText = 'Misturando o globo de pedras .';

    const p = perfisSom[somAtual];
    if (p) {
        tocarSom(p.freq * 0.29, p.tipo, 0.05, 0);
        setTimeout(() => { status.innerText = 'Misturando o globo de pedras . .'; tocarSom(p.freq * 0.34, p.tipo, 0.05, 0); }, 250);
        setTimeout(() => { status.innerText = 'Misturando o globo de pedras . . .'; tocarSom(p.freq * 0.40, p.tipo, 0.05, 0); }, 500);
    } else {
        setTimeout(() => { status.innerText = 'Misturando o globo de pedras . .'; }, 250);
        setTimeout(() => { status.innerText = 'Misturando o globo de pedras . . .'; }, 500);
    }

    setTimeout(() => {
        bola.classList.remove('animando');
        status.innerText = '';

        let numeroSorteado;
        if (repetirNumeros) {
            numeroSorteado = Math.floor(Math.random() * totalBolas) + 1;
        } else {
            const indiceAleatorio = Math.floor(Math.random() * numeros.length);
            numeroSorteado = numeros[indiceAleatorio];
            numeros.splice(indiceAleatorio, 1);
        }

        sorteados.push(numeroSorteado);

        DOM.rodadaTexto.innerText = `Rodada ${formatarNumero(rodada)}`;
        bola.innerText = formatarNumero(numeroSorteado);

        rodada++;
        atualizarContador();
        atualizarHistorico();

        const acabou = !repetirNumeros && numeros.length === 0;
        if (acabou) {
            finalizarSorteio();
        } else {
            tocarSomRodada();
            if (btnManual) btnManual.disabled = false;

            if (modoJogo === 'automatico' && autoRodando) {
                agendarProximoCicloAutomatico();
            }
        }
    }, 750);
}

function finalizarSorteio() {
    tocarSomFinal();
    dispararConfetes();
    autoRodando = false;
    clearTimeout(autoTimeoutId);
    pararContagemRegressiva();

    const status = document.getElementById('statusAnimacao');
    const mensagem = repetirNumeros
        ? `Sorteio encerrado! ${sorteados.length} número(s) sorteado(s).`
        : `Fim do sorteio! Todas as ${totalBolas} pedras saíram.`;
    status.innerHTML = `<strong class="destaque-final">${mensagem}</strong>`;

    const btnEncerrar = document.getElementById('btnEncerrarSorteio');
    if (btnEncerrar) btnEncerrar.disabled = true;

    if (modoJogo === 'automatico') {
        const btnPlay = document.getElementById('btnPlay');
        const btnPause = document.getElementById('btnPause');
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;
    } else {
        const btn = document.getElementById('btnAcao');
        if (btn) {
            // Remove o listener original de sortearNumero antes de reatribuir,
            // senão os dois disparam juntos no próximo clique (sorteio fantasma).
            btn.removeEventListener('click', sortearNumero);
            btn.innerText = 'Novo Jogo';
            btn.disabled = false;
            btn.addEventListener('click', prepararNovaPartida);
        }
    }
}

function encerrarSorteioManual() {
    if (!repetirNumeros) return;
    finalizarSorteio();
}

function atualizarHistorico() {
    const container = document.getElementById('historicoContainer');

    const itemVazio = document.getElementById('itemVazio');
    if (itemVazio) itemVazio.remove();

    const ultimoIndex = sorteados.length - 1;
    const num = sorteados[ultimoIndex];

    const item = document.createElement('div');
    item.className = 'item-historico';
    item.innerHTML = `${formatarNumero(ultimoIndex + 1)}º nº:<strong>${formatarNumero(num)}</strong>`;

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
}

// Mecânica de Animação de Aniversário (Confetes)
function dispararConfetes() {
    const cores = ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899'];

    // Loop para gerar 150 pedaços de confete na tela
    for (let i = 0; i < 150; i++) {
        const confete = document.createElement('div');
        confete.className = 'confete';

        // Características randômicas para cada papel picado
        confete.style.left = Math.random() * 100 + 'vw';
        confete.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
        confete.style.animationDuration = (Math.random() * 3 + 2) + 's'; // Entre 2s e 5s para cair
        confete.style.animationDelay = (Math.random() * 2) + 's'; // Cascata de queda de até 2s
        confete.style.transform = `scale(${Math.random() * 1 + 0.5})`; // Tamanhos variados

        document.body.appendChild(confete);

        // Remove o elemento após a animação acabar para não acumular memória
        setTimeout(() => { confete.remove(); }, 7000);
    }
}

function abrirModal(id) {
    document.getElementById(id).classList.add('aberto');
}

function fecharModal(id) {
    document.getElementById(id).classList.remove('aberto');
}

function fecharModalClique(evento, id) {
    if (evento.target.id === id) fecharModal(id);
}

document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    ['modalConfiguracoes', 'modalSobre', 'modalPrivacidade'].forEach(id => {
        if (document.getElementById(id).classList.contains('aberto')) fecharModal(id);
    });
});

const setupEventListeners = () => {
    document.getElementById('grupoModo').addEventListener('change', e => {
        if (e.target.name === 'modo') atualizarChipsRadio('grupoModo');
    });

    document.getElementById('grupoRepetir').addEventListener('change', e => {
        if (e.target.name === 'repetir') atualizarChipsRadio('grupoRepetir');
    });

    DOM.seletorQuantidade.addEventListener('change', function() {
        DOM.inputQuantidadeManual.classList.toggle('oculto', this.value !== 'manual');
    });

    DOM.seletorTema.addEventListener('change', function() {
        aplicarTema(this.value);
    });

    document.getElementById('btnAbrirConfiguracoes').addEventListener('click', () => abrirModal('modalConfiguracoes'));
    document.getElementById('btnAplicarConfiguracoes').addEventListener('click', aplicarConfiguracoes);
    document.getElementById('btnFecharConfiguracoes').addEventListener('click', () => fecharModal('modalConfiguracoes'));
    DOM.modalConfiguracoes.addEventListener('click', e => fecharModalClique(e, 'modalConfiguracoes'));

    document.getElementById('btnAbrirSobre').addEventListener('click', () => abrirModal('modalSobre'));
    document.getElementById('btnFecharSobre').addEventListener('click', () => fecharModal('modalSobre'));
    document.getElementById('modalSobre').addEventListener('click', e => fecharModalClique(e, 'modalSobre'));

    document.getElementById('btnAbrirPrivacidade').addEventListener('click', () => abrirModal('modalPrivacidade'));
    document.getElementById('btnFecharPrivacidade').addEventListener('click', () => fecharModal('modalPrivacidade'));
    document.getElementById('modalPrivacidade').addEventListener('click', e => fecharModalClique(e, 'modalPrivacidade'));
};

initDOM();
setupEventListeners();
carregarPreferencias();
lerConfiguracoesDosCampos();
prepararNovaPartida();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Botão "Instalar App": só aparece quando o navegador sinaliza que o PWA é instalável
// (hoje isso é suportado por navegadores baseados em Chromium; Firefox/Safari não disparam esse evento).
let eventoInstalacaoAdiado = null;

window.addEventListener('beforeinstallprompt', evento => {
    evento.preventDefault();
    eventoInstalacaoAdiado = evento;
    document.getElementById('btnInstalarApp').classList.remove('oculto');
    document.getElementById('separadorInstalar').classList.remove('oculto');
});

document.getElementById('btnInstalarApp').addEventListener('click', async () => {
    if (!eventoInstalacaoAdiado) return;
    eventoInstalacaoAdiado.prompt();
    await eventoInstalacaoAdiado.userChoice;
    eventoInstalacaoAdiado = null;
    document.getElementById('btnInstalarApp').classList.add('oculto');
    document.getElementById('separadorInstalar').classList.add('oculto');
});

window.addEventListener('appinstalled', () => {
    document.getElementById('btnInstalarApp').classList.add('oculto');
    document.getElementById('separadorInstalar').classList.add('oculto');
});
