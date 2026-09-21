/**
 * MAISYA-TRANS - UI View Controller & Modal System
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const UI = {
  currentView: 'dashboard',
  favorites: new Set(),

  init() {
    this.loadFavorites();
    this.initTheme();
    this.bindGlobalEvents();
  },

  /**
   * Router Tampilan Halaman (SPA Switching)
   */
  switchView(viewName) {
    // Validasi login
    if (!Auth.isLoggedIn() && viewName !== 'login' && viewName !== 'register') {
      viewName = 'login';
    }

    // Role protection untuk admin view
    if (viewName === 'admin' && !Auth.isAdmin()) {
      this.showToast('Halaman ini khusus untuk Admin Sarpras Pondok.', 'error');
      viewName = 'dashboard';
    }

    this.currentView = viewName;
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

  bindGlobalEvents() {
    // Delegasi klik tombol navigasi
    document.addEventListener('click', (e) => {
      const navTarget = e.target.closest('[data-view]');
      if (navTarget) {
        e.preventDefault();
        const view = navTarget.getAttribute('data-view');
        this.switchView(view);
        // Tutup mobile sidebar jika terbuka
        document.getElementById('appSidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop')?.classList.remove('active');
      }

      // Close modal button
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const modalId = closeBtn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      }
    });

    // Mobile hamburger menu toggle
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (menuBtn && sidebar && backdrop) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
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
