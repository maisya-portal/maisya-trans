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

  setFilter(type, status) {
    if (type !== undefined) this.filterType = type;
    if (status !== undefined) this.filterStatus = status;
    this.render();
  },

  setSearch(query) {
    this.searchQuery = query || '';
    this.render();
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
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight:700; font-size:1.1rem; color:var(--text-primary);">Armada Tidak Ditemukan</div>
          <p style="font-size:0.85rem; margin-top:4px;">Coba ubah kata kunci pencarian atau sesuaikan filter Anda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(v => {
      const isMotor = v.jenis === 'MOTOR';

      let badgeClass = 'badge-available';
      let statusLabel = '🟢 Tersedia';
      if (v.status === 'IN_USE')            { badgeClass = 'badge-in-use';        statusLabel = '🔴 Sedang Digunakan'; }
      else if (v.status === 'PENDING_APPROVAL') { badgeClass = 'badge-pending';   statusLabel = '🟡 Menunggu Persetujuan'; }
      else if (v.status === 'APPROVED')     { badgeClass = 'badge-approved';      statusLabel = '🔵 Disetujui (Ambil Kunci)'; }
      else if (v.status === 'MAINTENANCE')  { badgeClass = 'badge-maintenance';   statusLabel = '🟠 Dalam Perawatan'; }

      const defaultImg = isMotor 
        ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80';

      const adminActions = isAdmin ? `
        <div class="vehicle-admin-actions">
          <button class="veh-admin-btn veh-edit-btn" onclick="VehiclesView.openEditModal('${v.vehicleId}')" title="Edit Kendaraan">
            ✏️ Edit
          </button>
          <button class="veh-admin-btn veh-delete-btn" onclick="VehiclesView.deleteVehicle('${v.vehicleId}', '${v.merk} ${v.model}', '${v.nomorPolisi}')" title="Hapus Kendaraan">
            🗑️ Hapus
          </button>
        </div>
      ` : '';

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
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">
                  Tahun ${v.tahun || '-'} • Warna ${v.warna || '-'}
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-secondary); padding:6px 10px; border-radius:8px; margin:0.4rem 0; font-size:0.78rem;">
              <span style="color:var(--text-secondary);">Odometer Terkini:</span>
              <strong style="color:var(--primary-700); font-size:0.85rem;">${(v.currentKm || 0).toLocaleString('id-ID')} KM</strong>
            </div>

            <!-- Health status chip -->
            <div class="health-chip ${v.health === 'DANGER' ? 'danger' : (v.health === 'WARNING' ? 'warning' : 'good')}">
              <span>${v.health === 'DANGER' ? '🔴' : (v.health === 'WARNING' ? '🟡' : '🟢')}</span>
              <div style="display:flex; flex-direction:column; line-height:1.2;">
                <span>Kondisi Mesin: <strong>${v.healthLabel}</strong></span>
                <span style="font-size:0.7rem; opacity:0.85;">
                  ${v.oilStatus !== 'OK' ? v.oilStatusText : (v.tuneupStatus !== 'OK' ? v.tuneupStatusText : 'Servis & Oli Terjaga')}
                </span>
              </div>
            </div>

            <!-- Live Argo Mini jika sedang digunakan -->
            ${v.status === 'IN_USE' && v.activeTrip ? `
              <div style="background:rgba(239,68,68,0.08); border:1px dashed rgba(239,68,68,0.3); border-radius:8px; padding:6px 8px; margin-top:0.4rem; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                <span style="color:#B91C1C; font-weight:700;">⏱️ Argo: <span data-argo-start="${v.activeTrip.startTime}" style="font-family:monospace; font-weight:800;">00:00:00</span></span>
                <span style="color:var(--text-muted); font-size:0.7rem;">👤 ${v.activeTrip.userName.split(' ')[0]}</span>
              </div>
            ` : ''}

            ${v.notes ? `
              <div style="font-size:0.75rem; color:var(--text-muted); background:var(--surface-secondary); padding:4px 8px; border-radius:6px; margin-top:0.35rem;">
                📝 ${v.notes}
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
              <button class="btn btn-outline btn-sm btn-block" disabled>Dalam Pemeliharaan</button>
            `)))}
          </div>

          ${adminActions}
        </div>
      `;
    }).join('');
  },

  openEditModal(vehicleId) {
    const v = this.vehicles.find(x => x.vehicleId === vehicleId);
    if (!v) return;

    document.getElementById('editVehicleId').value = v.vehicleId;
    document.getElementById('editVehicleJenis').value = v.jenis;
    document.getElementById('editVehicleNopol').value = v.nomorPolisi;
    document.getElementById('editVehicleMerk').value = v.merk;
    document.getElementById('editVehicleModel').value = v.model;
    document.getElementById('editVehicleTahun').value = v.tahun || '';
    document.getElementById('editVehicleWarna').value = v.warna || '';
    document.getElementById('editVehicleKm').value = v.currentKm || 0;
    document.getElementById('editVehicleStatus').value = v.status;
    document.getElementById('editVehicleOilInterval').value = v.oilIntervalKm || 2000;
    document.getElementById('editVehicleTuneupInterval').value = v.tuneupIntervalKm || 5000;
    document.getElementById('editVehicleImageUrl').value = v.imageUrl || '';
    document.getElementById('editVehicleNotes').value = v.notes || '';

    UI.openModal('modalEditVehicle');
  },

  async submitEdit(e) {
    if (e) e.preventDefault();
    const vehicleId = document.getElementById('editVehicleId').value;
    const payload = {
      vehicleId,
      jenis: document.getElementById('editVehicleJenis').value,
      nomorPolisi: document.getElementById('editVehicleNopol').value,
      merk: document.getElementById('editVehicleMerk').value,
      model: document.getElementById('editVehicleModel').value,
      tahun: document.getElementById('editVehicleTahun').value,
      warna: document.getElementById('editVehicleWarna').value,
      currentKm: document.getElementById('editVehicleKm').value,
      status: document.getElementById('editVehicleStatus').value,
      oilIntervalKm: document.getElementById('editVehicleOilInterval').value,
      tuneupIntervalKm: document.getElementById('editVehicleTuneupInterval').value,
      imageUrl: document.getElementById('editVehicleImageUrl').value,
      notes: document.getElementById('editVehicleNotes').value
    };

    const res = await Api.request('updateVehicle', 'POST', payload);
    if (res.success) {
      UI.closeModal('modalEditVehicle');
      UI.showToast('Data armada berhasil diperbarui!', 'success');
      this.load();
      if (UI.currentView === 'dashboard') DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal memperbarui kendaraan.', 'error');
    }
  },

  deleteVehicle(vehicleId, name, nopol) {
    document.getElementById('deleteVehicleId').value = vehicleId;
    document.getElementById('deleteVehicleName').textContent = `${name} (${nopol})`;
    UI.openModal('modalDeleteVehicle');
  },

  async confirmDelete() {
    const vehicleId = document.getElementById('deleteVehicleId').value;
    const res = await Api.request('deleteVehicle', 'POST', { vehicleId });
    if (res.success) {
      UI.closeModal('modalDeleteVehicle');
      UI.showToast('Kendaraan berhasil dihapus.', 'success');
      this.load();
      if (UI.currentView === 'dashboard') DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menghapus kendaraan.', 'error');
    }
  }
};
