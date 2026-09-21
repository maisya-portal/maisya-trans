/**
 * MAISYA-TRANS - Trip Execution & Finish Receipt Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const TripsView = {
  currentActiveTrip: null,
  lastFinishedReceipt: null,

  async openFinishModal(tripId) {
    let trip = Store.data.trips.find(t => t.tripId === tripId && t.status === 'ACTIVE');
    if (!trip) {
      const v = Store.data.vehicles.find(x => x.activeTrip && x.activeTrip.tripId === tripId);
      if (v) {
        trip = { ...v.activeTrip, vehicleName: `${v.merk} ${v.model}`, nomorPolisi: v.nomorPolisi, currentKm: v.currentKm };
      }
    }

    if (!trip) {
      const res = await Api.request('getDashboard', 'GET');
      if (res.success && res.data) {
        const vList = res.data.vehicles || [];
        for (const v of vList) {
          if (v.activeTrip && v.activeTrip.tripId === tripId) {
            trip = { ...v.activeTrip, vehicleName: `${v.merk} ${v.model}`, nomorPolisi: v.nomorPolisi, currentKm: v.currentKm };
            break;
          }
        }
      }
    }

    if (!trip) {
      UI.showToast('Data perjalanan aktif tidak ditemukan.', 'error');
      return;
    }

    this.setupFinishModal(trip);
  },

  async openFinishByVehicleId(vehicleId) {
    let trip = null;
    const vLocal = Store.data.vehicles.find(x => x.vehicleId === vehicleId);
    if (vLocal && vLocal.activeTrip) {
      trip = { ...vLocal.activeTrip, vehicleName: `${vLocal.merk} ${vLocal.model}`, nomorPolisi: vLocal.nomorPolisi, currentKm: vLocal.currentKm };
    }
    if (!trip) {
      trip = Store.data.trips.find(t => t.vehicleId === vehicleId && t.status === 'ACTIVE');
    }

    if (!trip) {
      const res = await Api.request('getDashboard', 'GET');
      if (res.success && res.data) {
        const v = res.data.vehicles.find(x => x.vehicleId === vehicleId);
        if (v && v.activeTrip) {
          trip = { ...v.activeTrip, vehicleName: `${v.merk} ${v.model}`, nomorPolisi: v.nomorPolisi, currentKm: v.currentKm };
        }
      }
    }

    if (!trip) {
      UI.showToast('Kendaraan ini sedang tidak dalam status perjalanan aktif.', 'error');
      return;
    }

    this.setupFinishModal(trip);
  },

  setupFinishModal(trip) {
    this.currentActiveTrip = trip;

    document.getElementById('finishTripVehicleName').textContent = `${trip.vehicleName || 'Armada'} (${trip.nomorPolisi || '-'})`;
    document.getElementById('finishTripStartKmBadge').textContent = `KM Awal: ${(trip.startKm || 0).toLocaleString('id-ID')} KM`;
    
    // Default KM akhir adalah KM awal + 1
    const endKmInput = document.getElementById('finishTripEndKmInput');
    if (endKmInput) {
      endKmInput.value = (trip.startKm || 0) + 1;
    }

    // Reset return checklist
    document.getElementById('returnCheckClean').checked = true;
    document.getElementById('returnCheckFuel').checked = true;
    document.getElementById('returnCheckNoDamage').checked = true;
    document.getElementById('returnCheckDamage').checked = false;
    document.getElementById('damageNotesArea').style.display = 'none';
    document.getElementById('returnDamageNotesInput').value = '';

    UI.openModal('modalFinishTrip');
  },

  toggleDamageNote(hasDamage) {
    const area = document.getElementById('damageNotesArea');
    if (area) {
      area.style.display = hasDamage ? 'block' : 'none';
    }
  },

  async submitFinishTrip() {
    if (!this.currentActiveTrip) return;

    const endKmInput = document.getElementById('finishTripEndKmInput');
    const endKm = Number(endKmInput.value);
    const startKm = Number(this.currentActiveTrip.startKm);

    if (!endKm || isNaN(endKm)) {
      UI.showToast('Harap masukkan angka kilometer akhir yang valid.', 'error');
      return;
    }

    if (endKm < startKm) {
      UI.showToast(`KM akhir (${endKm.toLocaleString('id-ID')}) tidak boleh lebih kecil dari KM awal (${startKm.toLocaleString('id-ID')})!`, 'error');
      return;
    }

    const hasDamage = document.getElementById('returnCheckDamage').checked;
    const damageNotes = hasDamage ? document.getElementById('returnDamageNotesInput').value.trim() : '';

    const returnCondition = {
      clean: document.getElementById('returnCheckClean').checked,
      fuel: document.getElementById('returnCheckFuel').checked,
      noDamage: !hasDamage
    };

    const submitBtn = document.getElementById('btnSubmitFinishTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menghitung Biaya...';
    }

    try {
      const res = await Api.request('finishTrip', 'POST', {
        tripId: this.currentActiveTrip.tripId,
        end_km: endKm,
        return_condition: returnCondition,
        damage_notes: damageNotes
      });

      if (res.success && res.data) {
        UI.closeModal('modalFinishTrip');
        UI.showToast('Alhamdulillah, pemakaian selesai!', 'success');
        
        // Simpan struk dan tampilkan modal Struk
        this.lastFinishedReceipt = res.data;
        this.showReceiptModal(res.data);

        // Refresh dashboard jika sedang di dashboard
        if (UI.currentView === 'dashboard') DashboardView.load();
      } else {
        UI.showToast(res.message || 'Gagal menyelesaikan pemakaian.', 'error');
      }
    } catch (err) {
      UI.showToast('Terjadi kesalahan koneksi server.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '⏹ Selesaikan Pemakaian';
      }
    }
  },

  /**
   * Tampilkan Struk Ringkasan Pemakaian
   */
  showReceiptModal(receipt) {
    document.getElementById('receiptVehicleName').textContent = `${receipt.vehicleName} (${receipt.nomorPolisi})`;
    document.getElementById('receiptStartKm').textContent = `${receipt.startKm.toLocaleString('id-ID')} KM`;
    document.getElementById('receiptEndKm').textContent = `${receipt.endKm.toLocaleString('id-ID')} KM`;
    document.getElementById('receiptDistance').textContent = `${receipt.distanceKm} KM`;
    document.getElementById('receiptRate').textContent = `Rp${receipt.ratePerKm.toLocaleString('id-ID')} / KM`;
    document.getElementById('receiptDuration').textContent = receipt.durationText || '-';
    document.getElementById('receiptPurpose').textContent = receipt.purpose || 'Operasional Pondok';
    document.getElementById('receiptTotalCost').textContent = `Rp${receipt.totalCost.toLocaleString('id-ID')}`;

    UI.openModal('modalReceiptSummary');
  },

  /**
   * Bagikan Struk ke WhatsApp
   */
  shareReceiptToWhatsApp() {
    if (!this.lastFinishedReceipt) return;
    const url = Utils.generateWhatsAppShareUrl(this.lastFinishedReceipt);
    window.open(url, '_blank');
  }
};
