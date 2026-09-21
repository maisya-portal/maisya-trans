/**
 * MAISYA-TRANS - Trip History & Log Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const HistoryView = {
  trips: [],
  filterType: 'ALL',
  filterTime: 'ALL',

  async load() {
    const res = await Api.request('getHistory', 'GET');
    if (res.success && res.data) {
      this.trips = res.data;
      this.render();
    }
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
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">Belum Ada Riwayat Pemakaian</div>
          <p style="font-size: 0.85rem; margin-top: 4px;">Riwayat pemakaian kendaraan pondok akan tercatat otomatis di sini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => `
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:1rem; margin-bottom:0.85rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700; font-size:1rem; color:var(--text-primary);">${t.vehicleName}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              ${t.jenis} • <span style="font-family:monospace; font-weight:700; background:var(--surface-secondary); padding:1px 6px; border-radius:4px;">${t.nomorPolisi}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; font-size:1.1rem; color:var(--primary-700);">
              Rp${(t.totalCost || 0).toLocaleString('id-ID')}
            </div>
            <span class="badge ${t.status === 'FINISHED' ? 'badge-available' : 'badge-in-use'}">
              ${t.status === 'FINISHED' ? 'Selesai' : 'Sedang Aktif'}
            </span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.5rem; background:var(--surface-secondary); border-radius:8px; padding:0.75rem; margin:0.75rem 0; font-size:0.8rem;">
          <div>
            <span style="color:var(--text-muted);">Pengemudi:</span><br>
            <strong>${t.userName}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);">Tanggal:</span><br>
            <strong>${Utils.formatDateTime(t.startTime)}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);">Jarak Tempuh:</span><br>
            <strong>${t.distanceKm} KM</strong> (${t.startKm.toLocaleString('id-ID')} → ${(t.endKm || t.startKm).toLocaleString('id-ID')})
          </div>
          <div>
            <span style="color:var(--text-muted);">Tarif per KM:</span><br>
            <strong>Rp${(t.ratePerKm || 1000).toLocaleString('id-ID')}</strong>
          </div>
        </div>

        <div style="font-size:0.82rem; color:var(--text-secondary);">
          <strong>Keperluan:</strong> ${t.purpose}
        </div>

        ${t.damageNotes ? `
          <div style="margin-top:0.5rem; font-size:0.78rem; background:#FEE2E2; color:#991B1B; padding:6px 10px; border-radius:6px;">
            ⚠️ <strong>Catatan Kerusakan:</strong> ${t.damageNotes}
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  setFilter(type) {
    this.filterType = type;
    this.render();
  }
};
