/**
 * MAISYA-TRANS - Booking Management & Double Booking Prevention
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Bookings.gs
 */

/**
 * Buat pengajuan peminjaman baru dengan LockService server-side
 */
function handleCreateBooking(params) {
  const { userId, vehicleId, tanggal, start_time, estimated_end_time, purpose, notes } = params;
  
  if (!userId || !vehicleId || !tanggal || !start_time || !purpose) {
    return { success: false, message: 'Harap lengkapi tanggal, jam mulai, kendaraan, dan keperluan perjalanan.' };
  }
  
  // Gunakan LockService untuk mencegah double-booking bersamaan
  const lock = LockService.getScriptLock();
  try {
    const success = lock.waitLock(10000); // 10 detik
    if (!success) {
      return { success: false, message: 'Server sedang memproses peminjaman lain. Silakan coba 5 detik lagi.' };
    }
    
    // 1. Cek status kendaraan
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vehicleData = vehicleSheet.getDataRange().getValues();
    let targetVehicle = null;
    for (let i = 1; i < vehicleData.length; i++) {
      if (vehicleData[i][0] === vehicleId) {
        targetVehicle = vehicleData[i];
        break;
      }
    }
    
    if (!targetVehicle) {
      return { success: false, message: 'Kendaraan tidak ditemukan di sistem.' };
    }
    
    const vStatus = targetVehicle[14];
    if (vStatus === CONFIG.STATUS.VEHICLE.MAINTENANCE) {
      return { success: false, message: 'Maaf, kendaraan tersebut sedang dalam masa pemeliharaan/servis dan tidak dapat dipinjam.' };
    }
    if (vStatus === CONFIG.STATUS.VEHICLE.INACTIVE) {
      return { success: false, message: 'Kendaraan saat ini sedang nonaktif.' };
    }
    
    // 2. Server-side validation: Cek bentrok booking pada tanggal & jam yang sama
    const bookingSheet = getSheet(CONFIG.SHEETS.BOOKINGS);
    const bookingData = bookingSheet.getDataRange().getValues();
    
    const reqDate = tanggal.substring(0, 10);
    const reqStart = start_time;
    const reqEnd = estimated_end_time || '23:59';
    
    for (let i = 1; i < bookingData.length; i++) {
      const b = bookingData[i];
      const bVehicleId = b[2];
      const bDate = String(b[3]).substring(0, 10);
      const bStart = String(b[4]);
      const bEnd = String(b[5]);
      const bStatus = b[8];
      
      // Jika kendaraan sama, tanggal sama, dan status masih aktif (PENDING atau APPROVED)
      if (bVehicleId === vehicleId && bDate === reqDate && 
          (bStatus === CONFIG.STATUS.BOOKING.APPROVED || bStatus === CONFIG.STATUS.BOOKING.PENDING)) {
        // Cek overlap waktu
        if (isTimeOverlapping(reqStart, reqEnd, bStart, bEnd)) {
          return { 
            success: false, 
            message: `Maaf, kendaraan ${targetVehicle[2]} ${targetVehicle[3]} sudah dipesan untuk jam ${bStart} - ${bEnd}. Silakan pilih waktu atau kendaraan lain.` 
          };
        }
      }
    }
    
    const bookingId = generateUUID('BKG');
    const now = nowISO();
    
    // Cek apakah sistem butuh approval dari settings
    const isApprovalRequired = getSettingValue('APPROVAL_REQUIRED', 'true') === 'true';
    const initialStatus = isApprovalRequired ? CONFIG.STATUS.BOOKING.PENDING : CONFIG.STATUS.BOOKING.APPROVED;
    
    bookingSheet.appendRow([
      bookingId,
      userId,
      vehicleId,
      reqDate,
      reqStart,
      reqEnd,
      purpose.trim(),
      notes ? notes.trim() : '',
      initialStatus,
      isApprovalRequired ? '' : 'SYSTEM',
      isApprovalRequired ? '' : now,
      now
    ]);
    
    // Notifikasi ke Admin
    const userMap = getUserNameMap();
    const userName = userMap[userId] || 'Pengguna';
    addNotification({
      userId: 'ADMIN',
      type: 'PEMINJAMAN_BARU',
      title: 'Pengajuan Peminjaman Kendaraan',
      message: `${userName} mengajukan peminjaman ${targetVehicle[2]} ${targetVehicle[3]} (${targetVehicle[4]}) untuk tanggal ${reqDate} pk ${reqStart}.`
    });
    
    logAudit(userId, 'CREATE_BOOKING', 'BOOKINGS', bookingId, `Pengajuan pinjam ${targetVehicle[4]}`);
    
    return {
      success: true,
      message: isApprovalRequired 
        ? 'Alhamdulillah, pengajuan peminjaman berhasil dikirim. Menunggu persetujuan Admin Sarpras.' 
        : 'Alhamdulillah, peminjaman telah disetujui otomatis. Anda dapat mulai pemakaian saat kendaraan siap digunakan.',
      data: {
        bookingId,
        status: initialStatus
      }
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses peminjaman: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cek bentrok rentang waktu HH:mm
 */
function isTimeOverlapping(startA, endA, startB, endB) {
  return (startA < endB && endA > startB);
}

/**
 * Persetujuan Booking oleh Admin
 */
function handleApproveBooking(params) {
  const { bookingId, adminId } = params;
  const sheet = getSheet(CONFIG.SHEETS.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      const rowIdx = i + 1;
      const bUserId = data[i][1];
      const vId = data[i][2];
      const now = nowISO();
      
      sheet.getRange(rowIdx, 9).setValue(CONFIG.STATUS.BOOKING.APPROVED);
      sheet.getRange(rowIdx, 10).setValue(adminId || 'ADMIN');
      sheet.getRange(rowIdx, 11).setValue(now);
      
      // Notifikasi ke user
      addNotification({
        userId: bUserId,
        type: 'PEMINJAMAN_DISETUJUI',
        title: 'Peminjaman Disetujui',
        message: 'Pengajuan peminjaman kendaraan Anda telah disetujui. Silakan tekan MULAI PEMAKAIAN saat akan berangkat.'
      });
      
      logAudit(adminId, 'APPROVE_BOOKING', 'BOOKINGS', bookingId, `Setujui booking ID ${bookingId}`);
      return { success: true, message: 'Peminjaman berhasil disetujui.' };
    }
  }
  return { success: false, message: 'Peminjaman tidak ditemukan.' };
}

/**
 * Penolakan Booking oleh Admin
 */
function handleRejectBooking(params) {
  const { bookingId, adminId, reason } = params;
  const sheet = getSheet(CONFIG.SHEETS.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      const rowIdx = i + 1;
      const bUserId = data[i][1];
      const now = nowISO();
      
      sheet.getRange(rowIdx, 9).setValue(CONFIG.STATUS.BOOKING.REJECTED);
      sheet.getRange(rowIdx, 10).setValue(adminId || 'ADMIN');
      sheet.getRange(rowIdx, 11).setValue(now);
      
      addNotification({
        userId: bUserId,
        type: 'PEMINJAMAN_DITOLAK',
        title: 'Peminjaman Ditolak',
        message: `Pengajuan peminjaman Anda tidak disetujui oleh admin. Alasan: ${reason || 'Keperluan dinas lain/jadwal padat.'}`
      });
      
      logAudit(adminId, 'REJECT_BOOKING', 'BOOKINGS', bookingId, `Tolak booking ID ${bookingId}`);
      return { success: true, message: 'Peminjaman telah ditolak.' };
    }
  }
  return { success: false, message: 'Peminjaman tidak ditemukan.' };
}

/**
 * Ambil daftar peminjaman
 */
function getAllBookings(filterUserId, filterRole) {
  const sheet = getSheet(CONFIG.SHEETS.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const userMap = getUserNameMap();
  const vehicles = getAllVehicles();
  const vehicleMap = {};
  vehicles.forEach(v => { vehicleMap[v.vehicleId] = v; });
  
  const bookings = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const uId = row[1];
    
    // Filter jika role adalah USER biasa (hanya miliknya)
    if (filterRole === CONFIG.ROLES.USER && uId !== filterUserId) {
      continue;
    }
    
    const vId = row[2];
    const vehicle = vehicleMap[vId] || {};
    
    bookings.push({
      bookingId: row[0],
      userId: uId,
      userName: userMap[uId] || 'Pengguna',
      vehicleId: vId,
      vehicleName: vehicle.merk ? `${vehicle.merk} ${vehicle.model}` : 'Kendaraan',
      nomorPolisi: vehicle.nomorPolisi || '-',
      jenis: vehicle.jenis || 'MOTOR',
      tanggal: row[3],
      startTime: row[4],
      estimatedEndTime: row[5],
      purpose: row[6],
      notes: row[7],
      status: row[8],
      approvedBy: row[9],
      approvedAt: row[10],
      createdAt: row[11]
    });
  }
  
  return bookings;
}
