/* ══════════════════════════════════════════════════════════════
   VeloTrack — Controles de Treino
══════════════════════════════════════════════════════════════ */

const Training = {

    start() {
        state.isTraining      = true;
        state.isPaused        = false;
        state.startTime       = Date.now();
        state.pausedMs        = 0;
        state.totalDistM      = 0;
        state.currentSpeedKmh = 0;
        state.maxSpeedKmh     = 0;
        state.totalRevs       = 0;
        state.prevRevs        = null;
        state.prevEventTime   = null;
        state.speedHistory    = [];

        els.statusDot.className = 'status-dot training';
        showScreen('training');
        Timer.start();
        Scene.start();
        WakeLock.request();
        if (state.isDemoMode) Demo.start();
    },

    pause() {
        if (state.isPaused) {
            // Retomar
            state.pausedMs          += Date.now() - state.pauseStart;
            state.isPaused           = false;
            state.pauseStart         = null;
            state._resumedFromPause  = true; // reseta referência CSC na próxima leitura
            els.btnPause.textContent = 'II';
            els.statusDot.className  = 'status-dot training';
            WakeLock.request();
            if (state.isDemoMode) Demo.start();
        } else {
            // Pausar
            state.isPaused        = true;
            state.pauseStart      = Date.now();
            state.currentSpeedKmh = 0;
            els.btnPause.textContent = '▶';
            els.statusDot.className  = 'status-dot connected';
            WakeLock.release();
            if (state.isDemoMode) Demo.stop();
        }
    },

    finish() {
        state.isTraining = false;
        Timer.stop();
        Scene.stop();
        Demo.stop();
        WakeLock.release();

        const elapsedMs  = Timer.getElapsedMs();
        const elapsedSec = elapsedMs / 1000;
        const distKm     = state.totalDistM / 1000;
        const avgKmh     = elapsedSec > 0 ? (distKm / (elapsedSec / 3600)) : 0;

        state.result = {
            date:     new Date().toLocaleString('pt-BR'),
            duration: Timer.format(elapsedMs),
            distKm:   parseFloat(distKm.toFixed(3)),
            avgKmh:   parseFloat(avgKmh.toFixed(1)),
            maxKmh:   parseFloat(state.maxSpeedKmh.toFixed(1)),
            revs:     state.totalRevs,
        };

        Display.showSummary(elapsedMs);
        els.statusDot.className = 'status-dot connected';
        showScreen('summary');
        Confete.launch();
    },

    reset() {
        state.result      = null;
        state.isConnected = false;
        state.isPaused    = false;
        Demo.stop();
        Scene.stop();
        Bluetooth.disconnect();
        els.statusDot.className = 'status-dot';
        showScreen('connect');
    },
};

/* ══════════════════════════════════════════════════════════════
   Display — atualiza a UI durante o treino e resumo
══════════════════════════════════════════════════════════════ */
const Display = {

    calcCalorias(distKm, avgKmh) {
        const met = avgKmh < 15 ? 6 : avgKmh < 25 ? 8 : 10;
        return Math.round(distKm * state.weightKg * met * 0.06);
    },

    updateTraining() {
        const elapsedMs  = Timer.getElapsedMs();
        const elapsedSec = elapsedMs / 1000;
        const distKm     = state.totalDistM / 1000;
        const avgKmh     = elapsedSec > 0 ? (distKm / (elapsedSec / 3600)) : 0;
        const timeStr    = Timer.format(elapsedMs);

        const dispTime = $('display-time');
        if (dispTime) dispTime.textContent = timeStr;

        els.displayDist.textContent = distKm.toFixed(2);
        els.displayAvg.textContent  = avgKmh.toFixed(1);
        els.displayMax.textContent  = state.maxSpeedKmh.toFixed(1);

        // Pace (min/km)
        const dispPace = $('display-pace');
        if (dispPace) {
            if (state.currentSpeedKmh > 0.5) {
                const paceTotal = 60 / state.currentSpeedKmh;
                const paceMin   = Math.floor(paceTotal);
                const paceSec   = Math.round((paceTotal - paceMin) * 60);
                dispPace.textContent = paceMin + ':' + String(paceSec).padStart(2, '0');
            } else {
                dispPace.textContent = '--';
            }
        }

        // Calorias
        const dispCal = $('display-cal');
        if (dispCal) dispCal.textContent = this.calcCalorias(distKm, avgKmh);

        // 8: Cor de intensidade no HUD de velocidade
        const hudSpeed = $('hud-speed');
        if (hudSpeed) {
            const spd = state.currentSpeedKmh;
            let cor = '#00e5ff'; // azul — parado/lento
            if      (spd >= 30) cor = '#ff3d6b'; // vermelho — intenso
            else if (spd >= 20) cor = '#ffaa00'; // amarelo — moderado
            else if (spd >= 10) cor = '#00ff9d'; // verde — leve
            hudSpeed.setAttribute('fill', cor);
            // Atualiza borda do HUD box
            const hudBox = hudSpeed.previousElementSibling;
            if (hudBox) hudBox.setAttribute('stroke', cor);
        }

        // Meta
        const metaBar = $('meta-bar');
        const metaLbl = $('meta-label');
        const metaRem = $('meta-remaining');
        if (metaBar && state.metaKm > 0) {
            const pct    = Math.min((distKm / state.metaKm) * 100, 100);
            const faltam = Math.max(state.metaKm - distKm, 0);
            metaBar.style.width = pct + '%';
            if (metaLbl) metaLbl.textContent = state.metaKm + ' km';

            // 9: Animação ao atingir meta
            if (pct >= 100 && !state._metaAtingida) {
                state._metaAtingida      = true;
                metaBar.style.background = 'linear-gradient(90deg, #00ff9d, #00e5ff)';
                metaBar.style.boxShadow  = '0 0 12px rgba(0,255,157,0.6)';
                if (metaRem) metaRem.textContent = 'Meta atingida! 🎉';
                showToast('🎉 Meta atingida! Parabens!', 4000);
                const metaCard = $('meta-card');
                if (metaCard) {
                    metaCard.style.borderColor = '#00ff9d';
                    metaCard.style.boxShadow   = '0 0 16px rgba(0,255,157,0.3)';
                    setTimeout(() => {
                        metaCard.style.borderColor = '';
                        metaCard.style.boxShadow   = '';
                    }, 4000);
                }
            } else if (pct < 100) {
                state._metaAtingida = false;
                if (metaRem) metaRem.textContent = 'Faltam ' + faltam.toFixed(2) + ' km';
            }
        }
    },

    showSummary(elapsedMs) {
        const m      = Math.floor(elapsedMs / 60000);
        const sumCal = $('sum-cal');

        $('summary-date').textContent = state.result.date;
        $('sum-dist').textContent     = state.result.distKm.toFixed(2);
        $('sum-time').textContent     = String(Math.floor(m / 60)).padStart(2,'0') + ':' + String(m % 60).padStart(2,'0');
        $('sum-avg').textContent      = state.result.avgKmh.toFixed(1);
        $('sum-max').textContent      = state.result.maxKmh.toFixed(1);
        $('sum-rev').textContent      = state.result.revs.toLocaleString('pt-BR');
        if (sumCal) sumCal.textContent = this.calcCalorias(state.result.distKm, state.result.avgKmh);

        els.saveStatus.className = 'save-status';
        els.saveStatus.innerHTML = 'Aguardando envio...';
        els.btnSave.disabled     = false;
    },
};

/* ══════════════════════════════════════════════════════════════
   Demo — dados simulados quando sem sensor
══════════════════════════════════════════════════════════════ */
const Demo = {
    start() {
        this.stop();
        state.demoRevAcc  = state.prevRevs       || 0;
        state.demoTimeAcc = state.prevEventTime  || 0;

        state.demoInterval = setInterval(() => {
            if (!state.isTraining || state.isPaused) return;
            const targetSpeed = 18 + Math.random() * 17;
            const revPerSec   = (targetSpeed / 3.6) / (state.circumferenceMm / 1000);
            state.demoRevAcc  += revPerSec * 0.5;
            state.demoTimeAcc += 512;
            if (state.demoTimeAcc > 0xFFFF) state.demoTimeAcc -= 0xFFFF;
            Bluetooth.processRevData(
                Math.round(state.demoRevAcc),
                Math.round(state.demoTimeAcc) % 0xFFFF
            );
        }, 500);
    },

    stop() {
        if (state.demoInterval) {
            clearInterval(state.demoInterval);
            state.demoInterval = null;
        }
    },
};

/* ══════════════════════════════════════════════════════════════
   WakeLock — tela sempre ativa durante o treino
══════════════════════════════════════════════════════════════ */
const WakeLock = {
    async request() {
        if ('wakeLock' in navigator) {
            try {
                state.wakeLock = await navigator.wakeLock.request('screen');
                state.wakeLock.addEventListener('release', () => { state.wakeLock = null; });
            } catch (err) { console.warn('WakeLock:', err); }
        }
    },
    async release() {
        if (state.wakeLock) { await state.wakeLock.release(); state.wakeLock = null; }
    },
};

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && state.isTraining && !state.isPaused) {
        await WakeLock.request();
    }
});

/* ══════════════════════════════════════════════════════════════
   Confete — animação de conclusão
══════════════════════════════════════════════════════════════ */
const Confete = {
    launch() {
        const wrap = $('confete-wrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        wrap.classList.add('ativo');

        const cores = ['#00e5ff','#ff3d6b','#00ff9d','#ffaa00','#a855f7','#f5b942'];
        for (let i = 0; i < 80; i++) {
            const el = document.createElement('div');
            el.className              = 'confete';
            el.style.left             = Math.random() * 100 + 'vw';
            el.style.background       = cores[Math.floor(Math.random() * cores.length)];
            el.style.animationDuration = (1.5 + Math.random() * 2.5) + 's';
            el.style.animationDelay   = (Math.random() * 1.2) + 's';
            el.style.width            = (6 + Math.random() * 6) + 'px';
            el.style.height           = (10 + Math.random() * 8) + 'px';
            el.style.borderRadius     = Math.random() > 0.5 ? '50%' : '2px';
            wrap.appendChild(el);
        }

        setTimeout(() => { wrap.classList.remove('ativo'); wrap.innerHTML = ''; }, 5000);
    },
};
