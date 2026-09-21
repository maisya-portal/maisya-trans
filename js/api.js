/**
 * MAISYA-TRANS - Unified API Client
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * Mengirim request ke Google Apps Script Web App Endpoint.
 * Jika URL belum dikonfigurasi atau offline, secara mulus menggunakan Local Store (Mock)
 * sehingga aplikasi langsung berfungsi penuh tanpa jeda.
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
   * Core request executor
   */
  async request(action, method = 'GET', data = {}) {
    const currentUser = Auth.getUser();
    const token = Auth.getToken();
    
    // Fallback ke Store jika dalam mode mockup/offline
    if (this.isMockMode()) {
      return this.executeMock(action, data, currentUser);
    }

    try {
      const url = getActiveApiUrl();
      let response;

      if (method === 'GET') {
        const queryParams = new URLSearchParams({
          action,
          token: token || '',
          userId: currentUser ? currentUser.userId : '',
          role: currentUser ? currentUser.role : 'USER',
          ...data
        });
        response = await fetch(`${url}?${queryParams.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      } else {
        // POST Request
        const payload = {
          action,
          token: token || '',
          userId: currentUser ? currentUser.userId : '',
          role: currentUser ? currentUser.role : 'USER',
          ...data
        };
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain prevents CORS preflight in GAS
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.warn(`[API] Remote call failed (${err.message}). Menggunakan offline local store.`);
      return this.executeMock(action, data, currentUser);
    }
  },

  /**
   * Mock Engine untuk simulasi lokal jika GAS belum dideploy
   */
  executeMock(action, data, currentUser) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date().toISOString();
        
        switch (action) {
          // --- AUTH ---
          case 'login': {
            const { username, password } = data;
            const inputLower = (username || '').toLowerCase().trim();
            const user = Store.data.users.find(u => 
              (u.email.toLowerCase() === inputLower || u.nip === inputLower)
            );

            if (!user) {
              return resolve({ success: false, message: 'Email/NIP tidak ditemukan di sistem.' });
            }
            if (user.password_hash !== password) {
              return resolve({ success: false, message: 'Password salah.' });
            }
            if (user.status === 'PENDING') {
              return resolve({ 
                success: false, 
                message: 'Akun Anda masih PENDING menunggu persetujuan Admin Sarpras.' 
              });
            }
            if (user.status === 'REJECTED') {
              return resolve({ success: false, message: 'Pendaftaran akun Anda ditolak oleh Admin.' });
            }
            if (user.status === 'INACTIVE') {
              return resolve({ success: false, message: 'Akun Anda dinonaktifkan sementara.' });
            }

            user.lastLogin = now;
            Store.save();
            const mockToken = btoa(JSON.stringify({ userId: user.userId, role: user.role, time: Date.now() }));
            return resolve({
              success: true,
              message: 'Login berhasil. Selamat datang di Maisya-Trans!',
              data: { token: mockToken, user }
            });
          }

          case 'register': {
            const { nama, nip, jabatan, divisi, no_hp, email, password } = data;
            const exists = Store.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
              return resolve({ success: false, message: 'Email sudah terdaftar di sistem.' });
            }
            const newUser = {
              userId: 'USR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
              nama: nama.trim(),
              nip: nip || '-',
              jabatan: jabatan || 'Guru/Karyawan',
              divisi: divisi || 'Pondok',
              no_hp: no_hp.trim(),
              email: email.toLowerCase().trim(),
              password_hash: password,
              role: 'USER',
              status: 'PENDING',
              createdAt: now,
              approvedAt: '',
              approvedBy: '',
              lastLogin: ''
            };
            Store.data.users.push(newUser);
            Store.data.notifications.unshift({
              notificationId: 'NTF-' + Date.now(),
              userId: 'ADMIN',
              type: 'USER_BARU',
              title: 'Registrasi Pengguna Baru',
              message: `${nama} (${divisi}) mendaftar dan menunggu persetujuan.`,
              isRead: false,
              createdAt: now
            });
            Store.save();
            return resolve({
              success: true,
              message: 'Alhamdulillah, pendaftaran berhasil! Menunggu persetujuan Admin Sarpras.',
              data: newUser
            });
          }

          // --- DASHBOARD ---
          case 'getDashboard': {
            const vehicles = this.calculateVehicleHealth(Store.data.vehicles);
            const activeMotor = vehicles.find(v => v.jenis === 'MOTOR' && v.status === 'IN_USE') || null;
            const activeMobil = vehicles.find(v => v.jenis === 'MOBIL' && v.status === 'IN_USE') || null;
            const motorAvail = vehicles.filter(v => v.jenis === 'MOTOR' && v.status === 'AVAILABLE').length;
            const mobilAvail = vehicles.filter(v => v.jenis === 'MOBIL' && v.status === 'AVAILABLE').length;
            const inUseCount = vehicles.filter(v => v.status === 'IN_USE').length;
            const pendingUsers = Store.data.users.filter(u => u.status === 'PENDING').length;
            const unreadNotif = Store.data.notifications.filter(n => !n.isRead).length;

            return resolve({
              success: true,
              data: {
                overview: {
                  allAvailable: inUseCount === 0,
                  totalVehicles: vehicles.length,
                  totalInUse: inUseCount,
                  motorAvailableCount: motorAvail,
                  mobilAvailableCount: mobilAvail,
                  unreadNotifCount: unreadNotif,
                  pendingUserCount: pendingUsers
                },
                activeMotor,
                activeMobil,
                vehicles,
                recentTrips: Store.data.trips.slice(0, 5),
                notifications: Store.data.notifications.slice(0, 5)
              }
            });
          }

          // --- VEHICLES ---
          case 'getVehicles': {
            const list = this.calculateVehicleHealth(Store.data.vehicles);
            return resolve({ success: true, data: list });
          }

          case 'addVehicle': {
            const vId = 'VEH-' + (data.jenis === 'MOBIL' ? 'MBL' : 'MTR') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const newVeh = {
              vehicleId: vId,
              jenis: data.jenis,
              merk: data.merk,
              model: data.model,
              nomorPolisi: data.nomor_polisi.toUpperCase().trim(),
              tahun: data.tahun || new Date().getFullYear(),
              warna: data.warna || 'Standar',
              currentKm: Number(data.current_km) || 0,
              lastServiceKm: Number(data.current_km) || 0,
              lastServiceDate: now.substring(0, 10),
              lastOilKm: Number(data.current_km) || 0,
              lastOilDate: now.substring(0, 10),
              oilIntervalKm: Number(data.oil_interval_km) || (data.jenis === 'MOBIL' ? 5000 : 2000),
              tuneupIntervalKm: Number(data.tuneup_interval_km) || (data.jenis === 'MOBIL' ? 10000 : 5000),
              status: 'AVAILABLE',
              notes: data.notes || '',
              createdAt: now
            };
            Store.data.vehicles.push(newVeh);
            Store.save();
            return resolve({ success: true, message: 'Kendaraan berhasil ditambahkan!', data: newVeh });
          }

          // --- BOOKING ---
          case 'createBooking': {
            const targetV = Store.data.vehicles.find(v => v.vehicleId === data.vehicleId);
            if (!targetV) return resolve({ success: false, message: 'Kendaraan tidak ditemukan.' });
            if (targetV.status === 'MAINTENANCE') {
              return resolve({ success: false, message: 'Kendaraan sedang dalam perawatan servis.' });
            }

            const newBkg = {
              bookingId: 'BKG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
              userId: currentUser ? currentUser.userId : data.userId,
              userName: currentUser ? currentUser.nama : 'Pengguna Pondok',
              vehicleId: data.vehicleId,
              vehicleName: `${targetV.merk} ${targetV.model}`,
              nomorPolisi: targetV.nomorPolisi,
              jenis: targetV.jenis,
              tanggal: data.tanggal,
              startTime: data.start_time,
              estimatedEndTime: data.estimated_end_time,
              purpose: data.purpose,
              notes: data.notes || '',
              status: 'APPROVED', // Di set APPROVED agar langsung siap mulai
              approvedBy: 'SYSTEM',
              approvedAt: now,
              createdAt: now
            };
            Store.data.bookings.unshift(newBkg);
            Store.save();
            return resolve({
              success: true,
              message: 'Peminjaman berhasil disetujui! Silakan tekan MULAI PEMAKAIAN saat siap berangkat.',
              data: newBkg
            });
          }

          case 'getBookings': {
            return resolve({ success: true, data: Store.data.bookings });
          }

          // --- START TRIP ---
          case 'startTrip': {
            const { vehicleId, bookingId, start_km, purpose, start_checklist } = data;
            const startKmNum = Number(start_km);
            const targetVeh = Store.data.vehicles.find(v => v.vehicleId === vehicleId);

            if (!targetVeh) return resolve({ success: false, message: 'Kendaraan tidak ditemukan.' });
            if (targetVeh.status === 'IN_USE') {
              return resolve({ success: false, message: 'Kendaraan baru saja dipakai oleh pengguna lain.' });
            }
            if (targetVeh.status === 'MAINTENANCE') {
              return resolve({ success: false, message: 'Kendaraan berstatus perawatan bengkel.' });
            }
            if (startKmNum < targetVeh.currentKm) {
              return resolve({
                success: false,
                message: `KM Awal (${startKmNum.toLocaleString('id-ID')}) tidak boleh lebih kecil dari odometer tercatat (${targetVeh.currentKm.toLocaleString('id-ID')}).`
              });
            }

            const tripId = 'TRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const tripRecord = {
              tripId,
              bookingId: bookingId || '',
              userId: currentUser ? currentUser.userId : 'USR-GURU-01',
              userName: currentUser ? currentUser.nama : 'Pengguna Pondok',
              vehicleId,
              vehicleName: `${targetVeh.merk} ${targetVeh.model}`,
              nomorPolisi: targetVeh.nomorPolisi,
              jenis: targetVeh.jenis,
              startTime: now,
              endTime: '',
              startKm: startKmNum,
              endKm: 0,
              distanceKm: 0,
              ratePerKm: Number(Store.data.settings.DEFAULT_TARIFF) || 1000,
              totalCost: 0,
              purpose: purpose || 'Operasional Pondok',
              startChecklist: start_checklist,
              damageNotes: '',
              status: 'ACTIVE',
              createdAt: now
            };

            // Update status kendaraan & aktif trip info
            targetVeh.status = 'IN_USE';
            if (startKmNum > targetVeh.currentKm) targetVeh.currentKm = startKmNum;
            targetVeh.activeTrip = {
              tripId,
              userId: tripRecord.userId,
              userName: tripRecord.userName,
              startTime: now,
              startKm: startKmNum,
              purpose: tripRecord.purpose
            };

            Store.data.trips.unshift(tripRecord);
            Store.data.notifications.unshift({
              notificationId: 'NTF-' + Date.now(),
              userId: 'ADMIN',
              type: 'KENDARAAN_DIMULAI',
              title: `Kendaraan Mulai Digunakan: ${targetVeh.merk} (${targetVeh.nomorPolisi})`,
              message: `${tripRecord.userName} mulai menggunakan kendaraan pada KM ${startKmNum.toLocaleString('id-ID')}.`,
              isRead: false,
              createdAt: now
            });
            Store.save();

            return resolve({
              success: true,
              message: 'Bismillah! Pemakaian kendaraan berhasil dimulai.',
              data: tripRecord
            });
          }

          // --- FINISH TRIP ---
          case 'finishTrip': {
            const { tripId, end_km, return_condition, damage_notes } = data;
            const endKmNum = Number(end_km);
            const trip = Store.data.trips.find(t => t.tripId === tripId);
            if (!trip) return resolve({ success: false, message: 'Data perjalanan tidak ditemukan.' });
            if (endKmNum < trip.startKm) {
              return resolve({
                success: false,
                message: `KM Akhir (${endKmNum.toLocaleString('id-ID')}) tidak boleh lebih kecil dari KM awal (${trip.startKm.toLocaleString('id-ID')}).`
              });
            }

            const dist = endKmNum - trip.startKm;
            const rate = trip.ratePerKm || 1000;
            const cost = dist * rate;
            const targetVeh = Store.data.vehicles.find(v => v.vehicleId === trip.vehicleId);

            trip.endTime = now;
            trip.endKm = endKmNum;
            trip.distanceKm = dist;
            trip.totalCost = cost;
            trip.damageNotes = damage_notes || '';
            trip.status = 'FINISHED';

            if (targetVeh) {
              targetVeh.currentKm = endKmNum;
              targetVeh.status = (damage_notes && damage_notes.length > 5) ? 'MAINTENANCE' : 'AVAILABLE';
              targetVeh.activeTrip = null;
              if (damage_notes && damage_notes.length > 5) {
                targetVeh.notes = 'Laporan kerusakan: ' + damage_notes;
              }
            }

            const diffMins = Math.max(1, Math.round((new Date(now).getTime() - new Date(trip.startTime).getTime()) / 60000));
            const durationText = diffMins >= 60 ? `${Math.floor(diffMins/60)} jam ${diffMins%60} menit` : `${diffMins} menit`;

            Store.data.notifications.unshift({
              notificationId: 'NTF-' + Date.now(),
              userId: 'ADMIN',
              type: 'KENDARAAN_SELESAI',
              title: `Kendaraan Dikembalikan: ${trip.vehicleName}`,
              message: `${trip.userName} selesai. Jarak: ${dist} KM. Biaya: Rp${cost.toLocaleString('id-ID')}.`,
              isRead: false,
              createdAt: now
            });
            Store.save();

            return resolve({
              success: true,
              message: 'Alhamdulillah, pemakaian kendaraan selesai!',
              data: {
                tripId,
                vehicleName: trip.vehicleName,
                nomorPolisi: trip.nomorPolisi,
                startKm: trip.startKm,
                endKm: endKmNum,
                distanceKm: dist,
                ratePerKm: rate,
                totalCost: cost,
                durationText,
                purpose: trip.purpose
              }
            });
          }

          // --- HISTORY ---
          case 'getHistory': {
            let list = [...Store.data.trips];
            if (currentUser && currentUser.role === 'USER') {
              list = list.filter(t => t.userId === currentUser.userId);
            }
            return resolve({ success: true, data: list });
          }

          // --- USERS & APPROVAL ---
          case 'getUsers': {
            return resolve({ success: true, data: Store.data.users });
          }

          case 'approveUser': {
            const u = Store.data.users.find(x => x.userId === data.targetUserId);
            if (u) {
              u.status = 'ACTIVE';
              u.approvedAt = now;
              u.approvedBy = currentUser ? currentUser.userId : 'ADMIN';
              Store.save();
              return resolve({ success: true, message: `Akun ${u.nama} berhasil disetujui.` });
            }
            return resolve({ success: false, message: 'User tidak ditemukan.' });
          }

          case 'rejectUser': {
            const u = Store.data.users.find(x => x.userId === data.targetUserId);
            if (u) {
              u.status = 'REJECTED';
              Store.save();
              return resolve({ success: true, message: `Akun ${u.nama} ditolak.` });
            }
            return resolve({ success: false, message: 'User tidak ditemukan.' });
          }

          // --- STATISTICS ---
          case 'getStatistics': {
            const stats = this.buildMockStatistics();
            return resolve({ success: true, data: stats });
          }

          // --- MAINTENANCE ---
          case 'getMaintenance': {
            return resolve({ success: true, data: Store.data.maintenance });
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

            // Update di kendaraan
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
            return resolve({ success: true, message: 'Catatan servis berhasil disimpan!', data: newMnt });
          }

          // --- TARIFF ---
          case 'updateTariff': {
            const r = Number(data.newRate);
            Store.data.settings.DEFAULT_TARIFF = String(r);
            Store.save();
            return resolve({ success: true, message: `Tarif berhasil diubah menjadi Rp${r.toLocaleString('id-ID')} / KM.` });
          }

          // --- NOTIFICATIONS ---
          case 'getNotifications': {
            return resolve({ success: true, data: Store.data.notifications });
          }

          case 'markNotificationRead': {
            const notif = Store.data.notifications.find(n => n.notificationId === data.notificationId);
            if (notif) notif.isRead = true;
            Store.save();
            return resolve({ success: true });
          }

          default:
            return resolve({ success: false, message: `Aksi mock '${action}' belum didefinisikan.` });
        }
      }, 150); // slight simulated async delay
    });
  },

  /**
   * Kalkulasi status oli, tune up, dan status kesehatan kendaraan
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
      totalKm += t.distanceKm;
      totalCost += t.totalCost;
      if (!userMap[t.userId]) {
        userMap[t.userId] = {
          userId: t.userId,
          userName: t.userName,
          tripCount: 0,
          totalKm: 0,
          totalCost: 0
        };
      }
      userMap[t.userId].tripCount++;
      userMap[t.userId].totalKm += t.distanceKm;
      userMap[t.userId].totalCost += t.totalCost;
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
