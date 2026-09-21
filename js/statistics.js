/**
 * MAISYA-TRANS - Statistics & Analytics Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const StatisticsView = {
  stats: null,
  activeTab: 'count', // 'count' | 'km' | 'cost'

  async load() {
    const res = await Api.request('getStatistics', 'GET');
    if (res.success && res.data) {
      this.stats = res.data;
      this.render();
    }
  },

  render() {
    const container = document.getElementById('statisticsContentContainer');
    if (!container || !this.stats) return;

    const { kpi, rankings } = this.stats;

    container.innerHTML = `
      <!-- KPI Stats Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:var(--primary-50); color:var(--primary-700);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${kpi.totalVehicles}</span>
            <span class="kpi-label">Total Armada</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:#FEE2E2; color:#DC2626;">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${kpi.countInUse}</span>
            <span class="kpi-label">Sedang Digunakan</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:var(--gold-50); color:var(--gold-700);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">${(kpi.totalKmMonth || 0).toLocaleString('id-ID')} KM</span>
            <span class="kpi-label">Total Jarak Tempuh</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background:var(--primary-100); color:var(--primary-800);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">Rp${(kpi.totalCostMonth || 0).toLocaleString('id-ID')}</span>
            <span class="kpi-label">Total Biaya Pemakaian</span>
          </div>
        </div>
      </div>

      <!-- Ranking Pengguna Terbanyak Menggunakan Kendaraan -->
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.5rem; margin-bottom:1.5rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1.25rem;">
          <div>
            <h3 style="font-size:1.1rem; display:flex; align-items:center; gap:8px;">
              <span>🏆</span> Peringkat Pengguna Teraktif
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
              Statistik pemanfaatan armada pondok berdasarkan berbagai parameter
            </p>
          </div>

          <!-- Tab Selection: Frekuensi, Kilometer, Biaya -->
          <div style="display:flex; gap:6px; background:var(--surface-secondary); padding:4px; border-radius:var(--border-radius-md);">
            <button class="btn btn-sm ${this.activeTab === 'count' ? 'btn-primary' : 'btn-outline'}" 
                    style="border:none;" onclick="StatisticsView.switchRankingTab('count')">
              Frekuensi
            </button>
            <button class="btn btn-sm ${this.activeTab === 'km' ? 'btn-primary' : 'btn-outline'}" 
                    style="border:none;" onclick="StatisticsView.switchRankingTab('km')">
              Kilometer
            </button>
            <button class="btn btn-sm ${this.activeTab === 'cost' ? 'btn-primary' : 'btn-outline'}" 
                    style="border:none;" onclick="StatisticsView.switchRankingTab('cost')">
              Biaya
            </button>
          </div>
        </div>

        <div id="rankingListContainer">
          ${this.renderRankingList()}
        </div>
      </div>
    `;
  },

  switchRankingTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  renderRankingList() {
    if (!this.stats || !this.stats.rankings) return '';

    let list = [];
    let metricLabel = '';
    
    if (this.activeTab === 'count') {
      list = this.stats.rankings.topByCount || [];
      metricLabel = 'kali pemakaian';
    } else if (this.activeTab === 'km') {
      list = this.stats.rankings.topByKm || [];
      metricLabel = 'KM';
    } else {
      list = this.stats.rankings.topByCost || [];
      metricLabel = '';
    }

    if (list.length === 0) {
      return '<div style="color:var(--text-muted); font-size:0.85rem; padding:1rem 0;">Belum ada data pemakaian untuk peringkat ini.</div>';
    }

    const maxVal = Math.max(...list.map(u => {
      if (this.activeTab === 'count') return u.tripCount;
      if (this.activeTab === 'km') return u.totalKm;
      return u.totalCost;
    })) || 1;

    return `
      <div style="display:flex; flex-direction:column; gap:0.85rem;">
        ${list.map((u, idx) => {
          let val = 0;
          let formattedVal = '';
          if (this.activeTab === 'count') {
            val = u.tripCount;
            formattedVal = `${u.tripCount} kali`;
          } else if (this.activeTab === 'km') {
            val = u.totalKm;
            formattedVal = `${u.totalKm.toLocaleString('id-ID')} KM`;
          } else {
            val = u.totalCost;
            formattedVal = `Rp${u.totalCost.toLocaleString('id-ID')}`;
          }

          const percent = Math.min(100, Math.round((val / maxVal) * 100));

          return `
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; margin-bottom:4px;">
                <span style="font-weight:700; display:flex; align-items:center; gap:8px;">
                  <span style="width:22px; height:22px; border-radius:50%; background:${idx === 0 ? '#FCD34D' : (idx === 1 ? '#E2E8F0' : '#FEF3C7')}; color:#0F172A; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800;">
                    ${idx + 1}
                  </span>
                  ${u.userName}
                </span>
                <span style="font-weight:800; color:var(--primary-700);">${formattedVal}</span>
              </div>
              <div style="height:8px; background:var(--surface-secondary); border-radius:99px; overflow:hidden;">
                <div style="height:100%; width:${percent}%; background:linear-gradient(90deg, var(--primary-700), var(--gold-500)); border-radius:99px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
};
