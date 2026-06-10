/* ══════════════════════════════════════════════════════════════
   VeloTrack — Timer e Utilitários de Tempo
══════════════════════════════════════════════════════════════ */

const Timer = {
    _interval: null,

    start() {
        this.stop();
        this._interval = setInterval(() => {
            if (!state.isPaused) Display.updateTraining();
        }, 1000);
    },

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    },

    getElapsedMs() {
        if (!state.startTime) return 0;
        const now    = Date.now();
        const paused = state.isPaused ? (now - state.pauseStart) : 0;
        return now - state.startTime - state.pausedMs - paused;
    },

    format(ms) {
        const s = Math.floor(ms / 1000);
        return [
            Math.floor(s / 3600),
            Math.floor((s % 3600) / 60),
            s % 60,
        ].map(n => String(n).padStart(2, '0')).join(':');
    },
};
