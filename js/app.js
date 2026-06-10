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
    speedChartCurrent: $('speed-chart-current'),
    speedCanvas:       $('speed-canvas'),
};

/* ── Navegação ── */
function showScreen(name) {
    ['connect', 'training', 'summary'].forEach(k => {
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
})();

/* ── Event Listeners ── */
els.btnConnect.addEventListener('click', () => {
    state.circumferenceMm = parseInt(els.inputCirc.value)              || 2180;
    state.gasUrl          = els.inputGasUrl.value.trim();
    state.weightKg        = parseFloat($('input-weight')?.value)       || 70;
    state.metaKm          = parseFloat($('input-meta')?.value)         || 10;

    Storage.saveConfig();

    if (state.isDemoMode) {
        state.isConnected       = true;
        els.statusDot.className = 'status-dot connected';
        showToast('Modo demo ativo');
        Training.start();
    } else {
        Bluetooth.connect();
    }
});

els.btnPause.addEventListener('click',  () => Training.pause());
els.btnFinish.addEventListener('click', () => Training.finish());
els.btnSave.addEventListener('click',   () => Storage.saveToSheets());
els.btnNew.addEventListener('click',    () => Training.reset());

window.addEventListener('resize', () => Chart.draw());

/* ── Spotify ── */
Spotify.init();

/* ── PWA Service Worker ── */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
