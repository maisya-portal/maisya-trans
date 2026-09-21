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
   * Kirim autentikasi Google ke Backend / API
   */
  async processGoogleLogin(googleData) {
    UI.showToast('Memverifikasi akun Google...', 'info', 2500);
    try {
      const res = await Api.request('googleAuth', 'POST', googleData);
      if (res.success && res.data) {
        this.currentUser = res.data.user;
        this.token = res.data.token;
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.token);
        
        UI.closeModal('modalGoogleAuthPrompt');
        UI.showToast(res.message || 'Alhamdulillah, berhasil masuk dengan Google!', 'success');
        App.updateUserHeaderUI();
        UI.switchView('dashboard');
        App.startPolling();
      } else {
        UI.showToast(res.message || 'Gagal masuk dengan akun Google.', 'error');
      }
    } catch (err) {
      UI.showToast('Koneksi ke server gagal. Silakan coba lagi.', 'error');
    }
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

  logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari akun Maisya-Trans?')) {
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
