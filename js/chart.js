/* ══════════════════════════════════════════════════════════════
   VeloTrack — Gráfico de Velocidade (Canvas)
══════════════════════════════════════════════════════════════ */

const CHART_POINTS  = 40;
const MAX_SPEED_KMH = 60;

const Chart = {

    updateHistory(spd) {
        state.speedHistory.push(spd);
        if (state.speedHistory.length > CHART_POINTS) state.speedHistory.shift();
        els.speedChartCurrent.textContent = spd.toFixed(1) + ' km/h';
        this.draw();
    },

    draw() {
        const canvas = els.speedCanvas;
        if (!canvas) return;

        const dpr  = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        ctx.clearRect(0, 0, w, h);

        const history = state.speedHistory;
        if (history.length < 2) return;

        const maxVal = Math.max(MAX_SPEED_KMH, ...history) * 1.1;
        const step   = w / (CHART_POINTS - 1);

        // Gradiente da linha
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0,   'rgba(0,229,255,0.3)');
        grad.addColorStop(0.7, 'rgba(0,229,255,0.8)');
        grad.addColorStop(1,   '#ff3d6b');

        // Área preenchida
        ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * step, y = h - (val / maxVal) * h;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.lineTo((history.length - 1) * step, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,229,255,0.08)';
        ctx.fill();

        // Linha
        ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * step, y = h - (val / maxVal) * h;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2;
        ctx.lineJoin    = 'round';
        ctx.stroke();

        // Ponto atual
        const last = history[history.length - 1];
        ctx.beginPath();
        ctx.arc((history.length - 1) * step, h - (last / maxVal) * h, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3d6b';
        ctx.fill();
    },
};
