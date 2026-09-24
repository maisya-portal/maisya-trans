/**
 * MAISYA-TRANS - Trip History & Log Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const HistoryView = {
  trips: [],
  filterType: 'ALL',

  load() {
    // 1. Render data lokal instan (0ms - tanpa menunggu jaringan)
    const localRes = Api.getMockDataSync('getTrips', {}, Auth.getUser());
    this.trips = (localRes && localRes.data) || Store.data.trips || [];
    this.render();

    // 2. Background Revalidation jika remote API tersedia
    Api.request('getTrips', 'GET', {}, false).then(res => {
      if (res && res.success && res.data) {
        this.trips = res.data;
        this.render();
      }
    }).catch(() => {});
  },

  render() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    let filtered = this.trips.filter(t => {
      if (this.filterType !== 'ALL' && t.jenis !== this.filterType) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background:var(--surface); border-radius:var(--border-radius-lg); border:1px solid var(--surface-border);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">Belum Ada Riwayat Pemakaian</div>
          <p style="font-size: 0.85rem; margin-top: 4px;">Riwayat peminjaman kendaraan pesantren akan tercatat otomatis di sini.</p>
        </div>
      `;
      return;
    }

    const isAdmin = Auth.isAdmin();

    container.innerHTML = filtered.map(t => {
      const cIn = t.checkIn || {};
      const cOut = t.checkOut || {};
      const isWaived = cOut.isBbmFilled || t.totalCost === 0;
      const rate = t.ratePerKm || (t.jenis === 'MOBIL' ? Store.getTariff('MOBIL') : Store.getTariff('MOTOR'));
      
      // Invoice resolution
      const inv = (Store.data.invoices || []).find(i => i.invoiceId === t.invoiceId || (i.tripIds && i.tripIds.includes(t.tripId)));
      let billingBadge = '';
      if (isWaived) {
        billingBadge = '<span class="badge badge-available" style="font-size:0.75rem;">⛽ BBM Diisi Sendiri</span>';
      } else if (t.isPaid || (inv && inv.status === 'PAID')) {
        billingBadge = '<span class="badge badge-available" style="font-size:0.75rem;">✓ Lunas</span>';
      } else if (inv) {
        billingBadge = `<span class="badge badge-pending" style="font-size:0.75rem;">📄 Tagihan: ${inv.invoiceNumber}</span>`;
      } else {
        billingBadge = '<span class="badge" style="background:#FEF3C7; color:#92400E; font-size:0.75rem;">⏳ Belum Ditagihkan</span>';
      }

      return `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:1.25rem; margin-bottom:1rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">${t.vehicleName}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                ${t.jenis === 'MOTOR' ? '🏍️ Sepeda Motor' : '🚗 Mobil Operasional'} • <span style="font-family:monospace; font-weight:700; background:var(--surface-secondary); padding:1px 6px; border-radius:4px;">${t.nomorPolisi}</span> • Tarif: <strong>Rp${rate.toLocaleString('id-ID')}/KM</strong>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:1.15rem; color:${isWaived ? '#10B981' : 'var(--primary-700)'};">
                ${isWaived ? 'Rp 0 (BEBAS BIAYA)' : `Rp${(t.totalCost || 0).toLocaleString('id-ID')}`}
              </div>
              <div style="display:flex; gap:4px; justify-content:flex-end; margin-top:2px; flex-wrap:wrap;">
                <span class="badge ${t.status === 'FINISHED' ? 'badge-available' : (t.status === 'PENDING_VERIFICATION' ? 'badge-returned' : 'badge-in-use')}">
                  ${t.status === 'FINISHED' ? '✓ Selesai' : (t.status === 'PENDING_VERIFICATION' ? 'Menunggu Verifikasi' : '🔴 Sedang Berjalan')}
                </span>
                ${billingBadge}
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:0.6rem; background:var(--surface-secondary); border-radius:8px; padding:0.85rem; margin:0.75rem 0; font-size:0.8rem;">
            <div>
              <span style="color:var(--text-muted);">Peminjam:</span><br>
              <strong>👤 ${t.userName}</strong> (${t.divisi || 'Pesantren'})
            </div>
            <div>
              <span style="color:var(--text-muted);">Waktu Mulai:</span><br>
              <strong>📅 ${new Date(t.startTime).toLocaleDateString('id-ID', { day:'numeric', month:'short' })} • ${new Date(t.startTime).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Jarak Tempuh:</span><br>
              <strong>🛣️ ${t.distanceKm || 0} KM</strong> (${(t.startKm || 0).toLocaleString('id-ID')} → ${(t.endKm || t.startKm || 0).toLocaleString('id-ID')})
            </div>
            <div>
              <span style="color:var(--text-muted);">Biaya &amp; Tarif:</span><br>
              <strong>${isWaived ? '⛽ Diisi Sendiri (Rp 0)' : `${t.distanceKm || 0} KM × Rp${rate.toLocaleString('id-ID')}`}</strong>
            </div>
          </div>

          <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
            <div>📍 <strong>Tujuan / Keperluan:</strong> ${t.tujuan || t.purpose}</div>
            ${cIn.cleanliness ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">✨ Kondisi: Check-In (${cIn.cleanliness}, BBM ${cIn.fuelLevel || '-'}) → Check-Out (${cOut.cleanliness || '-'}, BBM ${cOut.fuelLevel || '-'})</div>` : ''}
          </div>

          ${t.damageNotes || cOut.damageNotes ? `
            <div style="margin-top:0.5rem; font-size:0.78rem; background:#FEE2E2; color:#991B1B; padding:6px 10px; border-radius:6px;">
              ⚠️ <strong>Laporan Kendala / Kerusakan:</strong> ${t.damageNotes || cOut.damageNotes}
            </div>
          ` : ''}

          ${isAdmin ? `
            <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:0.75rem; border-top:1px dashed var(--surface-border); padding-top:0.6rem;">
              <button type="button" class="btn btn-sm btn-outline" style="font-size:0.75rem;" onclick="HistoryView.openEditModal('${t.tripId}')">
                ✏️ Edit Riwayat &amp; Biaya
              </button>
              <button type="button" class="btn btn-sm btn-outline" style="font-size:0.75rem; color:#DC2626; border-color:#FCA5A5;" onclick="HistoryView.deleteTrip('${t.tripId}')">
                🗑️ Hapus
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  setFilter(type) {
    this.filterType = type;
    this.render();
  },

  /**
   * Modal Edit Riwayat & Rekap Biaya (Admin Only)
   */
  openEditModal(tripId) {
    if (!Auth.isAdmin()) {
      UI.showToast('Fitur ini hanya dapat diakses oleh Admin Sarpras.', 'warning');
      return;
    }

    const trip = Store.data.trips.find(t => t.tripId === tripId);
    if (!trip) {
      UI.showToast('Data riwayat perjalanan tidak ditemukan.', 'error');
      return;
    }

    document.getElementById('editTripId').value = trip.tripId;
    document.getElementById('editTripUserName').value = trip.userName || '';
    document.getElementById('editTripDivisi').value = trip.divisi || '';
    document.getElementById('editTripNoHp').value = trip.noHp || '';
    document.getElementById('editTripVehicleTitle').textContent = `${trip.vehicleName} (${trip.nomorPolisi})`;
    document.getElementById('editTripPurpose').value = trip.tujuan || trip.purpose || '';
    
    document.getElementById('editTripStartKm').value = trip.startKm || 0;
    document.getElementById('editTripEndKm').value = trip.endKm || trip.startKm || 0;
    document.getElementById('editTripRatePerKm').value = trip.ratePerKm || (trip.jenis === 'MOBIL' ? Store.getTariff('MOBIL') : Store.getTariff('MOTOR'));
    
    const isWaived = trip.checkOut?.isBbmFilled || trip.totalCost === 0;
    document.getElementById('editTripBbmWaived').checked = isWaived;
    document.getElementById('editTripStatus').value = trip.status || 'FINISHED';
    document.getElementById('editTripIsPaid').checked = Boolean(trip.isPaid);
    document.getElementById('editTripDamageNotes').value = trip.damageNotes || trip.checkOut?.damageNotes || '';

    this.recalculateEditModal();
    UI.openModal('modalEditTrip');
  },

  recalculateEditModal() {
    const startKm = Number(document.getElementById('editTripStartKm').value) || 0;
    const endKm = Number(document.getElementById('editTripEndKm').value) || 0;
    const ratePerKm = Number(document.getElementById('editTripRatePerKm').value) || 0;
    const isWaived = document.getElementById('editTripBbmWaived').checked;

    const distance = Math.max(0, endKm - startKm);
    const totalCost = isWaived ? 0 : (distance * ratePerKm);

    const distEl = document.getElementById('editTripCalcDistance');
    const costEl = document.getElementById('editTripCalcCost');
    if (distEl) distEl.textContent = `${distance.toLocaleString('id-ID')} KM`;
    if (costEl) costEl.textContent = isWaived ? 'Rp 0 (BBM Diisi Sendiri)' : `Rp${totalCost.toLocaleString('id-ID')}`;
  },

  async submitEditTrip(e) {
    if (e) e.preventDefault();

    const tripId = document.getElementById('editTripId').value;
    const userName = document.getElementById('editTripUserName').value.trim();
    const divisi = document.getElementById('editTripDivisi').value.trim();
    const noHp = document.getElementById('editTripNoHp').value.trim();
    const tujuan = document.getElementById('editTripPurpose').value.trim();
    const startKm = Number(document.getElementById('editTripStartKm').value) || 0;
    const endKm = Number(document.getElementById('editTripEndKm').value) || 0;
    const ratePerKm = Number(document.getElementById('editTripRatePerKm').value) || 0;
    const isBbmFilled = document.getElementById('editTripBbmWaived').checked;
    const status = document.getElementById('editTripStatus').value;
    const isPaid = document.getElementById('editTripIsPaid').checked;
    const damageNotes = document.getElementById('editTripDamageNotes').value.trim();

    if (endKm < startKm) {
      UI.showToast(`KM Akhir (${endKm}) tidak boleh lebih kecil dari KM awal (${startKm}).`, 'error');
      return;
    }

    try {
      UI.showLoading('Menyimpan perubahan riwayat trip...');
      const res = await Api.request('updateTrip', 'POST', {
        tripId,
        userName,
        divisi,
        noHp,
        tujuan,
        purpose: tujuan,
        startKm,
        endKm,
        ratePerKm,
        isBbmFilled,
        status,
        isPaid,
        damageNotes
      });
      UI.hideLoading();

      if (res.success) {
        UI.closeModal('modalEditTrip');
        UI.showToast('Alhamdulillah, data riwayat dan rekap biaya berhasil diperbarui!', 'success');
        this.load();
        DashboardView.load();
        if (typeof AdminView !== 'undefined') AdminView.load();
      } else {
        UI.showToast(res.message || 'Gagal memperbarui riwayat perjalanan.', 'error');
      }
    } catch (err) {
      UI.hideLoading();
      UI.showToast('Terjadi kesalahan koneksi.', 'error');
    }
  },

  async deleteTrip(tripId) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS riwayat peminjaman ini secara permanen?')) return;

    try {
      UI.showLoading('Menghapus data riwayat...');
      const res = await Api.request('deleteTrip', 'POST', { tripId });
      UI.hideLoading();

      if (res.success) {
        UI.showToast('Riwayat peminjaman berhasil dihapus.', 'success');
        this.load();
        DashboardView.load();
        if (typeof AdminView !== 'undefined') AdminView.load();
      } else {
        UI.showToast(res.message || 'Gagal menghapus riwayat.', 'error');
      }
    } catch (err) {
      UI.hideLoading();
      UI.showToast('Terjadi kesalahan koneksi.', 'error');
    }
  }
};
