/**
 * MAISYA-TRANS - Admin Sarpras Management Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const AdminView = {
  users: [],
  pendingBookings: [],
  pendingReturns: [],
  vehicles: [],
  stats: null,
  activeAdminTab: 'approval',

  async load() {
    if (!Auth.isAdmin()) {
      UI.switchView('login');
      return;
    }

    const res = await Api.request('getAdminDashboard', 'GET');

    if (res.success && res.data) {
      this.users = res.data.users || [];
      this.pendingBookings = res.data.pendingBookings || [];
      this.pendingReturns = res.data.pendingReturns || [];
      this.vehicles = res.data.vehicles || [];
      this.stats = res.data.stats || null;
    }

    this.render();
  },

  setTab(tab) {
    this.activeAdminTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;

    const currentTariff = Number(Store.data.settings?.DEFAULT_TARIFF) || 1000;

    container.innerHTML = `
      <!-- KPI Overview Cards -->
      <div class="kpi-grid" style="margin-bottom:1.5rem;">
        <div class="kpi-card" style="border-left:4px solid #F59E0B;">
          <div class="kpi-icon-wrap" style="background:#FEF3C7; color:#D97706;">
            ⏳
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${this.pendingBookings.length}</span>
            <span class="kpi-label">Peminjaman Menunggu Persetujuan</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left:4px solid #8B5CF6;">
          <div class="kpi-icon-wrap" style="background:#EDE9FE; color:#7C3AED;">
            🔑
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${this.pendingReturns.length}</span>
            <span class="kpi-label">Pengembalian Menunggu Verifikasi</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left:4px solid var(--primary-600);">
          <div class="kpi-icon-wrap" style="background:var(--primary-50); color:var(--primary-700);">
            🚗
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${this.vehicles.length}</span>
            <span class="kpi-label">Total Armada Terdaftar</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left:4px solid var(--gold-500);">
          <div class="kpi-icon-wrap" style="background:var(--gold-50); color:var(--gold-700);">
            💰
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">Rp${currentTariff.toLocaleString('id-ID')}</span>
            <span class="kpi-label">Tarif Operasional per KM</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs Admin -->
      <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem; border-bottom:2px solid var(--surface-border); padding-bottom:0.5rem; overflow-x:auto;">
        <button class="btn btn-sm ${this.activeAdminTab === 'approval' ? 'btn-primary' : 'btn-outline'}" onclick="AdminView.setTab('approval')">
          📋 Persetujuan Peminjaman (${this.pendingBookings.length})
        </button>
        <button class="btn btn-sm ${this.activeAdminTab === 'verification' ? 'btn-primary' : 'btn-outline'}" onclick="AdminView.setTab('verification')">
          🔍 Verifikasi Pengembalian &amp; Kunci (${this.pendingReturns.length})
        </button>
        <button class="btn btn-sm ${this.activeAdminTab === 'fleet' ? 'btn-primary' : 'btn-outline'}" onclick="AdminView.setTab('fleet')">
          🚗 Manajemen Armada &amp; Tarif
        </button>
      </div>

      <!-- TAB CONTENT -->
      ${this.renderTabContent()}
    `;
  },

  renderTabContent() {
    if (this.activeAdminTab === 'approval') {
      return this.renderApprovalTab();
    } else if (this.activeAdminTab === 'verification') {
      return this.renderVerificationTab();
    } else {
      return this.renderFleetAndSettingsTab();
    }
  },

  /**
   * TAB 1: PERSETUJUAN PEMINJAMAN
   */
  renderApprovalTab() {
    if (this.pendingBookings.length === 0) {
      return `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">🎉</div>
          <h4 style="font-size:1.1rem; color:var(--text-primary); font-weight:800; margin-bottom:4px;">Semua Pengajuan Telah Diproses</h4>
          <p style="font-size:0.85rem;">Alhamdulillah, saat ini tidak ada antrean permohonan peminjaman yang menunggu persetujuan.</p>
        </div>
      `;
    }

    return `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${this.pendingBookings.map(b => `
          <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; box-shadow:var(--shadow-sm);">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-bottom:0.75rem;">
              <div>
                <span class="badge badge-pending" style="font-size:0.75rem; margin-bottom:4px; display:inline-block;">Menunggu Persetujuan</span>
                <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-top:2px;">
                  ${b.userName} <span style="font-weight:400; color:var(--text-muted); font-size:0.9rem;">(${b.divisi || 'Pesantren'})</span>
                </h4>
                <div style="color:var(--primary-700); font-weight:700; font-size:0.95rem; margin-top:2px;">
                  🚗 ${b.vehicleName} (${b.nomorPolisi || '-'})
                </div>
              </div>

              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" onclick="AdminView.approveBooking('${b.bookingId}')" style="font-weight:700;">
                  ✓ Setujui Permohonan
                </button>
                <button class="btn btn-danger btn-sm" onclick="AdminView.rejectBooking('${b.bookingId}')">
                  ✕ Tolak
                </button>
                <a href="https://wa.me/${(b.noHp || '').replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-outline btn-sm" title="Chat WhatsApp">
                  📱 WA
                </a>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.6rem; background:var(--surface-secondary); padding:0.85rem; border-radius:10px; font-size:0.82rem;">
              <div>📅 <strong>Jadwal:</strong> ${b.tanggal} (${b.startTime} - ${b.estimatedEndTime})</div>
              <div>📍 <strong>Tujuan:</strong> ${b.tujuan || b.purpose}</div>
              <div>👥 <strong>Penumpang:</strong> ${b.passengerCount || 1} orang</div>
              <div>📱 <strong>No. WhatsApp:</strong> ${b.noHp || '-'}</div>
              <div style="grid-column:1 / -1;">📝 <strong>Keperluan:</strong> ${b.purpose}</div>
              ${b.notes ? `<div style="grid-column:1 / -1; color:var(--text-muted);">💬 Catatan: ${b.notes}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * TAB 2: VERIFIKASI PENGEMBALIAN ARMADA & KUNCI
   */
  renderVerificationTab() {
    if (this.pendingReturns.length === 0) {
      return `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">🔑</div>
          <h4 style="font-size:1.1rem; color:var(--text-primary); font-weight:800; margin-bottom:4px;">Tidak Ada Pengembalian yang Tertunda</h4>
          <p style="font-size:0.85rem;">Seluruh armada yang selesai digunakan telah diverifikasi dan kuncinya tersimpan dengan aman.</p>
        </div>
      `;
    }

    return `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        ${this.pendingReturns.map(t => {
          const cIn = t.checkIn || {};
          const cOut = t.checkOut || {};
          const isWaived = cOut.isBbmFilled || t.totalCost === 0;

          return `
            <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; box-shadow:var(--shadow-sm);">
              <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:1rem; border-bottom:1px solid var(--surface-border); padding-bottom:0.75rem;">
                <div>
                  <span class="badge badge-returned" style="font-size:0.75rem; margin-bottom:4px; display:inline-block;">Menunggu Verifikasi Akhir</span>
                  <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-primary);">
                    ${t.vehicleName} (${t.nomorPolisi || '-'})
                  </h4>
                  <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
                    Peminjam: <strong>${t.userName}</strong> (${t.divisi || 'Pondok'}) • 📱 ${t.noHp || '-'}
                  </div>
                </div>

                <div style="display:flex; gap:0.5rem;">
                  <button class="btn btn-primary btn-sm" onclick="AdminView.verifyReturn('${t.tripId}')" style="font-weight:700;">
                    ✓ Terima Kunci &amp; Selesaikan (Tersedia)
                  </button>
                </div>
              </div>

              <!-- Komparasi Kondisi Sebelum vs Sesudah -->
              <div class="comparison-grid">
                <div class="comparison-col">
                  <div class="comparison-title">
                    <span>🟢</span> KONDISI AWAL (CHECK-IN)
                  </div>
                  <div style="font-size:0.82rem; display:flex; flex-direction:column; gap:4px;">
                    <div>🛣️ Odometer: <strong>${(cIn.startKm || t.startKm || 0).toLocaleString('id-ID')} KM</strong></div>
                    <div>⛽ BBM: <strong>${cIn.fuelLevel || '75%'}</strong></div>
                    <div>✨ Kebersihan: <strong>${cIn.cleanliness || 'Bersih'}</strong></div>
                    <div>🛡️ Eksterior: ${cIn.exteriorCondition || 'Bagus'}</div>
                    ${cIn.damageNotes ? `<div style="color:#DC2626;">⚠️ Catatan: ${cIn.damageNotes}</div>` : ''}
                  </div>
                </div>

                <div class="comparison-col" style="background:#FEF9C3; border-color:#FDE047;">
                  <div class="comparison-title" style="color:#854D0E;">
                    <span>🏁</span> KONDISI AKHIR (CHECK-OUT)
                  </div>
                  <div style="font-size:0.82rem; display:flex; flex-direction:column; gap:4px;">
                    <div>🛣️ Odometer: <strong>${(cOut.endKm || t.endKm || 0).toLocaleString('id-ID')} KM</strong> (Jarak: <strong>${(t.distanceKm || 0).toLocaleString('id-ID')} KM</strong>)</div>
                    <div>⛽ BBM Akhir: <strong>${cOut.fuelLevel || '75%'}</strong></div>
                    <div>✨ Kebersihan: <strong>${cOut.cleanliness || 'Bersih'}</strong></div>
                    <div>🛡️ Eksterior: ${cOut.exteriorCondition || 'Baik'}</div>
                    ${cOut.damageNotes ? `<div style="color:#DC2626; font-weight:700;">⚠️ Kerusakan Baru: ${cOut.damageNotes}</div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Status Biaya & Bahan Bakar -->
              <div style="margin-top:1rem; background:var(--surface-secondary); padding:0.85rem; border-radius:10px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.75rem; font-size:0.85rem;">
                <div>
                  <div><strong>Laporan BBM:</strong> ${isWaived ? '<span class="badge badge-available">✓ Diisi Bahan Bakar (Bebas Biaya)</span>' : '<span class="badge badge-pending">Tidak Mengisi BBM</span>'}</div>
                  ${cOut.bbmCost ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Nominal Struk BBM: Rp${Number(cOut.bbmCost).toLocaleString('id-ID')}</div>` : ''}
                </div>

                <div style="text-align:right;">
                  <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total Biaya Pemakaian:</div>
                  <div style="font-size:1.15rem; font-weight:800; color:${isWaived ? '#10B981' : 'var(--primary-700)'};">
                    ${isWaived ? 'Rp 0 (BEBAS BIAYA)' : `Rp${(t.totalCost || 0).toLocaleString('id-ID')}`}
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Metode: ${cOut.paymentMethod || 'TUNAI'}</div>
                </div>
              </div>

              <!-- Foto Struk BBM atau Bukti Transfer jika ada -->
              ${(cOut.bbmReceiptUrl || cOut.transferProofUrl) ? `
                <div style="margin-top:0.75rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
                  ${cOut.bbmReceiptUrl ? `
                    <div>
                      <span style="font-size:0.75rem; font-weight:700;">Bukti Struk BBM:</span>
                      <img src="${cOut.bbmReceiptUrl}" style="height:80px; border-radius:6px; display:block; margin-top:2px; cursor:pointer;" onclick="window.open(this.src)">
                    </div>
                  ` : ''}
                  ${cOut.transferProofUrl ? `
                    <div>
                      <span style="font-size:0.75rem; font-weight:700;">Bukti Transfer Bank:</span>
                      <img src="${cOut.transferProofUrl}" style="height:80px; border-radius:6px; display:block; margin-top:2px; cursor:pointer;" onclick="window.open(this.src)">
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * TAB 3: MANAJEMEN ARMADA & TARIF
   */
  renderFleetAndSettingsTab() {
    const currentTariff = Number(Store.data.settings?.DEFAULT_TARIFF) || 1000;

    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.25rem;">
        <!-- Atur Tarif per KM -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
          <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
            <span>💰</span> Atur Tarif Pemakaian per KM
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">
            Tarif ini digunakan untuk menghitung biaya peminjaman jika peminjam tidak mengisi bahan bakar sendiri.
          </p>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <input type="number" id="inputSettingTariff" class="form-control" value="${currentTariff}" style="font-size:1.1rem; font-weight:800; color:var(--primary-700);">
            <button class="btn btn-primary" onclick="AdminView.saveTariff()">Simpan</button>
          </div>
        </div>

        <!-- Tambah Armada Baru -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
          <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
            <span>➕</span> Tambah Armada Baru
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">
            Daftarkan motor operasional atau mobil dinas baru ke dalam sistem pesantren.
          </p>
          <button class="btn btn-gold btn-block" onclick="UI.openModal('modalAddVehicle')" style="font-weight:700;">
            + Tambah Kendaraan Baru
          </button>
        </div>
      </div>
    `;
  },

  async approveBooking(bookingId) {
    const res = await Api.request('approveBooking', 'POST', { bookingId });
    if (res.success) {
      UI.showToast('Alhamdulillah, permohonan peminjaman berhasil disetujui!', 'success');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menyetujui permohonan.', 'error');
    }
  },

  async rejectBooking(bookingId) {
    const reason = prompt('Masukkan alasan penolakan (opsional):', 'Jadwal bentrok / Armada sedang diperlukan dinas mendesak');
    if (reason === null) return;

    const res = await Api.request('rejectBooking', 'POST', { bookingId, reason });
    if (res.success) {
      UI.showToast('Pengajuan peminjaman telah ditolak.', 'info');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menolak permohonan.', 'error');
    }
  },

  async verifyReturn(tripId) {
    const res = await Api.request('verifyReturnTrip', 'POST', { tripId });
    if (res.success) {
      UI.showToast('Alhamdulillah, verifikasi pengembalian selesai! Armada kembali berstatus TERSEDIA.', 'success');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal memverifikasi pengembalian.', 'error');
    }
  },

  async saveTariff() {
    const newRate = document.getElementById('inputSettingTariff')?.value;
    if (!newRate || Number(newRate) < 0) {
      UI.showToast('Harap masukkan tarif yang valid.', 'error');
      return;
    }
    const res = await Api.request('updateTariff', 'POST', { newRate });
    if (res.success) {
      UI.showToast(res.message, 'success');
      this.load();
    }
  },

  async submitAddVehicle(e) {
    if (e) e.preventDefault();
    const jenis = document.getElementById('addVehicleJenis').value;
    const merk = document.getElementById('addVehicleMerk').value.trim();
    const model = document.getElementById('addVehicleModel').value.trim();
    const nomor_polisi = document.getElementById('addVehicleNopol').value.trim();
    const current_km = document.getElementById('addVehicleKm').value;
    const imageUrl = document.getElementById('addVehicleImageUrl')?.value.trim();
    const oil_interval_km = document.getElementById('addVehicleOilInterval').value;
    const tuneup_interval_km = document.getElementById('addVehicleTuneupInterval').value;
    const notes = document.getElementById('addVehicleNotes').value.trim();

    const res = await Api.request('addVehicle', 'POST', {
      jenis,
      merk,
      model,
      nomor_polisi,
      current_km,
      imageUrl,
      oil_interval_km,
      tuneup_interval_km,
      notes
    });

    if (res.success) {
      UI.closeModal('modalAddVehicle');
      UI.showToast('Armada baru berhasil didaftarkan!', 'success');
      document.getElementById('formAddVehicle').reset();
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menambahkan kendaraan.', 'error');
    }
  }
};
