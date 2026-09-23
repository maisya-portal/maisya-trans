/**
 * MAISYA-TRANS - Unified API Client
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * Mendukung akses publik tanpa login dan kontrol penuh Admin Sarpras
 */

const Api = {
  /**
   * Cek apakah menggunakan mock local store
   */
  isMockMode() {
    const url = getActiveApiUrl();
    return !url || url.includes('YOUR_DEPLOYED_EXEC_ID') || !navigator.onLine;
  },

  /**
   * Core request executor dengan dukungan local cache instan & background sync
   */
  async request(action, method = 'GET', data = {}, showSpinner = false) {
    const currentUser = Auth.getUser();
    const token = Auth.getToken();
    
    if (showSpinner && typeof UI !== 'undefined' && UI.showLoading) {
      UI.showLoading('Memproses data...');
    }
    
    // Data lokal instan (0ms)
    const localRes = this.getMockDataSync(action, data, currentUser);

    // Jika mode mock atau sedang offline, langsung kembalikan data lokal
    if (this.isMockMode()) {
      if (showSpinner && typeof UI !== 'undefined' && UI.hideLoading) UI.hideLoading();
      return localRes;
    }

    try {
      const url = getActiveApiUrl();
      const controller = new AbortController();
      const timeoutMs = method === 'GET' ? 3500 : 8000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      if (method === 'GET') {
        const queryParams = new URLSearchParams({
          action,
          token: token || '',
          userId: currentUser ? currentUser.userId : 'PUBLIC_USER',
          role: currentUser ? currentUser.role : 'USER',
          ...data
        });
        response = await fetch(`${url}?${queryParams.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
      } else {
        const payload = {
          action,
          token: token || '',
          userId: currentUser ? currentUser.userId : 'PUBLIC_USER',
          role: currentUser ? currentUser.role : 'USER',
          ...data
        };
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);

      const result = await response.json();
      if (showSpinner && typeof UI !== 'undefined' && UI.hideLoading) UI.hideLoading();
      return result;
    } catch (err) {
      console.warn(`[API] Remote call '${action}' (${err.message || 'offline'}). Menggunakan store lokal.`);
      if (showSpinner && typeof UI !== 'undefined' && UI.hideLoading) UI.hideLoading();
      return localRes;
    }
  },

  /**
   * Mock Engine asynchronous wrapper
   */
  executeMock(action, data, currentUser) {
    return Promise.resolve(this.getMockDataSync(action, data, currentUser));
  },

  /**
   * Mengambil data secara sinkron (0ms) dari Local Store
   */
  getMockDataSync(action, data = {}, currentUser = null) {
    const now = new Date().toISOString();
    
    switch (action) {
      // --- AUTH (ADMIN / USER) ---
      case 'login': {
        const { username, password } = data;
        const inputLower = (username || '').toLowerCase().trim();
        const user = Store.data.users.find(u => 
          (u.email && u.email.toLowerCase() === inputLower) || (u.nip && u.nip === inputLower)
        );

        if (!user) {
          return { success: false, message: 'Email atau NIP tidak terdaftar.' };
        }
        if (user.password_hash !== password) {
          return { success: false, message: 'Password salah.' };
        }
        if (user.status === 'PENDING') {
          return { success: false, message: 'Akun Anda masih menunggu persetujuan Admin.' };
        }
        if (user.status === 'REJECTED' || user.status === 'INACTIVE') {
          return { success: false, message: 'Akun Anda tidak aktif atau ditolak.' };
        }

        user.lastLogin = now;
        Store.save();
        const mockToken = btoa(JSON.stringify({ userId: user.userId, role: user.role, time: Date.now() }));
        return {
          success: true,
          message: 'Login berhasil!',
          data: { token: mockToken, user }
        };
      }

      // --- DASHBOARD & PUBLIC FLEET CATALOG ---
      case 'getDashboard': {
        const vehicles = this.calculateVehicleHealth(Store.data.vehicles);
        const inUseCount = vehicles.filter(v => v.status === 'IN_USE').length;
        const motorAvail = vehicles.filter(v => v.jenis === 'MOTOR' && v.status === 'AVAILABLE').length;
        const mobilAvail = vehicles.filter(v => v.jenis === 'MOBIL' && v.status === 'AVAILABLE').length;
        const pendingBookings = Store.data.bookings.filter(b => b.status === 'PENDING').length;
        const pendingReturns = Store.data.trips.filter(t => t.status === 'PENDING_VERIFICATION').length;
        const unreadNotif = Store.data.notifications.filter(n => !n.isRead).length;

        return {
          success: true,
          data: {
            overview: {
              allAvailable: inUseCount === 0 && pendingBookings === 0,
              totalVehicles: vehicles.length,
              totalInUse: inUseCount,
              motorAvailableCount: motorAvail,
              mobilAvailableCount: mobilAvail,
              unreadNotifCount: unreadNotif,
              pendingBookingsCount: pendingBookings,
              pendingReturnsCount: pendingReturns
            },
            vehicles,
            activeTrips: Store.data.trips.filter(t => t.status === 'ACTIVE'),
            recentTrips: Store.data.trips.slice(0, 8),
            activeBookings: Store.data.bookings.filter(b => b.status === 'PENDING' || b.status === 'APPROVED').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)),
            notifications: Store.data.notifications.slice(0, 5)
          }
        };
      }

      // --- VEHICLES ---
      case 'getVehicles': {
        const list = this.calculateVehicleHealth(Store.data.vehicles);
        return { success: true, data: list };
      }

      case 'addVehicle': {
        const vId = 'VEH-' + (data.jenis === 'MOBIL' ? 'MBL' : 'MTR') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newVeh = {
          vehicleId: vId,
          jenis: data.jenis,
          merk: data.merk,
          model: data.model,
          nomorPolisi: (data.nomor_polisi || data.nomorPolisi || '').toUpperCase().trim(),
          tahun: data.tahun || new Date().getFullYear(),
          warna: data.warna || 'Standar',
          currentKm: Number(data.current_km || data.currentKm) || 0,
          lastServiceKm: Number(data.current_km || data.currentKm) || 0,
          lastServiceDate: now.substring(0, 10),
          lastOilKm: Number(data.current_km || data.currentKm) || 0,
          lastOilDate: now.substring(0, 10),
          oilIntervalKm: Number(data.oil_interval_km || data.oilIntervalKm) || (data.jenis === 'MOBIL' ? 5000 : 2000),
          tuneupIntervalKm: Number(data.tuneup_interval_km || data.tuneupIntervalKm) || (data.jenis === 'MOBIL' ? 10000 : 5000),
          status: 'AVAILABLE',
          notes: data.notes || '',
          imageUrl: data.imageUrl || (data.jenis === 'MOTOR' 
            ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'),
          createdAt: now
        };
        Store.data.vehicles.push(newVeh);
        Store.save();
        return { success: true, message: 'Kendaraan berhasil ditambahkan!', data: newVeh };
      }

      case 'updateVehicle': {
        const v = Store.data.vehicles.find(x => x.vehicleId === data.vehicleId);
        if (!v) return { success: false, message: 'Kendaraan tidak ditemukan.' };
        
        Object.assign(v, {
          jenis: data.jenis || v.jenis,
          merk: data.merk || v.merk,
          model: data.model || v.model,
          nomorPolisi: (data.nomorPolisi || v.nomorPolisi).toUpperCase().trim(),
          tahun: data.tahun || v.tahun,
          warna: data.warna || v.warna,
          currentKm: Number(data.currentKm) || v.currentKm,
          status: data.status || v.status,
          oilIntervalKm: Number(data.oilIntervalKm) || v.oilIntervalKm,
          tuneupIntervalKm: Number(data.tuneupIntervalKm) || v.tuneupIntervalKm,
          notes: data.notes !== undefined ? data.notes : v.notes,
          imageUrl: data.imageUrl || v.imageUrl
        });
        Store.save();
        return { success: true, message: 'Data kendaraan berhasil diperbarui.', data: v };
      }

      case 'deleteVehicle': {
        const vIdx = Store.data.vehicles.findIndex(x => x.vehicleId === data.vehicleId);
        if (vIdx === -1) return { success: false, message: 'Kendaraan tidak ditemukan.' };
        if (Store.data.vehicles[vIdx].status === 'IN_USE') {
          return { success: false, message: 'Kendaraan sedang digunakan dan tidak dapat dihapus.' };
        }
        Store.data.vehicles.splice(vIdx, 1);
        Store.save();
        return { success: true, message: 'Kendaraan berhasil dihapus.' };
      }

      // --- BOOKING (PENGAJUAN PINJAM OLEH PENGGUNA TANPA LOGIN) ---
      case 'createBooking': {
        const targetV = Store.data.vehicles.find(v => v.vehicleId === data.vehicleId);
        if (!targetV) return { success: false, message: 'Kendaraan tidak ditemukan.' };
        if (targetV.status === 'IN_USE') {
          return { success: false, message: 'Kendaraan sedang digunakan oleh peminjam lain.' };
        }
        if (targetV.status === 'MAINTENANCE') {
          return { success: false, message: 'Kendaraan sedang dalam perawatan bengkel.' };
        }

        const newBkg = {
          bookingId: 'BKG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          userId: currentUser ? currentUser.userId : 'GUEST-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          userName: data.userName || 'Peminjam',
          divisi: data.divisi || 'Umum',
          noHp: data.noHp || '',
          vehicleId: data.vehicleId,
          vehicleName: `${targetV.merk} ${targetV.model}`,
          nomorPolisi: targetV.nomorPolisi,
          jenis: targetV.jenis,
          tanggal: data.tanggal,
          startTime: data.startTime || '08:00',
          estimatedEndTime: data.estimatedEndTime || '12:00',
          passengerCount: Number(data.passengerCount) || 1,
          purpose: data.purpose,
          tujuan: data.tujuan || data.purpose,
          notes: data.notes || '',
          status: 'PENDING',
          createdAt: now
        };

        targetV.status = 'PENDING_APPROVAL';
        targetV.pendingBooking = newBkg;

        Store.data.bookings.unshift(newBkg);
        Store.data.notifications.unshift({
          notificationId: 'NTF-' + Date.now(),
          userId: 'ADMIN',
          type: 'PENGAJUAN_PINJAM',
          title: `Pengajuan Pinjam: ${targetV.merk} (${targetV.nomorPolisi})`,
          message: `${newBkg.userName} (${newBkg.divisi}) mengajukan peminjaman untuk ${newBkg.purpose}.`,
          isRead: false,
          createdAt: now
        });
        Store.save();

        return {
          success: true,
          message: 'Pengajuan peminjaman berhasil dikirim! Menunggu persetujuan Admin Sarpras.',
          data: newBkg
        };
      }

      case 'getBookings': {
        return { success: true, data: Store.data.bookings };
      }

      // --- ADMIN APPROVAL & REJECTION ---
      case 'approveBooking': {
        const bkg = Store.data.bookings.find(b => b.bookingId === data.bookingId);
        if (!bkg) return { success: false, message: 'Pengajuan tidak ditemukan.' };

        bkg.status = 'APPROVED';
        bkg.approvedBy = currentUser ? currentUser.nama : 'Admin Sarpras';
        bkg.approvedAt = now;

        const targetV = Store.data.vehicles.find(v => v.vehicleId === bkg.vehicleId);
        if (targetV) {
          targetV.status = 'APPROVED';
          targetV.approvedBooking = bkg;
          delete targetV.pendingBooking;
        }

        Store.data.notifications.unshift({
          notificationId: 'NTF-' + Date.now(),
          userId: 'ALL',
          type: 'DISETUJUI',
          title: `Peminjaman Disetujui: ${bkg.vehicleName}`,
          message: `Pengajuan ${bkg.userName} disetujui. Silakan ambil kunci kepada Admin Sarpras & lakukan Check-In.`,
          isRead: false,
          createdAt: now
        });
        Store.save();

        return {
          success: true,
          message: 'Peminjaman disetujui! Pengguna dapat mengambil kunci dan melakukan Check-In.',
          data: bkg
        };
      }

      case 'rejectBooking': {
        const bkg = Store.data.bookings.find(b => b.bookingId === data.bookingId);
        if (!bkg) return { success: false, message: 'Pengajuan tidak ditemukan.' };

        bkg.status = 'REJECTED';
        bkg.rejectReason = data.reason || 'Ditolak oleh Admin Sarpras';
        bkg.rejectedAt = now;

        const targetV = Store.data.vehicles.find(v => v.vehicleId === bkg.vehicleId);
        if (targetV) {
          targetV.status = 'AVAILABLE';
          delete targetV.pendingBooking;
          delete targetV.approvedBooking;
        }

        Store.save();
        return {
          success: true,
          message: 'Pengajuan peminjaman telah ditolak.',
          data: bkg
        };
      }

      // --- CHECK-IN & START TRIP (SERAH TERIMA AWAL & MULAI ARGO) ---
      case 'startTrip':
      case 'checkInTrip': {
        const { vehicleId, bookingId, startKm, fuelLevel, cleanliness, exteriorCondition, damageNotes, photos, userName, divisi, noHp, purpose, tujuan } = data;
        const startKmNum = Number(startKm);
        const targetVeh = Store.data.vehicles.find(v => v.vehicleId === vehicleId);

        if (!targetVeh) return { success: false, message: 'Kendaraan tidak ditemukan.' };
        if (targetVeh.status === 'IN_USE') {
          return { success: false, message: 'Kendaraan sedang digunakan dalam perjalanan aktif.' };
        }

        const tripId = 'TRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const tripRecord = {
          tripId,
          bookingId: bookingId || '',
          userId: currentUser ? currentUser.userId : 'GUEST-USER',
          userName: userName || targetVeh.approvedBooking?.userName || 'Pengguna Pondok',
          divisi: divisi || targetVeh.approvedBooking?.divisi || 'Pondok',
          noHp: noHp || targetVeh.approvedBooking?.noHp || '',
          vehicleId,
          vehicleName: `${targetVeh.merk} ${targetVeh.model}`,
          nomorPolisi: targetVeh.nomorPolisi,
          jenis: targetVeh.jenis,
          startTime: now,
          endTime: '',
          startKm: startKmNum || targetVeh.currentKm,
          endKm: 0,
          distanceKm: 0,
          ratePerKm: Number(Store.data.settings.DEFAULT_TARIFF) || 1000,
          totalCost: 0,
          purpose: purpose || targetVeh.approvedBooking?.purpose || 'Operasional Pondok',
          tujuan: tujuan || targetVeh.approvedBooking?.tujuan || 'Brebes',
          checkIn: {
            startKm: startKmNum || targetVeh.currentKm,
            fuelLevel: fuelLevel || '75%',
            cleanliness: cleanliness || 'Bersih',
            exteriorCondition: exteriorCondition || 'Bagus',
            damageNotes: damageNotes || '',
            photos: photos || {},
            checkInTime: now
          },
          status: 'ACTIVE',
          createdAt: now
        };

        targetVeh.status = 'IN_USE';
        if (startKmNum > targetVeh.currentKm) targetVeh.currentKm = startKmNum;
        targetVeh.activeTrip = {
          tripId,
          userName: tripRecord.userName,
          divisi: tripRecord.divisi,
          noHp: tripRecord.noHp,
          startTime: now,
          startKm: tripRecord.startKm,
          purpose: tripRecord.purpose,
          tujuan: tripRecord.tujuan,
          fuelLevelStart: tripRecord.checkIn.fuelLevel,
          cleanlinessStart: tripRecord.checkIn.cleanliness
        };
        delete targetVeh.approvedBooking;
        delete targetVeh.pendingBooking;

        if (bookingId) {
          const bkg = Store.data.bookings.find(b => b.bookingId === bookingId);
          if (bkg) bkg.status = 'IN_USE';
        }

        Store.data.trips.unshift(tripRecord);
        Store.data.notifications.unshift({
          notificationId: 'NTF-' + Date.now(),
          userId: 'ADMIN',
          type: 'KENDARAAN_DIMULAI',
          title: `Kendaraan Mulai Digunakan: ${targetVeh.merk} (${targetVeh.nomorPolisi})`,
          message: `${tripRecord.userName} telah Check-In (KM ${tripRecord.startKm}) dan mulai menggunakan kendaraan.`,
          isRead: false,
          createdAt: now
        });
        Store.save();

        return {
          success: true,
          message: 'Bismillah! Check-In berhasil. Argo pemakaian kendaraan telah aktif.',
          data: tripRecord
        };
      }

      // --- CHECK-OUT (PENGEMBALIAN KENDARAAN & OPSI BBM / PEMBAYARAN) ---
      case 'finishTrip':
      case 'checkOutTrip': {
        const { tripId, endKm, fuelLevel, cleanliness, exteriorCondition, damageNotes, photos, isBbmFilled, bbmCost, bbmReceiptUrl, paymentMethod, transferProofUrl } = data;
        const endKmNum = Number(endKm);
        const trip = Store.data.trips.find(t => t.tripId === tripId);
        if (!trip) return { success: false, message: 'Data perjalanan aktif tidak ditemukan.' };

        if (endKmNum < trip.startKm) {
          return {
            success: false,
            message: `KM Akhir (${endKmNum.toLocaleString('id-ID')}) tidak boleh lebih kecil dari KM awal (${trip.startKm.toLocaleString('id-ID')}).`
          };
        }

        const dist = endKmNum - trip.startKm;
        const rate = trip.ratePerKm || 1000;
        const isWaived = Boolean(isBbmFilled);
        const cost = isWaived ? 0 : (dist * rate);

        const targetVeh = Store.data.vehicles.find(v => v.vehicleId === trip.vehicleId);

        trip.endTime = now;
        trip.endKm = endKmNum;
        trip.distanceKm = dist;
        trip.totalCost = cost;
        trip.damageNotes = damageNotes || '';
        trip.checkOut = {
          endKm: endKmNum,
          fuelLevel: fuelLevel || '75%',
          cleanliness: cleanliness || 'Bersih',
          exteriorCondition: exteriorCondition || 'Baik',
          damageNotes: damageNotes || '',
          photos: photos || {},
          isBbmFilled: isWaived,
          bbmCost: Number(bbmCost) || 0,
          bbmReceiptUrl: bbmReceiptUrl || '',
          paymentMethod: isWaived ? 'BBM_WAIVED' : (paymentMethod || 'TUNAI'),
          transferProofUrl: transferProofUrl || '',
          checkOutTime: now
        };
        trip.status = 'PENDING_VERIFICATION';

        if (targetVeh) {
          targetVeh.currentKm = endKmNum;
          targetVeh.status = 'IN_USE';
          targetVeh.pendingReturnVerification = {
            tripId: trip.tripId,
            userName: trip.userName,
            distanceKm: dist,
            totalCost: cost,
            isBbmFilled: isWaived,
            paymentMethod: trip.checkOut.paymentMethod
          };
          delete targetVeh.activeTrip;
        }

        const diffMins = Math.max(1, Math.round((new Date(now).getTime() - new Date(trip.startTime).getTime()) / 60000));
        trip.durationText = diffMins >= 60 ? `${Math.floor(diffMins/60)} jam ${diffMins%60} menit` : `${diffMins} menit`;

        Store.data.notifications.unshift({
          notificationId: 'NTF-' + Date.now(),
          userId: 'ADMIN',
          type: 'PENGEMBALIAN_KENDARAAN',
          title: `Pengembalian Menunggu Verifikasi: ${trip.vehicleName}`,
          message: `${trip.userName} telah menyelesaikan Check-Out (Jarak: ${dist} KM). Harap verifikasi kondisi fisik & kunci.`,
          isRead: false,
          createdAt: now
        });
        Store.save();

        return {
          success: true,
          message: 'Check-Out berhasil dilaporkan! Silakan serahkan kunci kepada Admin Sarpras untuk verifikasi akhir.',
          data: trip
        };
      }

      // --- ADMIN FINAL VERIFICATION & KEY HANDOVER ---
      case 'verifyReturnTrip': {
        const { tripId, notes } = data;
        const trip = Store.data.trips.find(t => t.tripId === tripId);
        if (!trip) return { success: false, message: 'Data perjalanan tidak ditemukan.' };

        trip.status = 'FINISHED';
        trip.verifiedBy = currentUser ? currentUser.nama : 'Admin Sarpras';
        trip.verifiedAt = now;
        trip.adminNotes = notes || '';

        const targetVeh = Store.data.vehicles.find(v => v.vehicleId === trip.vehicleId);
        if (targetVeh) {
          const hasDamage = (trip.damageNotes && trip.damageNotes.length > 5) || (trip.checkOut?.damageNotes && trip.checkOut.damageNotes.length > 5);
          targetVeh.status = hasDamage ? 'MAINTENANCE' : 'AVAILABLE';
          delete targetVeh.pendingReturnVerification;
          delete targetVeh.activeTrip;
          if (hasDamage) {
            targetVeh.notes = 'Laporan kerusakan pemakaian: ' + (trip.damageNotes || trip.checkOut?.damageNotes);
          }
        }

        if (trip.bookingId) {
          const bkg = Store.data.bookings.find(b => b.bookingId === trip.bookingId);
          if (bkg) bkg.status = 'COMPLETED';
        }

        Store.save();
        return {
          success: true,
          message: 'Verifikasi selesai! Kunci telah diserahterimakan dan armada siap digunakan kembali.',
          data: trip
        };
      }

      // --- ADMIN DASHBOARD ---
      case 'getAdminDashboard': {
        const vehicles = this.calculateVehicleHealth(Store.data.vehicles);
        const pendingBookings = Store.data.bookings.filter(b => b.status === 'PENDING');
        const pendingReturns = Store.data.trips.filter(t => t.status === 'PENDING_VERIFICATION');
        const stats = this.buildMockStatistics();

        return {
          success: true,
          data: {
            users: Store.data.users,
            vehicles,
            pendingBookings,
            pendingReturns,
            stats
          }
        };
      }

      // --- RIWAYAT PERJALANAN ---
      case 'getTrips':
      case 'getHistory': {
        return { success: true, data: Store.data.trips };
      }

      // --- STATISTIK & EFISIENSI ARMADA ---
      case 'getStatistics': {
        return { success: true, data: this.buildMockStatistics() };
      }

      // --- PENGINGAT SERVIS & PEMELIHARAAN ---
      case 'getMaintenance': {
        return { success: true, data: Store.data.maintenance || [] };
      }

      case 'getMaintenanceDashboard': {
        return {
          success: true,
          data: {
            maintenance: Store.data.maintenance || [],
            vehicles: this.calculateVehicleHealth(Store.data.vehicles)
          }
        };
      }

      case 'createMaintenance': {
        const newMnt = {
          maintenanceId: 'MNT-' + Date.now(),
          vehicleId: data.vehicleId,
          vehicleName: data.vehicleName || 'Kendaraan',
          nomorPolisi: data.nomorPolisi || '-',
          jenis: data.jenis || 'MOTOR',
          type: data.type,
          date: data.date || now.substring(0, 10),
          km: Number(data.km) || 0,
          description: data.description || '',
          cost: Number(data.cost) || 0,
          nextDueKm: data.next_due_km || '',
          nextDueDate: data.next_due_date || '',
          createdBy: currentUser ? currentUser.userId : 'ADMIN'
        };
        Store.data.maintenance.unshift(newMnt);

        const v = Store.data.vehicles.find(x => x.vehicleId === data.vehicleId);
        if (v) {
          if (data.type.includes('OLI')) {
            v.lastOilKm = Number(data.km);
            v.lastOilDate = newMnt.date;
          }
          if (data.type.includes('TUNE') || data.type.includes('SERVIS')) {
            v.lastServiceKm = Number(data.km);
            v.lastServiceDate = newMnt.date;
          }
          if (v.status === 'MAINTENANCE') v.status = 'AVAILABLE';
        }
        Store.save();
        return { success: true, message: 'Catatan servis berhasil disimpan!', data: newMnt };
      }

      // --- TARIFF ---
      case 'updateTariff': {
        const r = Number(data.newRate);
        Store.data.settings.DEFAULT_TARIFF = String(r);
        Store.save();
        return { success: true, message: `Tarif berhasil diubah menjadi Rp${r.toLocaleString('id-ID')} / KM.` };
      }

      // --- NOTIFIKASI ---
      case 'getNotifications': {
        return { success: true, data: Store.data.notifications };
      }

      case 'markNotificationRead': {
        const notif = Store.data.notifications.find(n => n.notificationId === data.notificationId);
        if (notif) notif.isRead = true;
        Store.save();
        return { success: true };
      }

      default:
        return { success: false, message: `Aksi '${action}' tidak dikenali.` };
    }
  },

  /**
   * Kalkulasi status oli, tune up, dan status kesehatan armada
   */
  calculateVehicleHealth(vehicles) {
    return vehicles.map(v => {
      const currentKm = Number(v.currentKm) || 0;
      const lastOilKm = Number(v.lastOilKm) || 0;
      const oilInterval = Number(v.oilIntervalKm) || 2000;
      const nextOilKm = lastOilKm + oilInterval;
      const remainingOilKm = nextOilKm - currentKm;

      let oilStatus = 'OK';
      let oilStatusText = `${remainingOilKm.toLocaleString('id-ID')} KM lagi`;
      if (remainingOilKm <= 0) {
        oilStatus = 'OVERDUE';
        oilStatusText = `GANTI OLI DIPERLUKAN (Terlambat ${Math.abs(remainingOilKm)} KM)`;
      } else if (remainingOilKm <= 150) {
        oilStatus = 'WARNING';
        oilStatusText = `Ganti oli dalam ${remainingOilKm} KM`;
      }

      const lastServiceKm = Number(v.lastServiceKm) || 0;
      const tuneupInterval = Number(v.tuneupIntervalKm) || 5000;
      const nextTuneupKm = lastServiceKm + tuneupInterval;
      const remainingTuneupKm = nextTuneupKm - currentKm;

      let tuneupStatus = 'OK';
      let tuneupStatusText = `${remainingTuneupKm.toLocaleString('id-ID')} KM lagi`;
      if (remainingTuneupKm <= 0) {
        tuneupStatus = 'OVERDUE';
        tuneupStatusText = `Tune-up sudah jatuh tempo`;
      } else if (remainingTuneupKm <= 200) {
        tuneupStatus = 'WARNING';
        tuneupStatusText = `Tune-up dalam ${remainingTuneupKm} KM`;
      }

      let health = 'GOOD';
      let healthLabel = 'Baik';
      if (oilStatus === 'OVERDUE' || tuneupStatus === 'OVERDUE') {
        health = 'DANGER';
        healthLabel = 'Perlu Servis';
      } else if (oilStatus === 'WARNING' || tuneupStatus === 'WARNING') {
        health = 'WARNING';
        healthLabel = 'Perlu Perhatian';
      }

      return {
        ...v,
        remainingOilKm,
        oilStatus,
        oilStatusText,
        remainingTuneupKm,
        tuneupStatus,
        tuneupStatusText,
        health,
        healthLabel
      };
    });
  },

  /**
   * Bangun data statistik lokal
   */
  buildMockStatistics() {
    const vehicles = this.calculateVehicleHealth(Store.data.vehicles);
    const trips = Store.data.trips.filter(t => t.status === 'FINISHED');
    const users = Store.data.users;

    let totalKm = 0;
    let totalCost = 0;
    const userMap = {};

    trips.forEach(t => {
      totalKm += (t.distanceKm || 0);
      totalCost += (t.totalCost || 0);
      const uid = t.userId || 'GUEST';
      if (!userMap[uid]) {
        userMap[uid] = {
          userId: uid,
          userName: t.userName,
          tripCount: 0,
          totalKm: 0,
          totalCost: 0
        };
      }
      userMap[uid].tripCount++;
      userMap[uid].totalKm += (t.distanceKm || 0);
      userMap[uid].totalCost += (t.totalCost || 0);
    });

    const userStats = Object.values(userMap);
    const topByCount = [...userStats].sort((a, b) => b.tripCount - a.tripCount);
    const topByKm = [...userStats].sort((a, b) => b.totalKm - a.totalKm);
    const topByCost = [...userStats].sort((a, b) => b.totalCost - a.totalCost);

    return {
      kpi: {
        totalVehicles: vehicles.length,
        countMotor: vehicles.filter(v => v.jenis === 'MOTOR').length,
        countMobil: vehicles.filter(v => v.jenis === 'MOBIL').length,
        countAvailable: vehicles.filter(v => v.status === 'AVAILABLE').length,
        countInUse: vehicles.filter(v => v.status === 'IN_USE').length,
        countMaintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
        totalUsers: users.length,
        pendingUsers: users.filter(u => u.status === 'PENDING').length,
        totalTripsMonth: trips.length,
        totalKmMonth: totalKm,
        totalCostMonth: totalCost,
        activeTariff: Number(Store.data.settings.DEFAULT_TARIFF) || 1000
      },
      rankings: {
        topByCount,
        topByKm,
        topByCost
      }
    };
  }
};
