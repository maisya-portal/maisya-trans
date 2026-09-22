/**
 * MAISYA-TRANS - Maintenance & Service Logging
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Maintenance.gs
 */

/**
 * Mencatat riwayat servis / ganti oli / tune-up baru
 */
function handleCreateMaintenance(params) {
  const { vehicleId, type, date, km, description, cost, next_due_km, next_due_date, userId } = params;
  
  if (!vehicleId || !type || !km) {
    return { success: false, message: 'Kendaraan, tipe servis, dan kilometer servis wajib diisi.' };
  }
  
  const mSheet = getSheet(CONFIG.SHEETS.MAINTENANCE);
  const vSheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const mId = generateUUID('MNT');
  const serviceKm = Number(km);
  const serviceCost = Number(cost) || 0;
  const serviceDate = date || nowISO().substring(0, 10);
  
  // 1. Simpan ke sheet MAINTENANCE
  mSheet.appendRow([
    mId,
    vehicleId,
    type.toUpperCase(),
    serviceDate,
    serviceKm,
    description || 'Servis berkala',
    serviceCost,
    next_due_km || '',
    next_due_date || '',
    userId || 'ADMIN'
  ]);
  
  // 2. Sinkronisasikan ke data kendaraan di VEHICLES
  const vData = vSheet.getDataRange().getValues();
  for (let i = 1; i < vData.length; i++) {
    if (vData[i][0] === vehicleId) {
      const vRow = i + 1;
      
      // Jika tipe GANTI OLI
      if (type.toUpperCase().includes('OLI')) {
        vSheet.getRange(vRow, 11).setValue(serviceKm); // last_oil_km
        vSheet.getRange(vRow, 12).setValue(serviceDate); // last_oil_date
      }
      
      // Jika tipe TUNE UP atau SERVIS RUTIN
      if (type.toUpperCase().includes('TUNE') || type.toUpperCase().includes('SERVIS')) {
        vSheet.getRange(vRow, 9).setValue(serviceKm); // last_service_km
        vSheet.getRange(vRow, 10).setValue(serviceDate); // last_service_date
      }
      
      // Jika kilometer servis lebih tinggi dari odometer sekarang, sesuaikan odometer
      const currentKm = Number(vData[i][7]) || 0;
      if (serviceKm > currentKm) {
        vSheet.getRange(vRow, 8).setValue(serviceKm);
      }
      
      // Kembalikan status menjadi AVAILABLE jika sebelumnya MAINTENANCE
      if (vData[i][14] === CONFIG.STATUS.VEHICLE.MAINTENANCE) {
        vSheet.getRange(vRow, 15).setValue(CONFIG.STATUS.VEHICLE.AVAILABLE);
      }
      break;
    }
  }
  
  logAudit(userId || 'ADMIN', 'CREATE_MAINTENANCE', 'MAINTENANCE', mId, `Catat ${type} kendaraan ID ${vehicleId} pada KM ${serviceKm}`);
  
  return {
    success: true,
    message: 'Alhamdulillah, catatan servis & pemeliharaan berhasil disimpan.',
    data: { maintenanceId: mId }
  };
}

/**
 * Mengubah status kendaraan menjadi MAINTENANCE atau AVAILABLE
 */
function handleSetVehicleMaintenance(params) {
  const { vehicleId, isMaintenance, reason, userId } = params;
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vehicleId) {
      const rowIdx = i + 1;
      const newStatus = isMaintenance ? CONFIG.STATUS.VEHICLE.MAINTENANCE : CONFIG.STATUS.VEHICLE.AVAILABLE;
      sheet.getRange(rowIdx, 15).setValue(newStatus);
      if (reason) {
        sheet.getRange(rowIdx, 16).setValue(reason);
      }
      
      const vName = `${data[i][2]} ${data[i][3]} (${data[i][4]})`;
      addNotification({
        userId: 'ADMIN',
        type: 'KENDARAAN_MAINTENANCE',
        title: isMaintenance ? `Kendaraan Masuk Bengkel: ${vName}` : `Kendaraan Siap Operasional: ${vName}`,
        message: isMaintenance ? `Alasan: ${reason || 'Perawatan berkala'}` : 'Kendaraan telah selesai diservis dan dapat dipinjam kembali.'
      });
      
      logAudit(userId || 'ADMIN', 'TOGGLE_MAINTENANCE', 'VEHICLES', vehicleId, `Set status ${newStatus} untuk ${vName}`);
      return { success: true, message: `Status kendaraan berhasil diubah menjadi ${newStatus}.` };
    }
  }
  return { success: false, message: 'Kendaraan tidak ditemukan.' };
}

/**
 * Mengambil daftar riwayat servis
 */
function getAllMaintenance(filterVehicleId) {
  const sheet = getSheet(CONFIG.SHEETS.MAINTENANCE);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const vehicles = getAllVehicles();
  const vMap = {};
  vehicles.forEach(v => { vMap[v.vehicleId] = v; });
  
  const list = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const vId = row[1];
    if (filterVehicleId && vId !== filterVehicleId) continue;
    
    const v = vMap[vId] || {};
    list.push({
      maintenanceId: row[0],
      vehicleId: vId,
      vehicleName: v.merk ? `${v.merk} ${v.model}` : 'Kendaraan',
      nomorPolisi: v.nomorPolisi || '-',
      jenis: v.jenis || 'MOTOR',
      type: row[2],
      date: row[3],
      km: Number(row[4]) || 0,
      description: row[5],
      cost: Number(row[6]) || 0,
      nextDueKm: row[7],
      nextDueDate: row[8],
      createdBy: row[9]
    });
  }
  return list;
}
