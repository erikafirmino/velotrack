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
function showScreen(name) {
    ['connect', 'training', 'summary', 'historico', 'config'].forEach(k => {
        const el = $('screen-' + k);
        if (el) el.classList.toggle('active', k === name);
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
    showScreen('config');
});

// Salvar configurações
document.getElementById('btn-salvar-config')?.addEventListener('click', () => {
    state.circumferenceMm = parseInt($('input-circ')?.value)    || 2180;
    state.gasUrl          = $('input-gas-url')?.value.trim()    || '';
    state.weightKg        = parseFloat($('input-weight')?.value) || 70;
    state.metaKm          = parseFloat($('input-meta')?.value)   || 10;
    Storage.saveConfig();
    showToast('Configurações salvas!');
    setTimeout(() => showScreen('connect'), 800);
});

// Voltar das configurações
document.getElementById('btn-back-config')?.addEventListener('click', () => {
    showScreen('connect');
});

els.btnPause.addEventListener('click',  () => Training.pause());
els.btnFinish.addEventListener('click', () => Training.finish());
els.btnSave.addEventListener('click',   () => Storage.saveToSheets());
els.btnNew.addEventListener('click',    () => Training.reset());

window.addEventListener('resize', () => Chart.draw());

// Histórico a partir da home
document.getElementById('btn-ver-historico-home')?.addEventListener('click', () => {
    document.getElementById('btn-historico')?.click();
});

// Histórico a partir do summary
document.getElementById('btn-historico')?.addEventListener('click', () => {
    // Recordes
    const recVel  = $('rec-vel');
    const recDist = $('rec-dist');
    if (recVel)  recVel.textContent  = state._recordeVelocidade > 0 ? state._recordeVelocidade.toFixed(1) : '--';
    if (recDist) recDist.textContent = state._recordeDistancia  > 0 ? state._recordeDistancia.toFixed(2)  : '--';

    // Lista de treinos
    const lista     = $('historico-lista');
    const historico = Storage.loadHistorico();
    if (lista) {
        if (historico.length === 0) {
            lista.innerHTML = '<div style="font-family:var(--font-mono);font-size:12px;color:var(--muted);text-align:center;padding:20px;">Nenhum treino registrado ainda.</div>';
        } else {
            lista.innerHTML = historico.map((t, i) => `
                <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted);">${t.date}</span>
                        <span style="font-family:var(--font-display);font-size:13px;letter-spacing:1px;color:var(--accent);">${t.duration}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
                        <div>
                            <div style="font-family:var(--font-display);font-size:24px;color:var(--text);">${t.distKm.toFixed(2)}</div>
                            <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km</div>
                        </div>
                        <div>
                            <div style="font-family:var(--font-display);font-size:24px;color:var(--text);">${t.avgKmh.toFixed(1)}</div>
                            <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km/h med</div>
                        </div>
                        <div>
                            <div style="font-family:var(--font-display);font-size:24px;color:var(--warn);">${t.maxKmh.toFixed(1)}</div>
                            <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);">km/h max</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    showScreen('historico');
});

document.getElementById('btn-back-historico')?.addEventListener('click', () => {
    // Volta para connect se não há resultado de treino, senão para summary
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
