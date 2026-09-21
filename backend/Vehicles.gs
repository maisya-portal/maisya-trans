/**
 * MAISYA-TRANS - Vehicle Management & Health Monitoring
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Vehicles.gs
 */

/**
 * Mendapatkan daftar seluruh kendaraan beserta kalkulasi indikator servis/oli
 */
function getAllVehicles() {
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  // Ambil data trip aktif untuk mengetahui siapa pengguna yang sedang memakai kendaraan
  const activeTripsMap = getActiveTripsMap();
  
  const vehicles = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const vehicleId = row[0];
    const jenis = row[1];
    const merk = row[2];
    const model = row[3];
    const nopol = row[4];
    const currentKm = Number(row[7]) || 0;
    const lastServiceKm = Number(row[8]) || 0;
    const lastServiceDate = row[9];
    const lastOilKm = Number(row[10]) || 0;
    const lastOilDate = row[11];
    const oilInterval = Number(row[12]) || CONFIG.DEFAULT_OIL_INTERVAL_KM;
    const tuneupInterval = Number(row[13]) || CONFIG.DEFAULT_TUNEUP_INTERVAL_KM;
    const status = row[14] || CONFIG.STATUS.VEHICLE.AVAILABLE;
    const notes = row[15] || '';
    const imageUrl = row[17] || '';
    
    // Perhitungan Oli
    const nextOilKm = lastOilKm + oilInterval;
    const remainingOilKm = nextOilKm - currentKm;
    let oilStatus = 'OK';
    let oilStatusText = `${remainingOilKm} KM lagi`;
    if (remainingOilKm <= 0) {
      oilStatus = 'OVERDUE';
      oilStatusText = `GANTI OLI DIPERLUKAN (Terlambat ${Math.abs(remainingOilKm)} KM)`;
    } else if (remainingOilKm <= CONFIG.OIL_ALERT_THRESHOLD_KM) {
      oilStatus = 'WARNING';
      oilStatusText = `Ganti oli dalam ${remainingOilKm} KM`;
    }
    
    // Perhitungan Tune-up
    const nextTuneupKm = lastServiceKm + tuneupInterval;
    const remainingTuneupKm = nextTuneupKm - currentKm;
    let tuneupStatus = 'OK';
    let tuneupStatusText = `${remainingTuneupKm} KM lagi`;
    if (remainingTuneupKm <= 0) {
      tuneupStatus = 'OVERDUE';
      tuneupStatusText = `Tune-up sudah jatuh tempo (Terlambat ${Math.abs(remainingTuneupKm)} KM)`;
    } else if (remainingTuneupKm <= CONFIG.TUNEUP_ALERT_THRESHOLD_KM) {
      tuneupStatus = 'WARNING';
      tuneupStatusText = `Tune-up dalam ${remainingTuneupKm} KM`;
    }
    
    // Status Kesehatan Keseluruhan
    let health = 'GOOD'; // 🟢 Baik
    let healthLabel = 'Baik';
    if (oilStatus === 'OVERDUE' || tuneupStatus === 'OVERDUE') {
      health = 'DANGER'; // 🔴 Perlu Servis
      healthLabel = 'Perlu Servis';
    } else if (oilStatus === 'WARNING' || tuneupStatus === 'WARNING') {
      health = 'WARNING'; // 🟡 Perlu Perhatian
      healthLabel = 'Perlu Perhatian';
    }
    
    // Cek info pengguna aktif jika sedang digunakan
    const activeTrip = activeTripsMap[vehicleId] || null;
    
    vehicles.push({
      vehicleId,
      jenis,
      merk,
      model,
      nomorPolisi: nopol,
      tahun: row[5],
      warna: row[6],
      currentKm,
      lastServiceKm,
      lastServiceDate,
      lastOilKm,
      lastOilDate,
      oilIntervalKm: oilInterval,
      tuneupIntervalKm: tuneupInterval,
      nextOilKm,
      remainingOilKm,
      oilStatus,
      oilStatusText,
      nextTuneupKm,
      remainingTuneupKm,
      tuneupStatus,
      tuneupStatusText,
      health,
      healthLabel,
      status,
      notes,
      imageUrl,
      activeTrip,
      createdAt: row[16]
    });
  }
  
  return vehicles;
}

/**
 * Peta kendaraan yang sedang aktif digunakan saat ini
 */
function getActiveTripsMap() {
  const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
  const data = tripSheet.getDataRange().getValues();
  const map = {};
  if (data.length <= 1) return map;
  
  // Dapatkan nama-nama user
  const userMap = getUserNameMap();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[15];
    if (status === CONFIG.STATUS.TRIP.ACTIVE) {
      const vId = row[3];
      const uId = row[2];
      map[vId] = {
        tripId: row[0],
        bookingId: row[1],
        userId: uId,
        userName: userMap[uId] || 'Pengguna Pondok',
        startTime: row[4],
        startKm: Number(row[6]) || 0,
        purpose: row[11]
      };
    }
  }
  return map;
}

function getUserNameMap() {
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    map[data[i][0]] = data[i][1];
  }
  return map;
}

/**
 * Tambah Kendaraan Baru (Khusus Admin)
 */
function handleAddVehicle(params) {
  const { jenis, merk, model, nomor_polisi, tahun, warna, current_km, oil_interval_km, tuneup_interval_km, notes, imageUrl, userId } = params;
  
  if (!nomor_polisi || !merk || !model || !jenis) {
    return { success: false, message: 'Nomor Polisi, Merk, Model, dan Jenis wajib diisi.' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  const cleanNopol = nomor_polisi.toUpperCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][4]).toUpperCase().trim() === cleanNopol) {
      return { success: false, message: `Kendaraan dengan plat nomor ${cleanNopol} sudah ada di sistem.` };
    }
  }
  
  const vehicleId = generateUUID('VEH');
  const now = nowISO();
  const km = Number(current_km) || 0;
  const oilInterval = Number(oil_interval_km) || (jenis === 'MOBIL' ? 5000 : 2000);
  const tuneupInterval = Number(tuneup_interval_km) || (jenis === 'MOBIL' ? 10000 : 5000);
  
  const newRow = [
    vehicleId,
    jenis.toUpperCase(),
    merk.trim(),
    model.trim(),
    cleanNopol,
    tahun || new Date().getFullYear(),
    warna || 'Standar',
    km,
    km, // last_service_km
    now.substring(0, 10), // last_service_date
    km, // last_oil_km
    now.substring(0, 10), // last_oil_date
    oilInterval,
    tuneupInterval,
    CONFIG.STATUS.VEHICLE.AVAILABLE,
    notes || '',
    now,
    imageUrl || ''
  ];
  
  sheet.appendRow(newRow);
  logAudit(userId || 'ADMIN', 'ADD_VEHICLE', 'VEHICLES', vehicleId, `Tambah kendaraan: ${cleanNopol} (${merk} ${model})`);
  
  return {
    success: true,
    message: 'Alhamdulillah, data armada kendaraan berhasil ditambahkan.',
    data: { vehicleId }
  };
}

/**
 * Update Data Kendaraan
 */
function handleUpdateVehicle(params) {
  const { vehicleId, merk, model, nomor_polisi, tahun, warna, status, notes, oil_interval_km, tuneup_interval_km, imageUrl, userId } = params;
  
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vehicleId) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: 'Kendaraan tidak ditemukan.' };
  }
  
  if (merk) sheet.getRange(foundRow, 3).setValue(merk);
  if (model) sheet.getRange(foundRow, 4).setValue(model);
  if (nomor_polisi) sheet.getRange(foundRow, 5).setValue(nomor_polisi.toUpperCase().trim());
  if (tahun) sheet.getRange(foundRow, 6).setValue(tahun);
  if (warna) sheet.getRange(foundRow, 7).setValue(warna);
  if (oil_interval_km) sheet.getRange(foundRow, 13).setValue(Number(oil_interval_km));
  if (tuneup_interval_km) sheet.getRange(foundRow, 14).setValue(Number(tuneup_interval_km));
  if (status) sheet.getRange(foundRow, 15).setValue(status);
  if (notes !== undefined) sheet.getRange(foundRow, 16).setValue(notes);
  if (imageUrl !== undefined) sheet.getRange(foundRow, 18).setValue(imageUrl);
  
  logAudit(userId || 'ADMIN', 'UPDATE_VEHICLE', 'VEHICLES', vehicleId, `Update data kendaraan ID ${vehicleId}`);
  
  return { success: true, message: 'Data kendaraan berhasil diperbarui.' };
}

/**
 * Hapus Kendaraan dari Sistem (Khusus Admin)
 * Tidak bisa menghapus kendaraan yang sedang digunakan
 */
function handleDeleteVehicle(params) {
  const { vehicleId, userId } = params;

  if (!vehicleId) {
    return { success: false, message: 'ID kendaraan tidak valid.' };
  }

  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vehicleId) {
      const nopol = data[i][4];
      const merk  = data[i][2];
      const model = data[i][3];
      const status = data[i][14];

      // Tolak penghapusan jika kendaraan sedang dipakai
      if (status === CONFIG.STATUS.VEHICLE.IN_USE) {
        return {
          success: false,
          message: `Kendaraan ${merk} ${model} (${nopol}) tidak dapat dihapus karena sedang digunakan.`
        };
      }

      sheet.deleteRow(i + 1);
      logAudit(userId || 'ADMIN', 'DELETE_VEHICLE', 'VEHICLES', vehicleId,
        `Hapus kendaraan: ${nopol} (${merk} ${model})`);

      return { success: true, message: `Kendaraan ${merk} ${model} (${nopol}) berhasil dihapus dari sistem.` };
    }
  }

  return { success: false, message: 'Kendaraan tidak ditemukan.' };
}

