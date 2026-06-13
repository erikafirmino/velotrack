/* ══════════════════════════════════════════════════════════════
   VeloTrack — Persistência (localStorage + Google Sheets)
══════════════════════════════════════════════════════════════ */

const Storage = {

    /* ── Chaves ── */
    KEYS: {
        GAS_URL: 'vt_gas_url',
        CIRC:    'vt_circ',
        WEIGHT:  'vt_weight',
        META:    'vt_meta',
    },

    /* ── Salva configurações ── */
    saveConfig() {
        localStorage.setItem(this.KEYS.GAS_URL, state.gasUrl);
        localStorage.setItem(this.KEYS.CIRC,    state.circumferenceMm);
        localStorage.setItem(this.KEYS.WEIGHT,  state.weightKg);
        localStorage.setItem(this.KEYS.META,    state.metaKm);
    },

    /* ── Carrega configurações e preenche os inputs ── */
    loadConfig() {
        const savedUrl    = localStorage.getItem(this.KEYS.GAS_URL);
        const savedCirc   = localStorage.getItem(this.KEYS.CIRC);
        const savedWeight = localStorage.getItem(this.KEYS.WEIGHT);
        const savedMeta   = localStorage.getItem(this.KEYS.META);

        if (savedUrl)    els.inputGasUrl.value                            = savedUrl;
        if (savedCirc)   els.inputCirc.value                              = savedCirc;
        if (savedWeight) { const w = $('input-weight'); if (w) w.value   = savedWeight; }
        if (savedMeta)   { const m = $('input-meta');   if (m) m.value   = savedMeta;   }
    },

    /* ── Envia treino para o Google Sheets ── */
    async saveToSheets() {
        const url = state.gasUrl.trim();
        if (!url) { showToast('Configure a URL do Apps Script primeiro!'); return; }
        if (!state.result) return;

        els.btnSave.disabled = true;
        els.saveStatus.className = 'save-status saving';
        els.saveStatus.innerHTML = 'Enviando dados...';

        try {
            // Usa exatamente os valores exibidos na tela do resumo
            const payload = {
                date:     state.result.date,
                duration: state.result.duration,
                distKm:   parseFloat($('sum-dist')?.textContent || state.result.distKm),
                avgKmh:   parseFloat($('sum-avg')?.textContent  || state.result.avgKmh),
                maxKmh:   parseFloat($('sum-max')?.textContent  || state.result.maxKmh),
                revs:     state.result.revs,
            };

            const params = new URLSearchParams();
            params.append('payload', JSON.stringify(payload));
            await fetch(url, { method: 'POST', mode: 'no-cors', body: params });

            els.saveStatus.className = 'save-status saved';
            els.saveStatus.innerHTML = 'Salvo no Google Sheets!';
            showToast('Treino salvo com sucesso!');
        } catch (err) {
            els.saveStatus.className = 'save-status error';
            els.saveStatus.innerHTML = 'Erro: ' + err.message;
            showToast('Falha ao salvar: ' + err.message);
            els.btnSave.disabled = false;
        }
    },
    /* ── Recordes pessoais ── */
    loadRecordes() {
        state._recordeVelocidade = parseFloat(localStorage.getItem('vt_rec_vel')  || '0');
        state._recordeDistancia  = parseFloat(localStorage.getItem('vt_rec_dist') || '0');
    },

    saveRecordes() {
        localStorage.setItem('vt_rec_vel',  state._recordeVelocidade);
        localStorage.setItem('vt_rec_dist', state._recordeDistancia);
    },

    checkRecordes(distKm, maxKmh) {
        let novoRecorde = false;

        if (maxKmh > state._recordeVelocidade) {
            state._recordeVelocidade = maxKmh;
            novoRecorde = true;
            showToast('🏆 Novo recorde de velocidade: ' + maxKmh.toFixed(1) + ' km/h!', 4000);
            Som.recorde();
        }

        if (distKm > state._recordeDistancia) {
            state._recordeDistancia = distKm;
            novoRecorde = true;
            showToast('🏆 Novo recorde de distancia: ' + distKm.toFixed(2) + ' km!', 4000);
        }

        if (novoRecorde) this.saveRecordes();
        return novoRecorde;
    },

    /* ── Histórico local ── */
    saveHistorico(result) {
        const historico = this.loadHistorico();
        historico.unshift(result); // mais recente primeiro
        if (historico.length > 30) historico.pop(); // mantém 30 treinos
        localStorage.setItem('vt_historico', JSON.stringify(historico));
    },

    loadHistorico() {
        try {
            return JSON.parse(localStorage.getItem('vt_historico') || '[]');
        } catch {
            return [];
        }
    },
};
