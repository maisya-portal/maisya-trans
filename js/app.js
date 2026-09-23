/**
 * MAISYA-TRANS - Main Application Bootstrapper
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  deferredPrompt: null,
  argoIntervalId: null,

  async init() {
    console.log('[MAISYA-TRANS] Inisialisasi sistem peminjaman kendaraan...');

    // 1. Inisialisasi Modul
    Store.init();
    Auth.init();
    UI.init();

    // 2. Setup Form Events & Muat Ingat Sandi
    this.bindAuthForms();
    this.loadRememberedLogin();
    this.bindNetworkListeners();
    this.setupPWA();
    this.updateUserHeaderUI();

    // 3. Setup Halaman Awal: Selalu Buka Beranda Monitoring Publik secara Default
    let startView = 'dashboard';
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && hash !== 'login' && hash !== 'register' && document.getElementById(`view-${hash}`)) {
      if (hash === 'admin' && !Auth.isAdmin()) {
        startView = 'login';
      } else {
        startView = hash;
      }
    }

    try {
      history.replaceState({ view: startView, index: 0 }, '', `#${startView}`);
    } catch (e) {}

    UI.switchView(startView, false);

    if (Auth.isLoggedIn()) {
      Auth.startIdleWatcher();
    }

    // 4. Mulai Live Running Argo Ticker (Setiap 1 Detik)
    this.startArgoTicker();

    // 5. Gentle Polling (15 Detik) untuk Sinkronisasi Data Real-time
    this.startPolling();
  },

  /**
   * Perbarui Header User & Role Badge
   */
  updateUserHeaderUI() {
    const user = Auth.getUser();
    const profileBtn = document.getElementById('userProfileBtn');
    const loginLink = document.getElementById('headerLoginBtn');
    const headerLogout = document.getElementById('headerLogoutBtn');
    const sidebarLogout = document.getElementById('sidebarLogoutBtn');
    const adminNavItems = document.querySelectorAll('.admin-only-nav');

    if (user && user.role === 'ADMIN') {
      if (profileBtn) profileBtn.style.display = 'flex';
      if (loginLink) loginLink.style.display = 'none';
      if (headerLogout) headerLogout.style.display = 'inline-flex';
      if (sidebarLogout) sidebarLogout.style.display = 'flex';

      const nameEl = document.getElementById('headerUserName');
      const roleEl = document.getElementById('headerUserRole');
      const avatarEl = document.getElementById('headerUserAvatar');

      if (nameEl) nameEl.textContent = user.nama ? user.nama.split(' ')[0] : 'Admin';
      if (roleEl) roleEl.textContent = 'Admin Sarpras';
      if (avatarEl) avatarEl.textContent = '🛡️';

      adminNavItems.forEach(el => {
        el.style.display = 'flex';
      });
    } else {
      // Public User Mode
      if (profileBtn) profileBtn.style.display = 'none';
      if (loginLink) loginLink.style.display = 'inline-flex';
      if (headerLogout) headerLogout.style.display = 'none';
      if (sidebarLogout) sidebarLogout.style.display = 'none';

      adminNavItems.forEach(el => {
        el.style.display = 'none';
      });
    }
  },

  /**
   * Live Running Argo Ticker (Berjalan otomatis setiap 1 detik)
   * Menghitung durasi pemakaian real-time dari timestamp startTime yang tersimpan di DB
   */
  startArgoTicker() {
    if (this.argoIntervalId) clearInterval(this.argoIntervalId);

    this.argoIntervalId = setInterval(() => {
      // Update semua elemen dengan atribut data-argo-start
      const argoElements = document.querySelectorAll('[data-argo-start]');
      const nowMs = Date.now();

      argoElements.forEach(el => {
        const startIso = el.getAttribute('data-argo-start');
        if (!startIso) return;
        
        const startMs = new Date(startIso).getTime();
        if (isNaN(startMs)) return;

        const diffSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;

        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');

        el.textContent = `${hh}:${mm}:${ss}`;
      });
    }, 1000);
  },

  /**
   * Muat kredensial yang tersimpan (Ingat Sandi)
   */
  loadRememberedLogin() {
    const remembered = Auth.getRememberedCredentials();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const rememberCheckbox = document.getElementById('loginRememberMe');

    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }

    if (remembered) {
      if (usernameInput && !usernameInput.value) {
        usernameInput.value = remembered.username;
      }
      if (passwordInput && !passwordInput.value) {
        passwordInput.value = remembered.password;
      }
      if (rememberCheckbox) {
        rememberCheckbox.checked = remembered.remember;
      }
    }
  },

  /**
   * Mengatur tampilan state halaman login (form / loading / success / error)
   */
  setLoginState(state, message = '') {
    const form = document.getElementById('loginFormWrapper');
    const loading = document.getElementById('loginLoadingState');
    const success = document.getElementById('loginSuccessState');
    const error = document.getElementById('loginErrorState');

    if (form) form.style.display = state === 'form' ? '' : 'none';
    if (loading) loading.style.display = state === 'loading' ? 'block' : 'none';
    if (success) success.style.display = state === 'success' ? 'block' : 'none';
    if (error) error.style.display = state === 'error' ? 'block' : 'none';

    if (state === 'success' && message) {
      const el = document.getElementById('loginSuccessMsg');
      if (el) el.textContent = message;
    }
    if (state === 'error' && message) {
      const el = document.getElementById('loginErrorMsg');
      if (el) el.textContent = message;
    }
  },

  /** Reset halaman login ke tampilan form awal */
  resetLoginState() {
    this.setLoginState('form');
  },

  /**
   * Bind Login Handler untuk Admin
   */
  bindAuthForms() {
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberCheckbox = document.getElementById('loginRememberMe');
        const isRemember = rememberCheckbox ? rememberCheckbox.checked : true;

        App.setLoginState('loading');

        try {
          const res = await Auth.login(username, password, false);

          if (res.success) {
            Auth.saveRememberedCredentials(username, password, isRemember);
            const user = Auth.getUser();
            const nama = user?.nama || username;

            App.setLoginState('success', `Selamat datang, ${nama}! 🛡️`);
            await new Promise(r => setTimeout(r, 1200));

            Auth.startIdleWatcher();
            this.updateUserHeaderUI();
            App.resetLoginState();

            if (user?.role === 'ADMIN') {
              UI.switchView('admin');
            } else {
              UI.switchView('dashboard');
            }
          } else {
            App.setLoginState('error', res.message || 'Email atau password tidak cocok.');
          }
        } catch (err) {
          App.setLoginState('error', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
        }
      });
    }

    // Toggle Password Visibility
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input && input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else if (input) {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      });
    });
  },

  /**
   * Status Jaringan Online / Offline
   */
  bindNetworkListeners() {
    const noticeBar = document.getElementById('offlineNoticeBar');

    const updateStatus = () => {
      if (noticeBar) {
        if (!navigator.onLine) {
          noticeBar.classList.add('show');
          noticeBar.innerHTML = '⚠️ Anda sedang offline. Sistem menggunakan database lokal sementara.';
        } else {
          noticeBar.classList.remove('show');
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },

  /**
   * PWA Setup & Service Worker Registration
   */
  setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => {
            reg.update();
            console.log('[PWA] Service Worker aktif:', reg.scope);
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] Versi baru terinstal. Memuat ulang tampilan...');
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch(err => console.warn('[PWA] Registrasi SW gagal:', err));
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      const btnTop = document.getElementById('btnInstallPwaTop');
      const boxTop = document.getElementById('sidebarInstallTop');
      const btnBottom = document.getElementById('btnInstallPwaBottom') || document.getElementById('btnInstallPwa');

      const triggerInstall = () => {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        this.deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            UI.showToast('Alhamdulillah, MAISYA-TRANS berhasil dipasang di perangkat!');
            if (boxTop) boxTop.style.display = 'none';
            if (btnBottom) btnBottom.style.display = 'none';
          }
          this.deferredPrompt = null;
        });
      };

      if (btnTop && boxTop) {
        boxTop.style.display = 'block';
        btnTop.onclick = triggerInstall;
      }
      if (btnBottom) {
        btnBottom.style.display = 'block';
        btnBottom.onclick = triggerInstall;
      }
    });
  },

  /**
   * Gentle Polling (15 Detik) untuk Status Kendaraan Real-time
   */
  startPolling() {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (UI.currentView === 'dashboard') {
          DashboardView.load();
        } else if (UI.currentView === 'vehicles') {
          VehiclesView.load();
        } else if (UI.currentView === 'admin' && Auth.isAdmin()) {
          AdminView.load();
        }
        NotificationsView.load();
      }
    }, 15000);
  }
};
