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
  invoices: [],
  stats: null,
  activeAdminTab: 'approval',

  load() {
    if (!Auth.isAdmin()) {
      UI.switchView('login');
      return;
    }

    // 1. Render data lokal instan (0ms)
    const localRes = Api.getMockDataSync('getAdminDashboard', {}, Auth.getUser());
    if (localRes && localRes.success && localRes.data) {
      this.users = localRes.data.users || [];
      this.pendingBookings = localRes.data.pendingBookings || [];
      this.pendingReturns = localRes.data.pendingReturns || [];
      this.vehicles = localRes.data.vehicles || [];
      this.invoices = localRes.data.invoices || Store.data.invoices || [];
      this.stats = localRes.data.stats || null;
      this.render();
    }

    // 2. Background Revalidation
    Api.request('getAdminDashboard', 'GET', {}, false).then(res => {
      if (res && res.success && res.data) {
        this.users = res.data.users || [];
        this.pendingBookings = res.data.pendingBookings || [];
        this.pendingReturns = res.data.pendingReturns || [];
        this.vehicles = res.data.vehicles || [];
        this.invoices = res.data.invoices || Store.data.invoices || [];
        this.stats = res.data.stats || null;
        this.render();
      }
    }).catch(() => {});
  },

  setTab(tab) {
    this.activeAdminTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('adminContentContainer');
    if (!container) return;

    const tariffMotor = Store.getTariff('MOTOR');
    const tariffMobil = Store.getTariff('MOBIL');
    const unpaidInvoices = (this.invoices || []).filter(i => i.status === 'UNPAID');
    const totalUnpaid = unpaidInvoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);

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

        <div class="kpi-card" style="border-left:4px solid #EF4444;">
          <div class="kpi-icon-wrap" style="background:#FEE2E2; color:#DC2626;">
            💰
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">Rp${totalUnpaid.toLocaleString('id-ID')}</span>
            <span class="kpi-label">Tagihan Belum Lunas (${unpaidInvoices.length})</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left:4px solid var(--primary-600);">
          <div class="kpi-icon-wrap" style="background:var(--primary-50); color:var(--primary-700);">
            ⛽
          </div>
          <div class="kpi-meta">
            <span class="kpi-value" style="font-size:1.05rem;">Mtr Rp${tariffMotor.toLocaleString('id-ID')} | Mbl Rp${tariffMobil.toLocaleString('id-ID')}</span>
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
        <button class="btn btn-sm ${this.activeAdminTab === 'billing' ? 'btn-primary' : 'btn-outline'}" onclick="AdminView.setTab('billing')">
          💰 Rekap &amp; Tagihan Biaya (${unpaidInvoices.length})
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
    } else if (this.activeAdminTab === 'billing') {
      return this.renderBillingTab();
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
                  ✓ Setujui
                </button>
                <button class="btn btn-outline btn-sm" onclick="BookingView.openEditModal('${b.bookingId}')" title="Edit Data Pengajuan">
                  ✏️ Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="AdminView.rejectBooking('${b.bookingId}')">
                  ✕ Tolak
                </button>
                <button class="btn btn-outline btn-sm" onclick="BookingView.deleteBooking('${b.bookingId}')" style="color:#DC2626; border-color:#FCA5A5;" title="Hapus Pengajuan">
                  🗑️ Hapus
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
   * TAB 3: REKAP & TAGIHAN BIAYA PEMINJAMAN (INVOICING SYSTEM)
   */
  renderBillingTab() {
    const invoices = this.invoices || Store.data.invoices || [];
    const unpaidList = invoices.filter(i => i.status === 'UNPAID');
    const paidList = invoices.filter(i => i.status === 'PAID');
    const totalUnpaid = unpaidList.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);
    const totalPaid = paidList.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);

    return `
      <div>
        <!-- Billing Overview & Action Bar -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; margin-bottom:1.25rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem;">
          <div>
            <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
              💰 Rekap Tagihan Akumulasi Peminjaman
            </h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
              Total Tertunda: <strong style="color:#DC2626;">Rp${totalUnpaid.toLocaleString('id-ID')}</strong> (${unpaidList.length} tagihan) • 
              Terbayar: <strong style="color:#16A34A;">Rp${totalPaid.toLocaleString('id-ID')}</strong> (${paidList.length} tagihan)
            </p>
          </div>
          <div>
            <button class="btn btn-primary" onclick="AdminView.openCreateInvoiceModal()" style="font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>➕</span> Terbitkan Tagihan Baru
            </button>
          </div>
        </div>

        <!-- Invoices List -->
        ${invoices.length === 0 ? `
          <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:3rem 1.5rem; text-align:center; color:var(--text-muted);">
            <div style="font-size:2.5rem; margin-bottom:0.75rem;">🧾</div>
            <h4 style="font-size:1.1rem; color:var(--text-primary); font-weight:800; margin-bottom:4px;">Belum Ada Tagihan Terdaftar</h4>
            <p style="font-size:0.85rem; margin-bottom:1rem;">Akumulasikan biaya peminjaman beberapa perjalanan menjadi satu nota tagihan resmi.</p>
            <button class="btn btn-primary btn-sm" onclick="AdminView.openCreateInvoiceModal()">
              + Buat Tagihan Pertama
            </button>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${invoices.map(inv => {
              const isPaid = inv.status === 'PAID';
              const items = inv.items || [];
              const itemCount = items.length || (inv.tripIds ? inv.tripIds.length : 1);

              return `
                <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; box-shadow:var(--shadow-sm); border-left:4px solid ${isPaid ? '#10B981' : '#EF4444'};">
                  <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-bottom:0.75rem;">
                    <div>
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span class="badge ${isPaid ? 'badge-available' : 'badge-pending'}" style="font-weight:800;">
                          ${isPaid ? '✓ LUNAS' : '⏳ BELUM LUNAS'}
                        </span>
                        <span style="font-family:monospace; font-weight:800; color:var(--primary-700); font-size:0.9rem;">
                          ${inv.invoiceNumber}
                        </span>
                      </div>
                      <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0;">
                        ${inv.userName} <span style="font-weight:400; color:var(--text-muted); font-size:0.9rem;">(${inv.divisi || 'Pesantren'})</span>
                      </h4>
                      <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">
                        📅 Terbit: <strong>${inv.invoiceDate || '-'}</strong> • Jatuh Tempo: <strong>${inv.dueDate || '-'}</strong>
                        ${inv.noHp ? ` • 📱 <strong>${inv.noHp}</strong>` : ''}
                      </div>
                    </div>

                    <div style="text-align:right;">
                      <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Tagihan:</div>
                      <div style="font-size:1.3rem; font-weight:900; color:${isPaid ? '#16A34A' : 'var(--primary-700)'};">
                        Rp${(Number(inv.totalAmount) || 0).toLocaleString('id-ID')}
                      </div>
                      <div style="font-size:0.78rem; color:var(--text-muted);">
                        ${itemCount} perjalanan (${inv.totalDistanceKm || 0} KM)
                      </div>
                    </div>
                  </div>

                  <!-- Rincian Item Tagihan Ringkas -->
                  <div style="background:var(--surface-secondary); padding:0.75rem; border-radius:8px; font-size:0.82rem; margin-bottom:0.75rem;">
                    <div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">📝 Rincian Perjalanan yang Ditagihkan:</div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                      ${items.map((it, idx) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--surface-border); padding-bottom:3px;">
                          <span>${idx+1}. 🚗 <strong>${it.vehicleName}</strong> (${it.nomorPolisi || '-'}) - ${it.tanggal || ''} (${it.distanceKm} KM @ Rp${(it.ratePerKm || 1000).toLocaleString('id-ID')})</span>
                          <span style="font-weight:700; color:var(--text-primary);">Rp${(it.totalCost || 0).toLocaleString('id-ID')}</span>
                        </div>
                      `).join('')}
                    </div>
                    ${inv.notes ? `<div style="color:var(--text-muted); font-size:0.78rem; margin-top:6px;">💬 <strong>Catatan:</strong> ${inv.notes}</div>` : ''}
                  </div>

                  <!-- Action Buttons -->
                  <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.5rem;">
                    <div style="font-size:0.8rem; color:var(--text-secondary);">
                      💳 Rekening BSI: <strong>5221717173</strong> a.n. <em>PP. Imam Syafi'i Brebes</em>
                    </div>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                      <button class="btn btn-outline btn-sm" onclick="AdminView.openInvoiceReceipt('${inv.invoiceId}')" title="Lihat Kuitansi Resmi" style="font-weight:700;">
                        📄 Cetak Kuitansi
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="AdminView.shareInvoiceWhatsApp('${inv.invoiceId}')" title="Kirim Tagihan via WhatsApp">
                        📱 Kirim WA
                      </button>
                      ${!isPaid ? `
                        <button class="btn btn-primary btn-sm" onclick="AdminView.openPayInvoiceModal('${inv.invoiceId}')" style="font-weight:700;">
                          💳 Tandai Lunas
                        </button>
                      ` : `
                        <span class="badge badge-available" style="font-size:0.8rem; padding:6px 10px;">
                          ✓ Lunas (${inv.paymentMethod || 'BSI'})
                        </span>
                      `}
                      <button class="btn btn-danger btn-sm" onclick="AdminView.deleteInvoice('${inv.invoiceId}')" title="Hapus Tagihan">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  /**
   * TAB 4: MANAJEMEN ARMADA & TARIF (MOTOR & MOBIL TERPISAH)
   */
  renderFleetAndSettingsTab() {
    const tariffMotor = Store.getTariff('MOTOR');
    const tariffMobil = Store.getTariff('MOBIL');

    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.25rem;">
        <!-- Atur Tarif Terpisah Motor & Mobil -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
          <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.5rem; display:flex; align-items:center; gap:6px;">
            <span>💰</span> Atur Tarif Pemakaian per KM
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">
            Tarif dihitung otomatis berdasarkan jarak tempuh jika pengguna tidak mengisi bahan bakar sendiri.
          </p>
          
          <div style="display:flex; flex-direction:column; gap:0.85rem;">
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:0.82rem; font-weight:700; color:var(--primary-700);">
                🏍️ Tarif Sepeda Motor (per KM):
              </label>
              <div style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted); font-size:0.95rem;">Rp</span>
                <input type="number" id="inputSettingTariffMotor" class="form-control" value="${tariffMotor}" style="padding-left:2.5rem; font-size:1.1rem; font-weight:800; color:var(--primary-700);" min="0" step="50">
              </div>
            </div>

            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:0.82rem; font-weight:700; color:#1E40AF;">
                🚗 Tarif Mobil Operasional / Minibus (per KM):
              </label>
              <div style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted); font-size:0.95rem;">Rp</span>
                <input type="number" id="inputSettingTariffMobil" class="form-control" value="${tariffMobil}" style="padding-left:2.5rem; font-size:1.1rem; font-weight:800; color:#1E40AF;" min="0" step="100">
              </div>
            </div>

            <button class="btn btn-primary btn-block" onclick="AdminView.saveTariffs()" style="font-weight:700; margin-top:0.25rem;">
              💾 Simpan Perubahan Tarif
            </button>
          </div>
        </div>

        <!-- Tambah Armada Baru -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem;">
          <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.5rem; display:flex; align-items:center; gap:6px;">
            <span>➕</span> Tambah Armada Baru
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">
            Daftarkan motor operasional atau mobil dinas baru ke dalam sistem pesantren.
          </p>
          <button class="btn btn-gold btn-block" onclick="UI.openModal('modalAddVehicle')" style="font-weight:700;">
            + Tambah Kendaraan Baru
          </button>
        </div>

        <!-- Rekening Resmi Pesantren -->
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.25rem; grid-column:1 / -1;">
          <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.5rem; display:flex; align-items:center; gap:6px;">
            <span>🏦</span> Rekening Resmi Pembayaran Pesantren
          </h4>
          <div style="background:var(--surface-secondary); border-radius:8px; padding:0.85rem 1rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem; font-size:0.88rem;">
            <div>
              <div style="font-weight:800; color:var(--text-primary); font-size:1.05rem;">Bank Syariah Indonesia (BSI)</div>
              <div style="font-family:monospace; font-weight:900; font-size:1.2rem; color:var(--primary-700); letter-spacing:1px; margin-top:2px;">
                5221717173
              </div>
              <div style="font-size:0.82rem; color:var(--text-secondary);">a.n. <strong>Pondok Pesantren Imam Syafi'i Brebes</strong></div>
            </div>
            <div style="font-size:0.82rem; color:var(--text-muted); max-width:400px;">
              Nomor rekening ini dicantumkan pada seluruh kuitansi resmi, nota tagihan, dan pesan penagihan WhatsApp otomatis.
            </div>
          </div>
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

  async saveTariffs() {
    const motorRate = document.getElementById('inputSettingTariffMotor')?.value;
    const mobilRate = document.getElementById('inputSettingTariffMobil')?.value;

    if (!motorRate || !mobilRate || Number(motorRate) < 0 || Number(mobilRate) < 0) {
      UI.showToast('Harap masukkan nominal tarif yang valid.', 'error');
      return;
    }

    const res = await Api.request('updateTariff', 'POST', {
      tariffMotor: motorRate,
      tariffMobil: mobilRate
    });

    if (res.success) {
      UI.showToast(res.message || 'Tarif berhasil diperbarui!', 'success');
      this.load();
    }
  },

  /**
   * INVOICING ACTIONS
   */
  openCreateInvoiceModal() {
    // Ambil trip-trip yang selesai dan belum ada tagihan atau belum lunas
    const trips = (Store.data.trips || []).filter(t => t.totalCost > 0 && t.status === 'FINISHED' && !t.isPaid);
    const container = document.getElementById('createInvoiceTripList');
    if (!container) return;

    if (trips.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:1.5rem; background:var(--surface-secondary); border-radius:8px; color:var(--text-muted); font-size:0.85rem;">
          Tidak ada riwayat perjalanan yang berbayar dan belum lunas saat ini.
        </div>
      `;
    } else {
      container.innerHTML = trips.map(t => {
        const rate = t.ratePerKm || (t.jenis === 'MOBIL' ? 1500 : 500);
        return `
          <label style="display:flex; align-items:flex-start; gap:0.75rem; background:var(--surface-secondary); padding:0.75rem; border-radius:8px; cursor:pointer; font-size:0.83rem; border:1px solid var(--surface-border);">
            <input type="checkbox" name="selectedInvoiceTrips" value="${t.tripId}" data-cost="${t.totalCost}" data-km="${t.distanceKm || 0}" data-user="${t.userName}" data-divisi="${t.divisi || ''}" data-phone="${t.noHp || ''}" onchange="AdminView.updateCreateInvoiceTotals()" style="margin-top:3px; transform:scale(1.2);">
            <div style="flex:1;">
              <div style="font-weight:700; color:var(--text-primary);">
                ${t.vehicleName} (${t.nomorPolisi}) • 👤 ${t.userName} (${t.divisi || 'Pondok'})
              </div>
              <div style="color:var(--text-muted); font-size:0.78rem; margin-top:2px;">
                📅 ${t.startTime ? t.startTime.substring(0, 10) : '-'} • 🛣️ ${t.distanceKm || 0} KM @ Rp${rate.toLocaleString('id-ID')} • 📍 ${t.tujuan || t.purpose}
              </div>
            </div>
            <div style="font-weight:800; color:var(--primary-700); font-size:0.95rem;">
              Rp${(t.totalCost || 0).toLocaleString('id-ID')}
            </div>
          </label>
        `;
      }).join('');
    }

    // Set default due date 7 hari ke depan
    const dueEl = document.getElementById('createInvoiceDueDate');
    if (dueEl) {
      dueEl.value = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);
    }

    this.updateCreateInvoiceTotals();
    UI.openModal('modalCreateInvoice');
  },

  updateCreateInvoiceTotals() {
    const checkboxes = document.querySelectorAll('input[name="selectedInvoiceTrips"]:checked');
    let totalKm = 0;
    let totalAmount = 0;
    let autoUser = '';
    let autoDivisi = '';
    let autoPhone = '';

    checkboxes.forEach((cb, idx) => {
      totalKm += Number(cb.dataset.km) || 0;
      totalAmount += Number(cb.dataset.cost) || 0;
      if (idx === 0) {
        autoUser = cb.dataset.user || '';
        autoDivisi = cb.dataset.divisi || '';
        autoPhone = cb.dataset.phone || '';
      }
    });

    const kmEl = document.getElementById('createInvoiceTotalKm');
    const amtEl = document.getElementById('createInvoiceTotalAmount');
    if (kmEl) kmEl.textContent = `${totalKm.toLocaleString('id-ID')} KM`;
    if (amtEl) amtEl.textContent = `Rp${totalAmount.toLocaleString('id-ID')}`;

    const userInp = document.getElementById('createInvoiceUserName');
    const divInp = document.getElementById('createInvoiceDivisi');
    const phoneInp = document.getElementById('createInvoiceNoHp');

    if (userInp && (!userInp.value || autoUser) && checkboxes.length > 0) userInp.value = autoUser;
    if (divInp && (!divInp.value || autoDivisi) && checkboxes.length > 0) divInp.value = autoDivisi;
    if (phoneInp && (!phoneInp.value || autoPhone) && checkboxes.length > 0) phoneInp.value = autoPhone;
  },

  async submitCreateInvoice(e) {
    if (e) e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="selectedInvoiceTrips"]:checked');
    if (checkboxes.length === 0) {
      UI.showToast('Harap pilih minimal 1 perjalanan untuk diterbitkan tagihannya.', 'error');
      return;
    }

    const tripIds = Array.from(checkboxes).map(cb => cb.value);
    const userName = document.getElementById('createInvoiceUserName')?.value.trim();
    const divisi = document.getElementById('createInvoiceDivisi')?.value.trim();
    const noHp = document.getElementById('createInvoiceNoHp')?.value.trim();
    const dueDate = document.getElementById('createInvoiceDueDate')?.value;
    const notes = document.getElementById('createInvoiceNotes')?.value.trim();

    const res = await Api.request('createInvoice', 'POST', {
      tripIds,
      userName,
      divisi,
      noHp,
      dueDate,
      notes
    });

    if (res.success) {
      UI.closeModal('modalCreateInvoice');
      UI.showToast(res.message || 'Tagihan berhasil diterbitkan!', 'success');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menerbitkan tagihan.', 'error');
    }
  },

  openPayInvoiceModal(invoiceId) {
    const inv = (Store.data.invoices || []).find(i => i.invoiceId === invoiceId);
    if (!inv) return;

    document.getElementById('payInvoiceId').value = inv.invoiceId;
    document.getElementById('payInvoiceNumber').textContent = inv.invoiceNumber;
    document.getElementById('payInvoiceUserName').textContent = `${inv.userName} (${inv.divisi || 'Pesantren'})`;
    document.getElementById('payInvoiceAmount').textContent = `Rp${(Number(inv.totalAmount) || 0).toLocaleString('id-ID')}`;

    UI.openModal('modalPayInvoice');
  },

  async submitPayInvoice(e) {
    if (e) e.preventDefault();
    const invoiceId = document.getElementById('payInvoiceId')?.value;
    const paymentMethod = document.getElementById('payInvoiceMethod')?.value;
    const notes = document.getElementById('payInvoiceNotes')?.value.trim();

    const res = await Api.request('payInvoice', 'POST', {
      invoiceId,
      paymentMethod,
      notes
    });

    if (res.success) {
      UI.closeModal('modalPayInvoice');
      UI.showToast(res.message || 'Tagihan berhasil diverifikasi LUNAS!', 'success');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal memproses pelunasan.', 'error');
    }
  },

  openInvoiceReceipt(invoiceId) {
    const inv = (Store.data.invoices || []).find(i => i.invoiceId === invoiceId);
    if (!inv) return;

    const isPaid = inv.status === 'PAID';
    const container = document.getElementById('invoiceReceiptContent');
    if (!container) return;

    container.innerHTML = `
      <div class="receipt-print-wrapper" style="background:#fff; color:#1F2937; padding:2rem; border-radius:8px; border:1px solid #E5E7EB; font-family:Arial, sans-serif;">
        <!-- KOP NOTA / KUITANSI RESMI -->
        <div style="border-bottom:3px double #0D5C3A; padding-bottom:1rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:1.25rem;">
          <img src="./assets/logo/logo.png?v=2.0.0" alt="Logo Pondok" style="height:68px; width:auto; object-fit:contain;">
          <div style="flex:1;">
            <div style="font-size:1.15rem; font-weight:900; color:#0D5C3A; text-transform:uppercase; letter-spacing:0.5px;">
              PONDOK PESANTREN IMAM SYAFI'I BREBES
            </div>
            <div style="font-size:0.82rem; font-weight:700; color:#D4AF37;">
              Unit Pengelola Sarana &amp; Prasarana Transportasi (MAISYA-TRANS)
            </div>
            <div style="font-size:0.75rem; color:#4B5563; margin-top:2px;">
              Jl. Raya Pemaron No. 01, Kec. Brebes, Kab. Brebes, Jawa Tengah • Telp/WA: 0812-3456-7890
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.25rem; font-weight:900; color:${isPaid ? '#16A34A' : '#DC2626'}; border:2px solid ${isPaid ? '#16A34A' : '#DC2626'}; padding:4px 12px; border-radius:6px; display:inline-block;">
              ${isPaid ? '✓ LUNAS' : 'TAGIHAN'}
            </div>
            <div style="font-family:monospace; font-weight:800; font-size:0.85rem; color:#1F2937; margin-top:4px;">
              ${inv.invoiceNumber}
            </div>
          </div>
        </div>

        <!-- INFORMASI PENERIMA & TANGGAL -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.85rem; margin-bottom:1.25rem; background:#F9FAFB; padding:0.85rem; border-radius:6px;">
          <div>
            <div><span style="color:#6B7280;">Nama Peminjam:</span> <strong>${inv.userName}</strong></div>
            <div><span style="color:#6B7280;">Divisi / Bagian:</span> <strong>${inv.divisi || 'Pesantren'}</strong></div>
            <div><span style="color:#6B7280;">No. WhatsApp:</span> <strong>${inv.noHp || '-'}</strong></div>
          </div>
          <div style="text-align:right;">
            <div><span style="color:#6B7280;">Tanggal Terbit:</span> <strong>${inv.invoiceDate || '-'}</strong></div>
            <div><span style="color:#6B7280;">Jatuh Tempo:</span> <strong>${inv.dueDate || '-'}</strong></div>
            <div><span style="color:#6B7280;">Status Pembayaran:</span> <strong style="color:${isPaid ? '#16A34A' : '#DC2626'};">${isPaid ? 'LUNAS' : 'BELUM LUNAS'}</strong></div>
          </div>
        </div>

        <!-- TABEL RINCIAN PERJALANAN -->
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; margin-bottom:1.25rem;">
          <thead>
            <tr style="background:#0D5C3A; color:#ffffff; text-align:left;">
              <th style="padding:8px 10px; border:1px solid #0D5C3A;">No</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A;">Tanggal</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A;">Kendaraan &amp; Plat</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A;">Keperluan</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A; text-align:right;">Jarak (KM)</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A; text-align:right;">Tarif/KM</th>
              <th style="padding:8px 10px; border:1px solid #0D5C3A; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.items || []).map((it, idx) => `
              <tr style="border-bottom:1px solid #E5E7EB;">
                <td style="padding:8px 10px; text-align:center;">${idx + 1}</td>
                <td style="padding:8px 10px;">${it.tanggal || '-'}</td>
                <td style="padding:8px 10px;"><strong>${it.vehicleName}</strong><br><span style="color:#6B7280; font-family:monospace;">${it.nomorPolisi || '-'}</span></td>
                <td style="padding:8px 10px;">${it.purpose || '-'}</td>
                <td style="padding:8px 10px; text-align:right;">${(it.distanceKm || 0).toLocaleString('id-ID')} KM</td>
                <td style="padding:8px 10px; text-align:right;">Rp${(it.ratePerKm || 1000).toLocaleString('id-ID')}</td>
                <td style="padding:8px 10px; text-align:right; font-weight:700;">Rp${(it.totalCost || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#F3F4F6; font-weight:800;">
              <td colspan="4" style="padding:10px; text-align:right; font-size:0.9rem;">TOTAL AKUMULASI:</td>
              <td style="padding:10px; text-align:right;">${inv.totalDistanceKm || 0} KM</td>
              <td></td>
              <td style="padding:10px; text-align:right; font-size:1.1rem; color:#0D5C3A;">
                Rp${(Number(inv.totalAmount) || 0).toLocaleString('id-ID')}
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- REKENING & INSTRUKSI PEMBAYARAN -->
        <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; padding:0.85rem; font-size:0.8rem; margin-bottom:1.5rem;">
          <div style="font-weight:700; color:#1E40AF; margin-bottom:2px;">💳 Informasi Pembayaran Resmi:</div>
          <div>Bank: <strong>Bank Syariah Indonesia (BSI)</strong></div>
          <div>No. Rekening: <strong style="font-family:monospace; font-size:0.95rem; color:#0D5C3A;">5221717173</strong></div>
          <div>Atas Nama: <strong>Pondok Pesantren Imam Syafi'i Brebes</strong></div>
          <div style="color:#4B5563; font-size:0.75rem; margin-top:4px;">* Harap konfirmasi bukti transfer kepada Admin Sarpras Pondok.</div>
        </div>

        <!-- TANDA TANGAN RESMI -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; text-align:center; font-size:0.82rem; margin-top:2rem;">
          <div>
            <div style="color:#6B7280;">Peminjam / Pengguna,</div>
            <div style="height:55px;"></div>
            <div style="font-weight:800; border-top:1px solid #9CA3AF; display:inline-block; padding-top:4px; min-width:160px;">
              ${inv.userName}
            </div>
          </div>
          <div>
            <div style="color:#6B7280;">Brebes, ${inv.invoiceDate || new Date().toISOString().substring(0, 10)}<br>Bagian Sarpras PP. Imam Syafi'i,</div>
            <div style="height:55px;">
              ${isPaid ? '<span style="display:inline-block; margin-top:10px; border:2px solid #16A34A; color:#16A34A; font-weight:900; padding:2px 10px; border-radius:4px; transform:rotate(-5deg);">LUNAS ✓</span>' : ''}
            </div>
            <div style="font-weight:800; border-top:1px solid #9CA3AF; display:inline-block; padding-top:4px; min-width:160px;">
              Admin Sarpras
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('receiptInvoiceId').value = inv.invoiceId;
    UI.openModal('modalInvoiceReceipt');
  },

  shareInvoiceWhatsApp(invoiceId) {
    const inv = (Store.data.invoices || []).find(i => i.invoiceId === invoiceId);
    if (!inv) return;

    const phone = (inv.noHp || '').replace(/[^0-9]/g, '');
    const itemsText = (inv.items || []).map((it, i) => 
      `${i+1}. ${it.vehicleName} (${it.nomorPolisi || '-'}) - ${it.tanggal || ''}: ${it.distanceKm} KM = Rp${(it.totalCost || 0).toLocaleString('id-ID')}`
    ).join('%0A');

    const msg = `*TAGIHAN AKUMULASI PEMINJAMAN KENDARAAN*%0A` +
      `*PP. IMAM SYAFI'I BREBES (MAISYA-TRANS)*%0A%0A` +
      `No. Tagihan: *${inv.invoiceNumber}*%0A` +
      `Nama: *${inv.userName}* (${inv.divisi || 'Pesantren'})%0A` +
      `Jatuh Tempo: *${inv.dueDate || '-'}*%0A%0A` +
      `*Rincian Perjalanan:*%0A${itemsText}%0A%0A` +
      `*Total Tagihan: Rp${(Number(inv.totalAmount) || 0).toLocaleString('id-ID')}*%0A` +
      `Status: *${inv.status === 'PAID' ? 'LUNAS ✓' : 'BELUM LUNAS'}*%0A%0A` +
      `*Pembayaran via Transfer BSI:*%0A` +
      `Bank: *Bank Syariah Indonesia (BSI)*%0A` +
      `No. Rekening: *5221717173*%0A` +
      `Atas Nama: *Pondok Pesantren Imam Syafi'i Brebes*%0A%0A` +
      `_Jazakumullahu Khairan Katsiran._`;

    const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  },

  async deleteInvoice(invoiceId) {
    if (!confirm('Apakah Anda yakin ingin menghapus tagihan ini? Riwayat perjalanan yang terkait akan dikembalikan ke status belum ditagih.')) {
      return;
    }

    const res = await Api.request('deleteInvoice', 'POST', { invoiceId });
    if (res.success) {
      UI.showToast('Tagihan berhasil dihapus.', 'info');
      this.load();
      DashboardView.load();
    } else {
      UI.showToast(res.message || 'Gagal menghapus tagihan.', 'error');
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

