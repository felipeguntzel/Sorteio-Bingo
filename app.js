/**
 * BINGO PRO - SORTEADOR ELETRÔNICO PROFISSIONAL
 * Guntzel Tech · 2026
 */

// Tratamento de segurança contra erros de largura assíncrona do Google AdSense e ResizeObserver
window.addEventListener('error', function (evento) {
    const msg = (evento && (evento.message || (evento.error && evento.error.message))) || '';
    if (
        typeof msg === 'string' && (
            msg.includes('ResizeObserver') ||
            msg.includes('adsbygoogle') ||
            msg.includes('availableWidth')
        )
    ) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        return true;
    }
}, true);

window.onerror = function (message, source, lineno, colno, error) {
    const msg = (typeof message === 'string' ? message : '') + (error && error.message ? error.message : '');
    if (
        msg.includes('ResizeObserver') ||
        msg.includes('adsbygoogle') ||
        msg.includes('availableWidth')
    ) {
        return true;
    }
};

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
let vozAtiva = true;
let tabelaMestreVisivel = true;

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
    DOM.resumoModo = document.getElementById('resumoModo');
    DOM.resumoQuantidade = document.getElementById('resumoQuantidade');
    DOM.resumoSom = document.getElementById('resumoSom');
    DOM.resumoTema = document.getElementById('resumoTema');
    DOM.resumoRepetir = document.getElementById('resumoRepetir');
    DOM.gradeTabelaMestre = document.getElementById('gradeTabelaMestre');
    DOM.secaoTabelaMestre = document.getElementById('secaoTabelaMestre');
    DOM.statusVozTexto = document.getElementById('statusVozTexto');
    DOM.btnAlternarVoz = document.getElementById('btnAlternarVoz');
    DOM.btnAlternarTabelaMestre = document.getElementById('btnAlternarTabelaMestre');
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

// Síntese de Áudio (Web Audio API)
function tocarSom(frequencia, tipo, duracao, delay = 0) {
    if (somAtual === 'mudo') return;

    setTimeout(() => {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let oscilador = audioCtx.createOscillator();
            let ganho = audioCtx.createGain();

            oscilador.type = tipo;
            oscilador.frequency.setValueAtTime(frequencia, audioCtx.currentTime);

            ganho.gain.setValueAtTime(0.1, audioCtx.currentTime);
            ganho.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracao);

            oscilador.connect(ganho);
            ganho.connect(audioCtx.destination);

            oscilador.start();
            oscilador.stop(audioCtx.currentTime + duracao);
        } catch (e) {
            // Ignora se áudio bloqueado pelo navegador
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
    tocarSom(p.freq, p.tipo, 0.2, 0);
    tocarSom(p.freq * 1.26, p.tipo, 0.2, 150);
    tocarSom(p.freq * 1.5, p.tipo, 0.2, 300);
    tocarSom(p.freq * 2, p.tipo, 0.5, 450);
}

// Locução com Voz em Português (Web Speech API)
function falarNumero(num) {
    if (!vozAtiva || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Interrompe fala anterior

    let textoFala = '';
    if (totalBolas === 75) {
        let letra = 'B';
        if (num > 15 && num <= 30) letra = 'I';
        else if (num > 30 && num <= 45) letra = 'N';
        else if (num > 45 && num <= 60) letra = 'G';
        else if (num > 60) letra = 'O';
        textoFala = `Letra ${letra}, número ${num}`;
    } else {
        textoFala = `Pedra número ${num}`;
    }

    const locucao = new SpeechSynthesisUtterance(textoFala);
    locucao.lang = 'pt-BR';
    locucao.rate = 1.0;
    locucao.pitch = 1.0;
    
    // Tenta selecionar voz pt-BR se disponível
    const vozes = window.speechSynthesis.getVoices();
    const vozPt = vozes.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'));
    if (vozPt) locucao.voice = vozPt;

    window.speechSynthesis.speak(locucao);
}

function obterQuantidadeSelecionada() {
    const ehManual = DOM.seletorQuantidade.value === 'manual';
    const bruto = ehManual ? DOM.inputQuantidadeManual.value : DOM.seletorQuantidade.value;
    let valor = parseInt(bruto, 10);
    if (!Number.isFinite(valor)) valor = 75;
    valor = Math.min(200, Math.max(10, valor));
    if (ehManual) DOM.inputQuantidadeManual.value = valor;
    return valor;
}

function salvarPreferencias() {
    const ehManual = DOM.seletorQuantidade.value === 'manual';
    try {
        localStorage.setItem(CHAVE_PREFS, JSON.stringify({
            modo: modoJogo,
            quantidade: totalBolas,
            quantidadeManual: ehManual,
            som: somAtual,
            tema: temaAtual,
            repetir: repetirNumeros,
            intervalo: intervaloAutomaticoSegundos,
            voz: vozAtiva,
            tabelaMestre: tabelaMestreVisivel
        }));
    } catch (e) {}
}

function definirSelectSeValido(select, valor) {
    const existe = Array.from(select.options).some(opt => opt.value === String(valor));
    if (existe) select.value = valor;
    return existe;
}

function carregarPreferencias() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS));
        if (!salvo) {
            atualizarChipsRadio('grupoModo');
            atualizarChipsRadio('grupoRepetir');
            return;
        }

        if (salvo.modo && ['manual', 'automatico'].includes(salvo.modo)) {
            const radio = document.querySelector(`input[name="modo"][value="${salvo.modo}"]`);
            if (radio) radio.checked = true;
        }

        if (salvo.quantidadeManual && Number.isFinite(salvo.quantidade)) {
            DOM.seletorQuantidade.value = 'manual';
            DOM.inputQuantidadeManual.classList.remove('oculto');
            DOM.inputQuantidadeManual.value = Math.min(200, Math.max(10, salvo.quantidade));
        } else if (salvo.quantidade) {
            definirSelectSeValido(DOM.seletorQuantidade, salvo.quantidade);
        }

        if (salvo.som) definirSelectSeValido(DOM.seletorSom, salvo.som);

        if (salvo.tema && definirSelectSeValido(DOM.seletorTema, salvo.tema)) {
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

        if (typeof salvo.voz === 'boolean') {
            vozAtiva = salvo.voz;
            DOM.statusVozTexto.innerText = vozAtiva ? 'Ligada' : 'Desligada';
            DOM.btnAlternarVoz.classList.toggle('ativo', vozAtiva);
        }

        if (typeof salvo.tabelaMestre === 'boolean') {
            tabelaMestreVisivel = salvo.tabelaMestre;
            DOM.secaoTabelaMestre.classList.toggle('oculto', !tabelaMestreVisivel);
            DOM.btnAlternarTabelaMestre.classList.toggle('ativo', tabelaMestreVisivel);
        }
    } catch (e) {}
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
    somAtual = DOM.seletorSom.value;
    temaAtual = DOM.seletorTema.value;
    repetirNumeros = document.querySelector('input[name="repetir"]:checked').value === 'sim';
    aplicarTema(temaAtual);
    salvarPreferencias();
}

function aplicarConfiguracoes() {
    lerConfiguracoesDosCampos();
    prepararNovaPartida();
    fecharModal('modalConfiguracoes');
}

// Renderizador da Tabela Mestre de Conferência
function renderizarTabelaMestre() {
    if (!DOM.gradeTabelaMestre) return;
    DOM.gradeTabelaMestre.innerHTML = '';

    if (totalBolas === 75) {
        const colunas = [
            { letra: 'B', min: 1, max: 15 },
            { letra: 'I', min: 16, max: 30 },
            { letra: 'N', min: 31, max: 45 },
            { letra: 'G', min: 46, max: 60 },
            { letra: 'O', min: 61, max: 75 }
        ];

        colunas.forEach(col => {
            const linha = document.createElement('div');
            linha.className = 'mestre-linha';

            const header = document.createElement('div');
            header.className = 'mestre-letra-header';
            header.innerText = col.letra;
            linha.appendChild(header);

            const numLinha = document.createElement('div');
            numLinha.className = 'mestre-numeros-linha';

            for (let n = col.min; n <= col.max; n++) {
                const pedra = document.createElement('div');
                pedra.className = 'mestre-pedra';
                pedra.id = `mestre-pedra-${n}`;
                pedra.innerText = String(n).padStart(2, '0');
                if (sorteados.includes(n)) pedra.classList.add('sorteada');
                numLinha.appendChild(pedra);
            }

            linha.appendChild(numLinha);
            DOM.gradeTabelaMestre.appendChild(linha);
        });
    } else {
        // Tabela genérica por dezenas (ex: 1-10, 11-20, ...)
        const dezenas = Math.ceil(totalBolas / 10);
        for (let d = 0; d < dezenas; d++) {
            const min = d * 10 + 1;
            const max = Math.min((d + 1) * 10, totalBolas);

            const linha = document.createElement('div');
            linha.className = 'mestre-linha';

            const header = document.createElement('div');
            header.className = 'mestre-letra-header';
            header.innerText = `${min}`;
            header.style.fontSize = '11px';
            linha.appendChild(header);

            const numLinha = document.createElement('div');
            numLinha.className = 'mestre-numeros-linha';

            for (let n = min; n <= max; n++) {
                const pedra = document.createElement('div');
                pedra.className = 'mestre-pedra';
                pedra.id = `mestre-pedra-${n}`;
                pedra.innerText = String(n).padStart(2, '0');
                if (sorteados.includes(n)) pedra.classList.add('sorteada');
                numLinha.appendChild(pedra);
            }

            linha.appendChild(numLinha);
            DOM.gradeTabelaMestre.appendChild(linha);
        }
    }
}

function marcarPedraNaTabelaMestre(num) {
    const el = document.getElementById(`mestre-pedra-${num}`);
    if (el) el.classList.add('sorteada');
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
    renderizarTabelaMestre();
}

function atualizarResumo() {
    DOM.resumoModo.innerText = rotulosModo[modoJogo] || modoJogo;
    DOM.resumoQuantidade.innerText = totalBolas;
    DOM.resumoSom.innerText = rotulosSom[somAtual] || somAtual;
    DOM.resumoTema.innerText = rotulosTema[temaAtual] || temaAtual;
    DOM.resumoRepetir.innerText = repetirNumeros ? 'Sim' : 'Não';
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
    controles.innerHTML = '';

    if (modoJogo === 'automatico') {
        const divAuto = document.createElement('div');
        divAuto.className = 'controles-auto';
        divAuto.innerHTML = `
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
        `;
        controles.appendChild(divAuto);

        const seletorIntervalo = document.getElementById('seletorIntervaloAoVivo');
        const inputIntervalo = document.getElementById('inputIntervaloAoVivo');
        if (PRESETS_INTERVALO.includes(intervaloAutomaticoSegundos)) {
            seletorIntervalo.value = String(intervaloAutomaticoSegundos);
        } else {
            seletorIntervalo.value = 'manual';
            inputIntervalo.classList.remove('oculto');
            inputIntervalo.value = intervaloAutomaticoSegundos;
        }

        seletorIntervalo.addEventListener('change', e => {
            inputIntervalo.classList.toggle('oculto', e.target.value !== 'manual');
            if (e.target.value !== 'manual') {
                const val = parseInt(e.target.value, 10);
                if (Number.isFinite(val)) definirIntervalo(val);
            }
        });
        inputIntervalo.addEventListener('change', e => {
            const val = parseInt(e.target.value, 10);
            if (Number.isFinite(val)) definirIntervalo(val);
        });

        document.getElementById('btnPlay').addEventListener('click', iniciarAuto);
        document.getElementById('btnPause').addEventListener('click', pausarAuto);
        document.getElementById('btnReiniciarAuto').addEventListener('click', prepararNovaPartida);
        if (repetirNumeros) {
            document.getElementById('btnEncerrarSorteio').addEventListener('click', encerrarSorteioManual);
        }
    } else {
        const btn = document.createElement('button');
        btn.id = 'btnAcao';
        btn.type = 'button';
        btn.innerText = 'Sortear Número';
        btn.addEventListener('click', sortearNumero);
        controles.appendChild(btn);

        if (repetirNumeros) {
            const btnEncerrar = document.createElement('button');
            btnEncerrar.id = 'btnEncerrarSorteio';
            btnEncerrar.className = 'btn-secundario';
            btnEncerrar.type = 'button';
            btnEncerrar.innerText = 'Encerrar sorteio';
            btnEncerrar.addEventListener('click', encerrarSorteioManual);
            controles.appendChild(btnEncerrar);
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
    contagemTickId = setInterval(atualizarContagemRegressiva, 1000);
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

        let letraPrefixo = '';
        if (totalBolas === 75) {
            if (numeroSorteado <= 15) letraPrefixo = 'B - ';
            else if (numeroSorteado <= 30) letraPrefixo = 'I - ';
            else if (numeroSorteado <= 45) letraPrefixo = 'N - ';
            else if (numeroSorteado <= 60) letraPrefixo = 'G - ';
            else letraPrefixo = 'O - ';
        }

        DOM.rodadaTexto.innerText = `Rodada ${formatarNumero(rodada)} (${letraPrefixo}${numeroSorteado})`;
        bola.innerText = formatarNumero(numeroSorteado);

        marcarPedraNaTabelaMestre(numeroSorteado);
        falarNumero(numeroSorteado);

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

    const mensagem = repetirNumeros
        ? `Sorteio encerrado! ${sorteados.length} número(s) sorteado(s).`
        : `Fim do sorteio! Todas as ${totalBolas} pedras saíram.`;
    DOM.statusAnimacao.innerHTML = `<strong class="destaque-final">${mensagem}</strong>`;

    const btnEncerrar = document.getElementById('btnEncerrarSorteio');
    if (btnEncerrar) btnEncerrar.disabled = true;

    if (modoJogo === 'automatico') {
        const btnPlay = document.getElementById('btnPlay');
        const btnPause = document.getElementById('btnPause');
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;
    } else {
        const btn = DOM.btnAcao;
        if (btn) {
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
    item.className = 'item-historico recente';
    item.innerHTML = `${formatarNumero(ultimoIndex + 1)}º nº:<strong>${formatarNumero(num)}</strong>`;

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
}

function dispararConfetes() {
    const cores = ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899'];
    for (let i = 0; i < 30; i++) {
        const confete = document.createElement('div');
        confete.className = 'confete';
        confete.style.left = Math.random() * 100 + 'vw';
        confete.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
        confete.style.animationDuration = (Math.random() * 2 + 2.5) + 's';
        confete.style.animationDelay = Math.random() * 0.3 + 's';
        document.body.appendChild(confete);
        setTimeout(() => { confete.remove(); }, 5000);
    }
}

function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('aberto');
}

function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('aberto');
}

function fecharModalClique(evento, id) {
    if (evento.target.id === id) fecharModal(id);
}

document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    ['modalConfiguracoes', 'modalCompartilhar', 'modalSobre', 'modalPrivacidade'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.classList.contains('aberto')) fecharModal(id);
    });
});

// Ações da Barra de Ferramentas
function configurarBarraFerramentas() {
    // Alternar Locutor de Voz
    DOM.btnAlternarVoz.addEventListener('click', () => {
        vozAtiva = !vozAtiva;
        DOM.statusVozTexto.innerText = vozAtiva ? 'Ligada' : 'Desligada';
        DOM.btnAlternarVoz.classList.toggle('ativo', vozAtiva);
        salvarPreferencias();
    });

    // Alternar Tabela Mestre
    DOM.btnAlternarTabelaMestre.addEventListener('click', () => {
        tabelaMestreVisivel = !tabelaMestreVisivel;
        DOM.secaoTabelaMestre.classList.toggle('oculto', !tabelaMestreVisivel);
        DOM.btnAlternarTabelaMestre.classList.toggle('ativo', tabelaMestreVisivel);
        salvarPreferencias();
    });

    // Modo Tela Cheia (TV / Projetor)
    const btnTelaCheia = document.getElementById('btnTelaCheia');
    btnTelaCheia.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                document.body.classList.toggle('modo-tela-cheia');
            });
            btnTelaCheia.classList.add('ativo');
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            document.body.classList.remove('modo-tela-cheia');
            btnTelaCheia.classList.remove('ativo');
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const emTelaCheia = !!document.fullscreenElement;
        document.body.classList.toggle('modo-tela-cheia', emTelaCheia);
        btnTelaCheia.classList.toggle('ativo', emTelaCheia);
    });

    // Copiar Histórico
    const btnCopiar = document.getElementById('btnCopiarHistorico');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
            if (sorteados.length === 0) {
                alert('Nenhum número sorteado ainda para copiar.');
                return;
            }
            const texto = `BINGO PRO - Números Sorteados (${sorteados.length}):\n${sorteados.join(', ')}`;
            navigator.clipboard.writeText(texto).then(() => {
                btnCopiar.innerText = '✓ Copiado!';
                setTimeout(() => { btnCopiar.innerText = '📋 Copiar'; }, 2000);
            });
        });
    }

    // Modal Compartilhar
    const btnCompartilhar = document.getElementById('btnCompartilhar');
    btnCompartilhar.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'Bingo Pro - Sorteador Eletrônico',
                text: 'Acompanhe a rodada do bingo ou gere suas cartelas grátis no Bingo Pro!',
                url: window.location.href
            }).catch(() => abrirModal('modalCompartilhar'));
        } else {
            abrirModal('modalCompartilhar');
        }
    });

    const shareUrl = encodeURIComponent(window.location.origin || 'https://sorteio-bingo.pages.dev/');
    const shareText = encodeURIComponent('Vem jogar Bingo com a gente no Bingo Pro! Sorteador com voz e gerador de cartelas grátis: ');

    const linkZap = document.getElementById('btnShareWhatsapp');
    if (linkZap) linkZap.href = `https://api.whatsapp.com/send?text=${shareText}${shareUrl}`;

    const linkTg = document.getElementById('btnShareTelegram');
    if (linkTg) linkTg.href = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;

    const btnCopiarLink = document.getElementById('btnCopiarLinkApp');
    if (btnCopiarLink) {
        btnCopiarLink.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                btnCopiarLink.innerText = '✓ Link Copiado!';
                setTimeout(() => { btnCopiarLink.innerText = '📋 Copiar Link do Site'; }, 2000);
            });
        });
    }

    const btnFecharComp = document.getElementById('btnFecharCompartilhar');
    if (btnFecharComp) btnFecharComp.addEventListener('click', () => fecharModal('modalCompartilhar'));
}

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

    const modalComp = document.getElementById('modalCompartilhar');
    if (modalComp) modalComp.addEventListener('click', e => fecharModalClique(e, 'modalCompartilhar'));

    const btnFecharSob = document.getElementById('btnFecharSobre');
    if (btnFecharSob) btnFecharSob.addEventListener('click', () => fecharModal('modalSobre'));

    const btnFecharPriv = document.getElementById('btnFecharPrivacidade');
    if (btnFecharPriv) btnFecharPriv.addEventListener('click', () => fecharModal('modalPrivacidade'));

    configurarBarraFerramentas();
};

initDOM();
setupEventListeners();
carregarPreferencias();
lerConfiguracoesDosCampos();
prepararNovaPartida();

// Service Worker Registration for PWA Offline Functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Suporte PWA - Instalação
let eventoInstalacaoAdiado = null;
window.addEventListener('beforeinstallprompt', evento => {
    evento.preventDefault();
    eventoInstalacaoAdiado = evento;
    const btnInstalar = document.getElementById('btnInstalarApp');
    if (btnInstalar) btnInstalar.classList.remove('oculto');
});

const btnInstalar = document.getElementById('btnInstalarApp');
if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!eventoInstalacaoAdiado) return;
        eventoInstalacaoAdiado.prompt();
        await eventoInstalacaoAdiado.userChoice;
        eventoInstalacaoAdiado = null;
        btnInstalar.classList.add('oculto');
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.classList.add('oculto');
});

// Inicialização segura e resiliente de anúncios do Google AdSense
function carregarSlotAnuncio(slot) {
    if (!slot || slot.dataset.adLoaded === 'true' || slot.getAttribute('data-adsbygoogle-status')) return;

    const parent = slot.parentElement || slot;
    const rect = slot.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const larguraDisponivel = Math.max(rect.width, parentRect.width, slot.offsetWidth, parent.offsetWidth);

    if (larguraDisponivel >= 200 && window.getComputedStyle(slot).display !== 'none' && window.getComputedStyle(parent).display !== 'none') {
        try {
            slot.dataset.adLoaded = 'true';
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            // Silencia qualquer exceção sem interromper a execução
        }
    }
}

function configurarAnunciosSeguros() {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarAnunciosSeguros);
} else {
    configurarAnunciosSeguros();
}
