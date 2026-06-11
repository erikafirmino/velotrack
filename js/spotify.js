/* ══════════════════════════════════════════════════════════════
   VeloTrack — Spotify Integration
   Web Playback SDK + Authorization Code with PKCE
══════════════════════════════════════════════════════════════ */

const Spotify = {

    CLIENT_ID:    '3c00d9ed9625440aa4d94ef5f4e495e5',
    REDIRECT_URI: 'https://velotrack-one.vercel.app/',
    SCOPES: [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
    ].join(' '),

    _player:      null,
    _deviceId:    null,
    _token:       null,
    _isConnected: false,
    _isPlaying:   false,

    /* ── PKCE helpers ── */
    async _generateCodeVerifier() {
        const array = new Uint8Array(64);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    async _generateCodeChallenge(verifier) {
        const data    = new TextEncoder().encode(verifier);
        const digest  = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    /* ── Login ── */
    async login() {
        const verifier   = await this._generateCodeVerifier();
        const challenge  = await this._generateCodeChallenge(verifier);
        localStorage.setItem('vt_spotify_verifier', verifier);

        const params = new URLSearchParams({
            client_id:             this.CLIENT_ID,
            response_type:         'code',
            redirect_uri:          this.REDIRECT_URI,
            scope:                 this.SCOPES,
            code_challenge_method: 'S256',
            code_challenge:        challenge,
        });

        window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
    },

    /* ── Troca code por token ── */
    async exchangeToken(code) {
        const verifier = localStorage.getItem('vt_spotify_verifier');
        if (!verifier) return null;

        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id:     this.CLIENT_ID,
                grant_type:    'authorization_code',
                code,
                redirect_uri:  this.REDIRECT_URI,
                code_verifier: verifier,
            }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem('vt_spotify_token',   data.access_token);
        localStorage.setItem('vt_spotify_refresh',  data.refresh_token);
        localStorage.setItem('vt_spotify_expires',  Date.now() + data.expires_in * 1000);
        localStorage.removeItem('vt_spotify_verifier');
        return data.access_token;
    },

    /* ── Refresh token ── */
    async refreshToken() {
        const refresh = localStorage.getItem('vt_spotify_refresh');
        if (!refresh) return null;

        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id:     this.CLIENT_ID,
                grant_type:    'refresh_token',
                refresh_token: refresh,
            }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem('vt_spotify_token',   data.access_token);
        localStorage.setItem('vt_spotify_expires',  Date.now() + data.expires_in * 1000);
        if (data.refresh_token) localStorage.setItem('vt_spotify_refresh', data.refresh_token);
        return data.access_token;
    },

    /* ── Obtém token válido ── */
    async getToken() {
        const expires = parseInt(localStorage.getItem('vt_spotify_expires') || '0');
        if (Date.now() < expires - 60000) {
            return localStorage.getItem('vt_spotify_token');
        }
        return await this.refreshToken();
    },

    /* ── Inicializa o Web Playback SDK ── */
    async initPlayer(token) {
        this._token = token;

        return new Promise(resolve => {
            window.onSpotifyWebPlaybackSDKReady = () => {
                const player = new window.Spotify.Player({
                    name:          'VeloTrack',
                    getOAuthToken: async cb => {
                        const t = await this.getToken();
                        cb(t);
                    },
                    volume: 0.8,
                });

                player.addListener('ready', ({ device_id }) => {
                    this._deviceId    = device_id;
                    this._isConnected = true;
                    this._player      = player;
                    this._updateUI();
                    // 3: Transfere automaticamente para VeloTrack
                    setTimeout(() => this.transferToVeloTrack(), 1000);
                    // Restaura volume salvo
                    const savedVol = parseFloat(localStorage.getItem('vt_spotify_vol') || '0.8');
                    player.setVolume(savedVol);
                    resolve(player);
                });

                player.addListener('not_ready', () => {
                    this._isConnected = false;
                    this._updateUI();
                });

                player.addListener('player_state_changed', state => {
                    if (!state) return;
                    this._isPlaying = !state.paused;
                    this._updateTrack(state.track_window.current_track);
                    this._updatePlayBtn();
                    // 1: Progresso
                    if (this._isPlaying) this.startProgress();
                    else                 this.stopProgress();
                });

                player.addListener('initialization_error', ({ message }) => console.error('Spotify init:', message));
                player.addListener('authentication_error', ({ message }) => console.error('Spotify auth:', message));
                player.addListener('account_error',        ({ message }) => console.error('Spotify account:', message));

                player.connect();
                this._player = player;
            };

            // Carrega o SDK
            if (!document.getElementById('spotify-sdk')) {
                const script = document.createElement('script');
                script.id  = 'spotify-sdk';
                script.src = 'https://sdk.scdn.co/spotify-player.js';
                document.head.appendChild(script);
            } else if (window.Spotify) {
                window.onSpotifyWebPlaybackSDKReady();
            }
        });
    },

    /* ── Controles ── */
    async play()     { if (this._player) await this._player.resume(); },
    async pause()    { if (this._player) await this._player.pause(); },
    async next()     { if (this._player) await this._player.nextTrack(); },
    async previous() { if (this._player) await this._player.previousTrack(); },

    async togglePlay() {
        if (this._isPlaying) await this.pause();
        else                 await this.play();
    },

    /* ── 2: Volume ── */
    async setVolume(val) {
        if (this._player) await this._player.setVolume(val);
        localStorage.setItem('vt_spotify_vol', val);
    },

    /* ── 1: Progresso da música ── */
    _progressInterval: null,

    startProgress() {
        this.stopProgress();
        this._progressInterval = setInterval(async () => {
            if (!this._player || !this._isPlaying) return;
            const state = await this._player.getCurrentState();
            if (!state) return;
            const pct = (state.position / state.duration) * 100;
            const bar = document.getElementById('spotify-progress-bar');
            if (bar) bar.style.width = pct + '%';
            const pos = document.getElementById('spotify-position');
            if (pos) pos.textContent = this._formatMs(state.position);
            const dur = document.getElementById('spotify-duration');
            if (dur) dur.textContent = this._formatMs(state.duration);
        }, 1000);
    },

    stopProgress() {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }
    },

    _formatMs(ms) {
        const s   = Math.floor(ms / 1000);
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return min + ':' + String(sec).padStart(2, '0');
    },

    /* ── 3: Transfere reprodução para VeloTrack automaticamente ── */
    async transferToVeloTrack() {
        const token = await this.getToken();
        if (!token || !this._deviceId) return;
        try {
            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify({ device_ids: [this._deviceId], play: true }),
            });
        } catch (e) { console.warn('Spotify transfer:', e); }
    },

    /* ── UI ── */
    _updateUI() {
        const wrap = document.getElementById('spotify-player');
        if (!wrap) return;

        if (this._isConnected) {
            wrap.style.display = 'flex';
            document.getElementById('spotify-login-btn').style.display = 'none';
        }
    },

    _updateTrack(track) {
        if (!track) return;
        const name   = document.getElementById('spotify-track-name');
        const artist = document.getElementById('spotify-artist-name');
        const cover  = document.getElementById('spotify-cover');
        if (name)   name.textContent   = track.name;
        if (artist) artist.textContent = track.artists.map(a => a.name).join(', ');
        if (cover && track.album.images[0]) cover.src = track.album.images[0].url;
    },

    _updatePlayBtn() {
        const btn = document.getElementById('spotify-play-btn');
        if (btn) btn.textContent = this._isPlaying ? '⏸' : '▶';
    },

    /* ── Logout ── */
    logout() {
        localStorage.removeItem('vt_spotify_token');
        localStorage.removeItem('vt_spotify_refresh');
        localStorage.removeItem('vt_spotify_expires');
        if (this._player) this._player.disconnect();
        this._player      = null;
        this._isConnected = false;
        this._updateUI();
        const wrap = document.getElementById('spotify-player');
        if (wrap) wrap.style.display = 'none';
        const loginBtn = document.getElementById('spotify-login-btn');
        if (loginBtn) loginBtn.style.display = 'flex';
    },

    /* ── Inicialização ao carregar a página ── */
    async init() {
        // Verifica se voltou do redirect OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const code      = urlParams.get('code');

        if (code) {
            // Remove o code da URL sem recarregar
            window.history.replaceState({}, document.title, '/');
            const token = await this.exchangeToken(code);
            if (token) await this.initPlayer(token);
            return;
        }

        // Verifica se já tem token salvo
        const token = await this.getToken();
        if (token) {
            await this.initPlayer(token);
        }
    },
};
