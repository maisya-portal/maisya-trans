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
    const isAdmin = Auth.isAdmin();

    let filtered = this.vehicles.filter(v => {
      if (this.filterType !== 'ALL' && v.jenis !== this.filterType) return false;
      if (this.filterStatus !== 'ALL' && v.status !== this.filterStatus) return false;
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

      let badgeClass = 'badge-available';
      let statusLabel = 'Tersedia';
      if (v.status === 'IN_USE')        { badgeClass = 'badge-in-use';          statusLabel = 'Sedang Digunakan'; }
      else if (v.status === 'MAINTENANCE') { badgeClass = 'badge-maintenance';  statusLabel = 'Dalam Perawatan'; }
      else if (v.status === 'BOOKED')   { badgeClass = 'badge-booked';          statusLabel = 'Dipesan'; }

      const safeModel = (v.merk + ' ' + v.model).replace(/'/g, "\\'");
      const safeNopol = v.nomorPolisi.replace(/'/g, "\\'");

      const adminActions = isAdmin ? `
        <div class="vehicle-admin-actions">
          <button class="veh-admin-btn veh-edit-btn" onclick="VehiclesView.openEditModal('${v.vehicleId}')" title="Edit Kendaraan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button class="veh-admin-btn veh-delete-btn" onclick="VehiclesView.deleteVehicle('${v.vehicleId}', '${safeModel}', '${safeNopol}')" title="Hapus Kendaraan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            Hapus
          </button>
        </div>
      ` : '';

      return `
        <div class="vehicle-card" id="vcard-${v.vehicleId}">
          <div class="vehicle-card-image-wrap">
            <button class="favorite-toggle-btn ${isFav ? 'active' : ''}"
                    onclick="UI.toggleFavorite('${v.vehicleId}')"
                    title="${isFav ? 'Hapus favorit' : 'Tandai favorit'}">★</button>
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
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">Tahun ${v.tahun || '-'} &bull; Warna ${v.warna || '-'}</div>
              </div>
              <span class="vehicle-plate-badge">${v.nomorPolisi}</span>
            </div>

            <div class="vehicle-meta-tags">
              <span class="badge ${badgeClass}">${statusLabel}</span>
              <span class="badge" style="background:var(--surface-secondary); color:var(--text-secondary);">
                🛣️ ${v.currentKm.toLocaleString('id-ID')} KM
              </span>
            </div>

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
              <button class="btn btn-outline btn-sm btn-block" disabled>Dalam Pemeliharaan</button>
            `)}
          </div>

          ${adminActions}
        </div>
      `;
    }).join('');
  },

  /** Buka modal edit dengan data kendaraan yang sudah ada */
  openEditModal(vehicleId) {
    const v = this.vehicles.find(x => x.vehicleId === vehicleId);
    if (!v) { UI.showToast('Data kendaraan tidak ditemukan.', 'error'); return; }

    document.getElementById('editVehicleId').value             = v.vehicleId;
    document.getElementById('editVehicleJenis').value          = v.jenis;
    document.getElementById('editVehicleMerk').value           = v.merk;
    document.getElementById('editVehicleModel').value          = v.model;
    document.getElementById('editVehicleNopol').value          = v.nomorPolisi;
    document.getElementById('editVehicleTahun').value          = v.tahun || '';
    document.getElementById('editVehicleWarna').value          = v.warna || '';
    document.getElementById('editVehicleKm').value             = v.currentKm || 0;
    document.getElementById('editVehicleOilInterval').value    = v.oilIntervalKm || (v.jenis === 'MOBIL' ? 5000 : 2000);
    document.getElementById('editVehicleTuneupInterval').value = v.tuneupIntervalKm || (v.jenis === 'MOBIL' ? 10000 : 5000);
    document.getElementById('editVehicleStatus').value         = v.status;
    document.getElementById('editVehicleNotes').value          = v.notes || '';

    const title = document.getElementById('editVehicleModalTitle');
    if (title) title.textContent = `Edit: ${v.merk} ${v.model} (${v.nomorPolisi})`;

    UI.openModal('modalEditVehicle');
  },

  /** Submit form edit kendaraan */
  async submitEdit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitEditVehicle');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

    const user = Auth.getUser();
    const payload = {
      vehicleId:          document.getElementById('editVehicleId').value,
      jenis:              document.getElementById('editVehicleJenis').value,
      merk:               document.getElementById('editVehicleMerk').value,
      model:              document.getElementById('editVehicleModel').value,
      nomor_polisi:       document.getElementById('editVehicleNopol').value,
      tahun:              document.getElementById('editVehicleTahun').value,
      warna:              document.getElementById('editVehicleWarna').value,
      oil_interval_km:    document.getElementById('editVehicleOilInterval').value,
      tuneup_interval_km: document.getElementById('editVehicleTuneupInterval').value,
      status:             document.getElementById('editVehicleStatus').value,
      notes:              document.getElementById('editVehicleNotes').value,
      userId: user ? user.userId : '',
      token:  Auth.getToken() || ''
    };

    try {
      const res = await Api.request('updateVehicle', 'POST', payload);
      if (res.success) {
        UI.showToast(res.message || 'Kendaraan berhasil diperbarui.', 'success');
        UI.closeModal('modalEditVehicle');
        await this.load();
      } else {
        UI.showToast(res.message || 'Gagal memperbarui kendaraan.', 'error');
      }
    } catch (err) {
      UI.showToast('Gagal terhubung ke server.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Perubahan'; }
    }
  },

  /** Tampilkan modal konfirmasi hapus kendaraan */
  deleteVehicle(vehicleId, namaKendaraan, nopol) {
    document.getElementById('deleteVehicleId').value = vehicleId;
    const nameEl = document.getElementById('deleteVehicleName');
    if (nameEl) nameEl.textContent = `${namaKendaraan} (${nopol})`;
    UI.openModal('modalDeleteVehicle');
  },

  /** Eksekusi penghapusan setelah konfirmasi */
  async confirmDelete() {
    const vehicleId = document.getElementById('deleteVehicleId').value;
    const btn = document.getElementById('btnConfirmDeleteVehicle');
    if (!vehicleId) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Menghapus...'; }

    const user = Auth.getUser();
    try {
      const res = await Api.request('deleteVehicle', 'POST', {
        vehicleId,
        userId: user ? user.userId : '',
        token:  Auth.getToken() || ''
      });
      if (res.success) {
        UI.showToast(res.message || 'Kendaraan berhasil dihapus.', 'success');
        UI.closeModal('modalDeleteVehicle');
        const card = document.getElementById(`vcard-${vehicleId}`);
        if (card) {
          card.style.transition = 'opacity 0.35s, transform 0.35s';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => card.remove(), 360);
        }
        this.vehicles = this.vehicles.filter(v => v.vehicleId !== vehicleId);
      } else {
        UI.showToast(res.message || 'Gagal menghapus kendaraan.', 'error');
      }
    } catch (err) {
      UI.showToast('Gagal terhubung ke server.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Ya, Hapus Permanen'; }
    }
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
