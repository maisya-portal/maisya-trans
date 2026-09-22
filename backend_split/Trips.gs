/**
 * MAISYA-TRANS - Trip Management (Start & Finish Trip)
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Trips.gs
 */

/**
 * Memulai Penggunaan Kendaraan (START PEMAKAIAN)
 */
function handleStartTrip(params) {
  const { userId, vehicleId, bookingId, start_km, purpose, start_checklist } = params;
  
  const startKmNum = Number(start_km);
  if (isNaN(startKmNum) || startKmNum <= 0) {
    return { success: false, message: 'Kilometer awal tidak valid. Masukkan angka sesuai odometer.' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000); // GAS: throw exception jika gagal lock, bukan return false
    lockAcquired = true;
    
    // 1. Dapatkan data kendaraan
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vData = vehicleSheet.getDataRange().getValues();
    let vRowIdx = -1;
    let targetVehicle = null;
    
    for (let i = 1; i < vData.length; i++) {
      if (vData[i][0] === vehicleId) {
        vRowIdx = i + 1;
        targetVehicle = vData[i];
        break;
      }
    }
    
    if (!targetVehicle) {
      return { success: false, message: 'Kendaraan tidak ditemukan di sistem.' };
    }
    
    // Cek apakah kendaraan sedang dipakai orang lain
    const vStatus = targetVehicle[14];
    if (vStatus === CONFIG.STATUS.VEHICLE.IN_USE) {
      return { success: false, message: 'Maaf, kendaraan tersebut baru saja digunakan oleh pengguna lain.' };
    }
    if (vStatus === CONFIG.STATUS.VEHICLE.MAINTENANCE) {
      return { success: false, message: 'Kendaraan sedang dalam status maintenance.' };
    }
    
    // Validasi KM Awal: tidak boleh lebih kecil dari kilometer saat ini di sistem
    const currentKm = Number(targetVehicle[7]) || 0;
    if (startKmNum < currentKm) {
      return { 
        success: false, 
        message: `Kilometer awal (${startKmNum.toLocaleString('id-ID')} KM) tidak boleh lebih kecil dari odometer tercatat terakhir (${currentKm.toLocaleString('id-ID')} KM).` 
      };
    }
    
    const tripId = generateUUID('TRP');
    const now = nowISO();
    
    // 2. Simpan record di TRIPS
    const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
    tripSheet.appendRow([
      tripId,
      bookingId || '',
      userId,
      vehicleId,
      now,
      '', // end_time
      startKmNum,
      '', // end_km
      0,  // distance_km
      0,  // rate_per_km
      0,  // total_cost
      purpose || 'Operasional Pondok',
      typeof start_checklist === 'object' ? JSON.stringify(start_checklist) : (start_checklist || ''),
      '', // return_condition
      '', // damage_notes
      CONFIG.STATUS.TRIP.ACTIVE,
      now
    ]);
    
    // 3. Ubah status kendaraan menjadi IN_USE dan perbarui current_km jika startKm lebih tinggi
    vehicleSheet.getRange(vRowIdx, 15).setValue(CONFIG.STATUS.VEHICLE.IN_USE);
    if (startKmNum > currentKm) {
      vehicleSheet.getRange(vRowIdx, 8).setValue(startKmNum);
    }
    
    // 4. Jika ada booking terkait, ubah status booking
    if (bookingId) {
      const bSheet = getSheet(CONFIG.SHEETS.BOOKINGS);
      const bData = bSheet.getDataRange().getValues();
      for (let i = 1; i < bData.length; i++) {
        if (bData[i][0] === bookingId) {
          bSheet.getRange(i + 1, 9).setValue(CONFIG.STATUS.BOOKING.COMPLETED);
          break;
        }
      }
    }
    
    // 5. Notifikasi Admin
    const userMap = getUserNameMap();
    const userName = userMap[userId] || 'Pengguna';
    addNotification({
      userId: 'ADMIN',
      type: 'KENDARAAN_DIMULAI',
      title: 'Kendaraan Mulai Digunakan',
      message: `${userName} mulai menggunakan ${targetVehicle[2]} ${targetVehicle[3]} (${targetVehicle[4]}) pada KM ${startKmNum.toLocaleString('id-ID')}.`
    });
    
    logAudit(userId, 'START_TRIP', 'TRIPS', tripId, `Mulai trip kendaraan ${targetVehicle[4]} pada KM ${startKmNum}`);
    
    return {
      success: true,
      message: 'Bismillah! Pemakaian kendaraan berhasil dimulai. Semoga perjalanan aman dan berkah.',
      data: {
        tripId,
        vehicleId,
        startKm: startKmNum,
        startTime: now
      }
    };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('lock')) {
      return { success: false, message: 'Server sedang sibuk. Silakan coba sesaat lagi.' };
    }
    return { success: false, message: 'Gagal memulai pemakaian: ' + err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

/**
 * Mengakhiri Penggunaan Kendaraan (SELESAI PEMAKAIAN)
 */
function handleFinishTrip(params) {
  const { tripId, end_km, return_condition, damage_notes, userId } = params;
  
  const endKmNum = Number(end_km);
  if (isNaN(endKmNum) || endKmNum <= 0) {
    return { success: false, message: 'Kilometer akhir tidak valid. Masukkan angka sesuai odometer.' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000); // GAS: throw exception jika gagal lock, bukan return false
    lockAcquired = true;
    
    // 1. Cari trip record
    const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
    const tripData = tripSheet.getDataRange().getValues();
    let tripRowIdx = -1;
    let targetTrip = null;
    
    for (let i = 1; i < tripData.length; i++) {
      if (tripData[i][0] === tripId) {
        tripRowIdx = i + 1;
        targetTrip = tripData[i];
        break;
      }
    }
    
    if (!targetTrip) {
      return { success: false, message: 'Data perjalanan tidak ditemukan.' };
    }
    
    if (targetTrip[15] === CONFIG.STATUS.TRIP.FINISHED) {
      return { success: false, message: 'Perjalanan ini sudah diselesaikan sebelumnya.' };
    }
    
    const startKm = Number(targetTrip[6]);
    const vehicleId = targetTrip[3];
    const tripUserId = targetTrip[2];
    
    // Validasi KM Akhir >= KM Awal
    if (endKmNum < startKm) {
      return { 
        success: false, 
        message: `Kilometer akhir (${endKmNum.toLocaleString('id-ID')}) tidak boleh lebih kecil dari kilometer awal (${startKm.toLocaleString('id-ID')}).` 
      };
    }
    
    const distanceKm = endKmNum - startKm;
    const now = nowISO();
    
    // 2. Dapatkan tarif saat ini (Snapshot Tariff)
    const activeRate = getActiveTariff();
    const totalCost = distanceKm * activeRate;
    
    // 3. Update baris TRIPS
    tripSheet.getRange(tripRowIdx, 6).setValue(now); // end_time
    tripSheet.getRange(tripRowIdx, 8).setValue(endKmNum); // end_km
    tripSheet.getRange(tripRowIdx, 9).setValue(distanceKm); // distance_km
    tripSheet.getRange(tripRowIdx, 10).setValue(activeRate); // rate_per_km (SNAPSHOT)
    tripSheet.getRange(tripRowIdx, 11).setValue(totalCost); // total_cost
    tripSheet.getRange(tripRowIdx, 14).setValue(
      typeof return_condition === 'object' ? JSON.stringify(return_condition) : (return_condition || '')
    );
    tripSheet.getRange(tripRowIdx, 15).setValue(damage_notes || '');
    tripSheet.getRange(tripRowIdx, 16).setValue(CONFIG.STATUS.TRIP.FINISHED);
    
    // 4. Update Kendaraan: Odometer saat ini & status kembali AVAILABLE
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vData = vehicleSheet.getDataRange().getValues();
    let vehicleName = 'Kendaraan';
    let nopol = '';
    
    for (let i = 1; i < vData.length; i++) {
      if (vData[i][0] === vehicleId) {
        const vRow = i + 1;
        vehicleName = `${vData[i][2]} ${vData[i][3]}`;
        nopol = vData[i][4];
        
        // Update current_km
        vehicleSheet.getRange(vRow, 8).setValue(endKmNum);
        
        // Jika ada laporan kerusakan parah, langsung set MAINTENANCE jika ditandai
        if (damage_notes && damage_notes.trim().length > 5) {
          // Tetap buat notifikasi penting
          addNotification({
            userId: 'ADMIN',
            type: 'KERUSAKAN_KENDARAAN',
            title: `Laporan Kerusakan: ${vehicleName} (${nopol})`,
            message: `Catatan kerusakan dari pengguna: "${damage_notes}"`
          });
        }
        
        // Kembalikan status AVAILABLE
        vehicleSheet.getRange(vRow, 15).setValue(CONFIG.STATUS.VEHICLE.AVAILABLE);
        break;
      }
    }
    
    // 5. Cek apakah ada jadwal oli atau tune-up yang tercapai
    checkAndSendMaintenanceAlerts(vehicleId, endKmNum, vehicleName, nopol);
    
    // 6. Hitung durasi perjalanan
    const startTimeDate = new Date(targetTrip[4]);
    const endTimeDate = new Date(now);
    const diffMs = endTimeDate.getTime() - startTimeDate.getTime();
    const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const durationHours = Math.floor(diffMins / 60);
    const durationRestMins = diffMins % 60;
    const durationText = durationHours > 0 
      ? `${durationHours} jam ${durationRestMins} menit` 
      : `${diffMins} menit`;
    
    // 7. Notifikasi selesai ke admin
    const userMap = getUserNameMap();
    const userName = userMap[tripUserId] || 'Pengguna';
    addNotification({
      userId: 'ADMIN',
      type: 'KENDARAAN_SELESAI',
      title: 'Kendaraan Telah Dikembalikan',
      message: `${userName} selesai menggunakan ${vehicleName} (${nopol}). Jarak: ${distanceKm} KM. Biaya: Rp${totalCost.toLocaleString('id-ID')}.`
    });
    
    logAudit(userId || tripUserId, 'FINISH_TRIP', 'TRIPS', tripId, `Selesai trip ${nopol}: ${distanceKm} KM, Rp${totalCost}`);
    
    return {
      success: true,
      message: 'Alhamdulillah! Pemakaian kendaraan selesai.',
      data: {
        tripId,
        vehicleName,
        nomorPolisi: nopol,
        startKm,
        endKm: endKmNum,
        distanceKm,
        ratePerKm: activeRate,
        totalCost,
        durationText,
        purpose: targetTrip[11]
      }
    };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('lock')) {
      return { success: false, message: 'Server sedang sibuk. Silakan coba sesaat lagi.' };
    }
    return { success: false, message: 'Gagal menyelesaikan pemakaian: ' + err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

/**
 * Ambil tarif per KM aktif
 */
function getActiveTariff() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TARIFFS);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][4] === 'ACTIVE') {
        return Number(data[i][1]) || CONFIG.DEFAULT_TARIFF_PER_KM;
      }
    }
  } catch (e) {}
  return CONFIG.DEFAULT_TARIFF_PER_KM;
}

/**
 * Cek dan kirim alert servis/oli jika telah mendekati batas
 */
function checkAndSendMaintenanceAlerts(vehicleId, currentKm, vehicleName, nopol) {
  try {
    const vSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vData = vSheet.getDataRange().getValues();
    for (let i = 1; i < vData.length; i++) {
      if (vData[i][0] === vehicleId) {
        const lastOil = Number(vData[i][10]) || 0;
        const oilInterval = Number(vData[i][12]) || CONFIG.DEFAULT_OIL_INTERVAL_KM;
        const nextOil = lastOil + oilInterval;
        const remainOil = nextOil - currentKm;
        
        if (remainOil <= 0) {
          addNotification({
            userId: 'ADMIN',
            type: 'GANTI_OLI',
            title: `GANTI OLI DIPERLUKAN: ${vehicleName} (${nopol})`,
            message: `Odometer ${currentKm.toLocaleString('id-ID')} KM telah melewati jadwal ganti oli (${nextOil.toLocaleString('id-ID')} KM).`
          });
        } else if (remainOil <= CONFIG.OIL_ALERT_THRESHOLD_KM) {
          addNotification({
            userId: 'ADMIN',
            type: 'GANTI_OLI',
            title: `Pengingat Ganti Oli: ${vehicleName} (${nopol})`,
            message: `Tersisa ${remainOil} KM sebelum batas ganti oli berikutnya.`
          });
        }
        break;
      }
    }
  } catch (e) {}
}

/**
 * Ambil riwayat pemakaian dengan opsi filter
 */
function getTripHistory(filterParams = {}) {
  const sheet = getSheet(CONFIG.SHEETS.TRIPS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const userMap = getUserNameMap();
  const vehicles = getAllVehicles();
  const vehicleMap = {};
  vehicles.forEach(v => { vehicleMap[v.vehicleId] = v; });
  
  const { filterUserId, role, dateFilter, vehicleType } = filterParams;
  const trips = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const tripUserId = row[2];
    
    // User biasa hanya melihat riwayat miliknya
    if (role === CONFIG.ROLES.USER && tripUserId !== filterUserId) {
      continue;
    }
    
    const vId = row[3];
    const vehicle = vehicleMap[vId] || {};
    
    // Filter tipe kendaraan jika diminta
    if (vehicleType && vehicle.jenis && vehicle.jenis !== vehicleType) {
      continue;
    }
    
    trips.push({
      tripId: row[0],
      bookingId: row[1],
      userId: tripUserId,
      userName: userMap[tripUserId] || 'Pengguna Pondok',
      vehicleId: vId,
      vehicleName: vehicle.merk ? `${vehicle.merk} ${vehicle.model}` : 'Kendaraan',
      nomorPolisi: vehicle.nomorPolisi || '-',
      jenis: vehicle.jenis || 'MOTOR',
      startTime: row[4],
      endTime: row[5],
      startKm: Number(row[6]) || 0,
      endKm: Number(row[7]) || 0,
      distanceKm: Number(row[8]) || 0,
      ratePerKm: Number(row[9]) || CONFIG.DEFAULT_TARIFF_PER_KM,
      totalCost: Number(row[10]) || 0,
      purpose: row[11],
      damageNotes: row[14],
      status: row[15],
      createdAt: row[16]
    });
  }
  
  return trips;
}
