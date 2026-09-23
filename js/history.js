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

    container.innerHTML = filtered.map(t => {
      const cIn = t.checkIn || {};
      const cOut = t.checkOut || {};
      const isWaived = cOut.isBbmFilled || t.totalCost === 0;

      return `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:1.25rem; margin-bottom:1rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">${t.vehicleName}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                ${t.jenis === 'MOTOR' ? '🏍️ Motor' : '🚗 Mobil'} • <span style="font-family:monospace; font-weight:700; background:var(--surface-secondary); padding:1px 6px; border-radius:4px;">${t.nomorPolisi}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:1.15rem; color:${isWaived ? '#10B981' : 'var(--primary-700)'};">
                ${isWaived ? 'Rp 0 (BEBAS BIAYA)' : `Rp${(t.totalCost || 0).toLocaleString('id-ID')}`}
              </div>
              <span class="badge ${t.status === 'FINISHED' ? 'badge-available' : (t.status === 'PENDING_VERIFICATION' ? 'badge-returned' : 'badge-in-use')}">
                ${t.status === 'FINISHED' ? '✓ Selesai & Terverifikasi' : (t.status === 'PENDING_VERIFICATION' ? 'Menunggu Verifikasi Admin' : '🔴 Sedang Berjalan')}
              </span>
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
              <span style="color:var(--text-muted);">Laporan BBM:</span><br>
              <strong>${isWaived ? '⛽ Diisi Sendiri (Gratis)' : `💵 Bayar (${cOut.paymentMethod || 'TUNAI'})`}</strong>
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
        </div>
      `;
    }).join('');
  },

  setFilter(type) {
    this.filterType = type;
    this.render();
  }
};
