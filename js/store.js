/**
 * MAISYA-TRANS - Local Store & State Management
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * Mendukung penyimpanan persisten lokal dan sinkronisasi data riil database
 */

const Store = {
  data: {
    users: [],
    vehicles: [],
    bookings: [],
    trips: [],
    invoices: [],
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
        this.ensureSchemaIntegrity();
        return;
      } catch (e) {
        console.warn('Gagal memuat local DB, menginisialisasi ulang database bersih.');
      }
    }
    this.seedDefaultData();
  },

  /**
   * Mendapatkan tarif per KM berdasarkan jenis kendaraan
   */
  getTariff(jenis) {
    if (jenis === 'MOBIL') {
      return Number(this.data.settings?.TARIFF_MOBIL) || 1500;
    }
    return Number(this.data.settings?.TARIFF_MOTOR) || 500;
  },

  /**
   * Memastikan integritas data local DB dan membersihkan data dummy
   */
  ensureSchemaIntegrity() {
    if (!this.data.users) this.data.users = [];
    if (!this.data.vehicles) this.data.vehicles = [];
    if (!this.data.bookings) this.data.bookings = [];
    if (!this.data.trips) this.data.trips = [];
    if (!this.data.invoices) this.data.invoices = [];
    if (!this.data.maintenance) this.data.maintenance = [];
    if (!this.data.notifications) this.data.notifications = [];
    if (!this.data.settings) this.data.settings = {};

    // Inisialisasi tarif terpisah motor vs mobil
    if (!this.data.settings.TARIFF_MOTOR) this.data.settings.TARIFF_MOTOR = '500';
    if (!this.data.settings.TARIFF_MOBIL) this.data.settings.TARIFF_MOBIL = '1500';
    if (!this.data.settings.DEFAULT_TARIFF) this.data.settings.DEFAULT_TARIFF = '1500';

    // Perbarui rekening resmi PPISB
    if (!this.data.settings.BANK_ACCOUNT_NO || this.data.settings.BANK_ACCOUNT_NO === '7192830192') {
      this.data.settings.BANK_NAME = 'Bank Syariah Indonesia (BSI)';
      this.data.settings.BANK_ACCOUNT_NO = '5221717173';
      this.data.settings.BANK_ACCOUNT_NAME = "Pondok Pesantren Imam Syafi'i Brebes";
    }

    // Pastikan user admin default selalu ada jika data user kosong
    if (this.data.users.length === 0) {
      const nowIso = new Date().toISOString();
      this.data.users.push({
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
      });
    }

    // Pembersihan menyeluruh semua data dummy yang tersimpan di localStorage browser
    this.cleanDummyData();
    this.save();
  },

  /**
   * Membersihkan seluruh jejak data dummy/fiktif bawaan
   */
  cleanDummyData() {
    const dummyPlates = ['G 2841 QX', 'G 3912 BZ', 'G 1420 SY', 'G 8192 ZA'];
    const dummyVehIds = ['VEH-MTR-01', 'VEH-MTR-02', 'VEH-MBL-01', 'VEH-MBL-02'];

    // 1. Bersihkan armada dummy
    if (Array.isArray(this.data.vehicles)) {
      this.data.vehicles = this.data.vehicles.filter(v => 
        !dummyPlates.includes(v.nomorPolisi) && !dummyVehIds.includes(v.vehicleId)
      );
    }

    // 2. Bersihkan catatan pemeliharaan/servis dummy
    const dummyMntIds = ['MNT-001', 'MNT-002', 'MNT-003'];
    if (Array.isArray(this.data.maintenance)) {
      this.data.maintenance = this.data.maintenance.filter(m => 
        !dummyMntIds.includes(m.maintenanceId) && 
        !dummyPlates.includes(m.nomorPolisi) && 
        !dummyVehIds.includes(m.vehicleId) &&
        !['Honda Vario 160 CBS', 'Toyota Grand New Avanza 1.3 G', 'Daihatsu Gran Max Blind Van'].includes(m.vehicleName)
      );
    }

    // 3. Bersihkan riwayat perjalanan / trips dummy
    const dummyTripIds = ['TRP-ACT-01', 'TRP-HIST-01', 'TRP-HIST-02'];
    if (Array.isArray(this.data.trips)) {
      this.data.trips = this.data.trips.filter(t => 
        !dummyTripIds.includes(t.tripId) && 
        !dummyPlates.includes(t.nomorPolisi) && 
        !dummyVehIds.includes(t.vehicleId)
      );
    }

    // 4. Bersihkan booking / reservasi dummy
    const dummyBkgIds = ['BKG-001', 'BKG-HIST-01', 'BKG-HIST-02'];
    if (Array.isArray(this.data.bookings)) {
      this.data.bookings = this.data.bookings.filter(b => 
        !dummyBkgIds.includes(b.bookingId) && 
        !dummyPlates.includes(b.nomorPolisi) && 
        !dummyVehIds.includes(b.vehicleId)
      );
    }

    // 5. Bersihkan tagihan / invoice dummy
    const dummyInvIds = ['INV-2026-001'];
    if (Array.isArray(this.data.invoices)) {
      this.data.invoices = this.data.invoices.filter(i => 
        !dummyInvIds.includes(i.invoiceId) && 
        i.invoiceNumber !== 'INV/PPISB/2026/09/001' &&
        !i.items?.some(it => dummyPlates.includes(it.nomorPolisi) || dummyVehIds.includes(it.vehicleId))
      );
    }

    // 6. Bersihkan notifikasi dummy
    const dummyNotifIds = ['NTF-001', 'NTF-002'];
    if (Array.isArray(this.data.notifications)) {
      this.data.notifications = this.data.notifications.filter(n => 
        !dummyNotifIds.includes(n.notificationId) && 
        !n.title?.includes('Honda Vario') && 
        !n.title?.includes('G 2841 QX')
      );
    }
  },

  /**
   * Sinkronisasi data asli dari server Google Apps Script / Google Sheets
   * Menimpa data dummy/cache lama secara bersih dan persisten
   */
  syncFromRemote(action, remoteData) {
    if (!remoteData) return;

    if (action === 'getDashboard') {
      if (Array.isArray(remoteData.vehicles)) {
        this.data.vehicles = remoteData.vehicles;
      }
      if (Array.isArray(remoteData.activeBookings)) {
        this.data.bookings = remoteData.activeBookings;
      }
      if (Array.isArray(remoteData.recentTrips)) {
        this.data.trips = remoteData.recentTrips;
      }
      if (Array.isArray(remoteData.notifications)) {
        this.data.notifications = remoteData.notifications;
      }
      this.cleanDummyData();
      this.save();
    } else if (action === 'getVehicles') {
      if (Array.isArray(remoteData)) {
        this.data.vehicles = remoteData;
        this.cleanDummyData();
        this.save();
      }
    } else if (action === 'getTrips' || action === 'getHistory') {
      if (Array.isArray(remoteData)) {
        this.data.trips = remoteData;
        this.cleanDummyData();
        this.save();
      }
    } else if (action === 'getBookings') {
      if (Array.isArray(remoteData)) {
        this.data.bookings = remoteData;
        this.cleanDummyData();
        this.save();
      }
    } else if (action === 'getMaintenance' || action === 'getMaintenanceDashboard') {
      if (Array.isArray(remoteData)) {
        this.data.maintenance = remoteData;
      } else if (remoteData && Array.isArray(remoteData.maintenance)) {
        this.data.maintenance = remoteData.maintenance;
      }
      this.cleanDummyData();
      this.save();
    } else if (action === 'getInvoices') {
      if (Array.isArray(remoteData)) {
        this.data.invoices = remoteData;
        this.cleanDummyData();
        this.save();
      }
    }
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
   * Inisialisasi struktur data bersih awal pondok (Zero Dummy)
   */
  seedDefaultData() {
    const nowIso = new Date().toISOString();

    // 1. Users (Admin Akun Utama)
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
      }
    ];

    // Koleksi data operasional murni dimulai dari nol / sinkron dari database online
    this.data.vehicles = [];
    this.data.bookings = [];
    this.data.trips = [];
    this.data.maintenance = [];
    this.data.notifications = [];
    this.data.invoices = [];

    // Settings operasional
    this.data.settings = {
      APP_NAME: 'MAISYA-TRANS',
      TAGLINE: 'Mobilitas Aman, Tertib, dan Terdata',
      TARIFF_MOTOR: '500',
      TARIFF_MOBIL: '1500',
      DEFAULT_TARIFF: '1500',
      APPROVAL_REQUIRED: 'true',
      ALLOW_REGISTRATION: 'true',
      BANK_NAME: 'Bank Syariah Indonesia (BSI)',
      BANK_ACCOUNT_NO: '5221717173',
      BANK_ACCOUNT_NAME: "Pondok Pesantren Imam Syafi'i Brebes"
    };

    this.save();
  }
};

// Inisialisasi Store
Store.init();
