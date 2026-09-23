/**
 * MAISYA-TRANS - Dashboard Controller (Real-time Fleet Monitoring & Public Access)
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const DashboardView = {
  data: null,
  activeFilter: 'ALL',

  async load() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const res = await Api.request('getDashboard', 'GET');
    if (res.success && res.data) {
      this.data = res.data;
      this.render();
    }
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render();
  },

  render() {
    const container = document.getElementById('dashboardContent');
    if (!container || !this.data) return;

    const { overview, vehicles, activeTrips, recentTrips, activeBookings } = this.data;
    const user = Auth.getUser();
    const isAdmin = Auth.isAdmin();

    // Saring armada berdasarkan filter aktif
    let filteredVehicles = (vehicles || []).filter(v => {
      if (this.activeFilter === 'MOTOR') return v.jenis === 'MOTOR';
      if (this.activeFilter === 'MOBIL') return v.jenis === 'MOBIL';
      if (this.activeFilter === 'AVAILABLE') return v.status === 'AVAILABLE';
      if (this.activeFilter === 'IN_USE') return v.status === 'IN_USE';
      if (this.activeFilter === 'PENDING') return v.status === 'PENDING_APPROVAL';
      if (this.activeFilter === 'MAINTENANCE') return v.status === 'MAINTENANCE';
      return true;
    });

    container.innerHTML = `
      <!-- 1. Hero Banner: Informasi Real-time Pondok -->
      <div class="welcome-banner" style="background: linear-gradient(135deg, var(--primary-800), var(--primary-700)); color:#FFFFFF; border-radius:var(--border-radius-lg); padding:1.5rem; margin-bottom:1.5rem; position:relative; overflow:hidden; box-shadow:var(--shadow-lg);">
        <div style="position:relative; z-index:2; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem;">
          <div>
            <div style="font-size:0.8rem; font-weight:700; color:var(--gold-400); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
              Pondok Pesantren Imam Syafi'i Brebes
            </div>
            <h2 style="font-size:1.4rem; font-weight:800; color:#FFFFFF; margin-bottom:4px;">
              ${isAdmin ? `Assalamu'alaikum, ${user?.nama || 'Admin Sarpras'} 🛡️` : 'Sistem Peminjaman Kendaraan Operasional'}
            </h2>
            <p style="font-size:0.88rem; color:rgba(255,255,255,0.85); max-width:620px;">
              Akses peminjaman mudah untuk seluruh asatidzah, guru, staf, dan santri. Pantau status armada dan argo pemakaian real-time secara transparan.
            </p>
          </div>

          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-gold btn-sm" onclick="BookingView.openBookingModal()" style="font-weight:700; box-shadow:0 4px 12px rgba(217,119,6,0.3);">
              ➕ Ajukan Peminjaman
            </button>
            <button class="btn btn-outline btn-sm" onclick="DashboardView.load()" style="background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.3); color:#FFFFFF;" title="Segarkan Data">
              🔄 Segarkan
            </button>
          </div>
        </div>

        <!-- Mini Stats Counters -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.75rem; margin-top:1.25rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.15); position:relative; z-index:2;">
          <div style="background:rgba(255,255,255,0.1); padding:0.6rem 0.8rem; border-radius:10px;">
            <div style="font-size:0.72rem; color:rgba(255,255,255,0.75); text-transform:uppercase;">Total Armada</div>
            <div style="font-size:1.25rem; font-weight:800; color:#FFFFFF;">${overview.totalVehicles || 0} <span style="font-size:0.75rem; font-weight:500;">Unit</span></div>
          </div>
          <div style="background:rgba(16,185,129,0.25); padding:0.6rem 0.8rem; border-radius:10px; border:1px solid rgba(16,185,129,0.4);">
            <div style="font-size:0.72rem; color:#A7F3D0; text-transform:uppercase;">Tersedia</div>
            <div style="font-size:1.25rem; font-weight:800; color:#34D399;">${(overview.motorAvailableCount || 0) + (overview.mobilAvailableCount || 0)} <span style="font-size:0.75rem; font-weight:500;">Unit</span></div>
          </div>
          <div style="background:rgba(239,68,68,0.25); padding:0.6rem 0.8rem; border-radius:10px; border:1px solid rgba(239,68,68,0.4);">
            <div style="font-size:0.72rem; color:#FCA5A5; text-transform:uppercase;">Sedang Dipakai</div>
            <div style="font-size:1.25rem; font-weight:800; color:#F87171;">${overview.totalInUse || 0} <span style="font-size:0.75rem; font-weight:500;">Unit</span></div>
          </div>
          <div style="background:rgba(245,158,11,0.25); padding:0.6rem 0.8rem; border-radius:10px; border:1px solid rgba(245,158,11,0.4);">
            <div style="font-size:0.72rem; color:#FDE68A; text-transform:uppercase;">Menunggu Persetujuan</div>
            <div style="font-size:1.25rem; font-weight:800; color:#FBBF24;">${overview.pendingBookingsCount || 0} <span style="font-size:0.75rem; font-weight:500;">Pengajuan</span></div>
          </div>
        </div>
      </div>

      <!-- 2. Live Argo Cards Section: Kendaraan Sedang Digunakan -->
      ${this.renderActiveArgoSection(vehicles)}

      <!-- 3. Katalog & Status Armada Real-time -->
      <div style="margin-bottom: 1.5rem;">
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:1rem;">
          <div>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              <span>🚗</span> Daftar Seluruh Kendaraan Terdaftar
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
              Status kendaraan real-time, foto, nomor polisi, dan pengajuan peminjaman
            </p>
          </div>

          <!-- Filter Pills -->
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-sm ${this.activeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('ALL')">Semua</button>
            <button class="btn btn-sm ${this.activeFilter === 'MOTOR' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('MOTOR')">🏍️ Motor</button>
            <button class="btn btn-sm ${this.activeFilter === 'MOBIL' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('MOBIL')">🚗 Mobil</button>
            <button class="btn btn-sm ${this.activeFilter === 'AVAILABLE' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('AVAILABLE')">🟢 Tersedia</button>
            <button class="btn btn-sm ${this.activeFilter === 'IN_USE' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('IN_USE')">🔴 Dipakai</button>
            <button class="btn btn-sm ${this.activeFilter === 'PENDING' ? 'btn-primary' : 'btn-outline'}" onclick="DashboardView.setFilter('PENDING')">🟡 Pengajuan</button>
          </div>
        </div>

        <!-- Vehicle Grid -->
        <div class="vehicle-grid">
          ${filteredVehicles.map(v => this.renderVehicleCard(v)).join('')}
        </div>
      </div>

      <!-- 4. Antrean Pengajuan & Verifikasi Pengembalian (Untuk Admin & Publik) -->
      ${this.renderPendingQueues(activeBookings, isAdmin)}
    `;
  },

  /**
   * Render Section Live Argo untuk kendaraan yang sedang aktif berjalan
   */
  renderActiveArgoSection(vehicles) {
    const inUseVehicles = (vehicles || []).filter(v => v.status === 'IN_USE' && v.activeTrip);
    if (inUseVehicles.length === 0) return '';

    return `
      <div style="margin-bottom: 2rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
          <h3 style="font-size:1.05rem; font-weight:800; color:#DC2626; display:flex; align-items:center; gap:8px;">
            <span class="argo-live-dot"></span>
            <span>KENDARAAN SEDANG DIGUNAKAN (LIVE ARGO REAL-TIME)</span>
          </h3>
          <span style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">Waktu diperbarui otomatis per detik</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:1.25rem;">
          ${inUseVehicles.map(v => {
            const trip = v.activeTrip;
            const startTimeFormatted = new Date(trip.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const startDateFormatted = new Date(trip.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

            return `
              <div class="argo-ticker-box">
                <div class="argo-header-row">
                  <div style="font-weight:800; font-size:1rem; color:#FFFFFF;">
                    ${v.merk} ${v.model}
                    <span style="background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:6px; font-size:0.75rem; margin-left:6px; font-family:monospace;">
                      ${v.nomorPolisi}
                    </span>
                  </div>
                  <div class="argo-live-badge">
                    <span class="argo-live-dot"></span>
                    <span>Argo Berjalan</span>
                  </div>
                </div>

                <div class="argo-digital-display">
                  <div>
                    <div class="argo-time-label">Durasi Pemakaian Real-time</div>
                    <div class="argo-time-val" data-argo-start="${trip.startTime}">00:00:00</div>
                  </div>
                  <div style="text-align:right;">
                    <div class="argo-time-label">Mulai Sejak</div>
                    <div style="font-size:0.9rem; font-weight:700; color:#F8FAFC;">${startTimeFormatted} WIB</div>
                    <div style="font-size:0.7rem; color:#94A3B8;">${startDateFormatted}</div>
                  </div>
                </div>

                <div class="argo-meta-grid">
                  <div class="argo-meta-item">
                    <span>Peminjam</span>
                    <strong>👤 ${trip.userName}</strong>
                    <div style="font-size:0.72rem; color:#94A3B8; margin-top:2px;">${trip.divisi || 'Pesantren'}</div>
                  </div>
                  <div class="argo-meta-item">
                    <span>Tujuan / Keperluan</span>
                    <strong>📍 ${trip.tujuan || trip.purpose || 'Dinas'}</strong>
                    <div style="font-size:0.72rem; color:#94A3B8; margin-top:2px;">${trip.purpose || '-'}</div>
                  </div>
                  <div class="argo-meta-item">
                    <span>KM Awal Check-In</span>
                    <strong>🛣️ ${(trip.startKm || v.currentKm).toLocaleString('id-ID')} KM</strong>
                  </div>
                  <div class="argo-meta-item">
                    <span>BBM & Kebersihan</span>
                    <strong>⛽ ${trip.fuelLevelStart || '75%'} • ✨ ${trip.cleanlinessStart || 'Bersih'}</strong>
                  </div>
                </div>

                <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                  <button class="btn btn-danger btn-sm btn-block" onclick="TripsView.openCheckOutModal('${trip.tripId}')" style="font-weight:700; box-shadow:0 4px 12px rgba(220,38,38,0.35);">
                    ⏹ Selesai Pakai &amp; Check-Out
                  </button>
                  <a href="https://wa.me/${(trip.noHp || '').replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-outline btn-sm" style="background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); color:#FFFFFF;" title="Hubungi Peminjam via WhatsApp">
                    📱 WA
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Render Kartu Kendaraan Individual
   */
  renderVehicleCard(v) {
    const isMotor = v.jenis === 'MOTOR';
    
    // Status visual mapping
    let badgeClass = 'badge-available';
    let statusLabel = '🟢 Tersedia';
    let statusDesc = 'Armada stanby & siap dipinjam';

    if (v.status === 'IN_USE') {
      badgeClass = 'badge-in-use';
      statusLabel = '🔴 Sedang Digunakan';
      statusDesc = v.activeTrip ? `Dipakai: ${v.activeTrip.userName}` : 'Sedang dalam perjalanan';
    } else if (v.status === 'PENDING_APPROVAL') {
      badgeClass = 'badge-pending';
      statusLabel = '🟡 Menunggu Persetujuan';
      statusDesc = 'Pengajuan menunggu Admin Sarpras';
    } else if (v.status === 'APPROVED') {
      badgeClass = 'badge-approved';
      statusLabel = '🔵 Disetujui (Ambil Kunci)';
      statusDesc = 'Siap ambil kunci & Check-In';
    } else if (v.status === 'MAINTENANCE') {
      badgeClass = 'badge-maintenance';
      statusLabel = '🟠 Dalam Perawatan';
      statusDesc = 'Perawatan mesin / servis bengkel';
    }

    const defaultImg = isMotor 
      ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80';

    return `
      <div class="vehicle-card" id="vcard-${v.vehicleId}">
        <div class="vehicle-card-image-wrap">
          <img src="${v.imageUrl || defaultImg}" alt="${v.merk} ${v.model}" onerror="this.src='${defaultImg}'">
          <div style="position:absolute; top:8px; left:8px;">
            <span class="badge ${badgeClass}" style="font-size:0.75rem; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
              ${statusLabel}
            </span>
          </div>
          <div style="position:absolute; bottom:8px; right:8px;">
            <span class="vehicle-plate-badge" style="font-size:0.78rem;">${v.nomorPolisi}</span>
          </div>
        </div>

        <div class="vehicle-card-body">
          <div class="vehicle-title-row">
            <div>
              <div class="vehicle-name">${v.merk} ${v.model}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">
                Tahun ${v.tahun || '-'} • Warna ${v.warna || '-'}
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-secondary); padding:6px 10px; border-radius:8px; margin:0.4rem 0; font-size:0.78rem;">
            <span style="color:var(--text-secondary);">Odometer Terkini:</span>
            <strong style="color:var(--primary-700); font-size:0.85rem;">${(v.currentKm || 0).toLocaleString('id-ID')} KM</strong>
          </div>

          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem; line-height:1.4;">
            ℹ️ ${statusDesc}
          </div>

          <!-- Live Argo Mini jika sedang digunakan -->
          ${v.status === 'IN_USE' && v.activeTrip ? `
            <div style="background:rgba(239,68,68,0.08); border:1px dashed rgba(239,68,68,0.3); border-radius:8px; padding:6px 8px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
              <span style="color:#B91C1C; font-weight:700;">⏱️ Argo: <span data-argo-start="${v.activeTrip.startTime}" style="font-family:monospace; font-weight:800;">00:00:00</span></span>
              <span style="color:var(--text-muted); font-size:0.7rem;">👤 ${v.activeTrip.userName.split(' ')[0]}</span>
            </div>
          ` : ''}
        </div>

        <div class="vehicle-card-actions">
          ${v.status === 'AVAILABLE' ? `
            <button class="btn btn-primary btn-sm btn-block" onclick="BookingView.openBookingForVehicle('${v.vehicleId}')">
              ▶ Ajukan Peminjaman
            </button>
          ` : (v.status === 'APPROVED' ? `
            <button class="btn btn-gold btn-sm btn-block" onclick="BookingView.openCheckInModal('${v.vehicleId}')" style="font-weight:700;">
              🔑 Check-In &amp; Ambil Kunci
            </button>
          ` : (v.status === 'IN_USE' ? `
            <button class="btn btn-danger btn-sm btn-block" onclick="TripsView.openCheckOutByVehicle('${v.vehicleId}')">
              ⏹ Check-Out &amp; Pengembalian
            </button>
          ` : (v.status === 'PENDING_APPROVAL' ? `
            <button class="btn btn-outline btn-sm btn-block" disabled style="opacity:0.8; color:var(--gold-700);">
              ⏳ Menunggu Persetujuan
            </button>
          ` : `
            <button class="btn btn-outline btn-sm btn-block" disabled>Dalam Perawatan</button>
          `)))}
        </div>
      </div>
    `;
  },

  /**
   * Render antrean pengajuan & aktivitas peminjaman
   */
  renderPendingQueues(activeBookings, isAdmin) {
    return `
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; margin-top:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="font-size: 0.95rem; font-weight:800; display:flex; align-items:center; gap:6px;">
            <span>📅</span> Riwayat Pengajuan Peminjaman Terkini
          </h4>
          <button class="btn btn-outline btn-sm" onclick="UI.switchView('booking')">Lihat Semua</button>
        </div>

        ${activeBookings && activeBookings.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${activeBookings.slice(0, 5).map(b => `
              <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--surface-secondary); border-radius:var(--border-radius-md); font-size:0.85rem; gap:0.75rem;">
                <div>
                  <div style="font-weight:700; color:var(--text-primary);">
                    ${b.userName} <span style="font-weight:400; color:var(--text-muted);">(${b.divisi || 'Pondok'})</span>
                  </div>
                  <div style="font-size:0.78rem; color:var(--primary-700); font-weight:600; margin-top:2px;">
                    ${b.vehicleName} (${b.nomorPolisi || '-'})
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                    📅 ${b.tanggal} • 🕒 ${b.startTime} - ${b.estimatedEndTime} • Tujuan: ${b.tujuan || b.purpose}
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="badge ${b.status === 'APPROVED' ? 'badge-approved' : (b.status === 'IN_USE' ? 'badge-in-use' : 'badge-pending')}">
                    ${b.status === 'APPROVED' ? 'Disetujui' : (b.status === 'IN_USE' ? 'Sedang Dipakai' : 'Menunggu Persetujuan')}
                  </span>
                  ${isAdmin && b.status === 'PENDING' ? `
                    <button class="btn btn-primary btn-sm" onclick="AdminView.approveBooking('${b.bookingId}')">Setujui</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
            Belum ada antrean pengajuan peminjaman saat ini.
          </div>
        `}
      </div>
    `;
  }
};
