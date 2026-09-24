/**
 * MAISYA-TRANS - Approvals Management Controller (Daftar Pengajuan)
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const ApprovalsView = {
  bookings: [],
  filterStatus: 'ALL',
  searchQuery: '',

  load() {
    if (!Auth.isAdmin()) {
      UI.switchView('login');
      return;
    }

    // 1. Render data lokal instan (0ms)
    const localRes = Api.getMockDataSync('getBookings', {}, Auth.getUser());
    this.bookings = (localRes && localRes.data) || Store.data.bookings || [];
    
    // Default filter ke PENDING jika ada yang pending, jika tidak ALL
    const pendingCount = this.bookings.filter(b => b.status === 'PENDING').length;
    if (this.filterStatus === 'ALL' && pendingCount > 0) {
      this.filterStatus = 'PENDING';
    }
    
    this.render();
    this.updateBadge();

    // 2. Background Revalidation jika remote API tersedia
    Api.request('getBookings', 'GET', {}, false).then(res => {
      if (res && res.success && res.data) {
        this.bookings = res.data;
        this.render();
        this.updateBadge();
      }
    }).catch(() => {});
  },

  updateBadge() {
    const pendingCount = (this.bookings || Store.data.bookings || []).filter(b => b.status === 'PENDING').length;
    const badge = document.getElementById('sidebarPendingBadge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  setFilter(status) {
    this.filterStatus = status;
    this.render();
  },

  setSearch(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.render();
  },

  render() {
    const container = document.getElementById('approvalsListContainer');
    const countsEl = document.getElementById('approvalsCountSummary');
    if (!container) return;

    const all = this.bookings || [];
    const pendingList = all.filter(b => b.status === 'PENDING');
    const approvedList = all.filter(b => b.status === 'APPROVED');
    const rejectedList = all.filter(b => b.status === 'REJECTED');

    if (countsEl) {
      countsEl.innerHTML = `
        <div class="kpi-grid" style="margin-bottom:1.25rem;">
          <div class="kpi-card" style="border-left:4px solid #F59E0B; cursor:pointer;" onclick="ApprovalsView.setFilter('PENDING')">
            <div class="kpi-icon-wrap" style="background:#FEF3C7; color:#D97706;">⏳</div>
            <div class="kpi-meta">
              <span class="kpi-value">${pendingList.length}</span>
              <span class="kpi-label">Menunggu Persetujuan</span>
            </div>
          </div>
          <div class="kpi-card" style="border-left:4px solid #10B981; cursor:pointer;" onclick="ApprovalsView.setFilter('APPROVED')">
            <div class="kpi-icon-wrap" style="background:#D1FAE5; color:#059669;">✓</div>
            <div class="kpi-meta">
              <span class="kpi-value">${approvedList.length}</span>
              <span class="kpi-label">Telah Disetujui</span>
            </div>
          </div>
          <div class="kpi-card" style="border-left:4px solid #EF4444; cursor:pointer;" onclick="ApprovalsView.setFilter('REJECTED')">
            <div class="kpi-icon-wrap" style="background:#FEE2E2; color:#DC2626;">✕</div>
            <div class="kpi-meta">
              <span class="kpi-value">${rejectedList.length}</span>
              <span class="kpi-label">Ditolak</span>
            </div>
          </div>
          <div class="kpi-card" style="border-left:4px solid var(--primary-600); cursor:pointer;" onclick="ApprovalsView.setFilter('ALL')">
            <div class="kpi-icon-wrap" style="background:var(--primary-50); color:var(--primary-700);">📑</div>
            <div class="kpi-meta">
              <span class="kpi-value">${all.length}</span>
              <span class="kpi-label">Semua Permohonan</span>
            </div>
          </div>
        </div>
      `;
    }

    let filtered = all.filter(b => {
      if (this.filterStatus !== 'ALL' && b.status !== this.filterStatus) return false;
      if (this.searchQuery) {
        const text = `${b.userName} ${b.divisi} ${b.vehicleName} ${b.nomorPolisi} ${b.purpose} ${b.tujuan} ${b.noHp}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }
      return true;
    });

    // Urutkan: PENDING paling atas, lalu tanggal terbaru
    filtered.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">📋</div>
          <h4 style="font-size:1.1rem; color:var(--text-primary); font-weight:800; margin-bottom:4px;">Tidak Ada Pengajuan Ditemukan</h4>
          <p style="font-size:0.85rem;">Tidak ada permohonan pinjam kendaraan dengan filter atau pencarian saat ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(b => {
      const v = Store.data.vehicles.find(x => x.vehicleId === b.vehicleId) || {};
      const plate = b.nomorPolisi || v.nomorPolisi || '-';
      const vehName = b.vehicleName || `${v.merk || ''} ${v.model || ''}`.trim() || 'Kendaraan Pondok';
      const cleanPhone = (b.noHp || '').replace(/[^0-9]/g, '');
      const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : (cleanPhone.startsWith('62') ? cleanPhone : '6281234567890');
      
      let statusBadge = '';
      if (b.status === 'PENDING') {
        statusBadge = '<span class="badge badge-pending" style="font-size:0.8rem; padding:4px 10px;">⏳ Menunggu Persetujuan</span>';
      } else if (b.status === 'APPROVED') {
        statusBadge = '<span class="badge badge-approved" style="font-size:0.8rem; padding:4px 10px;">✓ Disetujui</span>';
      } else if (b.status === 'REJECTED') {
        statusBadge = '<span class="badge" style="background:#FEE2E2; color:#DC2626; font-size:0.8rem; padding:4px 10px;">✕ Ditolak</span>';
      } else if (b.status === 'IN_USE') {
        statusBadge = '<span class="badge badge-in-use" style="font-size:0.8rem; padding:4px 10px;">🔴 Sedang Digunakan</span>';
      } else {
        statusBadge = '<span class="badge badge-available" style="font-size:0.8rem; padding:4px 10px;">✓ Selesai</span>';
      }

      const waMsg = encodeURIComponent(
        `Assalamu'alaikum Wr. Wb. Ustadz/Ustadzah *${b.userName}* (${b.divisi}),\n\n` +
        `Mengenai pengajuan peminjaman kendaraan *${vehName} (${plate})* untuk tanggal *${b.tanggal}* (${b.startTime} - ${b.estimatedEndTime}):\n` +
        (b.status === 'APPROVED' 
          ? `✓ *Pengajuan Anda TELAH DISETUJUI.* Silakan ambil kunci fisik di kantor Sarpras dan lakukan Check-In di aplikasi Maisya-Trans saat akan berangkat.\n\nSyukron jazakumullah khairan.`
          : (b.status === 'REJECTED'
            ? `✕ Mohon maaf, permohonan peminjaman *belum dapat disetujui*. Alasan: ${b.rejectReason || 'Armada digunakan keperluan dinas pondok lainnya'}.\n\nSyukron.`
            : `Status permohonan Anda sedang kami tinjau di sistem Sarpras Pondok Pesantren Imam Syafi'i Brebes.\n\nSyukron.`))
      );
      const waUrl = `https://wa.me/${waPhone}?text=${waMsg}`;

      return `
        <div style="background:var(--surface); border:1px solid ${b.status === 'PENDING' ? '#F59E0B' : 'var(--surface-border)'}; border-radius:var(--border-radius-md); padding:1.25rem; margin-bottom:1rem; box-shadow:var(--shadow-sm); position:relative;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong style="font-size:1.05rem; color:var(--text-primary);">${b.userName}</strong>
                <span style="font-size:0.8rem; background:var(--surface-secondary); padding:2px 8px; border-radius:4px; font-weight:600; color:var(--primary-700);">
                  ${b.divisi || 'Pesantren'}
                </span>
                ${b.noHp ? `<span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">📞 ${b.noHp}</span>` : ''}
              </div>
              <div style="font-size:0.88rem; font-weight:700; color:var(--primary-700); margin-top:3px;">
                ${b.jenis === 'MOTOR' ? '🏍️' : '🚗'} ${vehName} <span style="font-family:monospace; background:var(--surface-secondary); padding:1px 6px; border-radius:4px; font-size:0.8rem;">${plate}</span>
              </div>
            </div>

            <div style="text-align:right;">
              ${statusBadge}
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                ID: <code style="font-size:0.72rem;">${b.bookingId}</code>
              </div>
            </div>
          </div>

          <!-- Grid Info Detail Permohonan -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:0.6rem; background:var(--surface-secondary); border-radius:8px; padding:0.85rem; margin-bottom:0.85rem; font-size:0.8rem;">
            <div>
              <span style="color:var(--text-muted);">Jadwal Peminjaman:</span><br>
              <strong>📅 ${b.tanggal || '-'}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Estimasi Waktu:</span><br>
              <strong>🕒 ${b.startTime || '08:00'} - ${b.estimatedEndTime || 'Selesai'}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Jumlah Penumpang:</span><br>
              <strong>👥 ${b.passengerCount || 1} Orang</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Tujuan / Keperluan:</span><br>
              <strong style="color:var(--text-primary);">📍 ${b.tujuan || b.purpose || '-'}</strong>
            </div>
          </div>

          ${b.notes ? `
            <div style="font-size:0.78rem; color:var(--text-secondary); background:rgba(0,0,0,0.02); border-left:3px solid var(--primary-500); padding:4px 8px; margin-bottom:0.75rem; border-radius:0 4px 4px 0;">
              <strong>Catatan Peminjam:</strong> ${b.notes}
            </div>
          ` : ''}

          ${b.rejectReason ? `
            <div style="font-size:0.78rem; background:#FEE2E2; color:#991B1B; padding:6px 10px; border-radius:6px; margin-bottom:0.75rem;">
              ⚠️ <strong>Alasan Penolakan:</strong> ${b.rejectReason}
            </div>
          ` : ''}

          <!-- Baris Tombol Aksi Admin -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; border-top:1px solid var(--surface-border-subtle); padding-top:0.75rem;">
            <!-- Group Kiri: Hubungi Peminjam via WA -->
            <div style="display:flex; gap:0.4rem;">
              <a href="${waUrl}" target="_blank" class="btn btn-sm btn-outline" style="color:#059669; border-color:#059669; font-size:0.78rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                <span>📱</span>
                <span>Chat WA Peminjam</span>
              </a>
            </div>

            <!-- Group Kanan: Aksi Keputusan Admin & Edit/Hapus -->
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${b.status === 'PENDING' ? `
                <button class="btn btn-sm btn-primary" onclick="ApprovalsView.approve('${b.bookingId}')" style="font-weight:700; background:#059669; border-color:#059669;">
                  ✓ Setujui
                </button>
                <button class="btn btn-sm btn-outline" onclick="ApprovalsView.reject('${b.bookingId}')" style="color:#DC2626; border-color:#DC2626; font-weight:700;">
                  ✕ Tolak
                </button>
              ` : (b.status === 'REJECTED' ? `
                <button class="btn btn-sm btn-primary" onclick="ApprovalsView.approve('${b.bookingId}')" style="font-weight:700; background:#059669; border-color:#059669;">
                  ✓ Ubah Jadi Disetujui
                </button>
              ` : (b.status === 'APPROVED' ? `
                <button class="btn btn-sm btn-outline" onclick="ApprovalsView.reject('${b.bookingId}')" style="color:#DC2626; border-color:#DC2626; font-size:0.78rem;">
                  ✕ Batalkan / Tolak
                </button>
              ` : ''))}

              <!-- Tombol Edit Admin -->
              <button class="btn btn-sm btn-outline" onclick="BookingView.openEditModal('${b.bookingId}')" title="Edit Jadwal & Detail Permohonan" style="font-weight:700;">
                ✏️ Edit
              </button>

              <!-- Tombol Hapus Admin -->
              <button class="btn btn-sm btn-outline" onclick="ApprovalsView.deleteBooking('${b.bookingId}')" title="Hapus Jadwal Reservasi" style="color:#DC2626; border-color:#FCA5A5;">
                🗑️ Hapus
              </button>
            </div>
          </div>

        </div>
      `;
    }).join('');
  },

  async approve(bookingId) {
    if (!confirm('Apakah Anda yakin ingin MENYETUJUI permohonan peminjaman ini? Armada akan ditandai siap serah terima kunci.')) return;

    try {
      UI.showLoading('Menyetujui permohonan...');
      const res = await Api.request('approveBooking', 'POST', { bookingId });
      UI.hideLoading();

      if (res.success) {
        UI.showToast('Alhamdulillah, pengajuan peminjaman berhasil disetujui!', 'success');
        this.load();
        DashboardView.load();
        BookingView.load();
        AdminView.load();
      } else {
        UI.showToast(res.message || 'Gagal menyetujui pengajuan.', 'error');
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('Terjadi kesalahan sistem.', 'error');
    }
  },

  async reject(bookingId) {
    const reason = prompt('Masukkan alasan penolakan permohonan peminjaman:', 'Armada digunakan keperluan dinas pondok lainnya.');
    if (reason === null) return; // Batal

    try {
      UI.showLoading('Memproses penolakan...');
      const res = await Api.request('rejectBooking', 'POST', { bookingId, reason });
      UI.hideLoading();

      if (res.success) {
        UI.showToast('Pengajuan peminjaman telah ditolak.', 'info');
        this.load();
        DashboardView.load();
        BookingView.load();
        AdminView.load();
      } else {
        UI.showToast(res.message || 'Gagal menolak pengajuan.', 'error');
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('Terjadi kesalahan sistem.', 'error');
    }
  },

  async deleteBooking(bookingId) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS jadwal reservasi ini secara permanen?')) return;

    try {
      UI.showLoading('Menghapus reservasi...');
      const res = await Api.request('deleteBooking', 'POST', { bookingId });
      UI.hideLoading();

      if (res.success) {
        UI.showToast('Jadwal reservasi berhasil dihapus.', 'success');
        this.load();
        DashboardView.load();
        BookingView.load();
        AdminView.load();
      } else {
        UI.showToast(res.message || 'Gagal menghapus reservasi.', 'error');
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('Terjadi kesalahan koneksi.', 'error');
    }
  }
};
