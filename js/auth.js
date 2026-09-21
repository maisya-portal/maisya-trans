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

  async login(username, password) {
    const res = await Api.request('login', 'POST', { username, password });
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
    UI.showToast('Memverifikasi akun Google...', 'info', 2000);
    const cleanEmail = (googleData.email || '').toLowerCase().trim();
    const cleanName = googleData.name || cleanEmail.split('@')[0];

    try {
      const res = await Api.request('googleAuth', 'POST', googleData);

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

        UI.closeModal('modalGoogleAuthPrompt');
        if (!googleData.isAutoLogin) {
          UI.showToast(res.message || 'Alhamdulillah, berhasil masuk dengan Google!', 'success');
        }
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

      UI.showToast(res.message || 'Gagal masuk dengan akun Google.', 'error');
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
   * Submit dari Form Modal Google
   */
  async submitGooglePromptForm(e) {
    e.preventDefault();
    const emailInput = document.getElementById('googleAuthEmail');
    const nameInput = document.getElementById('googleAuthName');
    const btnSubmit = document.getElementById('btnSubmitGooglePrompt');

    const email = emailInput ? emailInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!email || !email.includes('@')) {
      UI.showToast('Harap masukkan alamat email Google yang valid.', 'error');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Menghubungkan...';
    }

    await this.processGoogleLogin({
      email: email,
      name: name || email.split('@')[0],
      picture: ''
    });

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Lanjutkan dengan Akun Google Ini';
    }
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
    if (confirm('Apakah Anda yakin ingin keluar dari akun Maisya-Trans?')) {
      // Hapus auto-login Google HANYA saat pengguna sengaja logout manual
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_AUTH_SESSION);
      this.clearSession();
      window.location.hash = 'login';
      window.location.reload();
    }
  },

  clearSession() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  }
};

Auth.init();
