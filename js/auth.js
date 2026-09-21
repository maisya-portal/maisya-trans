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
