/* ══════════════════════════════════════════════════════════════
   VeloTrack — Estado Global da Aplicação
══════════════════════════════════════════════════════════════ */

const state = {
    // Conexão
    isConnected:      false,
    isTraining:       false,
    isPaused:         false,
    isDemoMode:       false,
    btDevice:         null,
    btChar:           null,

    // Configurações
    circumferenceMm:  2180,
    gasUrl:           '',
    weightKg:         70,
    metaKm:           10,

    // Métricas do treino
    startTime:        null,
    pausedMs:         0,
    pauseStart:       null,
    totalDistM:       0,
    currentSpeedKmh:  0,
    maxSpeedKmh:      0,
    totalRevs:        0,

    // Leitura CSC anterior
    prevRevs:         null,
    prevEventTime:    null,

    // Demo
    demoInterval:     null,
    demoRevAcc:       0,
    demoTimeAcc:      0,

    // Histórico de velocidade para o gráfico
    speedHistory:     [],

    // Resultado final do treino
    result:           null,

    // WakeLock
    wakeLock:         null,
    _resumedFromPause: false,
    _metaAtingida:     false,
};
