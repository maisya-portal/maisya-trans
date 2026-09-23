/**
 * MAISYA-TRANS - UI View Controller & Modal System
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const UI = {
  currentView: 'dashboard',
  favorites: new Set(),
  historyStack: [],
  historyIndex: -1,
  isNavigatingHistory: false,

  init() {
    this.loadFavorites();
    this.initTheme();
    this.initSidebarState();
    this.bindGlobalEvents();
    this.bindHistoryEvents();
  },

  /**
   * Status Sidebar Awal
   */
  initSidebarState() {
    const container = document.querySelector('.app-container');
    const savedState = localStorage.getItem('maisya_sidebar_collapsed');
    // Jika user sebelumnya sengaja menutup sidebar pada desktop, terapkan
    if (savedState === 'true' && window.innerWidth > 900) {
      container?.classList.add('sidebar-collapsed');
    }
  },

  /**
   * Router Tampilan Halaman (SPA Switching dengan Riwayat Navigasi)
   */
  switchView(viewName, addToHistory = true) {
    // 1. Jika pengguna SUDAH login sebagai admin dan mencoba mengakses login, arahkan ke admin dashboard
    if (Auth.isAdmin() && (viewName === 'login' || viewName === 'register')) {
      viewName = 'admin';
    }

    // 2. Proteksi khusus untuk view admin
    if (viewName === 'admin' && !Auth.isAdmin()) {
      this.showToast('Halaman ini khusus untuk Admin Sarpras Pondok. Silakan login.', 'info');
      viewName = 'login';
    }

    this.currentView = viewName;

    // Stack Riwayat Halaman (Kembali & Lanjut)
    if (addToHistory && !this.isNavigatingHistory) {
      if (this.historyStack.length === 0 || this.historyStack[this.historyIndex] !== viewName) {
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        this.historyStack.push(viewName);
        this.historyIndex = this.historyStack.length - 1;
        try {
          history.pushState({ view: viewName, index: this.historyIndex }, '', `#${viewName}`);
        } catch (e) {}
      }
    }
    this.updateNavButtons();

    // Mode Login (hanya aktif jika user secara eksplisit membuka form login/register)
    const appContainer = document.querySelector('.app-container');
    const isLoginView = (viewName === 'login' || viewName === 'register');
    if (appContainer) {
      if (isLoginView) {
        appContainer.classList.add('guest-mode');
      } else {
        appContainer.classList.remove('guest-mode');
      }
    }

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.style.display = 'block';
    }

    // Update active state di sidebar & bottom nav
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Perbarui judul halaman di header
    this.updateHeaderTitle(viewName);

    // Trigger load data sesuai view
    this.onViewActivated(viewName);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateHeaderTitle(viewName) {
    const titleEl = document.getElementById('headerPageTitle');
    const titles = {
      dashboard: 'Beranda Monitoring',
      vehicles: 'Daftar Armada Kendaraan',
      booking: 'Peminjaman Kendaraan',
      history: 'Riwayat Pemakaian',
      notifications: 'Pusat Notifikasi',
      profile: 'Profil Pengguna',
      admin: 'Dashboard Admin Sarpras',
      login: 'Masuk Aplikasi',
      register: 'Pendaftaran Akun'
    };
    if (titleEl) {
      titleEl.textContent = titles[viewName] || 'MAISYA-TRANS';
    }
  },

  onViewActivated(viewName) {
    switch (viewName) {
      case 'dashboard':
        DashboardView.load();
        break;
      case 'vehicles':
        VehiclesView.load();
        break;
      case 'booking':
        BookingView.load();
        break;
      case 'history':
        HistoryView.load();
        break;
      case 'notifications':
        NotificationsView.load();
        break;
      case 'profile':
        ProfileView.load();
        break;
      case 'admin':
        AdminView.load();
        break;
    }
  },

  /**
   * Modal Management
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  },

  /**
   * Global Loading Overlay
   */
  showLoading(text = 'Memproses data...') {
    const overlay = document.getElementById('globalLoadingOverlay');
    const textEl = document.getElementById('loadingText');
    if (overlay) {
      if (textEl) textEl.textContent = text;
      overlay.classList.add('active');
    }
  },

  hideLoading() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  /**
   * Toast Notification
   */
  showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Status Pop-up saat Dashboard dibuka
   */
  showWelcomeStatusPopup(overview, activeMotor, activeMobil) {
    const hasSeenToday = sessionStorage.getItem('maisya_seen_welcome_today');
    if (hasSeenToday) return; // Hanya sekali per sesi agar tidak mengganggu

    const modal = document.getElementById('modalWelcomeStatus');
    if (!modal) return;

    const titleEl = document.getElementById('welcomeModalTitle');
    const msgEl = document.getElementById('welcomeModalMessage');
    const activeBox = document.getElementById('welcomeModalActiveVehicles');

    if (overview.allAvailable) {
      titleEl.innerHTML = '🟢 Seluruh Kendaraan Tersedia';
      msgEl.textContent = 'Alhamdulillah, seluruh kendaraan pondok saat ini sedang tidak digunakan dan siap operasional.';
      activeBox.style.display = 'none';
    } else {
      titleEl.innerHTML = '🔴 Info Kendaraan Sedang Digunakan';
      msgEl.textContent = `Saat ini terdapat ${overview.totalInUse} armada yang sedang aktif di luar pondok:`;
      activeBox.style.display = 'flex';
      activeBox.innerHTML = '';

      if (activeMotor && activeMotor.activeTrip) {
        activeBox.innerHTML += `
          <div class="stat-pill" style="border-left: 3px solid #EF4444;">
            <strong>Motor:</strong> ${activeMotor.merk} ${activeMotor.model} (${activeMotor.nomorPolisi})<br>
            <span style="font-size:0.75rem; color:var(--text-muted);">Dipakai oleh ${activeMotor.activeTrip.userName}</span>
          </div>`;
      }
      if (activeMobil && activeMobil.activeTrip) {
        activeBox.innerHTML += `
          <div class="stat-pill" style="border-left: 3px solid #EF4444;">
            <strong>Mobil:</strong> ${activeMobil.merk} ${activeMobil.model} (${activeMobil.nomorPolisi})<br>
            <span style="font-size:0.75rem; color:var(--text-muted);">Dipakai oleh ${activeMobil.activeTrip.userName}</span>
          </div>`;
      }
    }

    this.openModal('modalWelcomeStatus');
    sessionStorage.setItem('maisya_seen_welcome_today', 'true');
  },

  /**
   * Favorite Vehicles Toggle
   */
  loadFavorites() {
    try {
      const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FAVORITES);
      if (saved) {
        this.favorites = new Set(JSON.parse(saved));
      }
    } catch (e) {}
  },

  toggleFavorite(vehicleId) {
    if (this.favorites.has(vehicleId)) {
      this.favorites.delete(vehicleId);
      this.showToast('Dihapus dari kendaraan favorit.', 'info');
    } else {
      this.favorites.add(vehicleId);
      this.showToast('Ditambahkan ke kendaraan favorit! ⭐', 'success');
    }
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify([...this.favorites]));
    if (this.currentView === 'vehicles') VehiclesView.render();
  },

  isFavorite(vehicleId) {
    return this.favorites.has(vehicleId);
  },

  /**
   * Dark Mode
   */
  initTheme() {
    const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, next);
    this.showToast(`Mode tema diubah ke: ${next === 'dark' ? 'Gelap 🌙' : 'Terang ☀️'}`);
  },

  /**
   * Navigasi Riwayat: Kembali (Back)
   */
  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const prevView = this.historyStack[this.historyIndex];
      this.isNavigatingHistory = true;
      this.switchView(prevView, false);
      this.isNavigatingHistory = false;
      this.updateNavButtons();
      try {
        history.replaceState({ view: prevView, index: this.historyIndex }, '', `#${prevView}`);
      } catch (e) {}
    }
  },

  /**
   * Navigasi Riwayat: Lanjut (Forward)
   */
  goForward() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      const nextView = this.historyStack[this.historyIndex];
      this.isNavigatingHistory = true;
      this.switchView(nextView, false);
      this.isNavigatingHistory = false;
      this.updateNavButtons();
      try {
        history.replaceState({ view: nextView, index: this.historyIndex }, '', `#${nextView}`);
      } catch (e) {}
    }
  },

  /**
   * Update Status Tombol Kembali & Lanjut
   */
  updateNavButtons() {
    const btnBack = document.getElementById('navBackBtn');
    const btnForward = document.getElementById('navForwardBtn');
    if (btnBack) {
      btnBack.disabled = (this.historyIndex <= 0);
    }
    if (btnForward) {
      btnForward.disabled = (this.historyIndex >= this.historyStack.length - 1);
    }
  },

  /**
   * Kontrol Sidebar: Sembunyikan atau Tampilkan (Hide / Show)
   */
  toggleSidebar(forceState = null) {
    const container = document.querySelector('.app-container');
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
      // Di Mobile: Buka / Tutup Drawer Off-Canvas
      const willOpen = forceState !== null ? forceState : !sidebar?.classList.contains('mobile-open');
      if (willOpen) {
        sidebar?.classList.add('mobile-open');
        backdrop?.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        sidebar?.classList.remove('mobile-open');
        backdrop?.classList.remove('active');
        document.body.style.overflow = '';
      }
    } else {
      // Di Desktop: Collapse / Expand Sidebar
      const willCollapse = forceState !== null ? !forceState : !container?.classList.contains('sidebar-collapsed');
      if (willCollapse) {
        container?.classList.add('sidebar-collapsed');
        localStorage.setItem('maisya_sidebar_collapsed', 'true');
        this.showToast('Sidebar disembunyikan. Klik Menu untuk memunculkan kembali.', 'info', 2000);
      } else {
        container?.classList.remove('sidebar-collapsed');
        localStorage.setItem('maisya_sidebar_collapsed', 'false');
      }
    }
  },

  hideSidebar() {
    this.toggleSidebar(false);
  },

  showSidebar() {
    this.toggleSidebar(true);
  },

  /**
   * Event Listeners untuk History API
   */
  bindHistoryEvents() {
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        this.isNavigatingHistory = true;
        if (typeof e.state.index === 'number') {
          this.historyIndex = e.state.index;
        }
        this.switchView(e.state.view, false);
        this.isNavigatingHistory = false;
        this.updateNavButtons();
      } else if (window.location.hash) {
        const hashView = window.location.hash.replace('#', '');
        if (hashView) {
          if (Auth.isLoggedIn() && (hashView === 'login' || hashView === 'register')) {
            this.switchView('dashboard', false);
          } else {
            this.switchView(hashView, false);
          }
        }
      }
    });

    const btnBack = document.getElementById('navBackBtn');
    const btnForward = document.getElementById('navForwardBtn');
    if (btnBack) {
      btnBack.addEventListener('click', (e) => {
        e.preventDefault();
        this.goBack();
      });
    }
    if (btnForward) {
      btnForward.addEventListener('click', (e) => {
        e.preventDefault();
        this.goForward();
      });
    }
  },

  bindGlobalEvents() {
    // Delegasi klik tombol navigasi
    document.addEventListener('click', (e) => {
      const navTarget = e.target.closest('[data-view]');
      if (navTarget) {
        e.preventDefault();
        const view = navTarget.getAttribute('data-view');
        this.switchView(view);
        // Tutup mobile drawer jika terbuka
        document.getElementById('appSidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop')?.classList.remove('active');
        document.body.style.overflow = '';
      }

      // Close modal button
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const modalId = closeBtn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      }
    });

    // Universal Sidebar Toggle Button (Desktop & Mobile)
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSidebar();
      });
    }

    // Legacy Mobile Menu Button compatibility
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn && mobileBtn !== toggleBtn) {
      mobileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSidebar();
      });
    }

    // Sidebar Close Button (inside sidebar header)
    const closeBtn = document.getElementById('sidebarCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideSidebar();
      });
    }

    // Backdrop click to close sidebar
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.hideSidebar();
      });
    }

    // Modal background click to close
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });
  }
};
