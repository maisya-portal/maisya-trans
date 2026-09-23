/**
 * MAISYA-TRANS - Maintenance & Service Monitoring Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const MaintenanceView = {
  maintenanceList: [],
  vehicles: [],

  load() {
    // 1. Render data lokal instan (0ms)
    const localRes = Api.getMockDataSync('getMaintenanceDashboard', {}, Auth.getUser());
    if (localRes && localRes.success && localRes.data) {
      this.maintenanceList = localRes.data.maintenance || [];
      this.vehicles = localRes.data.vehicles || [];
      this.renderHealthSummary();
      this.renderMaintenanceHistory();
    }

    // 2. Background Revalidation
    Api.request('getMaintenanceDashboard', 'GET', {}, false).then(res => {
      if (res && res.success && res.data) {
        this.maintenanceList = res.data.maintenance || [];
        this.vehicles = res.data.vehicles || [];
        this.renderHealthSummary();
        this.renderMaintenanceHistory();
      }
    }).catch(() => {});
  },

  renderHealthSummary() {
    const container = document.getElementById('maintenanceHealthContainer');
    if (!container) return;

    container.innerHTML = this.vehicles.map(v => `
      <div class="monitor-card" style="border-top: 4px solid ${v.health === 'DANGER' ? '#EF4444' : (v.health === 'WARNING' ? '#F59E0B' : '#10B981')};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700; font-size:1rem;">${v.merk} ${v.model}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${v.jenis} • ${v.nomorPolisi}</div>
          </div>
          <span class="badge ${v.health === 'DANGER' ? 'badge-in-use' : (v.health === 'WARNING' ? 'badge-maintenance' : 'badge-available')}">
            ${v.healthLabel}
          </span>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem; font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; background:var(--surface-secondary); padding:6px 10px; border-radius:6px;">
            <span>🛢️ Ganti Oli:</span>
            <strong style="color:${v.oilStatus === 'OVERDUE' ? '#EF4444' : (v.oilStatus === 'WARNING' ? '#B45309' : 'inherit')}">
              ${v.oilStatusText}
            </strong>
          </div>
          <div style="display:flex; justify-content:space-between; background:var(--surface-secondary); padding:6px 10px; border-radius:6px;">
            <span>🔧 Tune-up & Servis:</span>
            <strong style="color:${v.tuneupStatus === 'OVERDUE' ? '#EF4444' : (v.tuneupStatus === 'WARNING' ? '#B45309' : 'inherit')}">
              ${v.tuneupStatusText}
            </strong>
          </div>
        </div>

        <div style="margin-top:0.85rem; display:flex; gap:0.5rem;">
          ${Auth.isAdmin() ? `
            <button class="btn btn-primary btn-sm btn-block" onclick="MaintenanceView.openAddModal('${v.vehicleId}')">
              + Catat Servis
            </button>
            <button class="btn btn-outline btn-sm" onclick="MaintenanceView.toggleStatus('${v.vehicleId}', ${v.status !== 'MAINTENANCE'})">
              ${v.status === 'MAINTENANCE' ? 'Set Aktif' : 'Bengkel'}
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  renderMaintenanceHistory() {
    const tableBody = document.getElementById('maintenanceHistoryTableBody');
    if (!tableBody) return;

    if (this.maintenanceList.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Belum ada riwayat pemeliharaan.</td></tr>';
      return;
    }

    tableBody.innerHTML = this.maintenanceList.map(m => `
      <tr>
        <td style="font-weight:600;">${Utils.formatDate(m.date)}</td>
        <td><strong>${m.vehicleName}</strong> (${m.nomorPolisi})</td>
        <td><span class="badge badge-maintenance">${m.type}</span></td>
        <td>${m.km.toLocaleString('id-ID')} KM</td>
        <td>${m.description}</td>
        <td style="font-weight:700;">Rp${(m.cost || 0).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');
  },

  openAddModal(vehicleId) {
    const v = this.vehicles.find(x => x.vehicleId === vehicleId);
    if (!v) return;

    document.getElementById('mVehicleSelect').value = vehicleId;
    document.getElementById('mKmInput').value = v.currentKm;
    document.getElementById('mDateInput').value = new Date().toISOString().substring(0, 10);
    UI.openModal('modalAddMaintenance');
  },

  async submitMaintenance(e) {
    e.preventDefault();
    const vehicleId = document.getElementById('mVehicleSelect').value;
    const type = document.getElementById('mTypeSelect').value;
    const date = document.getElementById('mDateInput').value;
    const km = document.getElementById('mKmInput').value;
    const cost = document.getElementById('mCostInput').value;
    const desc = document.getElementById('mDescInput').value;

    const res = await Api.request('createMaintenance', 'POST', {
      vehicleId,
      type,
      date,
      km,
      cost,
      description: desc
    });

    if (res.success) {
      UI.showToast(res.message, 'success');
      UI.closeModal('modalAddMaintenance');
      this.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  },

  async toggleStatus(vehicleId, isMaintenance) {
    const reason = isMaintenance ? prompt('Masukkan alasan perbaikan/servis:') : '';
    const res = await Api.request('setVehicleMaintenance', 'POST', {
      vehicleId,
      isMaintenance,
      reason
    });

    if (res.success) {
      UI.showToast(res.message, 'success');
      this.load();
    } else {
      UI.showToast(res.message, 'error');
    }
  }
};
