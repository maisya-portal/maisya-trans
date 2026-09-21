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
   * Alur Pinjam Sekarang (Quick Flow)
   */
  openQuickBorrow(type) {
    let allVehicles = this.vehicles;
    if ((!allVehicles || allVehicles.length === 0) && typeof VehiclesView !== 'undefined' && VehiclesView.vehicles.length > 0) {
      allVehicles = VehiclesView.vehicles;
    }
    if (!allVehicles || allVehicles.length === 0) {
      allVehicles = Store.data.vehicles;
    }

    const available = allVehicles.find(v => v.jenis === type && v.status === 'AVAILABLE');
    if (!available) {
      UI.showToast(`Maaf, tidak ada unit ${type} yang tersedia saat ini.`, 'error');
      return;
    }
    this.openQuickBorrowById(available.vehicleId);
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
        start_km: startKm,
        purpose: purpose,
        start_checklist: checklist
      });

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
        listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Belum ada jadwal booking armada.</div>';
        return;
      }

      listContainer.innerHTML = bookings.map(b => `
        <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-md); padding:0.85rem; margin-bottom:0.6rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; font-size:0.9rem;">${b.vehicleName} (${b.nomorPolisi})</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
              📅 ${Utils.formatDate(b.tanggal)} • ⏰ ${b.startTime} - ${b.estimatedEndTime || 'Selesai'}
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
              Keperluan: ${b.purpose} (Oleh: ${b.userName})
            </div>
          </div>
          <div>
            <span class="badge ${b.status === 'APPROVED' ? 'badge-available' : (b.status === 'PENDING' ? 'badge-maintenance' : 'badge-in-use')}">
              ${b.status}
            </span>
            ${b.status === 'APPROVED' && Auth.getUser()?.userId === b.userId ? `
              <button class="btn btn-primary btn-sm" style="margin-top:6px; font-size:0.75rem;" onclick="BookingView.openQuickBorrowById('${b.vehicleId}')">
                ▶ Mulai
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    }
  }
};
