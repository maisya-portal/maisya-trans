/**
 * MAISYA-TRANS - Vehicles Catalog & Management
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const VehiclesView = {
  vehicles: [],
  filterType: 'ALL',
  filterStatus: 'ALL',
  searchQuery: '',

  async load() {
    const res = await Api.request('getVehicles', 'GET');
    if (res.success && res.data) {
      this.vehicles = res.data;
      this.render();
    }
  },

  render() {
    const container = document.getElementById('vehiclesListContainer');
    if (!container) return;

    let filtered = this.vehicles.filter(v => {
      // Filter Type
      if (this.filterType !== 'ALL' && v.jenis !== this.filterType) return false;
      // Filter Status
      if (this.filterStatus !== 'ALL' && v.status !== this.filterStatus) return false;
      // Search Query
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const match = 
          (v.merk && v.merk.toLowerCase().includes(q)) ||
          (v.model && v.model.toLowerCase().includes(q)) ||
          (v.nomorPolisi && v.nomorPolisi.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin:0 auto 1rem; display:block;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div style="font-weight:700; font-size:1.1rem; color:var(--text-primary);">Armada Tidak Ditemukan</div>
          <p style="font-size:0.85rem; margin-top:4px;">Coba ubah kata kunci pencarian atau bersihkan filter Anda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(v => {
      const isFav = UI.isFavorite(v.vehicleId);
      const isMotor = v.jenis === 'MOTOR';

      // Badge status
      let badgeClass = 'badge-available';
      let statusLabel = 'Tersedia';
      if (v.status === 'IN_USE') {
        badgeClass = 'badge-in-use';
        statusLabel = 'Sedang Digunakan';
      } else if (v.status === 'MAINTENANCE') {
        badgeClass = 'badge-maintenance';
        statusLabel = 'Dalam Perawatan';
      } else if (v.status === 'BOOKED') {
        badgeClass = 'badge-booked';
        statusLabel = 'Dipesan';
      }

      return `
        <div class="vehicle-card">
          <div class="vehicle-card-image-wrap">
            <button class="favorite-toggle-btn ${isFav ? 'active' : ''}" 
                    onclick="UI.toggleFavorite('${v.vehicleId}')" 
                    title="${isFav ? 'Hapus favorit' : 'Tandai favorit'}">
              ★
            </button>
            ${isMotor ? `
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            ` : `
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
            `}
          </div>

          <div class="vehicle-card-body">
            <div class="vehicle-title-row">
              <div>
                <div class="vehicle-name">${v.merk} ${v.model}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">Tahun ${v.tahun || '-'} • Warna ${v.warna || '-'}</div>
              </div>
              <span class="vehicle-plate-badge">${v.nomorPolisi}</span>
            </div>

            <div class="vehicle-meta-tags">
              <span class="badge ${badgeClass}">${statusLabel}</span>
              <span class="badge" style="background:var(--surface-secondary); color:var(--text-secondary);">
                🛣️ ${v.currentKm.toLocaleString('id-ID')} KM
              </span>
            </div>

            <!-- Health & Service Alert -->
            <div class="health-chip ${v.health === 'DANGER' ? 'danger' : (v.health === 'WARNING' ? 'warning' : 'good')}">
              <span>${v.health === 'DANGER' ? '🔴' : (v.health === 'WARNING' ? '🟡' : '🟢')}</span>
              <div style="display:flex; flex-direction:column; line-height:1.2;">
                <span>Kondisi: <strong>${v.healthLabel}</strong></span>
                <span style="font-size:0.7rem; opacity:0.85;">
                  ${v.oilStatus !== 'OK' ? v.oilStatusText : (v.tuneupStatus !== 'OK' ? v.tuneupStatusText : 'Servis & Oli Terjaga')}
                </span>
              </div>
            </div>

            ${v.notes ? `
              <div style="font-size:0.75rem; color:var(--text-muted); background:var(--surface-secondary); padding:4px 8px; border-radius:6px;">
                📝 ${v.notes}
              </div>
            ` : ''}
          </div>

          <div class="vehicle-card-actions">
            ${v.status === 'AVAILABLE' ? `
              <button class="btn btn-primary btn-sm btn-block" onclick="BookingView.openQuickBorrowById('${v.vehicleId}')">
                ▶ Pinjam Sekarang
              </button>
            ` : (v.status === 'IN_USE' ? `
              <button class="btn btn-danger btn-sm btn-block" onclick="TripsView.openFinishByVehicleId('${v.vehicleId}')">
                ⏹ Selesai Pakai
              </button>
            ` : `
              <button class="btn btn-outline btn-sm btn-block" disabled>
                Dalam Pemeliharaan
              </button>
            `)}
          </div>
        </div>
      `;
    }).join('');
  },

  setFilter(type, status) {
    if (type !== undefined) this.filterType = type;
    if (status !== undefined) this.filterStatus = status;
    this.render();
  },

  setSearch(q) {
    this.searchQuery = q;
    this.render();
  }
};
