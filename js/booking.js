/**
 * MAISYA-TRANS - Booking & Vehicle Check-In Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const BookingView = {
  vehicles: [],
  selectedVehicle: null,
  selectedFuelCheckIn: '75%',
  selectedCleanCheckIn: 'Bersih',
  checkInPhotos: {},

  async load() {
    const res = await Api.request('getVehicles', 'GET');
    if (res.success && res.data) {
      this.vehicles = res.data;
      this.populateVehicleSelect();
    }
    this.renderBookingCalendar();
    this.renderHistory();
  },

  populateVehicleSelect(preselectId) {
    const select = document.getElementById('bookingVehicleSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Armada Kendaraan --</option>';
    this.vehicles.forEach(v => {
      const isAvailable = v.status === 'AVAILABLE' || v.status === 'APPROVED';
      const label = `${v.jenis === 'MOTOR' ? '🏍️' : '🚗'} ${v.merk} ${v.model} (${v.nomorPolisi}) - ${v.status === 'AVAILABLE' ? 'Tersedia' : (v.status === 'APPROVED' ? 'Disetujui' : 'Tidak Tersedia')}`;
      const selected = v.vehicleId === preselectId ? 'selected' : '';
      select.innerHTML += `<option value="${v.vehicleId}" ${selected} ${!isAvailable && v.vehicleId !== preselectId ? 'disabled' : ''}>${label}</option>`;
    });
  },

  openBookingModal() {
    UI.switchView('booking');
    const dateInput = document.getElementById('bookingDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().substring(0, 10);
    }
  },

  openBookingForVehicle(vehicleId) {
    UI.switchView('booking');
    this.populateVehicleSelect(vehicleId);
    const select = document.getElementById('bookingVehicleSelect');
    if (select) select.value = vehicleId;

    const dateInput = document.getElementById('bookingDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().substring(0, 10);
    }
  },

  /**
   * Submit Formulir Peminjaman Terbuka (Tanpa Login)
   */
  async submitBookingForm(e) {
    if (e) e.preventDefault();

    const vehicleId = document.getElementById('bookingVehicleSelect').value;
    const userName = document.getElementById('bookingUserName').value.trim();
    const divisi = document.getElementById('bookingDivisi').value.trim();
    const purpose = document.getElementById('bookingPurpose').value.trim();
    const tujuan = document.getElementById('bookingTujuan').value.trim();
    const tanggal = document.getElementById('bookingDate').value;
    const startTime = document.getElementById('bookingStartTime').value;
    const estimatedEndTime = document.getElementById('bookingEndTime').value;
    const passengerCount = document.getElementById('bookingPassengers').value;
    const noHp = document.getElementById('bookingNoHp').value.trim();
    const notes = document.getElementById('bookingNotes')?.value.trim() || '';

    if (!vehicleId) {
      UI.showToast('Harap pilih kendaraan yang akan dipinjam.', 'error');
      return;
    }
    if (!userName || !divisi || !tujuan || !tanggal || !startTime || !noHp) {
      UI.showToast('Harap lengkapi semua kolom bertanda bintang (*).', 'error');
      return;
    }

    const btnSubmit = document.getElementById('btnSubmitBooking');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Mengirim Permohonan...';
    }

    try {
      const res = await Api.request('createBooking', 'POST', {
        vehicleId,
        userName,
        divisi,
        purpose,
        tujuan,
        tanggal,
        startTime,
        estimatedEndTime,
        passengerCount,
        noHp,
        notes
      });

      if (res.success) {
        UI.showToast('Alhamdulillah, pengajuan peminjaman berhasil dikirim!', 'success');
        
        // Reset form
        document.getElementById('formBooking').reset();
        
        // Tampilkan modal dialog konfirmasi & link WhatsApp ke Admin Sarpras
        this.showBookingSuccessModal(res.data);

        // Segarkan antrean
        this.load();
        DashboardView.load();
      } else {
        UI.showToast(res.message || 'Gagal mengirim pengajuan.', 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Ajukan Peminjaman';
      }
    }
  },

  showBookingSuccessModal(booking) {
    const waText = encodeURIComponent(
      `Assalamu'alaikum Admin Sarpras PP. Imam Syafi'i,\n` +
      `Saya *${booking.userName}* (${booking.divisi}) telah mengajukan peminjaman kendaraan:\n` +
      `🚗 *${booking.vehicleName}* (${booking.nomorPolisi})\n` +
      `📅 Tanggal: ${booking.tanggal} (${booking.startTime} - ${booking.estimatedEndTime})\n` +
      `📍 Tujuan: ${booking.tujuan}\n` +
      `👥 Penumpang: ${booking.passengerCount} orang\n` +
      `Mohon persetujuan Admin Sarpras. Syukron jazakumullah khairan.`
    );
    const waUrl = `https://wa.me/6281234567890?text=${waText}`;

    const modalBody = document.getElementById('modalBookingSuccessContent');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align:center; padding:1rem 0;">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.15); color:#10B981; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 1rem;">
            ✓
          </div>
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--primary-700); margin-bottom:0.4rem;">
            Pengajuan Berhasil Terkirim!
          </h3>
          <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1.25rem;">
            Status permohonan Anda kini <strong>Menunggu Persetujuan Admin Sarpras</strong>.<br>
            Setelah disetujui, Anda dapat mengambil kunci kendaraan dan melakukan <strong>Check-In</strong> di aplikasi.
          </p>

          <div style="background:var(--surface-secondary); padding:1rem; border-radius:12px; text-align:left; font-size:0.82rem; margin-bottom:1.25rem;">
            <div><strong>Peminjam:</strong> ${booking.userName} (${booking.divisi})</div>
            <div style="margin-top:2px;"><strong>Kendaraan:</strong> ${booking.vehicleName} (${booking.nomorPolisi})</div>
            <div style="margin-top:2px;"><strong>Jadwal:</strong> ${booking.tanggal} • ${booking.startTime} - ${booking.estimatedEndTime}</div>
            <div style="margin-top:2px;"><strong>Tujuan:</strong> ${booking.tujuan}</div>
          </div>

          <a href="${waUrl}" target="_blank" class="btn btn-gold btn-block" style="font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📱</span>
            <span>Konfirmasi ke Admin via WhatsApp</span>
          </a>
        </div>
      `;
    }

    UI.openModal('modalBookingSuccess');
  },

  /**
   * =========================================================================
   * CHECK-IN KENDARAAN (SERAH TERIMA KONDISI AWAL & MULAI ARGO)
   * =========================================================================
   */
  openCheckInModal(vehicleId) {
    const v = Store.data.vehicles.find(x => x.vehicleId === vehicleId);
    if (!v) {
      UI.showToast('Data armada tidak ditemukan.', 'error');
      return;
    }

    this.selectedVehicle = v;
    this.checkInPhotos = {};
    this.selectedFuelCheckIn = '75%';
    this.selectedCleanCheckIn = 'Bersih';

    document.getElementById('checkInVehicleTitle').textContent = `${v.merk} ${v.model} (${v.nomorPolisi})`;
    document.getElementById('checkInKmInput').value = v.currentKm || 0;
    document.getElementById('checkInLastKmBadge').textContent = `Odometer Terakhir: ${(v.currentKm || 0).toLocaleString('id-ID')} KM`;
    
    // Prefill peminjam jika ada approved booking
    const booking = v.approvedBooking || (Store.data.bookings.find(b => b.vehicleId === vehicleId && b.status === 'APPROVED'));
    if (booking) {
      document.getElementById('checkInUserNameInput').value = booking.userName || '';
      document.getElementById('checkInDivisiInput').value = booking.divisi || '';
      document.getElementById('checkInPurposeInput').value = booking.purpose || '';
      document.getElementById('checkInTujuanInput').value = booking.tujuan || booking.purpose || '';
      document.getElementById('checkInNoHpInput').value = booking.noHp || '';
      this._activeBookingId = booking.bookingId;
    } else {
      document.getElementById('checkInUserNameInput').value = '';
      document.getElementById('checkInDivisiInput').value = '';
      document.getElementById('checkInPurposeInput').value = 'Operasional Pesantren';
      document.getElementById('checkInTujuanInput').value = 'Brebes';
      document.getElementById('checkInNoHpInput').value = '';
      this._activeBookingId = '';
    }

    // Reset UI fuel & clean selector
    this.setFuelCheckIn('75%');
    this.setCleanCheckIn('Bersih');
    this.resetPhotoSlots();

    UI.openModal('modalCheckIn');
  },

  setFuelCheckIn(level) {
    this.selectedFuelCheckIn = level;
    document.querySelectorAll('.fuel-btn-checkin').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
  },

  setCleanCheckIn(cleanliness) {
    this.selectedCleanCheckIn = cleanliness;
    document.querySelectorAll('.clean-btn-checkin').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.clean === cleanliness);
    });
  },

  resetPhotoSlots() {
    ['front', 'side', 'back', 'odometer'].forEach(side => {
      const slot = document.getElementById(`photoSlotCheckIn_${side}`);
      if (slot) {
        slot.classList.remove('has-image');
        slot.innerHTML = `
          <div style="font-size:1.4rem;">📷</div>
          <div class="photo-slot-label">${this.getSlotLabel(side)}</div>
          <input type="file" accept="image/*" style="display:none;" onchange="BookingView.handlePhotoUpload(this, 'checkIn', '${side}')">
        `;
        slot.onclick = (e) => {
          if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('photo-slot-btn-remove')) {
            slot.querySelector('input[type=file]')?.click();
          }
        };
      }
    });
  },

  getSlotLabel(side) {
    const map = { front: 'Tampak Depan', side: 'Tampak Samping', back: 'Tampak Belakang', odometer: 'Foto Speedometer' };
    return map[side] || side;
  },

  handlePhotoUpload(input, type, side) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      if (type === 'checkIn') {
        this.checkInPhotos[side] = base64;
        const slot = document.getElementById(`photoSlotCheckIn_${side}`);
        if (slot) {
          slot.classList.add('has-image');
          slot.innerHTML = `
            <img src="${base64}" alt="${side}">
            <button type="button" class="photo-slot-btn-remove" onclick="event.stopPropagation(); BookingView.removePhoto('checkIn', '${side}')">✕</button>
          `;
        }
      } else if (type === 'checkOut') {
        TripsView.checkOutPhotos[side] = base64;
        const slot = document.getElementById(`photoSlotCheckOut_${side}`);
        if (slot) {
          slot.classList.add('has-image');
          slot.innerHTML = `
            <img src="${base64}" alt="${side}">
            <button type="button" class="photo-slot-btn-remove" onclick="event.stopPropagation(); TripsView.removePhoto('${side}')">✕</button>
          `;
        }
      }
    };
    reader.readAsDataURL(file);
  },

  removePhoto(type, side) {
    if (type === 'checkIn') {
      delete this.checkInPhotos[side];
      const slot = document.getElementById(`photoSlotCheckIn_${side}`);
      if (slot) {
        slot.classList.remove('has-image');
        slot.innerHTML = `
          <div style="font-size:1.4rem;">📷</div>
          <div class="photo-slot-label">${this.getSlotLabel(side)}</div>
          <input type="file" accept="image/*" style="display:none;" onchange="BookingView.handlePhotoUpload(this, 'checkIn', '${side}')">
        `;
      }
    }
  },

  /**
   * Submit Check-In: Mulai Menggunakan Kendaraan & Aktifkan Argo Real-time!
   */
  async submitCheckIn() {
    if (!this.selectedVehicle) return;

    const startKm = Number(document.getElementById('checkInKmInput').value);
    const userName = document.getElementById('checkInUserNameInput').value.trim();
    const divisi = document.getElementById('checkInDivisiInput').value.trim();
    const purpose = document.getElementById('checkInPurposeInput').value.trim();
    const tujuan = document.getElementById('checkInTujuanInput').value.trim();
    const noHp = document.getElementById('checkInNoHpInput').value.trim();
    const damageNotes = document.getElementById('checkInDamageNotesInput')?.value.trim() || '';
    const exteriorCondition = document.getElementById('checkInExteriorSelect')?.value || 'Bagus / Tidak ada cacat';

    if (!startKm || startKm < (this.selectedVehicle.currentKm || 0)) {
      UI.showToast(`Kilometer awal (${startKm}) tidak boleh lebih kecil dari odometer tercatat (${this.selectedVehicle.currentKm}).`, 'error');
      return;
    }
    if (!userName || !tujuan) {
      UI.showToast('Harap lengkapi nama peminjam dan tujuan perjalanan.', 'error');
      return;
    }

    const consentCheck = document.getElementById('checkInConsentCheck');
    if (consentCheck && !consentCheck.checked) {
      UI.showToast('Harap centang konfirmasi tanggung jawab serah terima kendaraan.', 'warning');
      return;
    }

    const btn = document.getElementById('btnSubmitCheckIn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Memulai Argo...';
    }

    try {
      const res = await Api.request('checkInTrip', 'POST', {
        vehicleId: this.selectedVehicle.vehicleId,
        bookingId: this._activeBookingId || '',
        startKm,
        fuelLevel: this.selectedFuelCheckIn,
        cleanliness: this.selectedCleanCheckIn,
        exteriorCondition,
        damageNotes,
        photos: this.checkInPhotos,
        userName,
        divisi,
        noHp,
        purpose,
        tujuan
      });

      if (res.success) {
        UI.closeModal('modalCheckIn');
        UI.showToast('Bismillah! Pemakaian dimulai dan argo aktif berjalan.', 'success');
        
        // Kembali ke dashboard agar pengguna langsung melihat argo berjalan
        UI.switchView('dashboard');
        DashboardView.load();
      } else {
        UI.showToast(res.message || 'Gagal memulai pemakaian.', 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan koneksi server.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '▶ Bismillah, Mulai Menggunakan Kendaraan';
      }
    }
  },

  renderBookingCalendar() {
    const container = document.getElementById('activeBookingsList');
    if (!container) return;

    const bookings = Store.data.bookings.filter(b => b.status === 'PENDING' || b.status === 'APPROVED');
    if (bookings.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
          Tidak ada jadwal reservasi aktif. Semua armada bebas dipinjam.
        </div>
      `;
      return;
    }

    container.innerHTML = bookings.map(b => `
      <div style="background:var(--surface-secondary); padding:0.75rem; border-radius:10px; margin-bottom:0.5rem; font-size:0.82rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--text-primary);">${b.userName}</strong>
          <span class="badge ${b.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}">${b.status === 'APPROVED' ? 'Disetujui' : 'Menunggu'}</span>
        </div>
        <div style="color:var(--primary-700); font-weight:700; margin-top:2px;">${b.vehicleName} (${b.nomorPolisi || '-'})</div>
        <div style="color:var(--text-muted); margin-top:2px;">📅 ${b.tanggal} • 🕒 ${b.startTime} - ${b.estimatedEndTime}</div>
        <div style="color:var(--text-secondary); margin-top:2px;">📍 Tujuan: ${b.tujuan || b.purpose}</div>
      </div>
    `).join('');
  },

  renderHistory() {
    const container = document.getElementById('bookingHistoryContainer');
    if (!container) return;

    const all = Store.data.bookings.slice(0, 5);
    if (all.length === 0) {
      container.innerHTML = `
        <div style="color:var(--text-muted); font-size:0.82rem;">Belum ada riwayat permohonan.</div>
      `;
      return;
    }

    container.innerHTML = all.map(b => `
      <div style="border-left:3px solid var(--primary-600); padding-left:0.75rem; font-size:0.82rem;">
        <div style="font-weight:700;">${b.vehicleName}</div>
        <div style="color:var(--text-muted); font-size:0.75rem;">${b.tanggal} • ${b.purpose}</div>
      </div>
    `).join('');
  }
};
