/* ══════════════════════════════════════════════════════════════
   VeloTrack — Sons (Web Audio API)
   Sons gerados sinteticamente — sem arquivos externos
══════════════════════════════════════════════════════════════ */

const Som = {
    _ctx: null,

    _getCtx() {
        if (!this._ctx) {
            try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        // Resume se estava suspenso (política de autoplay)
        if (this._ctx.state === 'suspended') this._ctx.resume();
        return this._ctx;
    },

    _beep(frequency, duration, type = 'sine', volume = 0.3) {
        const ctx = this._getCtx();
        if (!ctx) return;

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type      = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    },

    /* ── Meta atingida — fanfarra ascendente ── */
    meta() {
        const notas = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notas.forEach((freq, i) => {
            setTimeout(() => this._beep(freq, 0.25, 'sine', 0.25), i * 150);
        });
    },

    /* ── Recorde pessoal — três bips agudos ── */
    recorde() {
        [880, 1100, 1320].forEach((freq, i) => {
            setTimeout(() => this._beep(freq, 0.18, 'triangle', 0.2), i * 120);
        });
    },

    /* ── Conclusão do treino — sequência celebratória ── */
    conclusao() {
        const seq = [
            { f: 523, t: 0   },
            { f: 659, t: 150 },
            { f: 784, t: 300 },
            { f: 659, t: 450 },
            { f: 784, t: 550 },
            { f: 1047,t: 700 },
        ];
        seq.forEach(n => setTimeout(() => this._beep(n.f, 0.3, 'sine', 0.25), n.t));
    },

    /* ── Notificação simples ── */
    notificacao() {
        this._beep(880, 0.12, 'sine', 0.15);
        setTimeout(() => this._beep(1100, 0.12, 'sine', 0.15), 150);
    },
};
