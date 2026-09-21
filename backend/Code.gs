/**
 * MAISYA-TRANS - Main Web App API Entry Point (doGet & doPost)
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * File: Code.gs
 */

/**
 * Handle GET Requests
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'ping';
    
    // Auth token check if provided
    const token = params.token || '';
    const session = validateSessionToken(token);
    const userId = session ? session.userId : (params.userId || '');
    const role = session ? session.role : (params.role || CONFIG.ROLES.USER);
    
    switch (action) {
      case 'ping':
        return jsonResponse({
          status: 'online',
          app: 'MAISYA-TRANS',
          institution: 'Pondok Pesantren Imam Syafi’i Brebes',
          version: '1.0.0',
          spreadsheetId: CONFIG.SPREADSHEET_ID
        }, true, 'MAISYA-TRANS API siap digunakan');
        
      case 'initDatabase':
        return jsonResponse(initDatabase(), true, 'Inisialisasi database berhasil');
        
      case 'seedDemoData':
        return jsonResponse(seedDemoData(), true, 'Seed data demo selesai');
        
      case 'getDashboard':
        return jsonResponse(getDashboardData(userId, role), true, 'Data dashboard berhasil dimuat');
        
      case 'getVehicles':
        return jsonResponse(getAllVehicles(), true, 'Data kendaraan berhasil dimuat');
        
      case 'getBookings':
        return jsonResponse(getAllBookings(userId, role), true, 'Data peminjaman berhasil dimuat');
        
      case 'getHistory':
        return jsonResponse(getTripHistory({
          filterUserId: userId,
          role: role,
          vehicleType: params.jenis
        }), true, 'Riwayat berhasil dimuat');
        
      case 'getUsers':
        if (role !== CONFIG.ROLES.ADMIN) {
          return jsonResponse(null, false, 'Akses ditolak. Khusus Admin Sarpras.', 403);
        }
        return jsonResponse(getAllUsers(), true, 'Data pengguna berhasil dimuat');
        
      case 'getStatistics':
        return jsonResponse(getFullStatistics(), true, 'Statistik berhasil dimuat');
        
      case 'getMaintenance':
        return jsonResponse(getAllMaintenance(params.vehicleId), true, 'Data pemeliharaan berhasil dimuat');
        
      case 'getNotifications':
        return jsonResponse(getNotifications(userId, role), true, 'Notifikasi berhasil dimuat');
        
      case 'getSettings':
        return jsonResponse(getAllSettings(), true, 'Pengaturan berhasil dimuat');
        
      case 'exportReport':
        if (role !== CONFIG.ROLES.ADMIN) {
          return jsonResponse(null, false, 'Akses ditolak. Khusus Admin Sarpras.', 403);
        }
        return jsonResponse(handleExportTripsCsv({
          vehicleType: params.jenis
        }), true, 'Export laporan CSV siap');
        
      case 'googleAuth':
        return wrapResult(handleGoogleAuth(params));

      default:
        return jsonResponse(null, false, `Aksi '${action}' tidak dikenali.`);
    }
  } catch (err) {
    return jsonResponse(null, false, 'Terjadi kesalahan pada server: ' + err.message, 500);
  }
}

/**
 * Handle POST Requests
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const action = body.action || (e.parameter ? e.parameter.action : '');
    
    // Auth token check if provided
    const token = body.token || (e.parameter ? e.parameter.token : '');
    const session = validateSessionToken(token);
    const userId = session ? session.userId : (body.userId || '');
    const role = session ? session.role : (body.role || CONFIG.ROLES.USER);
    body.userId = userId;
    body.role = role;
    
    switch (action) {
      // 1. Auth & Users
      case 'register':
        return wrapResult(handleRegister(body));
        
      case 'login':
        return wrapResult(handleLogin(body));

      case 'googleAuth':
        return wrapResult(handleGoogleAuth(body));
        
      case 'approveUser':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleApproveUser(body));
        
      case 'rejectUser':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleRejectUser(body));
        
      case 'toggleUserStatus':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleToggleUserStatus(body));
        
      // 2. Vehicles
      case 'addVehicle':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        return wrapResult(handleAddVehicle(body));
        
      case 'updateVehicle':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        return wrapResult(handleUpdateVehicle(body));
        
      case 'setVehicleMaintenance':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        return wrapResult(handleSetVehicleMaintenance(body));
        
      // 3. Bookings
      case 'createBooking':
        return wrapResult(handleCreateBooking(body));
        
      case 'approveBooking':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleApproveBooking(body));
        
      case 'rejectBooking':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleRejectBooking(body));
        
      // 4. Trips (Start / Finish)
      case 'startTrip':
        return wrapResult(handleStartTrip(body));
        
      case 'finishTrip':
        return wrapResult(handleFinishTrip(body));
        
      // 5. Maintenance & Tariff
      case 'createMaintenance':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        return wrapResult(handleCreateMaintenance(body));
        
      case 'updateTariff':
        if (role !== CONFIG.ROLES.ADMIN) return forbiddenResponse();
        body.adminId = userId;
        return wrapResult(handleUpdateTariff(body));
        
      // 6. Notifications
      case 'markNotificationRead':
        return wrapResult(markNotificationRead(body.notificationId));
        
      default:
        return jsonResponse(null, false, `Aksi POST '${action}' tidak dikenali.`);
    }
  } catch (err) {
    return jsonResponse(null, false, 'Terjadi kesalahan sistem saat memproses data: ' + err.message, 500);
  }
}

/**
 * Mendapatkan ringkasan gabungan untuk Real-time Dashboard
 */
function getDashboardData(userId, role) {
  const vehicles = getAllVehicles();
  const trips = getTripHistory({ filterUserId: userId, role });
  const notifications = getNotifications(userId, role);
  
  // Pisahkan motor dan mobil aktif
  let activeMotor = null;
  let activeMobil = null;
  let motorAvailableCount = 0;
  let mobilAvailableCount = 0;
  let totalInUse = 0;
  
  vehicles.forEach(v => {
    if (v.status === CONFIG.STATUS.VEHICLE.IN_USE) {
      totalInUse++;
      if (v.jenis === 'MOTOR' && !activeMotor) activeMotor = v;
      if (v.jenis === 'MOBIL' && !activeMobil) activeMobil = v;
    } else if (v.status === CONFIG.STATUS.VEHICLE.AVAILABLE) {
      if (v.jenis === 'MOTOR') motorAvailableCount++;
      if (v.jenis === 'MOBIL') mobilAvailableCount++;
    }
  });
  
  // Hitung jumlah notif belum dibaca
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;
  
  // Pending user approvals jika role admin
  let pendingUserCount = 0;
  if (role === CONFIG.ROLES.ADMIN) {
    const users = getAllUsers();
    pendingUserCount = users.filter(u => u.status === CONFIG.STATUS.USER.PENDING).length;
  }
  
  return {
    overview: {
      allAvailable: totalInUse === 0,
      totalVehicles: vehicles.length,
      totalInUse: totalInUse,
      motorAvailableCount,
      mobilAvailableCount,
      unreadNotifCount,
      pendingUserCount
    },
    activeMotor,
    activeMobil,
    vehicles,
    recentTrips: trips.slice(0, 5),
    unreadNotifications: notifications.slice(0, 5)
  };
}

function wrapResult(res) {
  if (!res) return jsonResponse(null, false, 'Tidak ada respon dari server.');
  return jsonResponse(res.data || null, res.success, res.message);
}

function forbiddenResponse() {
  return jsonResponse(null, false, 'Akses ditolak. Fitur ini hanya untuk Admin Sarpras Pondok.', 403);
}
