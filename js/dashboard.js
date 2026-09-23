/**
 * MAISYA-TRANS - Dashboard Controller (Real-time Vehicle Monitoring)
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const DashboardView = {
  data: null,
  refreshTimer: null,

  async load() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    // Tampilkan data langsung jika ada, lalu fetch update
    const res = await Api.request('getDashboard', 'GET');
    if (res.success && res.data) {
      this.data = res.data;
      this.render();

      // Tampilkan status popup elegan jika baru pertama kali dibuka
      if (this.data.overview) {
        UI.showWelcomeStatusPopup(
          this.data.overview,
          this.data.activeMotor,
          this.data.activeMobil
        );
      }
    }
  },

  render() {
    const container = document.getElementById('dashboardContent');
    if (!container || !this.data) return;

    const { overview, activeMotor, activeMobil, recentTrips, activeBookings, vehicles } = this.data;
    const user = Auth.getUser() || { nama: 'Guru / Karyawan' };

    // Saring pengingat servis yang mendekati / terlambat
    const serviceAlerts = (vehicles || []).filter(v => v.oilStatus !== 'OK' || v.tuneupStatus !== 'OK');

    container.innerHTML = `
      <!-- 1. Welcome Banner Islami -->
      <div class="welcome-banner">
        <div class="banner-content">
          <div class="banner-greeting">
            Assalamu'alaikum, ${user.nama} 👋
          </div>
          <div class="banner-sub">
            Selamat datang di Sistem Peminjaman & Monitoring Kendaraan Pondok Pesantren Imam Syafi’i Brebes.
          </div>
          <div class="banner-status-tag">
            ${overview.allAvailable 
              ? '🟢 Seluruh Armada Siap Operasional' 
              : `🔴 ${overview.totalInUse} Kendaraan Sedang Digunakan`}
          </div>
        </div>
        <div>
          <button class="btn btn-gold btn-sm" onclick="DashboardView.load()" title="Segarkan Data Real-time">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Segarkan
          </button>
        </div>
      </div>

      <!-- 2. Realtime Monitoring Cards (MOTOR & MOBIL) -->
      <div class="monitoring-grid">
        <!-- MOTOR CARD -->
        ${this.renderMonitorCard('MOTOR', activeMotor, overview.motorAvailableCount)}

        <!-- MOBIL CARD -->
        ${this.renderMonitorCard('MOBIL', activeMobil, overview.mobilAvailableCount)}
      </div>

      <!-- 3. Quick Action Bar -->
      <div class="quick-actions-bar">
        <div class="quick-action-btn primary" data-view="booking">
          <div class="quick-action-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="quick-action-label">Pinjam Sekarang</span>
        </div>

        <div class="quick-action-btn gold" data-view="vehicles">
          <div class="quick-action-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <span class="quick-action-label">Daftar Armada</span>
        </div>

        <div class="quick-action-btn blue" data-view="history">
          <div class="quick-action-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          </div>
          <span class="quick-action-label">Riwayat & Biaya</span>
        </div>

        <div class="quick-action-btn slate" data-view="notifications">
          <div class="quick-action-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </div>
          <span class="quick-action-label">Notifikasi (${overview.unreadNotifCount || 0})</span>
        </div>
      </div>

      <!-- DAFTAR PENGAJUAN AKTIF -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:1.25rem; margin-bottom:1.5rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 1rem; display:flex; align-items:center; gap:6px;">
          <span>📅</span> Pengajuan Peminjaman Aktif
        </h4>
        ${activeBookings && activeBookings.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${activeBookings.map(b => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--surface-border-subtle); font-size:0.85rem;">
                <div>
                  <span style="font-weight:700;">${b.userName}</span> mengajukan <strong>${b.vehicleName}</strong>
                  <div style="color:var(--text-muted); margin-top:2px;">📅 ${b.tanggal} 🕒 ${b.startTime} - ${b.estimatedEndTime}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Keperluan: ${b.kepentingan} - ${b.purpose}</div>
                </div>
                <div>
                  <span class="badge ${b.status === 'APPROVED' ? 'badge-available' : 'badge-maintenance'}">${b.status === 'APPROVED' ? 'Disetujui' : 'Menunggu'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.88rem;">
            Tidak ada pengajuan peminjaman saat ini.
          </div>
        `}
      </div>

      <!-- 4. Smart Maintenance Alerts (Jika ada yang mendekati / overdue) -->
      ${serviceAlerts.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; display:flex; align-items:center; gap:6px;">
            <span>🔧</span> Pengingat Servis & Ganti Oli Armada
          </h4>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${serviceAlerts.map(v => `
              <div class="health-chip ${v.oilStatus === 'OVERDUE' || v.tuneupStatus === 'OVERDUE' ? 'danger' : 'warning'}" style="justify-content:space-between;">
                <div>
                  <strong>${v.merk} ${v.model} (${v.nomorPolisi})</strong>: 
                  ${v.oilStatus !== 'OK' ? v.oilStatusText : v.tuneupStatusText}
                </div>
                <span style="font-size:0.75rem; font-weight:700;">Odometer: ${v.currentKm.toLocaleString('id-ID')} KM</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 5. Recent Activity Timeline -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="font-size: 0.95rem; display:flex; align-items:center; gap:6px;">
            <span>⏱️</span> Aktivitas & Perjalanan Terbaru
          </h4>
          <button class="btn btn-outline btn-sm" data-view="history">Lihat Semua</button>
        </div>

        ${recentTrips && recentTrips.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${recentTrips.map(t => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--surface-border-subtle); font-size:0.85rem;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <span style="font-weight:700; font-family:monospace; background:var(--surface-secondary); padding:2px 6px; border-radius:4px;">
                    ${t.startTime ? new Date(t.startTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                  <div>
                    <span style="font-weight:700;">${t.userName}</span> 
                    <span style="color:var(--text-muted);">${t.status === 'ACTIVE' ? 'sedang menggunakan' : 'selesai menggunakan'}</span>
                    <strong>${t.vehicleName}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${t.purpose}</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  ${t.status === 'ACTIVE' ? `
                    <span class="badge badge-in-use">Sedang Aktif</span>
                  ` : `
                    <div style="font-weight:700; color:var(--primary-700);">${t.distanceKm} KM</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Rp${(t.totalCost || 0).toLocaleString('id-ID')}</div>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.88rem;">
            Belum ada aktivitas perjalanan tercatat.
          </div>
        `}
      </div>
    `;
  },

  renderMonitorCard(type, activeVehicle, availableCount) {
    const isMotor = type === 'MOTOR';
    const typeLabel = isMotor ? 'MOTOR OPERASIONAL' : 'MOBIL DINAS';
    const typeIcon = isMotor 
      ? '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
      : '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>';

    if (activeVehicle && activeVehicle.activeTrip) {
      const trip = activeVehicle.activeTrip;
      const elapsed = Utils.calculateElapsed(trip.startTime);
      const startFormatted = new Date(trip.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="monitor-card status-in-use">
          <div class="monitor-card-header">
            <div class="monitor-type-badge ${isMotor ? 'motor' : 'mobil'}">
              ${typeIcon}
              <span>${typeLabel}</span>
            </div>
            <div class="pulse-indicator in-use">
              <span class="pulse-dot"></span>
              <span>Sedang Digunakan</span>
            </div>
          </div>

          <div class="monitor-active-body">
            <div class="monitor-vehicle-info">
              <div>
                <div class="vehicle-brand-name">${activeVehicle.merk} ${activeVehicle.model}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Tujuan: ${trip.purpose || 'Dinas Pondok'}</div>
              </div>
              <span class="vehicle-plate-badge">${activeVehicle.nomorPolisi}</span>
            </div>

            <div class="borrower-info">
              <div class="borrower-avatar-sm">${trip.userName.charAt(0)}</div>
              <span>Pengemudi: <strong>${trip.userName}</strong></span>
            </div>

            <!-- Visual Progress Bar Pemakaian -->
            <div class="trip-progress-container">
              <div class="trip-progress-labels">
                <span>Mulai ${startFormatted}</span>
                <span style="color:#EF4444; font-weight:700;">● Berjalan ${elapsed}</span>
              </div>
              <div class="trip-progress-track">
                <div class="trip-progress-fill"></div>
              </div>
            </div>

            <div class="trip-stat-pills">
              <div class="stat-pill">KM Awal: <strong>${trip.startKm.toLocaleString('id-ID')} KM</strong></div>
              <div class="stat-pill">KM Terkini: <strong>${activeVehicle.currentKm.toLocaleString('id-ID')} KM</strong></div>
            </div>

            <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
              <button class="btn btn-danger btn-sm btn-block" onclick="TripsView.openFinishModal('${trip.tripId}')">
                ⏹ Selesai Pemakaian
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Idle State (Tidak sedang digunakan)
    return `
      <div class="monitor-card status-available">
        <div class="monitor-card-header">
          <div class="monitor-type-badge ${isMotor ? 'motor' : 'mobil'}">
            ${typeIcon}
            <span>${typeLabel}</span>
          </div>
          <div class="pulse-indicator available">
            <span class="pulse-dot"></span>
            <span>Tersedia (${availableCount} Unit)</span>
          </div>
        </div>

        <div class="monitor-idle-body">
          <div class="monitor-idle-icon">
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div class="monitor-idle-text">
            Sedang tidak digunakan
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); max-width:260px; margin-bottom:0.5rem;">
            Alhamdulillah armada dalam kondisi stanby dan siap digunakan untuk keperluan pondok.
          </div>
          <div style="font-size:0.75rem; background:rgba(234,179,8,0.12); border:1px solid rgba(234,179,8,0.35); border-radius:8px; padding:0.5rem 0.75rem; color:#92400e; margin-bottom:0.65rem; line-height:1.5; max-width:280px;">
            📋 <strong>Perlu Reservasi:</strong> Ajukan peminjaman &amp; tunggu persetujuan Admin Sarpras sebelum memulai pemakaian.
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:0.25rem;" onclick="BookingView.openQuickBorrow('${type}')">
            ▶ Pinjam ${isMotor ? 'Motor' : 'Mobil'} Sekarang
          </button>
        </div>
      </div>
    `;
  }
};
