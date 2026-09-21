/**
 * MAISYA-TRANS - Admin Sarpras Management Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const AdminView = {
  users: [],
  pendingUsers: [],
  vehicles: [],
  stats: null,

  async load() {
    if (!Auth.isAdmin()) {
      UI.switchView('dashboard');
      return;
    }

    const [uRes, vRes, sRes] = await Promise.all([
      Api.request('getUsers', 'GET'),
      Api.request('getVehicles', 'GET'),
      Api.request('getStatistics', 'GET')
    ]);

    if (uRes.success && uRes.data) {
      this.users = uRes.data;
      this.pendingUsers = this.users.filter(u => u.status === 'PENDING');
    }
    if (vRes.success && vRes.data) this.vehicles = vRes.data;
    if (sRes.success && sRes.data) this.stats = sRes.data;

    this.render();
  },

  render() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;

    const currentTariff = this.stats?.kpi?.activeTariff || APP_CONFIG.DEFAULT_TARIFF_PER_KM;
    const currentApiUrl = getActiveApiUrl();

    container.innerHTML = `
      <!-- Admin Top KPI -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:var(--primary-50); color:var(--primary-700);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${this.users.length}</span>
            <span class="kpi-label">Total Pengguna</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #EF4444;">
          <div class="kpi-icon-wrap" style="background:#FEE2E2; color:#DC2626;">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${this.pendingUsers.length}</span>
            <span class="kpi-label">User Menunggu Persetujuan</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:var(--gold-50); color:var(--gold-700);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">Rp${currentTariff.toLocaleString('id-ID')}</span>
            <span class="kpi-label">Tarif per KM Aktif</span>
          </div>
        </div>
      </div>

      <!-- 1. Section: User Registrasi Menunggu Persetujuan (APPROVAL USER) -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.5rem; margin-bottom:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="font-size:1.05rem; display:flex; align-items:center; gap:8px;">
            <span>👥</span> Persetujuan Pengguna Baru
            ${this.pendingUsers.length > 0 ? `
              <span class="badge badge-in-use">${this.pendingUsers.length} Menunggu</span>
            ` : ''}
          </h3>
        </div>

        ${this.pendingUsers.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${this.pendingUsers.map(u => `
              <div style="background:var(--surface-secondary); border-radius:var(--border-radius-md); padding:1rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem;">
                <div>
                  <div style="font-weight:700; font-size:0.95rem;">${u.nama}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                    NIP/ID: ${u.nip || '-'} • Jabatan: ${u.jabatan || '-'} (${u.divisi || 'Pondok'})
                  </div>
                  <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                    ✉️ ${u.email} • 📱 ${u.no_hp}
                  </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  <button class="btn btn-primary btn-sm" onclick="AdminView.approveUser('${u.userId}')">
                    ✓ Setujui
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="AdminView.rejectUser('${u.userId}')">
                    ✕ Tolak
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.88rem;">
            Alhamdulillah, tidak ada pendaftaran pengguna baru yang menunggu persetujuan.
          </div>
        `}
      </div>

      <!-- 2. Section: Pengaturan Tarif & Manajemen Armada -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
        <!-- Atur Tarif per KM -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
          <h4 style="font-size:1rem; margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
            <span>💰</span> Atur Tarif Pemakaian per KM
          </h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">
            Tarif ini akan dijadikan dasar perhitungan biaya seluruh peminjaman baru (histori lama tidak akan berubah).
          </p>
          <div style="display:flex; gap:0.5rem;">
            <input type="number" id="adminNewTariffInput" class="form-control" value="${currentTariff}" min="100" step="50">
            <button class="btn btn-gold" onclick="AdminView.submitUpdateTariff()">Simpan</button>
          </div>
        </div>

        <!-- Tambah Armada Kendaraan Baru -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h4 style="font-size:1rem; margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
              <span>🚗</span> Tambah Armada Baru
            </h4>
            <p style="font-size:0.8rem; color:var(--text-muted);">
              Tambahkan motor dinas atau mobil baru ke database Google Spreadsheet pondok.
            </p>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:1rem;" onclick="UI.openModal('modalAddVehicle')">
            + Tambah Kendaraan
          </button>
        </div>
      </div>

      <!-- 3. Section: Ekspor Laporan Perjalanan (CSV) -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; margin-bottom:1.5rem;">
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem;">
          <div>
            <h4 style="font-size:1rem; display:flex; align-items:center; gap:6px;">
              <span>📥</span> Ekspor Laporan Pemakaian (CSV / Excel)
            </h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
              Unduh rekapan perjalanan, total kilometer, dan biaya pemakaian dinas pondok.
            </p>
          </div>
          <button class="btn btn-primary" onclick="AdminView.exportTrips()">
            Download Laporan CSV
          </button>
        </div>
      </div>

      <!-- 4. Section: Konfigurasi Endpoint Google Apps Script -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
        <h4 style="font-size:1rem; margin-bottom:0.5rem; display:flex; align-items:center; gap:6px;">
          <span>⚙️</span> Koneksi Google Apps Script API & Spreadsheet
        </h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">
          Spreadsheet ID: <code>${APP_CONFIG.SPREADSHEET_ID}</code><br>
          Project ID: <code>${APP_CONFIG.PROJECT_ID}</code>
        </p>
        <div class="form-group">
          <label class="form-label" style="font-size:0.8rem;">URL Web App Deployment (/exec):</label>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" id="adminGasUrlInput" class="form-control" value="${currentApiUrl}">
            <button class="btn btn-primary" onclick="AdminView.saveGasUrl()">Simpan URL</button>
          </div>
        </div>
      </div>
    `;
  },

  async approveUser(targetUserId) {
    const res = await Api.request('approveUser', 'POST', { targetUserId });
    if (res.success) {
      UI.showToast(res.message, 'success');
      this.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  },

  async rejectUser(targetUserId) {
    const reason = prompt('Masukkan alasan penolakan pendaftaran:') || 'Tidak memenuhi syarat administrasi.';
    const res = await Api.request('rejectUser', 'POST', { targetUserId, reason });
    if (res.success) {
      UI.showToast(res.message, 'info');
      this.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  },

  async submitUpdateTariff() {
    const input = document.getElementById('adminNewTariffInput');
    const newRate = Number(input.value);
    if (!newRate || newRate <= 0) {
      UI.showToast('Harap masukkan nominal tarif yang valid.', 'error');
      return;
    }

    const res = await Api.request('updateTariff', 'POST', { newRate });
    if (res.success) {
      UI.showToast(res.message, 'success');
      this.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  },

  async submitAddVehicle(e) {
    e.preventDefault();
    const jenis = document.getElementById('addVehicleJenis').value;
    const merk = document.getElementById('addVehicleMerk').value;
    const model = document.getElementById('addVehicleModel').value;
    const nopol = document.getElementById('addVehicleNopol').value;
    const km = document.getElementById('addVehicleKm').value;
    const oilInterval = document.getElementById('addVehicleOilInterval').value;
    const tuneupInterval = document.getElementById('addVehicleTuneupInterval').value;
    const notes = document.getElementById('addVehicleNotes').value;

    const res = await Api.request('addVehicle', 'POST', {
      jenis,
      merk,
      model,
      nomor_polisi: nopol,
      current_km: km,
      oil_interval_km: oilInterval,
      tuneup_interval_km: tuneupInterval,
      notes
    });

    if (res.success) {
      UI.showToast(res.message, 'success');
      UI.closeModal('modalAddVehicle');
      document.getElementById('formAddVehicle').reset();
      this.load();
      if (UI.currentView === 'vehicles') VehiclesView.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  },

  async exportTrips() {
    const res = await Api.request('getHistory', 'GET');
    if (res.success && res.data) {
      const trips = res.data;
      const headers = ['Trip ID', 'Tanggal', 'Pengguna', 'Jenis', 'Kendaraan', 'Plat Nomor', 'KM Awal', 'KM Akhir', 'Total KM', 'Tarif (Rp/KM)', 'Total Biaya (Rp)', 'Keperluan', 'Status'];
      const rows = [headers.join(',')];

      trips.forEach(t => {
        const row = [
          t.tripId,
          t.startTime ? t.startTime.substring(0, 10) : '',
          `"${(t.userName || '').replace(/"/g, '""')}"`,
          t.jenis,
          `"${(t.vehicleName || '').replace(/"/g, '""')}"`,
          t.nomorPolisi,
          t.startKm,
          t.endKm,
          t.distanceKm,
          t.ratePerKm,
          t.totalCost,
          `"${(t.purpose || '').replace(/"/g, '""')}"`,
          t.status
        ];
        rows.push(row.join(','));
      });

      Utils.downloadCSV(rows.join('\r\n'), `Laporan_MaisyaTrans_${new Date().toISOString().substring(0, 10)}.csv`);
      UI.showToast('Laporan CSV berhasil diunduh!', 'success');
    }
  },

  saveGasUrl() {
    const input = document.getElementById('adminGasUrlInput');
    if (!input) return;
    const url = input.value.trim();
    setActiveApiUrl(url);
    UI.showToast('URL Google Apps Script berhasil disimpan!', 'success');
  }
};
