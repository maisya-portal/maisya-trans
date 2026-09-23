/**
 * MAISYA-TRANS - Local Store & Mock Database
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * Mendukung penyimpanan persisten lokal dan sinkronisasi real-time
 */

const Store = {
  data: {
    users: [],
    vehicles: [],
    bookings: [],
    trips: [],
    tariffs: [],
    maintenance: [],
    notifications: [],
    settings: {}
  },

  /**
   * Inisialisasi store dari localStorage atau buat data seed awal
   */
  init() {
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        if (this.data.vehicles && this.data.vehicles.length > 0) {
          // Pastikan properti baru terisi jika ada update schema
          this.ensureSchemaIntegrity();
          return;
        }
      } catch (e) {
        console.warn('Gagal memuat local DB, menginisialisasi ulang seed data.');
      }
    }
    this.seedDefaultData();
  },

  /**
   * Memastikan integritas data local DB
   */
  ensureSchemaIntegrity() {
    if (!this.data.bookings) this.data.bookings = [];
    if (!this.data.trips) this.data.trips = [];
    if (!this.data.maintenance) this.data.maintenance = [];
    if (!this.data.notifications) this.data.notifications = [];
    if (!this.data.settings) this.data.settings = {};

    // Perbarui rekening
    if (!this.data.settings.BANK_ACCOUNT_NO || this.data.settings.BANK_ACCOUNT_NO === '7192830192') {
      this.data.settings.BANK_NAME = 'Bank Syariah Indonesia (BSI)';
      this.data.settings.BANK_ACCOUNT_NO = '5221717173';
      this.data.settings.BANK_ACCOUNT_NAME = "Pondok Pesantren Imam Syafi'i Brebes";
    }

    // Backfill bookings
    this.data.bookings.forEach(b => {
      const v = this.data.vehicles.find(x => x.vehicleId === b.vehicleId) || {};
      const u = (this.data.users && this.data.users.find(x => x.userId === b.userId)) || {};
      if (!b.userName) b.userName = b.nama_peminjam || u.nama || 'Ustadz Pesantren';
      if (!b.divisi) b.divisi = u.divisi || 'Pendidikan & Asrama';
      if (!b.vehicleName) b.vehicleName = v.merk ? `${v.merk} ${v.model}` : 'Kendaraan Pondok';
      if (!b.nomorPolisi) b.nomorPolisi = v.nomorPolisi || '-';
      if (!b.tujuan) b.tujuan = b.purpose || 'Brebes';
      if (!b.status) b.status = 'APPROVED';
    });

    // Backfill trips
    this.data.trips.forEach(t => {
      const v = this.data.vehicles.find(x => x.vehicleId === t.vehicleId) || {};
      const u = (this.data.users && this.data.users.find(x => x.userId === t.userId)) || {};
      if (!t.userName) t.userName = u.nama || 'Pengguna Pesantren';
      if (!t.divisi) t.divisi = u.divisi || 'Pondok';
      if (!t.vehicleName) t.vehicleName = v.merk ? `${v.merk} ${v.model}` : 'Kendaraan';
      if (!t.nomorPolisi) t.nomorPolisi = v.nomorPolisi || '-';
      if (!t.jenis) t.jenis = v.jenis || 'MOTOR';
    });

    // Jika trips atau maintenance kosong pada localStorage lama, seed agar tampilan lengkap
    if (this.data.trips.length === 0) {
      this.seedTrips();
    }
    if (this.data.maintenance.length === 0) {
      this.seedMaintenance();
    }
    if (this.data.notifications.length === 0) {
      this.seedNotifications();
    }

    this.save();
  },

  /**
   * Simpan perubahan ke LocalStorage
   */
  save() {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Gagal menyimpan ke localStorage:', e);
    }
  },

  /**
   * Seed data awal pondok
   */
  seedDefaultData() {
    const now = new Date();
    const nowIso = now.toISOString();
    const dateToday = nowIso.substring(0, 10);
    
    // Waktu mulai 35 menit yang lalu untuk simulasi argo aktif real-time
    const activeStartTime = new Date(now.getTime() - 35 * 60 * 1000).toISOString();

    // 1. Users (Admin & Sample Users)
    this.data.users = [
      {
        userId: 'USR-ADMIN-01',
        nama: 'Ustadz Admin Sarpras',
        nip: '19850101001',
        jabatan: 'Kepala Sarpras & Operasional',
        divisi: 'Sarana & Prasarana',
        no_hp: '081234567890',
        email: 'admin@imamsyafii.ponpes.id',
        password_hash: 'admin123',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: nowIso,
        approvedAt: nowIso,
        approvedBy: 'SYSTEM',
        lastLogin: nowIso
      },
      {
        userId: 'USR-GURU-01',
        nama: 'Ustadz Ahmad Fauzi, S.Pd.I.',
        nip: '19900215002',
        jabatan: 'Guru Pengajar',
        divisi: 'Pendidikan & Asrama',
        no_hp: '081298765432',
        email: 'ahmad@imamsyafii.ponpes.id',
        password_hash: 'user123',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: nowIso,
        approvedAt: nowIso,
        approvedBy: 'USR-ADMIN-01',
        lastLogin: nowIso
      },
      {
        userId: 'USR-STAF-02',
        nama: 'Ustadz Muhammad Rizqi, S.Kom.',
        nip: '19930720003',
        jabatan: 'Staf Administrasi & Logistik',
        divisi: 'Tata Usaha',
        no_hp: '085712345678',
        email: 'rizqi@imamsyafii.ponpes.id',
        password_hash: 'user123',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: nowIso,
        approvedAt: nowIso,
        approvedBy: 'USR-ADMIN-01',
        lastLogin: nowIso
      }
    ];

    // 2. Vehicles
    this.data.vehicles = [
      {
        vehicleId: 'VEH-MTR-01',
        jenis: 'MOTOR',
        merk: 'Honda',
        model: 'Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        tahun: '2023',
        warna: 'Hitam Metalik',
        currentKm: 12450,
        lastServiceKm: 11000,
        lastServiceDate: '2026-08-15',
        lastOilKm: 10600,
        lastOilDate: '2026-08-15',
        oilIntervalKm: 2000,
        tuneupIntervalKm: 5000,
        status: 'IN_USE',
        notes: 'Motor operasional asrama putra. Kondisi mesin prima.',
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80',
        activeTrip: {
          tripId: 'TRP-ACT-01',
          bookingId: 'BKG-001',
          userId: 'USR-GURU-01',
          userName: 'Ustadz Ahmad Fauzi',
          divisi: 'Pendidikan & Asrama',
          noHp: '081298765432',
          startTime: activeStartTime,
          startKm: 12450,
          purpose: 'Antar berkas ujian santri ke Kemenag Brebes',
          tujuan: 'Kantor Kemenag Brebes',
          passengerCount: 1,
          fuelLevelStart: '75%',
          cleanlinessStart: 'Bersih',
          notes: 'Membawa dokumen penting pondok'
        },
        createdAt: nowIso
      },
      {
        vehicleId: 'VEH-MTR-02',
        jenis: 'MOTOR',
        merk: 'Yamaha',
        model: 'NMAX 155 VVA',
        nomorPolisi: 'G 3912 BZ',
        tahun: '2022',
        warna: 'Abu-Abu Doff',
        currentKm: 18850,
        lastServiceKm: 17000,
        lastServiceDate: '2026-08-20',
        lastOilKm: 17000,
        lastOilDate: '2026-08-20',
        oilIntervalKm: 2000,
        tuneupIntervalKm: 5000,
        status: 'AVAILABLE',
        notes: 'Motor dinas luar kota / koordinasi daerah.',
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop&q=80',
        createdAt: nowIso
      },
      {
        vehicleId: 'VEH-MBL-01',
        jenis: 'MOBIL',
        merk: 'Toyota',
        model: 'Grand New Avanza 1.3 G',
        nomorPolisi: 'G 1420 SY',
        tahun: '2021',
        warna: 'Putih Mutiara',
        currentKm: 35200,
        lastServiceKm: 30000,
        lastServiceDate: '2026-07-10',
        lastOilKm: 30000,
        lastOilDate: '2026-07-10',
        oilIntervalKm: 5000,
        tuneupIntervalKm: 10000,
        status: 'AVAILABLE',
        notes: 'Mobil dinas pondok kapasitas 7 penumpang.',
        imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80',
        createdAt: nowIso
      },
      {
        vehicleId: 'VEH-MBL-02',
        jenis: 'MOBIL',
        merk: 'Daihatsu',
        model: 'Gran Max Blind Van',
        nomorPolisi: 'G 8192 ZA',
        tahun: '2020',
        warna: 'Silver',
        currentKm: 62100,
        lastServiceKm: 55000,
        lastServiceDate: '2026-06-01',
        lastOilKm: 60000,
        lastOilDate: '2026-08-01',
        oilIntervalKm: 5000,
        tuneupIntervalKm: 10000,
        status: 'MAINTENANCE',
        notes: 'Sedang servis rem dan perawatan rutin di bengkel rekanan.',
        imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80',
        createdAt: nowIso
      }
    ];

    // 3. Bookings
    this.data.bookings = [
      {
        bookingId: 'BKG-001',
        userId: 'USR-GURU-01',
        userName: 'Ustadz Ahmad Fauzi',
        divisi: 'Pendidikan & Asrama',
        noHp: '081298765432',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        tanggal: dateToday,
        startTime: '08:00',
        estimatedEndTime: '11:30',
        purpose: 'Antar berkas ujian santri ke Kemenag Brebes',
        tujuan: 'Kemenag Brebes',
        passengerCount: 1,
        notes: 'Membawa berkas santri',
        status: 'IN_USE',
        approvedBy: 'USR-ADMIN-01',
        approvedAt: nowIso,
        createdAt: nowIso
      }
    ];

    // 4. Trips (Active & History)
    this.data.trips = [
      {
        tripId: 'TRP-ACT-01',
        bookingId: 'BKG-001',
        userId: 'USR-GURU-01',
        userName: 'Ustadz Ahmad Fauzi',
        divisi: 'Pendidikan & Asrama',
        noHp: '081298765432',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        startTime: activeStartTime,
        endTime: '',
        startKm: 12450,
        endKm: 0,
        distanceKm: 0,
        ratePerKm: 1000,
        totalCost: 0,
        purpose: 'Antar berkas ujian santri ke Kemenag Brebes',
        tujuan: 'Kantor Kemenag Brebes',
        passengerCount: 1,
        checkIn: {
          startKm: 12450,
          fuelLevel: '75%',
          cleanliness: 'Bersih',
          exteriorCondition: 'Bagus / Tidak ada lecet baru',
          damageNotes: '',
          photos: {
            front: '',
            side: '',
            back: '',
            odometer: ''
          },
          checkInTime: activeStartTime
        },
        status: 'ACTIVE',
        createdAt: activeStartTime
      },
      {
        tripId: 'TRP-HIST-01',
        bookingId: 'BKG-HIST-01',
        userId: 'USR-GURU-01',
        userName: 'Ustadz Ahmad Fauzi',
        divisi: 'Pendidikan & Asrama',
        noHp: '081298765432',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        startTime: '2026-09-20T08:00:00.000Z',
        endTime: '2026-09-20T10:15:00.000Z',
        startKm: 12422,
        endKm: 12450,
        distanceKm: 28,
        ratePerKm: 1000,
        totalCost: 0,
        purpose: 'Keperluan koordinasi dinas luar pondok',
        tujuan: 'Dinas Pendidikan Brebes',
        passengerCount: 1,
        checkIn: {
          startKm: 12422,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          exteriorCondition: 'Baik'
        },
        checkOut: {
          endKm: 12450,
          fuelLevel: '75%',
          cleanliness: 'Bersih',
          isBbmFilled: true,
          bbmCost: 35000,
          bbmReceiptUrl: '',
          paymentMethod: 'BBM_WAIVED',
          isPaid: true
        },
        damageNotes: '',
        status: 'FINISHED',
        verifiedBy: 'USR-ADMIN-01',
        verifiedAt: '2026-09-20T10:30:00.000Z',
        createdAt: '2026-09-20T10:15:00.000Z'
      },
      {
        tripId: 'TRP-HIST-02',
        bookingId: 'BKG-HIST-02',
        userId: 'USR-STAF-02',
        userName: 'Ustadz Muhammad Rizqi',
        divisi: 'Tata Usaha & Logistik',
        noHp: '085712345678',
        vehicleId: 'VEH-MBL-01',
        vehicleName: 'Toyota Grand New Avanza 1.3 G',
        nomorPolisi: 'G 1420 SY',
        jenis: 'MOBIL',
        startTime: '2026-09-19T09:00:00.000Z',
        endTime: '2026-09-19T12:30:00.000Z',
        startKm: 35140,
        endKm: 35200,
        distanceKm: 60,
        ratePerKm: 1000,
        totalCost: 60000,
        purpose: 'Belanja logistik dapur santri di Pasar Induk Brebes',
        tujuan: 'Pasar Induk Brebes',
        passengerCount: 3,
        checkIn: {
          startKm: 35140,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          exteriorCondition: 'Baik'
        },
        checkOut: {
          endKm: 35200,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          isBbmFilled: false,
          paymentMethod: 'TRANSFER',
          transferProofUrl: '',
          isPaid: true
        },
        damageNotes: '',
        status: 'FINISHED',
        verifiedBy: 'USR-ADMIN-01',
        verifiedAt: '2026-09-19T12:45:00.000Z',
        createdAt: '2026-09-19T12:30:00.000Z'
      }
    ];

    // 5. Maintenance
    this.data.maintenance = [
      {
        maintenanceId: 'MNT-001',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        type: 'GANTI_OLI',
        date: '2026-08-15',
        km: 10600,
        description: 'Ganti oli mesin AHM SPX2 dan oli gardan',
        cost: 95000,
        nextDueKm: 12600,
        nextDueDate: '2026-10-15',
        createdBy: 'USR-ADMIN-01'
      }
    ];

    // 6. Notifications
    this.data.notifications = [
      {
        notificationId: 'NTF-001',
        userId: 'ALL',
        type: 'INFO',
        title: 'Sistem Peminjaman Kendaraan Terbuka Aktif',
        message: 'Pengguna dapat langsung mengajukan peminjaman kendaraan tanpa login. Kunci diambil setelah disetujui Admin Sarpras.',
        isRead: false,
        createdAt: nowIso
      }
    ];

    // 7. Settings
    this.data.settings = {
      APP_NAME: 'MAISYA-TRANS',
      TAGLINE: 'Mobilitas Aman, Tertib, dan Terdata',
      DEFAULT_TARIFF: '1000',
      APPROVAL_REQUIRED: 'true',
      ALLOW_REGISTRATION: 'true',
      BANK_NAME: 'Bank Syariah Indonesia (BSI)',
      BANK_ACCOUNT_NO: '5221717173',
      BANK_ACCOUNT_NAME: "Pondok Pesantren Imam Syafi'i Brebes"
    };

    this.save();
  },

  seedTrips() {
    this.data.trips = [
      {
        tripId: 'TRP-HIST-01',
        bookingId: 'BKG-HIST-01',
        userId: 'USR-GURU-01',
        userName: 'Ustadz Ahmad Fauzi',
        divisi: 'Pendidikan & Asrama',
        noHp: '081298765432',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        startTime: '2026-09-20T08:00:00.000Z',
        endTime: '2026-09-20T10:15:00.000Z',
        startKm: 12422,
        endKm: 12450,
        distanceKm: 28,
        ratePerKm: 1000,
        totalCost: 0,
        purpose: 'Keperluan koordinasi dinas luar pondok',
        tujuan: 'Dinas Pendidikan Brebes',
        passengerCount: 1,
        checkIn: {
          startKm: 12422,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          exteriorCondition: 'Baik'
        },
        checkOut: {
          endKm: 12450,
          fuelLevel: '75%',
          cleanliness: 'Bersih',
          isBbmFilled: true,
          bbmCost: 35000,
          bbmReceiptUrl: '',
          paymentMethod: 'BBM_WAIVED',
          isPaid: true
        },
        damageNotes: '',
        status: 'FINISHED',
        verifiedBy: 'USR-ADMIN-01',
        verifiedAt: '2026-09-20T10:30:00.000Z',
        createdAt: '2026-09-20T10:15:00.000Z'
      },
      {
        tripId: 'TRP-HIST-02',
        bookingId: 'BKG-HIST-02',
        userId: 'USR-STAF-02',
        userName: 'Ustadz Muhammad Rizqi',
        divisi: 'Tata Usaha & Logistik',
        noHp: '085712345678',
        vehicleId: 'VEH-MBL-01',
        vehicleName: 'Toyota Grand New Avanza 1.3 G',
        nomorPolisi: 'G 1420 SY',
        jenis: 'MOBIL',
        startTime: '2026-09-19T09:00:00.000Z',
        endTime: '2026-09-19T12:30:00.000Z',
        startKm: 35140,
        endKm: 35200,
        distanceKm: 60,
        ratePerKm: 1000,
        totalCost: 60000,
        purpose: 'Belanja logistik dapur santri di Pasar Induk Brebes',
        tujuan: 'Pasar Induk Brebes',
        passengerCount: 3,
        checkIn: {
          startKm: 35140,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          exteriorCondition: 'Baik'
        },
        checkOut: {
          endKm: 35200,
          fuelLevel: '50%',
          cleanliness: 'Bersih',
          isBbmFilled: false,
          paymentMethod: 'TRANSFER',
          transferProofUrl: '',
          isPaid: true
        },
        damageNotes: '',
        status: 'FINISHED',
        verifiedBy: 'USR-ADMIN-01',
        verifiedAt: '2026-09-19T12:45:00.000Z',
        createdAt: '2026-09-19T12:30:00.000Z'
      }
    ];
  },

  seedMaintenance() {
    this.data.maintenance = [
      {
        maintenanceId: 'MNT-001',
        vehicleId: 'VEH-MTR-01',
        vehicleName: 'Honda Vario 160 CBS',
        nomorPolisi: 'G 2841 QX',
        jenis: 'MOTOR',
        type: 'GANTI_OLI',
        date: '2026-08-15',
        km: 10600,
        description: 'Ganti oli mesin AHM SPX2 dan oli gardan',
        cost: 95000,
        nextDueKm: 12600,
        nextDueDate: '2026-10-15',
        createdBy: 'USR-ADMIN-01'
      },
      {
        maintenanceId: 'MNT-002',
        vehicleId: 'VEH-MBL-01',
        vehicleName: 'Toyota Grand New Avanza 1.3 G',
        nomorPolisi: 'G 1420 SY',
        jenis: 'MOBIL',
        type: 'TUNE_UP',
        date: '2026-07-10',
        km: 30000,
        description: 'Tune-up mesin berkala 30.000 KM & rotasi ban',
        cost: 450000,
        nextDueKm: 40000,
        nextDueDate: '2026-12-10',
        createdBy: 'USR-ADMIN-01'
      },
      {
        maintenanceId: 'MNT-003',
        vehicleId: 'VEH-MBL-02',
        vehicleName: 'Daihatsu Gran Max Blind Van',
        nomorPolisi: 'G 8192 ZA',
        jenis: 'MOBIL',
        type: 'SERVIS_REM',
        date: '2026-09-22',
        km: 62100,
        description: 'Penggantian kampas rem depan dan kuras minyak rem',
        cost: 380000,
        nextDueKm: 70000,
        nextDueDate: '2027-03-22',
        createdBy: 'USR-ADMIN-01'
      }
    ];
  },

  seedNotifications() {
    this.data.notifications = [
      {
        notificationId: 'NTF-001',
        userId: 'ALL',
        type: 'INFO',
        title: 'Sistem Peminjaman Kendaraan Terbuka Aktif',
        message: 'Pengguna dapat langsung mengajukan peminjaman kendaraan tanpa login. Kunci diambil setelah disetujui Admin Sarpras.',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        notificationId: 'NTF-002',
        userId: 'ADMIN',
        type: 'GANTI_OLI',
        title: 'Pengingat Ganti Oli: Honda Vario 160 (G 2841 QX)',
        message: 'Odometer saat ini mendekati batas jadwal ganti oli berkala berikutnya (12.600 KM).',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];
  }
};

// Inisialisasi Store
Store.init();
