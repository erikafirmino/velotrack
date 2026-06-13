/* ══════════════════════════════════════════════════════════════
   VeloTrack — Inicialização e Event Listeners
══════════════════════════════════════════════════════════════ */

/* ── Utilitário ── */
const $ = id => document.getElementById(id);

/* ── Referências DOM ── */
const els = {
    statusDot:         $('status-dot'),
    noBtBanner:        $('no-bt-banner'),
    inputCirc:         $('input-circ'),
    inputGasUrl:       $('input-gas-url'),
    btnConnect:        $('btn-connect'),
    displayDist:       $('display-dist'),
    displayAvg:        $('display-avg'),
    displayMax:        $('display-max'),
    btnPause:          $('btn-pause'),
    btnFinish:         $('btn-finish'),
    summaryDate:       $('summary-date'),
    sumDist:           $('sum-dist'),
    sumTime:           $('sum-time'),
    sumAvg:            $('sum-avg'),
    sumMax:            $('sum-max'),
    sumRev:            $('sum-rev'),
    saveStatus:        $('save-status'),
    btnSave:           $('btn-save'),
    btnNew:            $('btn-new'),
    toast:             $('toast'),
    btnHistorico:      $('btn-historico'),
    btnBackHistorico:  $('btn-back-historico'),
    speedChartCurrent: $('speed-chart-current'),
    speedCanvas:       $('speed-canvas'),
};

/* ── Navegação ── */
function showScreen(name, anim) {
    ['connect', 'training', 'summary', 'historico', 'config'].forEach(k => {
        const el = $('screen-' + k);
        if (!el) return;
        el.classList.remove('active', 'slide-right', 'slide-left');
        if (k === name) {
            el.classList.add('active');
            if (anim === 'right') el.classList.add('slide-right');
            if (anim === 'left')  el.classList.add('slide-left');
        }
    });
}

/* ── Toast ── */
let _toastTimer;
function showToast(msg, dur = 3000) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => els.toast.classList.remove('show'), dur);
}

/* ── Inicialização ── */
(function init() {
    // Verifica suporte a Bluetooth
    if (!navigator.bluetooth) {
        els.noBtBanner.style.display = 'block';
        state.isDemoMode             = true;
        els.btnConnect.textContent   = 'INICIAR DEMO';
    }

    // Carrega config salva
    Storage.loadConfig();
    Storage.loadRecordes();
})();

/* ── Event Listeners ── */
els.btnConnect.addEventListener('click', () => {
    // Carrega config salva antes de conectar
    state.circumferenceMm = parseInt(localStorage.getItem('vt_circ'))    || 2180;
    state.gasUrl          = localStorage.getItem('vt_gas_url')           || '';
    state.weightKg        = parseFloat(localStorage.getItem('vt_weight')) || 70;
    state.metaKm          = parseFloat(localStorage.getItem('vt_meta'))   || 10;

    if (state.isDemoMode) {
        state.isConnected       = true;
        els.statusDot.className = 'status-dot connected';
        showToast('Modo demo ativo');
        Training.start();
    } else {
        Bluetooth.connect();
    }
});

// Ir para configurações
document.getElementById('btn-ir-config')?.addEventListener('click', () => {
    showScreen('config', 'right');
});

// Salvar configurações
document.getElementById('btn-salvar-config')?.addEventListener('click', () => {
    state.circumferenceMm = parseInt($('input-circ')?.value)    || 2180;
    state.gasUrl          = $('input-gas-url')?.value.trim()    || '';
    state.weightKg        = parseFloat($('input-weight')?.value) || 70;
    state.metaKm          = parseFloat($('input-meta')?.value)   || 10;
    Storage.saveConfig();
    showToast('Configurações salvas!');
    setTimeout(() => showScreen('connect', 'left'), 800);
});

// Voltar das configurações
document.getElementById('btn-back-config')?.addEventListener('click', () => {
    showScreen('connect', 'left');
});

els.btnPause.addEventListener('click',  () => Training.pause());
els.btnFinish.addEventListener('click', () => Training.finish());
els.btnSave.addEventListener('click',   () => Storage.saveToSheets());
els.btnNew.addEventListener('click',    () => Training.reset());

window.addEventListener('resize', () => Chart.draw());

/* ── Resumo Semanal ── */
function calcResumoSemanal(treinos) {
    const agora   = new Date();
    const diaSem  = agora.getDay(); // 0=dom
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - diaSem);
    inicioSemana.setHours(0, 0, 0, 0);

    const desta = treinos.filter(t => {
        try {
            // Data no formato brasileiro: "dd/mm/aaaa, hh:mm:ss"
            const partes = t.date.split('/');
            if (partes.length < 3) return false;
            const dia = parseInt(partes[0]);
            const mes = parseInt(partes[1]) - 1;
            const ano = parseInt(partes[2].split(',')[0]);
            const d   = new Date(ano, mes, dia);
            return d >= inicioSemana;
        } catch { return false; }
    });

    const totalKm   = desta.reduce((s, t) => s + parseFloat(t.distKm || 0), 0);
    const totalMins = desta.reduce((s, t) => {
        try {
            const dur = t.duration || '00:00:00';
            const p   = dur.split(':').map(Number);
            return s + (p[0] * 60) + p[1];
        } catch { return s; }
    }, 0);

    return {
        treinos: desta.length,
        km:      totalKm,
        horas:   Math.floor(totalMins / 60),
        mins:    totalMins % 60,
    };
}

function renderResumoSemanal(treinos) {
    const r = calcResumoSemanal(treinos);
    const semTreinos = $('sem-treinos');
    const semKm      = $('sem-km');
    const semTempo   = $('sem-tempo');
    if (semTreinos) semTreinos.textContent = r.treinos;
    if (semKm)      semKm.textContent      = r.km.toFixed(1);
    if (semTempo)   semTempo.textContent   = r.horas > 0
        ? r.horas + 'h' + (r.mins > 0 ? r.mins + 'm' : '')
        : r.mins + 'm';
}

/* ── Gráfico de Evolução ── */
let _evolucaoTreinos = [];
let _evolucaoMetrica = 'dist';

function renderEvolucao(metrica) {
    _evolucaoMetrica = metrica;
    // Atualiza botões
    const btnDist = $('btn-ev-dist');
    const btnVel  = $('btn-ev-vel');
    if (btnDist) btnDist.classList.toggle('active', metrica === 'dist');
    if (btnVel)  btnVel.classList.toggle('active',  metrica === 'vel');

    const canvas = $('evolucao-canvas');
    if (!canvas) return;

    const treinos = _evolucaoTreinos.slice(-15).reverse(); // últimos 15 em ordem cronológica
    if (treinos.length < 2) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#6b6b80';
        ctx.textAlign = 'center';
        ctx.fillText('Precisa de mais treinos para o gráfico', rect.width/2, rect.height/2);
        return;
    }

    const valores = treinos.map(t => metrica === 'dist'
        ? parseFloat(t.distKm || 0)
        : parseFloat(t.maxKmh || 0));

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(...valores) * 1.15 || 1;
    const minVal = 0;
    const step   = W / (valores.length - 1);

    // Grade
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    [0.25, 0.5, 0.75].forEach(f => {
        const y = H - f * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });

    // Gradiente
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   'rgba(0,229,255,0.5)');
    grad.addColorStop(1,   '#ff3d6b');

    // Área
    ctx.beginPath();
    valores.forEach((v, i) => {
        const x = i * step;
        const y = H - ((v - minVal) / (maxVal - minVal)) * H * 0.85 - H * 0.05;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo((valores.length - 1) * step, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,229,255,0.07)';
    ctx.fill();

    // Linha
    ctx.beginPath();
    valores.forEach((v, i) => {
        const x = i * step;
        const y = H - ((v - minVal) / (maxVal - minVal)) * H * 0.85 - H * 0.05;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // Pontos e valores
    valores.forEach((v, i) => {
        const x = i * step;
        const y = H - ((v - minVal) / (maxVal - minVal)) * H * 0.85 - H * 0.05;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3d6b';
        ctx.fill();
        // Label do valor
        ctx.font      = `${9 * dpr / dpr}px monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(1), x, y - 7);
    });
}

// Renderiza lista de treinos
function renderListaHistorico(treinos) {
    const lista = $('historico-lista');
    if (!lista) return;
    if (treinos.length === 0) {
        lista.innerHTML = '<div style="font-family:var(--font-mono);font-size:12px;color:var(--muted);text-align:center;padding:20px;">Nenhum treino registrado ainda.</div>';
        return;
    }
    lista.innerHTML = treinos.map(t => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted);">${t.date}</span>
                <span style="font-family:var(--font-display);font-size:13px;letter-spacing:1px;color:var(--accent);">${t.duration}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
                <div>
                    <div style="font-family:var(--font-display);font-size:24px;color:var(--text);">${parseFloat(t.distKm).toFixed(2)}</div>
                    <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km</div>
                </div>
                <div>
                    <div style="font-family:var(--font-display);font-size:24px;color:var(--text);">${parseFloat(t.avgKmh).toFixed(1)}</div>
                    <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km/h med</div>
                </div>
                <div>
                    <div style="font-family:var(--font-display);font-size:24px;color:var(--warn);">${parseFloat(t.maxKmh).toFixed(1)}</div>
                    <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km/h max</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Busca histórico da planilha via JSONP
function buscarHistoricoPlanilha(callback) {
    const url = state.gasUrl || localStorage.getItem('vt_gas_url');
    if (!url) { callback([]); return; }

    const callbackName = 'vtHistoricoCallback_' + Date.now();
    const script       = document.createElement('script');

    window[callbackName] = function(data) {
        delete window[callbackName];
        script.remove();
        if (data.status === 'ok') callback(data.treinos);
        else callback([]);
    };

    script.src = url + '?action=historico&callback=' + callbackName;
    script.onerror = () => { delete window[callbackName]; callback([]); };
    document.head.appendChild(script);
}

function abrirHistorico() {
    // Recordes
    const recVel  = $('rec-vel');
    const recDist = $('rec-dist');
    if (recVel)  recVel.textContent  = state._recordeVelocidade > 0 ? state._recordeVelocidade.toFixed(1) : '--';
    if (recDist) recDist.textContent = state._recordeDistancia  > 0 ? state._recordeDistancia.toFixed(2)  : '--';

    // Mostra histórico local imediatamente
    const local = Storage.loadHistorico();
    _evolucaoTreinos = local;
    renderListaHistorico(local);
    renderResumoSemanal(local);
    showScreen('historico', 'right');
    setTimeout(() => renderEvolucao('dist'), 100);

    // Tenta buscar da planilha em segundo plano
    const lista   = $('historico-lista');
    const loading = document.createElement('div');
    loading.style.cssText = 'font-family:var(--font-mono);font-size:10px;color:var(--muted);text-align:center;padding:8px;';
    loading.textContent   = '⟳ Buscando treinos da planilha...';
    if (lista) lista.prepend(loading);

    buscarHistoricoPlanilha(treinos => {
        loading.remove();
        if (treinos.length > 0) {
            _evolucaoTreinos = treinos;
            renderListaHistorico(treinos);
            renderResumoSemanal(treinos);
            setTimeout(() => renderEvolucao(_evolucaoMetrica), 100);
        }
    });
}

// Histórico a partir da home
document.getElementById('btn-ver-historico-home')?.addEventListener('click', abrirHistorico);

// Histórico a partir do summary
document.getElementById('btn-historico')?.addEventListener('click', abrirHistorico);

document.getElementById('btn-back-historico')?.addEventListener('click', () => {
    showScreen(state.result ? 'summary' : 'connect');
});

/* ── Spotify ── */
Spotify.init();

/* ── PWA Service Worker ── */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
