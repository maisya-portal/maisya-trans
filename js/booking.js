/**
 * MAISYA-TRANS - Booking & Quick Borrow Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const BookingView = {
  vehicles: [],
  selectedVehicle: null,

  async load() {
    const res = await Api.request('getVehicles', 'GET');
    if (res.success && res.data) {
      this.vehicles = res.data;
      this.populateVehicleSelect();
    }
    this.renderBookingCalendar();
  },

  populateVehicleSelect() {
    const select = document.getElementById('bookingVehicleSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Armada Kendaraan --</option>';
    this.vehicles.forEach(v => {
      const disabled = v.status !== 'AVAILABLE';
      const label = `${v.jenis === 'MOTOR' ? '🏍️' : '🚗'} ${v.merk} ${v.model} (${v.nomorPolisi}) - ${v.status}`;
      select.innerHTML += `<option value="${v.vehicleId}" ${disabled ? 'disabled' : ''}>${label}</option>`;
    });
  },

  /**
   * Pinjam Sekarang — harus ada booking APPROVED terlebih dahulu
   * Alur: cek booking approved hari ini → ada? buka modal start trip → tidak ada? minta reservasi
   */
  async openQuickBorrow(type) {
    UI.showToast('Memeriksa jadwal peminjaman Anda...', 'info');

    try {
      const res = await Api.request('getBookings', 'GET');
      if (!res.success) throw new Error('Gagal mengambil data booking');

      const user = Auth.getUser();
      const todayStr = new Date().toISOString().substring(0, 10);

      // Cari booking milik user ini yang: APPROVED + tanggal hari ini + kendaraan sesuai jenis
      let allVehicles = this.vehicles;
      if ((!allVehicles || allVehicles.length === 0) && typeof Store !== 'undefined') {
        allVehicles = Store.data.vehicles || [];
      }

      const vehicleIdsOfType = allVehicles
        .filter(v => v.jenis === type)
        .map(v => v.vehicleId);

      const approvedBooking = (res.data || []).find(b =>
        b.userId === user.userId &&
        b.status === 'APPROVED' &&
        String(b.tanggal).substring(0, 10) === todayStr &&
        vehicleIdsOfType.includes(b.vehicleId)
      );

      if (!approvedBooking) {
        // Tidak ada booking approved — tampilkan modal info & arahkan ke reservasi
        this._showNeedBookingInfo(type);
        return;
      }

      // Ada booking approved — pastikan kendaraannya AVAILABLE
      const vehicle = allVehicles.find(v => v.vehicleId === approvedBooking.vehicleId);
      if (!vehicle || vehicle.status !== 'AVAILABLE') {
        UI.showToast(`Kendaraan sedang tidak tersedia (${vehicle ? vehicle.status : 'tidak ditemukan'}).`, 'error');
        return;
      }

      // Simpan bookingId untuk dikirim ke backend saat startTrip
      this._activeBookingId = approvedBooking.bookingId;
      this.openQuickBorrowById(approvedBooking.vehicleId);
    } catch (err) {
      UI.showToast('Gagal memeriksa jadwal: ' + err.message, 'error');
    }
  },

  /**
   * Tampilkan modal informasi bahwa user perlu reservasi dahulu
   */
  _showNeedBookingInfo(type) {
    const typeLabel = type === 'MOTOR' ? 'Motor' : 'Mobil';
    // Gunakan sweet-alert style modal via UI layer
    const msg = `Untuk meminjam ${typeLabel}, Anda harus mengajukan <strong>Reservasi</strong> terlebih dahulu dan menunggu persetujuan Admin Sarpras.<br><br>` +
      `Setelah pengajuan <span style="color:var(--primary-700);font-weight:700;">DISETUJUI</span>, tombol ini akan aktif pada hari peminjaman.`;

    // Inject modal info dinamis jika belum ada
    let overlay = document.getElementById('modalNeedBookingInfo');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modalNeedBookingInfo';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-container" style="max-width:420px; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">📋</div>
          <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">Reservasi Diperlukan</h3>
          <p id="needBookingMsg" style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1.25rem;"></p>
          <div style="display:flex; gap:0.75rem; justify-content:center;">
            <button class="btn btn-outline btn-sm" onclick="UI.closeModal('modalNeedBookingInfo')">Tutup</button>
            <button class="btn btn-primary btn-sm" onclick="UI.closeModal('modalNeedBookingInfo'); UI.switchView('booking')">
              📅 Buat Reservasi Sekarang
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    document.getElementById('needBookingMsg').innerHTML = msg;
    UI.openModal('modalNeedBookingInfo');
  },

  openQuickBorrowById(vehicleId) {
    let v = this.vehicles.find(x => x.vehicleId === vehicleId);
    if (!v && typeof VehiclesView !== 'undefined' && VehiclesView.vehicles.length > 0) {
      v = VehiclesView.vehicles.find(x => x.vehicleId === vehicleId);
    }
    if (!v && typeof Store !== 'undefined') {
      v = Store.data.vehicles.find(x => x.vehicleId === vehicleId);
    }
    if (!v) return;

    this.selectedVehicle = v;
    document.getElementById('startTripVehicleName').textContent = `${v.merk} ${v.model} (${v.nomorPolisi})`;
    document.getElementById('startTripLastKmBadge').textContent = `Odometer Tercatat: ${v.currentKm.toLocaleString('id-ID')} KM`;
    
    // Set default KM awal ke odometer saat ini
    const kmInput = document.getElementById('startTripKmInput');
    if (kmInput) kmInput.value = v.currentKm;

    // Reset checklist
    document.querySelectorAll('.departure-check').forEach(ch => ch.checked = false);
    document.getElementById('departureConsentCheck').checked = false;

    UI.openModal('modalStartTrip');
  },

  /**
   * Submit Mulai Pemakaian dari modal
   */
  async submitStartTrip() {
    if (!this.selectedVehicle) return;

    const kmInput = document.getElementById('startTripKmInput');
    const purposeInput = document.getElementById('startTripPurposeInput');
    const startKm = Number(kmInput.value);
    const purpose = purposeInput.value.trim();

    if (!startKm || isNaN(startKm)) {
      UI.showToast('Harap masukkan angka kilometer awal yang valid.', 'error');
      return;
    }

    if (startKm < this.selectedVehicle.currentKm) {
      UI.showToast(`Kilometer awal tidak boleh lebih kecil dari ${this.selectedVehicle.currentKm.toLocaleString('id-ID')} KM!`, 'error');
      return;
    }

    if (!purpose) {
      UI.showToast('Harap sebutkan keperluan perjalanan dinas pondok.', 'error');
      return;
    }

    // Validasi Checklist Sebelum Berangkat
    const consent = document.getElementById('departureConsentCheck').checked;
    if (!consent) {
      UI.showToast('Harap centang pernyataan kelayakan kendaraan sebelum berangkat.', 'error');
      return;
    }

    const checklist = {
      ban: document.getElementById('checkBan')?.checked || false,
      rem: document.getElementById('checkRem')?.checked || false,
      lampu: document.getElementById('checkLampu')?.checked || false,
      spion: document.getElementById('checkSpion')?.checked || false,
      bbm: document.getElementById('checkBbm')?.checked || false
    };

    const submitBtn = document.getElementById('btnSubmitStartTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses Mulai...';
    }

    try {
      const res = await Api.request('startTrip', 'POST', {
        vehicleId: this.selectedVehicle.vehicleId,
        bookingId: this._activeBookingId || '',  // bookingId dari booking APPROVED
        start_km: startKm,
        purpose: purpose,
        start_checklist: checklist
      });
      this._activeBookingId = null; // reset setelah dipakai

      if (res.success) {
        UI.showToast(res.message, 'success');
        UI.closeModal('modalStartTrip');
        // Arahkan ke Beranda untuk melihat progress pemakaian
        UI.switchView('dashboard');
      } else {
        UI.showToast(res.message || 'Gagal memulai pemakaian kendaraan.', 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '▶ Bismillah, Mulai Pemakaian';
      }
    }
  },

  /**
   * Submit Reservasi / Booking Masa Depan
   */
  async submitBookingForm(e) {
    e.preventDefault();
    const vehicleId = document.getElementById('bookingVehicleSelect').value;
    const tanggal = document.getElementById('bookingDate').value;
    const startTime = document.getElementById('bookingStartTime').value;
    const endTime = document.getElementById('bookingEndTime').value;
    const purpose = document.getElementById('bookingPurpose').value;
    const notes = document.getElementById('bookingNotes').value;

    if (!vehicleId || !tanggal || !startTime || !purpose) {
      UI.showToast('Harap lengkapi semua kolom bertanda bintang (*).', 'error');
      return;
    }

    const submitBtn = document.getElementById('btnSubmitBooking');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengajukan...';
    }

    try {
      const res = await Api.request('createBooking', 'POST', {
        vehicleId,
        tanggal,
        start_time: startTime,
        estimated_end_time: endTime,
        purpose,
        notes
      });

      if (res.success) {
        UI.showToast(res.message, 'success');
        document.getElementById('formBooking').reset();
        this.renderBookingCalendar();
      } else {
        UI.showToast(res.message, 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan saat mengajukan peminjaman.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ajukan Peminjaman';
      }
    }
  },

  /**
   * Render Kalender Jadwal Peminjaman
   */
  async renderBookingCalendar() {
    const listContainer = document.getElementById('activeBookingsList');
    if (!listContainer) return;

    const res = await Api.request('getBookings', 'GET');
    if (res.success && res.data) {
      const bookings = res.data;
      if (bookings.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">📋</div>
            Belum ada jadwal pengajuan peminjaman.<br>
            <span style="font-size:0.78rem;">Gunakan form di atas untuk mengajukan reservasi kendaraan.</span>
          </div>`;
        return;
      }

      const user = Auth.getUser();
      const todayStr = new Date().toISOString().substring(0, 10);

      const statusLabel = {
        'PENDING':  { text: '⏳ Menunggu Persetujuan', cls: 'badge-maintenance' },
        'APPROVED': { text: '✅ Disetujui Admin',      cls: 'badge-available'   },
        'REJECTED': { text: '❌ Ditolak',               cls: 'badge-in-use'      }
      };

      listContainer.innerHTML = bookings.map(b => {
        const sl = statusLabel[b.status] || { text: b.status, cls: '' };
        const isOwner = user && user.userId === b.userId;
        const isToday = String(b.tanggal).substring(0, 10) === todayStr;
        const canStart = isOwner && b.status === 'APPROVED' && isToday;

        // Border kiri berwarna sesuai status
        const borderColor = b.status === 'APPROVED' ? 'var(--primary-600)' :
                            b.status === 'PENDING'  ? '#d97706' : '#ef4444';

        return `
          <div style="background:var(--surface); border:1px solid var(--surface-border); border-left:4px solid ${borderColor}; border-radius:var(--border-radius-md); padding:0.85rem; margin-bottom:0.6rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${b.vehicleName} <span style="font-weight:400; color:var(--text-muted);">(${b.nomorPolisi})</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
                📅 ${Utils.formatDate(b.tanggal)} &nbsp;•&nbsp; ⏰ ${b.startTime}${b.estimatedEndTime ? ' – ' + b.estimatedEndTime : ''}
              </div>
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                ${b.userName} &nbsp;›&nbsp; ${b.purpose}
              </div>
              ${b.status === 'PENDING' ? `
                <div style="font-size:0.72rem; color:#92400e; margin-top:4px; font-style:italic;">
                  Menunggu persetujuan Admin Sarpras...
                </div>` : ''}
              ${b.status === 'APPROVED' && !isToday ? `
                <div style="font-size:0.72rem; color:var(--primary-700); margin-top:4px;">
                  Tombol mulai aktif pada hari peminjaman.
                </div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
              <span class="badge ${sl.cls}" style="font-size:0.7rem; white-space:nowrap;">${sl.text}</span>
              ${canStart ? `
                <button class="btn btn-primary btn-sm" style="font-size:0.75rem; white-space:nowrap;"
                  onclick="BookingView._startFromBooking('${b.bookingId}', '${b.vehicleId}')">
                  ▶ Mulai Sekarang
                </button>` : ''}
            </div>
          </div>`;
      }).join('');
    }
  },

  /**
   * Mulai pemakaian langsung dari daftar booking APPROVED
   */
  async _startFromBooking(bookingId, vehicleId) {
    let allVehicles = this.vehicles;
    if ((!allVehicles || allVehicles.length === 0) && typeof Store !== 'undefined') {
      allVehicles = Store.data.vehicles || [];
    }
    const vehicle = allVehicles.find(v => v.vehicleId === vehicleId);
    if (!vehicle) {
      UI.showToast('Data kendaraan tidak ditemukan. Silakan segarkan halaman.', 'error');
      return;
    }
    if (vehicle.status !== 'AVAILABLE') {
      UI.showToast(`Kendaraan sedang tidak tersedia (${vehicle.status}).`, 'error');
      return;
    }
    // Simpan bookingId dan buka modal start trip
    this._activeBookingId = bookingId;
    this.openQuickBorrowById(vehicleId);
  }
};
