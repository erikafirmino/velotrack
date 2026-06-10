/* ══════════════════════════════════════════════════════════════
   VeloTrack — Animação da Cena (SVG)
   Pôr do sol com árvores, nuvens, pássaros e estrada animada
══════════════════════════════════════════════════════════════ */

const Scene = {
    _raf:       null,
    _off:       0,
    _birdPhase: 0,
    _lastTs:    performance.now(),

    // Dimensões do viewBox
    W:  400,
    H:  210,
    HY: 128,
    VX: 200,

    roadLX(y) { return this.VX * (1 - (y - this.HY) / (this.H - this.HY)); },
    roadRX(y) { return this.VX + this.VX * ((y - this.HY) / (this.H - this.HY)); },

    start() {
        this._raf = requestAnimationFrame(ts => this._tick(ts));
    },

    stop() {
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    },

    _tick(ts) {
        this._raf = requestAnimationFrame(t => this._tick(t));
        const dt      = Math.min((ts - this._lastTs) / 1000, 0.05);
        this._lastTs  = ts;
        const factor  = state.currentSpeedKmh / 55;
        this._off    += factor * 200 * dt;
        this._birdPhase += dt;
        this._render();
    },

    _render() {
        const { W, H, HY, VX } = this;
        const off = this._off;
        const bp  = this._birdPhase;

        // Nuvens
        [['cloud1', 80, 0.1], ['cloud2', 260, 0.06], ['cloud3', 340, 0.13]].forEach(([id, bx, sp]) => {
            const el = $(id);
            if (el) el.setAttribute('transform',
                `translate(${((bx - off * sp) % (W + 120) + W + 120) % (W + 120) - 60 - bx}, 0)`);
        });

        // Pássaros
        const birdsG = $('birds');
        if (birdsG) {
            birdsG.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const bx   = ((i * 85 + 30 - off * 0.18) % (W + 60) + W + 60) % (W + 60) - 30;
                const by   = 28 + (i * 13) % 28;
                const sc   = 0.6 + (i * 0.17) % 0.5;
                const flap = Math.sin(bp * 3 + i * 1.2) * 4 * sc;
                const g    = this._svg('g', { transform: `translate(${bx},${by})`, opacity: '0.8' });
                g.appendChild(this._svg('path', { d: `M0,0 Q${-7*sc},${flap} ${-14*sc},0`, stroke: '#2a0a1a', 'stroke-width': 1.2*sc, fill: 'none' }));
                g.appendChild(this._svg('path', { d: `M0,0 Q${7*sc},${flap} ${14*sc},0`,  stroke: '#2a0a1a', 'stroke-width': 1.2*sc, fill: 'none' }));
                birdsG.appendChild(g);
            }
        }

        // Faixas tracejadas
        const dashG = $('road-dashes');
        if (dashG) {
            dashG.innerHTML = '';
            for (let i = 0; i < 8; i++) {
                const frac = ((i / 8) + (off * 0.0022)) % 1;
                const y1   = HY + frac * (H - HY);
                const y2   = HY + Math.min(frac + 1 / 8 / 1.8, 1) * (H - HY);
                dashG.appendChild(this._svg('line', {
                    x1: VX, y1, x2: VX, y2,
                    stroke: 'rgba(255,255,255,0.7)',
                    'stroke-width': 1 + frac * 5,
                    'stroke-linecap': 'round',
                }));
            }
        }

        // Árvores
        const treesG = $('trees-group');
        if (treesG) {
            treesG.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const frac = ((i / 10) + (off * 0.0028)) % 1;
                const y    = HY + frac * (H - HY);
                const lx   = this.roadLX(y);
                const rx   = this.roadRX(y);
                const sc2  = 0.1 + frac * 0.9;
                const h    = (32 + (i * 11) % 18) * sc2;
                const dark = i % 2 === 0;
                const gap  = 5 + frac * 22;
                [[lx - gap - h * 0.3, y], [rx + gap, y]].forEach(([tx, ty]) => {
                    treesG.appendChild(this._makeTree(tx, ty, h, dark));
                });
            }
        }

        // HUDs
        const hudSpeed = $('hud-speed');
        const hudTime  = $('hud-time');
        const dispTime = $('display-time');
        if (hudSpeed) hudSpeed.textContent = state.currentSpeedKmh.toFixed(1);
        if (hudTime && dispTime) hudTime.textContent = dispTime.textContent;
    },

    _makeTree(tx, ty, h, dark) {
        const g   = this._svg('g', { transform: `translate(${tx},${ty})` });
        const wt  = h * 0.55;
        const tw2 = Math.max(1.5, h * 0.1);
        const tr  = this._svg('rect', { x: -tw2/2, y: 0, width: tw2, height: h*0.22, fill: '#2a1a08' });
        const b1  = this._svg('polygon', { points: `0,${-h*0.55} ${-wt*0.65},0 ${wt*0.65},0`, fill: dark ? '#0f2a0f' : '#1a3a10' });
        const b2  = this._svg('polygon', { points: `0,${-h*0.85} ${-wt*0.5},${-h*0.35} ${wt*0.5},${-h*0.35}`, fill: dark ? '#162a12' : '#224015' });
        g.appendChild(tr); g.appendChild(b1); g.appendChild(b2);
        return g;
    },

    _svg(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    },
};
