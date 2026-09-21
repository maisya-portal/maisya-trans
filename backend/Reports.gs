/**
 * MAISYA-TRANS - Statistics, Analytics & Reports
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Reports.gs
 */

/**
 * Mendapatkan ringkasan statistik lengkap untuk dashboard dan laporan
 */
function getFullStatistics() {
  const users = getAllUsers();
  const vehicles = getAllVehicles();
  const trips = getTripHistory({});
  
  // 1. Hitung User KPI
  let totalUsers = 0;
  let pendingUsers = 0;
  let activeUsers = 0;
  users.forEach(u => {
    totalUsers++;
    if (u.status === CONFIG.STATUS.USER.PENDING) pendingUsers++;
    if (u.status === CONFIG.STATUS.USER.ACTIVE) activeUsers++;
  });
  
  // 2. Hitung Kendaraan KPI
  let totalVehicles = vehicles.length;
  let countMotor = 0;
  let countMobil = 0;
  let countAvailable = 0;
  let countInUse = 0;
  let countMaintenance = 0;
  
  vehicles.forEach(v => {
    if (v.jenis === 'MOTOR') countMotor++;
    if (v.jenis === 'MOBIL') countMobil++;
    if (v.status === CONFIG.STATUS.VEHICLE.AVAILABLE) countAvailable++;
    if (v.status === CONFIG.STATUS.VEHICLE.IN_USE) countInUse++;
    if (v.status === CONFIG.STATUS.VEHICLE.MAINTENANCE) countMaintenance++;
  });
  
  // 3. Hitung Statistik Bulanan (Bulan Ini)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  let totalTripsMonth = 0;
  let totalKmMonth = 0;
  let totalCostMonth = 0;
  
  const userAggMap = {};
  const vehicleAggMap = {};
  
  trips.forEach(t => {
    const isThisMonth = t.createdAt && t.createdAt.substring(0, 7) === currentMonthStr;
    if (isThisMonth && t.status === CONFIG.STATUS.TRIP.FINISHED) {
      totalTripsMonth++;
      totalKmMonth += t.distanceKm;
      totalCostMonth += t.totalCost;
    }
    
    // Agregasi per user
    if (!userAggMap[t.userId]) {
      userAggMap[t.userId] = {
        userId: t.userId,
        userName: t.userName,
        tripCount: 0,
        totalKm: 0,
        totalCost: 0
      };
    }
    userAggMap[t.userId].tripCount++;
    userAggMap[t.userId].totalKm += t.distanceKm;
    userAggMap[t.userId].totalCost += t.totalCost;
    
    // Agregasi per kendaraan
    if (!vehicleAggMap[t.vehicleId]) {
      vehicleAggMap[t.vehicleId] = {
        vehicleId: t.vehicleId,
        vehicleName: t.vehicleName,
        nomorPolisi: t.nomorPolisi,
        jenis: t.jenis,
        tripCount: 0,
        totalKm: 0,
        totalCost: 0
      };
    }
    vehicleAggMap[t.vehicleId].tripCount++;
    vehicleAggMap[t.vehicleId].totalKm += t.distanceKm;
    vehicleAggMap[t.vehicleId].totalCost += t.totalCost;
  });
  
  // Ranking Top Users
  const userList = Object.values(userAggMap);
  const topByCount = [...userList].sort((a, b) => b.tripCount - a.tripCount).slice(0, 5);
  const topByKm = [...userList].sort((a, b) => b.totalKm - a.totalKm).slice(0, 5);
  const topByCost = [...userList].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  
  // Ranking Kendaraan
  const vehicleList = Object.values(vehicleAggMap);
  const mostUsedMotor = vehicleList.filter(v => v.jenis === 'MOTOR').sort((a, b) => b.tripCount - a.tripCount)[0] || null;
  const mostUsedMobil = vehicleList.filter(v => v.jenis === 'MOBIL').sort((a, b) => b.tripCount - a.tripCount)[0] || null;
  
  return {
    kpi: {
      totalVehicles,
      countMotor,
      countMobil,
      countAvailable,
      countInUse,
      countMaintenance,
      totalUsers,
      pendingUsers,
      activeUsers,
      totalTripsMonth,
      totalKmMonth,
      totalCostMonth,
      activeTariff: getActiveTariff()
    },
    rankings: {
      topByCount,
      topByKm,
      topByCost,
      mostUsedMotor,
      mostUsedMobil
    },
    recentTrips: trips.slice(0, 10)
  };
}

/**
 * Update Tarif per KM (Hanya Admin)
 */
function handleUpdateTariff(params) {
  const { newRate, adminId } = params;
  const rateNum = Number(newRate);
  if (isNaN(rateNum) || rateNum <= 0) {
    return { success: false, message: 'Nominal tarif per kilometer harus angka positif.' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.TARIFFS);
  const data = sheet.getDataRange().getValues();
  
  // Nonaktifkan tarif lama
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'ACTIVE') {
      sheet.getRange(i + 1, 5).setValue('INACTIVE');
    }
  }
  
  // Tambah baris tarif baru
  const newTariffId = generateUUID('TRF');
  const now = nowISO();
  sheet.appendRow([
    newTariffId,
    rateNum,
    now,
    adminId || 'ADMIN',
    'ACTIVE'
  ]);
  
  // Update setting jika ada
  setSettingValue('DEFAULT_TARIFF', String(rateNum), adminId);
  
  logAudit(adminId, 'UPDATE_TARIFF', 'TARIFFS', newTariffId, `Ubah tarif menjadi Rp${rateNum.toLocaleString('id-ID')}/KM`);
  
  return {
    success: true,
    message: `Alhamdulillah, tarif pemakaian berhasil diubah menjadi Rp${rateNum.toLocaleString('id-ID')} / KM.`,
    data: { newRate: rateNum }
  };
}

/**
 * Generate data CSV laporan perjalanan
 */
function handleExportTripsCsv(filterParams = {}) {
  const trips = getTripHistory(filterParams);
  
  const headers = [
    'Trip ID', 'Tanggal', 'Pengguna', 'Jenis', 'Kendaraan', 'Plat Nomor',
    'KM Awal', 'KM Akhir', 'Total KM', 'Tarif (Rp/KM)', 'Total Biaya (Rp)', 'Keperluan', 'Status'
  ];
  
  const csvRows = [];
  csvRows.push(headers.map(h => `"${h}"`).join(','));
  
  trips.forEach(t => {
    const row = [
      t.tripId,
      t.startTime ? t.startTime.substring(0, 10) : '',
      t.userName,
      t.jenis,
      t.vehicleName,
      t.nomorPolisi,
      t.startKm,
      t.endKm,
      t.distanceKm,
      t.ratePerKm,
      t.totalCost,
      t.purpose.replace(/"/g, '""'),
      t.status
    ];
    csvRows.push(row.map(val => `"${val}"`).join(','));
  });
  
  return {
    success: true,
    csv: csvRows.join('\r\n'),
    filename: `Laporan_MaisyaTrans_${nowISO().substring(0, 10)}.csv`
  };
}
