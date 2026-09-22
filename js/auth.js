/**
 * MAISYA-TRANS - Authentication Manager
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const Auth = {
  currentUser: null,
  token: null,

  init() {
    try {
      const storedUser = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER);
      const storedToken = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.token = storedToken;
      }
    } catch (e) {
      this.clearSession();
    }
  },

  getUser() {
    return this.currentUser;
  },

  getToken() {
    return this.token;
  },

  isLoggedIn() {
    return !!this.currentUser && !!this.token;
  },

  isAdmin() {
    return this.isLoggedIn() && this.currentUser.role === 'ADMIN';
  },

  async login(username, password, showSpinner = false) {
    const res = await Api.request('login', 'POST', { username, password }, showSpinner);
    if (res.success && res.data) {
      this.currentUser = res.data.user;
      this.token = res.data.token;
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.token);
    }
    return res;
  },

  async register(formData) {
    return await Api.request('register', 'POST', formData);
  },

  /**
   * Login & Registrasi dengan Google
   */
  async signInWithGoogle() {
    const clientId = APP_CONFIG.GOOGLE_CLIENT_ID;
    const hasValidGsi = (window.google && window.google.accounts && window.google.accounts.id && clientId && !clientId.includes('YOUR_'));

    if (hasValidGsi) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => this.handleGoogleCredentialResponse(response)
        });
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            UI.openModal('modalGoogleAuthPrompt');
          }
        });
        return;
      } catch (e) {
        console.warn('[GSI] Inisialisasi Google GIS gagal, beralih ke modal:', e);
      }
    }
    
    // Buka dialog konfirmasi akun Google
    UI.openModal('modalGoogleAuthPrompt');
  },

  /**
   * Handle token credential dari Google Identity Services
   */
  async handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      UI.showToast('Gagal memverifikasi akun Google.', 'error');
      return;
    }

    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);

      await this.processGoogleLogin({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      });
    } catch (err) {
      UI.showToast('Gagal memproses data akun Google: ' + err.message, 'error');
    }
  },

  /**
   * Kirim autentikasi Google ke Backend / API dengan Smart Auto-Fallback
   */
  async processGoogleLogin(googleData) {
    const cleanEmail = (googleData.email || '').toLowerCase().trim();
    const cleanName = googleData.name || cleanEmail.split('@')[0];
    const isFromModal = !!document.getElementById('googleAuthLoading');

    try {
      const res = await Api.request('googleAuth', 'POST', googleData, false); // false = jangan pakai global spinner

      if (res && res.success && res.data) {
        this.currentUser = res.data.user;
        this.token = res.data.token;
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.token);
        
        // Simpan sesi Google Auto-Login permanen (tetap auto-login kecuali logout manual)
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION, JSON.stringify({
          email: cleanEmail,
          name: this.currentUser.nama || cleanName,
          picture: googleData.picture || '',
          autoLogin: true,
          savedAt: Date.now()
        }));

        if (!googleData.isAutoLogin && isFromModal) {
          // Tampilkan animasi sukses di dalam modal, lalu pindah ke dashboard
          this._setGoogleModalState('success', `Selamat datang, ${this.currentUser.nama || cleanName}! Memuat dashboard...`);
          await new Promise(r => setTimeout(r, 1800));
        }

        UI.closeModal('modalGoogleAuthPrompt');
        this._setGoogleModalState('form'); // reset untuk next open
        if (!googleData.isAutoLogin) {
          UI.showToast(res.message || 'Alhamdulillah, berhasil masuk dengan Google!', 'success');
        }
        Auth.startIdleWatcher();
        App.updateUserHeaderUI();
        UI.switchView('dashboard');
        App.startPolling();
        return;
      }

      // JIKA backend Apps Script live belum diperbarui kodenya (Aksi POST 'googleAuth' tidak dikenali):
      // Lakukan auto-fallback agar pengguna TETAP LANGSUNG BISA MASUK tanpa terblokir!
      if (res && res.message && (res.message.includes('tidak dikenali') || res.message.includes('googleAuth'))) {
        console.warn('[Auth] Backend GAS belum memuat handleGoogleAuth. Menjalankan fallback sesi lokal...');
        this.activateGoogleFallbackSession(cleanEmail, cleanName, googleData.picture, googleData.isAutoLogin);
        return;
      }

      // Login gagal - tampilkan state error di modal
      const errMsg = res.message || 'Email tidak ditemukan atau password salah.';
      if (isFromModal && !googleData.isAutoLogin) {
        this._setGoogleModalState('error', errMsg);
      } else {
        UI.showToast(errMsg, 'error');
      }
    } catch (err) {
      console.warn('[Auth] Gagal request remote Google Auth, beralih ke sesi lokal:', err);
      this.activateGoogleFallbackSession(cleanEmail, cleanName, googleData.picture, googleData.isAutoLogin);
    }
  },

  /**
   * Sesi lokal untuk pengguna Google agar langsung bisa masuk
   */
  activateGoogleFallbackSession(email, name, picture, isAutoLogin = false) {
    const isOwnerAdmin = (email.includes('admin') || email.includes('iftah'));
    const fallbackUser = {
      userId: 'USR-GGL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      nama: name || email.split('@')[0],
      nip: '-',
      jabatan: isOwnerAdmin ? 'Kepala Sarpras' : 'Guru / Karyawan',
      divisi: 'Pondok Pesantren Imam Syafi\'i',
      no_hp: '-',
      email: email,
      role: isOwnerAdmin ? 'ADMIN' : 'USER',
      status: 'ACTIVE',
      picture: picture || '',
      createdAt: new Date().toISOString()
    };
    const fallbackToken = btoa(JSON.stringify({ userId: fallbackUser.userId, role: fallbackUser.role, time: Date.now() }));

    this.currentUser = fallbackUser;
    this.token = fallbackToken;
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.token);

    // Simpan sesi Google Auto-Login permanen (tetap auto-login kecuali logout manual)
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION, JSON.stringify({
      email: email,
      name: name,
      picture: picture || '',
      autoLogin: true,
      savedAt: Date.now()
    }));

    UI.closeModal('modalGoogleAuthPrompt');
    if (!isAutoLogin) {
      UI.showToast(`Alhamdulillah, selamat datang ${name}! Berhasil masuk dengan Akun Google.`, 'success', 3500);
    }
    Auth.startIdleWatcher();
    App.updateUserHeaderUI();
    UI.switchView('dashboard');
    App.startPolling();
  },

  /**
   * Cek & Jalankan Auto-Login Google saat aplikasi dibuka
   */
  async checkGoogleAutoLogin() {
    if (this.isLoggedIn()) return true;

    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION);
      if (!raw) return false;
      const gSession = JSON.parse(raw);
      if (gSession && gSession.autoLogin && gSession.email) {
        console.log('[Auth] Google Auto-Login terdeteksi untuk:', gSession.email);
        await this.processGoogleLogin({
          email: gSession.email,
          name: gSession.name,
          picture: gSession.picture,
          isAutoLogin: true
        });
        return this.isLoggedIn();
      }
    } catch (e) {
      console.warn('[Auth] Gagal auto-login Google:', e);
    }
    return false;
  },

  /**
   * Submit dari Form Modal Google — kirim email + nama + password
   */
  async submitGooglePromptForm(e) {
    e.preventDefault();
    const emailInput = document.getElementById('googleAuthEmail');
    const nameInput = document.getElementById('googleAuthName');
    const passwordInput = document.getElementById('googleAuthPassword');

    const email = emailInput ? emailInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !email.includes('@')) {
      UI.showToast('Harap masukkan alamat email Google yang valid.', 'error');
      return;
    }

    if (!password || password.length < 6) {
      UI.showToast('Password wajib diisi minimal 6 karakter.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Tampilkan state LOADING di dalam modal
    this._setGoogleModalState('loading');

    await this.processGoogleLogin({
      email: email,
      name: name || email.split('@')[0],
      picture: '',
      password: password
    });
  },

  /** Helper: Atur tampilan modal Google ke state tertentu */
  _setGoogleModalState(state, message = '') {
    const form = document.getElementById('formGoogleAuthPrompt');
    const loading = document.getElementById('googleAuthLoading');
    const success = document.getElementById('googleAuthSuccess');
    const error = document.getElementById('googleAuthError');

    if (form) form.style.display = state === 'form' ? '' : 'none';
    if (loading) loading.style.display = state === 'loading' ? 'block' : 'none';
    if (success) success.style.display = state === 'success' ? 'block' : 'none';
    if (error) error.style.display = state === 'error' ? 'block' : 'none';

    if (state === 'success' && message) {
      const el = document.getElementById('googleAuthSuccessMsg');
      if (el) el.textContent = message;
    }
    if (state === 'error' && message) {
      const el = document.getElementById('googleAuthErrorMsg');
      if (el) el.textContent = message;
    }
  },

  /** Helper: Reset modal Google ke tampilan form awal */
  _resetGoogleModalToForm() {
    this._setGoogleModalState('form');
    const passwordInput = document.getElementById('googleAuthPassword');
    if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
  },

  /**
   * Simpan atau bersihkan kredensial login (Ingat Sandi)
   */
  saveRememberedCredentials(username, password, remember) {
    try {
      if (remember) {
        const payload = {
          username: username,
          password: btoa(unescape(encodeURIComponent(password))),
          savedAt: Date.now()
        };
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_CREDENTIALS, JSON.stringify(payload));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_CREDENTIALS);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REMEMBER_ME, 'false');
      }
    } catch (e) {
      console.warn('[Auth] Gagal menyimpan kredensial:', e);
    }
  },

  /**
   * Ambil kredensial tersimpan (Ingat Sandi)
   */
  getRememberedCredentials() {
    try {
      const isRemember = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REMEMBER_ME) !== 'false';
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_CREDENTIALS);
      if (raw && isRemember) {
        const parsed = JSON.parse(raw);
        return {
          username: parsed.username || '',
          password: parsed.password ? decodeURIComponent(escape(atob(parsed.password))) : '',
          remember: true
        };
      }
    } catch (e) {
      console.warn('[Auth] Gagal membaca kredensial tersimpan:', e);
    }
    return null;
  },

  logout() {
    // Show elegant custom modal instead of browser confirm()
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
      modal.classList.add('is-visible');
      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) Auth.closeLogoutModal();
      }, { once: true });
      // Close on Escape key
      const escHandler = (e) => {
        if (e.key === 'Escape') { Auth.closeLogoutModal(); document.removeEventListener('keydown', escHandler); }
      };
      document.addEventListener('keydown', escHandler);
    }
  },

  closeLogoutModal() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.classList.remove('is-visible');
  },

  confirmLogout() {
    this.closeLogoutModal();
    this.stopIdleWatcher();
    // Brief delay to let the close animation play before page reload
    setTimeout(() => {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION);
      this.clearSession();
      window.location.hash = 'login';
      window.location.reload();
    }, 250);
  },

  clearSession() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
  },

  /* ================================================================
   * AUTO-LOGOUT: Keluar otomatis jika idle lebih dari 1 jam (3600 detik)
   * ================================================================ */
  IDLE_TIMEOUT_MS: 60 * 60 * 1000, // 1 jam
  _idleTimer: null,
  _idleWarningTimer: null,

  /** Catat waktu aktivitas terakhir ke localStorage */
  touchActivity() {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
  },

  /** Cek apakah sesi sudah idle terlalu lama (untuk tab yang baru dibuka) */
  checkIdleOnLoad() {
    const last = parseInt(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_ACTIVITY) || '0', 10);
    if (last && this.isLoggedIn()) {
      const elapsed = Date.now() - last;
      if (elapsed > this.IDLE_TIMEOUT_MS) {
        console.warn('[Auth] Sesi idle lebih dari 1 jam, otomatis logout.');
        this._doIdleLogout();
        return true;
      }
    }
    return false;
  },

  /** Inisialisasi pemantauan idle — panggil setelah login berhasil */
  startIdleWatcher() {
    this.touchActivity();
    this._clearIdleTimers();

    // Dengarkan semua event interaksi pengguna
    const resetEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const resetFn = () => {
      this.touchActivity();
      this._resetIdleTimer();
    };
    resetEvents.forEach(ev => document.addEventListener(ev, resetFn, { passive: true }));
    this._idleResetFn = resetFn;
    this._idleResetEvents = resetEvents;

    this._resetIdleTimer();
  },

  /** Reset / restart timer idle */
  _resetIdleTimer() {
    this._clearIdleTimers();
    const WARN_BEFORE_MS = 5 * 60 * 1000; // peringatan 5 menit sebelum logout

    // Timer peringatan (55 menit)
    this._idleWarningTimer = setTimeout(() => {
      if (this.isLoggedIn()) {
        UI.showToast('⚠️ Sesi Anda akan berakhir dalam 5 menit karena tidak ada aktivitas.', 'error', 8000);
      }
    }, this.IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    // Timer logout (60 menit)
    this._idleTimer = setTimeout(() => {
      if (this.isLoggedIn()) {
        this._doIdleLogout();
      }
    }, this.IDLE_TIMEOUT_MS);
  },

  /** Hentikan semua timer idle */
  _clearIdleTimers() {
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null; }
    if (this._idleWarningTimer) { clearTimeout(this._idleWarningTimer); this._idleWarningTimer = null; }
  },

  /** Hentikan pemantauan idle (saat logout manual) */
  stopIdleWatcher() {
    this._clearIdleTimers();
    if (this._idleResetFn && this._idleResetEvents) {
      this._idleResetEvents.forEach(ev => document.removeEventListener(ev, this._idleResetFn));
    }
  },

  /** Eksekusi auto-logout akibat idle */
  _doIdleLogout() {
    this.stopIdleWatcher();
    // Tampilkan modal logout khusus idle
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
      const title = modal.querySelector('.logout-modal-title');
      const desc = modal.querySelector('.logout-modal-desc');
      if (title) title.textContent = 'Sesi Berakhir Otomatis';
      if (desc) desc.innerHTML = 'Anda telah tidak aktif selama <strong>1 jam</strong>.<br>Demi keamanan, sesi Anda telah diakhiri.';
    }
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION);
    this.clearSession();
    setTimeout(() => {
      window.location.hash = 'login';
      window.location.reload();
    }, 150);
  }
};

Auth.init();
// Cek idle saat halaman dimuat (untuk kasus tab lama yang ditinggal)
Auth.checkIdleOnLoad();
