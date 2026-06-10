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
            const params = new URLSearchParams();
            params.append('payload', JSON.stringify(state.result));
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
};
