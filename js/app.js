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

  async init() {
    console.log('[MAISYA-TRANS] Memulai aplikasi...');

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

    // 3. Setup Halaman Awal & Persistensi Sesi (Tidak auto-logout saat aplikasi ditutup)
    if (Auth.isLoggedIn()) {
      let startView = 'dashboard';
      const hash = window.location.hash.replace('#', '');
      if (hash && document.getElementById(`view-${hash}`) && hash !== 'login' && hash !== 'register') {
        startView = hash;
      }
      // Ganti hash URL jika sebelumnya masih tertinggal #login
      if (window.location.hash === '#login' || window.location.hash === '#register') {
        try {
          history.replaceState({ view: startView, index: 0 }, '', `#${startView}`);
        } catch (e) {}
      }
      UI.switchView(startView, false);
      Auth.startIdleWatcher();
      this.startPolling();
    } else {
      // 4. Periksa Auto-Login Google: Otomatis masuk jika sebelumnya pernah login dengan Google (kecuali logout manual)
      const didAutoLogin = await Auth.checkGoogleAutoLogin();
      if (didAutoLogin && Auth.isLoggedIn()) {
        let startView = 'dashboard';
        const hash = window.location.hash.replace('#', '');
        if (hash && document.getElementById(`view-${hash}`) && hash !== 'login' && hash !== 'register') {
          startView = hash;
        }
        try {
          history.replaceState({ view: startView, index: 0 }, '', `#${startView}`);
        } catch (e) {}
        UI.switchView(startView, false);
        Auth.startIdleWatcher();
        this.startPolling();
      } else {
        // Jika belum login dan tidak ada auto-login Google, barulah tampilkan form login
        const hash = window.location.hash.replace('#', '');
        if (hash === 'register') {
          UI.switchView('register', false);
        } else {
          UI.switchView('login', false);
        }
      }
    }
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

    if (user) {
      if (profileBtn) profileBtn.style.display = 'flex';
      if (loginLink) loginLink.style.display = 'none';
      if (headerLogout) headerLogout.style.display = 'inline-flex';
      if (sidebarLogout) sidebarLogout.style.display = 'flex';

      const nameEl = document.getElementById('headerUserName');
      const roleEl = document.getElementById('headerUserRole');
      const avatarEl = document.getElementById('headerUserAvatar');

      if (nameEl) nameEl.textContent = user.nama ? user.nama.split(' ')[0] : 'User';
      if (roleEl) roleEl.textContent = user.role === 'ADMIN' ? 'Admin Sarpras' : 'Guru / Karyawan';
      if (avatarEl) avatarEl.textContent = user.nama ? user.nama.charAt(0) : 'U';

      // Tampilkan/sembunyikan nav item admin
      adminNavItems.forEach(el => {
        el.style.display = user.role === 'ADMIN' ? 'flex' : 'none';
      });
    } else {
      if (profileBtn) profileBtn.style.display = 'none';
      if (loginLink) loginLink.style.display = 'flex';
      if (headerLogout) headerLogout.style.display = 'none';
      if (sidebarLogout) sidebarLogout.style.display = 'none';
      adminNavItems.forEach(el => {
        el.style.display = 'none';
      });
    }
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
      rememberCheckbox.checked = true; // Selalu default tercentang untuk kenyamanan guru/karyawan
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

    // Catatan: form Google Auth sengaja TIDAK di-prefill otomatis
    // agar pengguna selalu mengisi email dan password secara sadar
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
   * Bind Login & Register Form Handlers
   */
  bindAuthForms() {
    // Form Login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberCheckbox = document.getElementById('loginRememberMe');
        const isRemember = rememberCheckbox ? rememberCheckbox.checked : true;
        // Tampilkan state loading di halaman login
        App.setLoginState('loading');

        try {
          const res = await Auth.login(username, password, false); // false = skip global spinner

          if (res.success) {
            Auth.saveRememberedCredentials(username, password, isRemember);
            const nama = Auth.getUser()?.nama || username;
            // Tampilkan animasi sukses
            App.setLoginState('success', `Selamat datang kembali, ${nama}! 🎉`);
            await new Promise(r => setTimeout(r, 1600));
            Auth.startIdleWatcher();
            this.updateUserHeaderUI();
            App.resetLoginState(); // reset form ke semula
            UI.switchView('dashboard');
            this.startPolling();
          } else {
            // Tampilkan animasi gagal
            App.setLoginState('error', res.message || 'Email atau password tidak cocok.');
          }
        } catch (err) {
          App.setLoginState('error', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
        }
      });
    }

    // Form Register
    const formRegister = document.getElementById('formRegister');
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('regNama').value.trim();
        const nip = document.getElementById('regNip').value.trim();
        const jabatan = document.getElementById('regJabatan').value.trim();
        const divisi = document.getElementById('regDivisi').value.trim();
        const no_hp = document.getElementById('regHp').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const btnSubmit = document.getElementById('btnRegSubmit');

        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Mendaftarkan...';
        }

        try {
          const res = await Auth.register({ nama, nip, jabatan, divisi, no_hp, email, password });
          if (res.success) {
            UI.showToast(res.message, 'success', 5000);
            formRegister.reset();
            UI.switchView('login');
          } else {
            UI.showToast(res.message, 'error');
          }
        } catch (err) {
          UI.showToast('Terjadi kendala saat mendaftar.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Daftar Akun Baru';
          }
        }
      });
    }

    // Toggle Password Visibility Helpers
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
          noticeBar.innerHTML = '⚠️ Anda sedang offline. Fitur transaksi memerlukan akses internet ke Google Spreadsheet.';
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
            console.log('[PWA] Service Worker aktif & diperbarui:', reg.scope);
          })
          .catch(err => console.warn('[PWA] Registrasi SW gagal:', err));
      });
    }

    // Install prompt handler
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
   * Gentle Polling (20 Detik) untuk Status Kendaraan Real-time
   */
  startPolling() {
    setInterval(() => {
      if (Auth.isLoggedIn() && document.visibilityState === 'visible') {
        if (UI.currentView === 'dashboard') {
          DashboardView.load();
        }
        NotificationsView.load();
      }
    }, APP_CONFIG.POLLING_INTERVAL_MS);
  }
};
