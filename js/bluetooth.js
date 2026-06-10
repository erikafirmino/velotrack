/* ══════════════════════════════════════════════════════════════
   VeloTrack — Bluetooth (Web Bluetooth API + CSC Profile)
══════════════════════════════════════════════════════════════ */

const CSC_SERVICE_UUID          = 0x1816;
const CSC_MEASUREMENT_CHAR_UUID = 0x2A5B;

const Bluetooth = {

    /* ── Inicia conexão ── */
    async connect() {
        try {
            showToast('Abrindo seletor Bluetooth...');
            const device = await navigator.bluetooth.requestDevice({
                filters:          [{ services: [CSC_SERVICE_UUID] }],
                optionalServices: [CSC_SERVICE_UUID],
            });

            state.btDevice = device;
            device.addEventListener('gattserverdisconnected', () => this.onDisconnected());

            showToast('Conectando a ' + device.name + '...');
            const server  = await device.gatt.connect();
            const service = await server.getPrimaryService(CSC_SERVICE_UUID);
            const char    = await service.getCharacteristic(CSC_MEASUREMENT_CHAR_UUID);

            state.btChar = char;
            char.addEventListener('characteristicvaluechanged', e => this.onCSCData(e));
            await char.startNotifications();

            this.onConnected(device.name || 'Sensor CSC');
        } catch (err) {
            if (err.name !== 'NotFoundError') showToast('Erro: ' + err.message);
        }
    },

    onConnected(name) {
        state.isConnected = true;
        els.statusDot.className = 'status-dot connected';
        showToast('Conectado: ' + name);
        Training.start();
    },

    onDisconnected() {
        state.isConnected = false;
        if (state.isTraining) {
            els.statusDot.className = 'status-dot';
            Training.pause();
        }
    },

    /* ── Parsing do pacote CSC (Bluetooth SIG spec) ── */
    onCSCData(event) {
        const data  = event.target.value;
        const flags = data.getUint8(0);
        if ((flags & 0x01) === 0) return; // só wheel revolution

        let offset = 1;
        const cumWheelRevs   = data.getUint32(offset, true); offset += 4;
        const lastWheelEvent = data.getUint16(offset, true);
        this.processRevData(cumWheelRevs, lastWheelEvent);
    },

    /* ── Calcula velocidade e distância a partir dos deltas ── */
    processRevData(cumRevs, eventTime) {
        // Primeira leitura ou retomada do pause — apenas registra a referência
        if (state.prevRevs === null || state._resumedFromPause) {
            state.prevRevs          = cumRevs;
            state.prevEventTime     = eventTime;
            state._resumedFromPause = false;
            return;
        }

        let deltaRevs = cumRevs - state.prevRevs;
        if (deltaRevs < 0) deltaRevs += 0xFFFFFFFF;

        let deltaTime = eventTime - state.prevEventTime;
        if (deltaTime < 0) deltaTime += 0xFFFF;

        const deltaTimeSec = deltaTime / 1024;
        state.prevRevs      = cumRevs;
        state.prevEventTime = eventTime;

        if (deltaTimeSec <= 0 || !state.isTraining || state.isPaused) return;

        // Descarta leituras fisicamente impossíveis (> 80 km/h)
        const speedCheck = ((deltaRevs * state.circumferenceMm) / 1000 / deltaTimeSec) * 3.6;
        if (speedCheck > 80) {
            state.prevRevs      = cumRevs;
            state.prevEventTime = eventTime;
            return;
        }

        const distM    = (deltaRevs * state.circumferenceMm) / 1000;
        const speedKmh = (distM / deltaTimeSec) * 3.6;

        state.totalDistM     += distM;
        state.totalRevs       = cumRevs;
        state.currentSpeedKmh = speedKmh;
        if (speedKmh > state.maxSpeedKmh) state.maxSpeedKmh = speedKmh;

        Chart.updateHistory(speedKmh);
        Display.updateTraining();
    },

    /* ── Desconecta ── */
    disconnect() {
        if (state.btChar) {
            state.btChar.stopNotifications().catch(() => {});
            state.btChar = null;
        }
        if (state.btDevice?.gatt?.connected) {
            state.btDevice.gatt.disconnect();
            state.btDevice = null;
        }
    },
};
