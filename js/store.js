/**
 * MAISYA-TRANS - Local Store & Mock Database
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * Bertindak sebagai cache lokal dan fallback mockup demo
 * agar aplikasi dapat langsung dijalankan dan diuji 100% secara interaktif!
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
        // Pastikan relasi minimal tersedia
        if (this.data.vehicles && this.data.vehicles.length > 0) return;
      } catch (e) {
        console.warn('Gagal memuat local DB, menginisialisasi ulang seed data.');
      }
    }
    this.seedDefaultData();
  },

  /**
   * Simpan perubahan ke LocalStorage
   */
  save() {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(this.data));
  },

  /**
   * Seed data awal pondok
   */
  seedDefaultData() {
    const now = new Date().toISOString();
    const dateToday = now.substring(0, 10);
    
    // 1. Users
    this.data.users = [
      {
        userId: 'USR-ADMIN-01',
        nama: 'Ustadz Admin Maisya',
        nip: '19850101001',
        jabatan: 'Kepala Sarpras',
        divisi: 'Sarana & Prasarana',
        no_hp: '081234567890',
        email: 'admin@imamsyafii.ponpes.id',
        password_hash: 'admin123',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: now,
        approvedAt: now,
        approvedBy: 'SYSTEM',
        lastLogin: now
      },
      {
        userId: 'USR-GURU-01',
        nama: 'Ustadz Ahmad Fauzi',
        nip: '19900215002',
        jabatan: 'Guru Pengajar',
        divisi: 'Pendidikan & Asrama',
        no_hp: '081298765432',
        email: 'ahmad@imamsyafii.ponpes.id',
        password_hash: 'user123',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: now,
        approvedAt: now,
        approvedBy: 'USR-ADMIN-01',
        lastLogin: now
      },
      {
        userId: 'USR-STAF-02',
        nama: 'Ustadz Muhammad Rizqi',
        nip: '19930720003',
        jabatan: 'Staf Administrasi',
        divisi: 'Tata Usaha & Logistik',
        no_hp: '085712345678',
        email: 'rizqi@imamsyafii.ponpes.id',
        password_hash: 'user123',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: now,
        approvedAt: now,
        approvedBy: 'USR-ADMIN-01',
        lastLogin: now
      },
      {
        userId: 'USR-PEND-03',
        nama: 'Ustadz Abdullah Said',
        nip: '19960810004',
        jabatan: 'Pengasuhan Santri',
        divisi: 'Kesantrian Putra',
        no_hp: '081399887766',
        email: 'abdullah@imamsyafii.ponpes.id',
        password_hash: 'user123',
        role: 'USER',
        status: 'PENDING',
        createdAt: now,
        approvedAt: '',
        approvedBy: '',
        lastLogin: ''
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
        status: 'AVAILABLE',
        notes: 'Motor operasional asrama putra. Kondisi mesin prima.',
        createdAt: now
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
        createdAt: now
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
        createdAt: now
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
        createdAt: now
      }
    ];

    // 3. Bookings
    this.data.bookings = [
      {
        bookingId: 'BKG-001',
        userId: 'USR-GURU-01',
        vehicleId: 'VEH-MTR-01',
        tanggal: dateToday,
        startTime: '13:00',
        estimatedEndTime: '15:00',
        purpose: 'Antar berkas ujian santri ke Kemenag Brebes',
        notes: 'Bawa tas berkas',
        status: 'APPROVED',
        approvedBy: 'USR-ADMIN-01',
        approvedAt: now,
        createdAt: now
      }
    ];

    // 4. Riwayat Perjalanan (Trips)
    this.data.trips = [
      {
        tripId: 'TRP-HIST-01',
        bookingId: 'BKG-HIST-01',
        userId: 'USR-GURU-01',
        userName: 'Ustadz Ahmad Fauzi',
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
        totalCost: 28000,
        purpose: 'Keperluan koordinasi dinas luar pondok',
        damageNotes: '',
        status: 'FINISHED',
        createdAt: '2026-09-20T10:15:00.000Z'
      },
      {
        tripId: 'TRP-HIST-02',
        bookingId: 'BKG-HIST-02',
        userId: 'USR-STAF-02',
        userName: 'Ustadz Muhammad Rizqi',
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
        damageNotes: '',
        status: 'FINISHED',
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
        userId: 'ADMIN',
        type: 'USER_BARU',
        title: 'Registrasi Pengguna Menunggu Persetujuan',
        message: 'Ustadz Abdullah Said telah mendaftar dan menunggu persetujuan akun.',
        isRead: false,
        createdAt: now
      },
      {
        notificationId: 'NTF-002',
        userId: 'ADMIN',
        type: 'GANTI_OLI',
        title: 'Pengingat Ganti Oli: Honda Vario (G 2841 QX)',
        message: 'Tersisa 150 KM sebelum batas ganti oli berikutnya (Target 12.600 KM).',
        isRead: false,
        createdAt: now
      }
    ];

    // 7. Settings
    this.data.settings = {
      APP_NAME: 'MAISYA-TRANS',
      TAGLINE: 'Mobilitas Aman, Tertib, dan Terdata',
      DEFAULT_TARIFF: '1000',
      APPROVAL_REQUIRED: 'true',
      ALLOW_REGISTRATION: 'true'
    };

    this.save();
  }
};

// Auto initialize Store
Store.init();
