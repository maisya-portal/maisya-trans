/**
 * MAISYA-TRANS - Trip Execution, Check-Out & Return Verification
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 */

const TripsView = {
  currentActiveTrip: null,
  lastFinishedReceipt: null,
  checkOutPhotos: {},
  selectedFuelCheckOut: '75%',
  selectedCleanCheckOut: 'Bersih',
  isBbmRefilled: false,
  selectedPaymentMethod: 'TUNAI',
  transferProofBase64: '',
  bbmReceiptBase64: '',

  async openCheckOutByVehicle(vehicleId) {
    let trip = Store.data.trips.find(t => t.vehicleId === vehicleId && t.status === 'ACTIVE');
    if (!trip) {
      const v = Store.data.vehicles.find(x => x.vehicleId === vehicleId);
      if (v && v.activeTrip) {
        trip = {
          tripId: v.activeTrip.tripId,
          vehicleId: v.vehicleId,
          vehicleName: `${v.merk} ${v.model}`,
          nomorPolisi: v.nomorPolisi,
          userName: v.activeTrip.userName,
          divisi: v.activeTrip.divisi,
          startTime: v.activeTrip.startTime,
          startKm: v.activeTrip.startKm,
          purpose: v.activeTrip.purpose,
          ratePerKm: Number(Store.data.settings.DEFAULT_TARIFF) || 1000
        };
      }
    }

    if (!trip) {
      UI.showToast('Data perjalanan aktif tidak ditemukan untuk kendaraan ini.', 'error');
      return;
    }

    this.setupCheckOutModal(trip);
  },

  async openCheckOutModal(tripId) {
    let trip = Store.data.trips.find(t => t.tripId === tripId && t.status === 'ACTIVE');
    if (!trip) {
      const v = Store.data.vehicles.find(x => x.activeTrip && x.activeTrip.tripId === tripId);
      if (v) {
        trip = {
          tripId,
          vehicleId: v.vehicleId,
          vehicleName: `${v.merk} ${v.model}`,
          nomorPolisi: v.nomorPolisi,
          userName: v.activeTrip.userName,
          divisi: v.activeTrip.divisi,
          startTime: v.activeTrip.startTime,
          startKm: v.activeTrip.startKm,
          purpose: v.activeTrip.purpose,
          ratePerKm: Number(Store.data.settings.DEFAULT_TARIFF) || 1000
        };
      }
    }

    if (!trip) {
      UI.showToast('Perjalanan aktif tidak ditemukan.', 'error');
      return;
    }

    this.setupCheckOutModal(trip);
  },

  setupCheckOutModal(trip) {
    this.currentActiveTrip = trip;
    this.checkOutPhotos = {};
    this.bbmReceiptBase64 = '';
    this.transferProofBase64 = '';
    this.isBbmRefilled = false;
    this.selectedPaymentMethod = 'TUNAI';

    document.getElementById('checkOutVehicleTitle').textContent = `${trip.vehicleName || 'Armada'} (${trip.nomorPolisi || '-'})`;
    document.getElementById('checkOutStartKmBadge').textContent = `KM Awal Check-In: ${(trip.startKm || 0).toLocaleString('id-ID')} KM`;
    
    // Default KM Akhir
    const endKmInput = document.getElementById('checkOutEndKmInput');
    if (endKmInput) {
      endKmInput.value = (trip.startKm || 0) + 5;
    }

    this.calculateDistanceAndCost();

    // Reset Fuel & Clean & Photo Slots
    this.setFuelCheckOut('75%');
    this.setCleanCheckOut('Bersih');
    this.setBbmToggle(false);
    this.setPaymentMethod('TUNAI');
    this.resetCheckOutPhotoSlots();

    UI.openModal('modalCheckOut');
  },

  setFuelCheckOut(level) {
    this.selectedFuelCheckOut = level;
    document.querySelectorAll('.fuel-btn-checkout').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
  },

  setCleanCheckOut(cleanliness) {
    this.selectedCleanCheckOut = cleanliness;
    document.querySelectorAll('.clean-btn-checkout').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.clean === cleanliness);
    });
  },

  setBbmToggle(isFilled) {
    this.isBbmRefilled = isFilled;
    const btnYes = document.getElementById('btnBbmYes');
    const btnNo = document.getElementById('btnBbmNo');
    const boxBbmYes = document.getElementById('boxBbmUploadStruk');
    const boxPayment = document.getElementById('boxNonBbmPayment');

    if (btnYes) btnYes.classList.toggle('active', isFilled);
    if (btnNo) btnNo.classList.toggle('active', !isFilled);

    if (boxBbmYes) boxBbmYes.style.display = isFilled ? 'block' : 'none';
    if (boxPayment) boxPayment.style.display = isFilled ? 'none' : 'block';

    this.calculateDistanceAndCost();
  },

  setPaymentMethod(method) {
    this.selectedPaymentMethod = method;
    const btnTunai = document.getElementById('btnPayTunai');
    const btnTransfer = document.getElementById('btnPayTransfer');
    const boxTransferInfo = document.getElementById('boxTransferInfo');

    if (btnTunai) btnTunai.classList.toggle('active', method === 'TUNAI');
    if (btnTransfer) btnTransfer.classList.toggle('active', method === 'TRANSFER');
    if (boxTransferInfo) boxTransferInfo.style.display = method === 'TRANSFER' ? 'block' : 'none';
  },

  calculateDistanceAndCost() {
    if (!this.currentActiveTrip) return;

    const startKm = Number(this.currentActiveTrip.startKm) || 0;
    const endKm = Number(document.getElementById('checkOutEndKmInput')?.value) || startKm;
    const dist = Math.max(0, endKm - startKm);
    const rate = this.currentActiveTrip.ratePerKm || 1000;
    const cost = this.isBbmRefilled ? 0 : (dist * rate);

    const distEl = document.getElementById('checkOutCalcDistance');
    const costEl = document.getElementById('checkOutCalcCost');
    const waivedBadge = document.getElementById('checkOutWaivedBadge');

    if (distEl) distEl.textContent = `${dist.toLocaleString('id-ID')} KM`;
    if (costEl) costEl.textContent = `Rp${cost.toLocaleString('id-ID')}`;
    if (waivedBadge) waivedBadge.style.display = this.isBbmRefilled ? 'inline-block' : 'none';
  },

  resetCheckOutPhotoSlots() {
    ['front', 'side', 'odometer'].forEach(side => {
      const slot = document.getElementById(`photoSlotCheckOut_${side}`);
      if (slot) {
        slot.classList.remove('has-image');
        slot.innerHTML = `
          <div style="font-size:1.4rem;">📷</div>
          <div class="photo-slot-label">${BookingView.getSlotLabel(side)}</div>
          <input type="file" accept="image/*" style="display:none;" onchange="BookingView.handlePhotoUpload(this, 'checkOut', '${side}')">
        `;
        slot.onclick = (e) => {
          if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('photo-slot-btn-remove')) {
            slot.querySelector('input[type=file]')?.click();
          }
        };
      }
    });
  },

  removePhoto(side) {
    delete this.checkOutPhotos[side];
    const slot = document.getElementById(`photoSlotCheckOut_${side}`);
    if (slot) {
      slot.classList.remove('has-image');
      slot.innerHTML = `
        <div style="font-size:1.4rem;">📷</div>
        <div class="photo-slot-label">${BookingView.getSlotLabel(side)}</div>
        <input type="file" accept="image/*" style="display:none;" onchange="BookingView.handlePhotoUpload(this, 'checkOut', '${side}')">
      `;
    }
  },

  handleBbmReceiptUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.bbmReceiptBase64 = e.target.result;
      const preview = document.getElementById('bbmReceiptPreview');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  },

  handleTransferProofUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.transferProofBase64 = e.target.result;
      const preview = document.getElementById('transferProofPreview');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  },

  copyBankAccount() {
    const acc = Store.data.settings?.BANK_ACCOUNT_NO || '5221717173';
    navigator.clipboard.writeText(acc).then(() => {
      UI.showToast(`Nomor rekening ${acc} berhasil disalin!`, 'success');
    }).catch(() => {
      UI.showToast(`Nomor rekening: ${acc}`, 'info');
    });
  },

  /**
   * Submit Check-Out Pengembalian Kendaraan
   */
  async submitCheckOut() {
    if (!this.currentActiveTrip) return;

    const endKm = Number(document.getElementById('checkOutEndKmInput').value);
    const startKm = Number(this.currentActiveTrip.startKm);

    if (!endKm || isNaN(endKm)) {
      UI.showToast('Harap masukkan angka kilometer akhir yang valid.', 'error');
      return;
    }
    if (endKm < startKm) {
      UI.showToast(`KM akhir (${endKm}) tidak boleh lebih kecil dari KM awal (${startKm})!`, 'error');
      return;
    }

    const damageNotes = document.getElementById('checkOutDamageNotesInput')?.value.trim() || '';
    const exteriorCondition = document.getElementById('checkOutExteriorSelect')?.value || 'Baik';
    const bbmCost = document.getElementById('checkOutBbmCostInput')?.value || 0;

    const btn = document.getElementById('btnSubmitCheckOut');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan Laporan...';
    }

    try {
      const res = await Api.request('checkOutTrip', 'POST', {
        tripId: this.currentActiveTrip.tripId,
        endKm,
        fuelLevel: this.selectedFuelCheckOut,
        cleanliness: this.selectedCleanCheckOut,
        exteriorCondition,
        damageNotes,
        photos: this.checkOutPhotos,
        isBbmFilled: this.isBbmRefilled,
        bbmCost,
        bbmReceiptUrl: this.bbmReceiptBase64,
        paymentMethod: this.selectedPaymentMethod,
        transferProofUrl: this.transferProofBase64
      });

      if (res.success && res.data) {
        UI.closeModal('modalCheckOut');
        UI.showToast('Alhamdulillah, Check-Out berhasil dilaporkan!', 'success');

        this.lastFinishedReceipt = res.data;
        this.showReceiptModal(res.data);

        DashboardView.load();
      } else {
        UI.showToast(res.message || 'Gagal menyelesaikan Check-Out.', 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan koneksi server.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⏹ Selesaikan Check-Out &amp; Kembalikan Kunci';
      }
    }
  },

  /**
   * Tampilkan Struk Ringkasan Pemakaian & Tombol WA
   */
  showReceiptModal(receipt) {
    document.getElementById('receiptVehicleName').textContent = `${receipt.vehicleName} (${receipt.nomorPolisi})`;
    document.getElementById('receiptStartKm').textContent = `${(receipt.startKm || 0).toLocaleString('id-ID')} KM`;
    document.getElementById('receiptEndKm').textContent = `${(receipt.endKm || 0).toLocaleString('id-ID')} KM`;
    document.getElementById('receiptDistance').textContent = `${(receipt.distanceKm || 0).toLocaleString('id-ID')} KM`;
    document.getElementById('receiptDuration').textContent = receipt.durationText || '1 jam';
    document.getElementById('receiptPurpose').textContent = receipt.purpose || 'Operasional Pondok';
    
    const costEl = document.getElementById('receiptTotalCost');
    const isWaived = receipt.checkOut?.isBbmFilled || receipt.totalCost === 0;

    if (isWaived) {
      costEl.innerHTML = `<span style="color:#10B981;">Rp 0 (BEBAS BIAYA / ISI BBM)</span>`;
    } else {
      costEl.textContent = `Rp${(receipt.totalCost || 0).toLocaleString('id-ID')}`;
    }

    const payStatusEl = document.getElementById('receiptPaymentStatus');
    if (payStatusEl) {
      payStatusEl.textContent = isWaived ? 'DIBEBASKAN (ISI BENSIN)' : (receipt.checkOut?.paymentMethod === 'TRANSFER' ? 'TRANSFER BANK' : 'TUNAI');
    }

    UI.openModal('modalReceiptSummary');
  },

  /**
   * Bagikan Struk ke WhatsApp
   */
  shareReceiptToWhatsApp() {
    if (!this.lastFinishedReceipt) return;
    const r = this.lastFinishedReceipt;
    const isWaived = r.checkOut?.isBbmFilled || r.totalCost === 0;
    const costText = isWaived ? 'Rp 0 (BEBAS BIAYA KARENA ISI BENSIN)' : `Rp${(r.totalCost || 0).toLocaleString('id-ID')}`;

    const text = encodeURIComponent(
      `🧾 *STRUK PENGEMBALIAN KENDARAAN*\n` +
      `*Pondok Pesantren Imam Syafi'i Brebes*\n\n` +
      `🚗 *Kendaraan:* ${r.vehicleName} (${r.nomorPolisi})\n` +
      `👤 *Peminjam:* ${r.userName} (${r.divisi || 'Pondok'})\n` +
      `📍 *Keperluan:* ${r.purpose}\n` +
      `🛣️ *KM Awal:* ${(r.startKm || 0).toLocaleString('id-ID')} KM\n` +
      `🛣️ *KM Akhir:* ${(r.endKm || 0).toLocaleString('id-ID')} KM\n` +
      `📏 *Total Jarak:* ${(r.distanceKm || 0).toLocaleString('id-ID')} KM\n` +
      `⏱️ *Durasi:* ${r.durationText || '-'}\n` +
      `💰 *Total Biaya:* ${costText}\n\n` +
      `_Alhamdulillah pemakaian selesai dan kunci telah diserahkan ke Admin Sarpras._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
};
