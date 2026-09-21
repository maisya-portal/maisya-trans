/**
 * MAISYA-TRANS - Database Initialization & Sheet Management
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Database.gs
 */

const SHEET_SCHEMAS = {
  USERS: [
    'user_id', 'nama', 'nip', 'jabatan', 'divisi', 'no_hp', 'email', 
    'password_hash', 'role', 'status', 'created_at', 'approved_at', 'approved_by', 'last_login'
  ],
  VEHICLES: [
    'vehicle_id', 'jenis', 'merk', 'model', 'nomor_polisi', 'tahun', 'warna', 
    'current_km', 'last_service_km', 'last_service_date', 'last_oil_km', 'last_oil_date', 
    'oil_interval_km', 'tuneup_interval_km', 'status', 'notes', 'created_at'
  ],
  BOOKINGS: [
    'booking_id', 'user_id', 'vehicle_id', 'tanggal', 'start_time', 'estimated_end_time', 
    'purpose', 'notes', 'status', 'approved_by', 'approved_at', 'created_at'
  ],
  TRIPS: [
    'trip_id', 'booking_id', 'user_id', 'vehicle_id', 'start_time', 'end_time', 
    'start_km', 'end_km', 'distance_km', 'rate_per_km', 'total_cost', 'purpose', 
    'start_checklist', 'return_condition', 'damage_notes', 'status', 'created_at'
  ],
  TARIFFS: [
    'tariff_id', 'rate_per_km', 'effective_date', 'created_by', 'status'
  ],
  MAINTENANCE: [
    'maintenance_id', 'vehicle_id', 'type', 'date', 'km', 
    'description', 'cost', 'next_due_km', 'next_due_date', 'created_by'
  ],
  NOTIFICATIONS: [
    'notification_id', 'user_id', 'type', 'title', 'message', 'is_read', 'created_at'
  ],
  SETTINGS: [
    'key', 'value', 'description', 'updated_at', 'updated_by'
  ],
  AUDIT_LOG: [
    'log_id', 'user_id', 'action', 'entity', 'entity_id', 'description', 'timestamp', 'ip_or_device_if_available'
  ]
};

/**
 * Inisialisasi seluruh tabel / sheet pada Google Spreadsheet
 * Buat sheet jika belum ada, lalu beri header dan styling islami modern (hijau tua & teks putih)
 */
function initDatabase() {
  const ss = getSpreadsheet();
  const results = [];
  
  for (const sheetName in SHEET_SCHEMAS) {
    let sheet = ss.getSheetByName(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      
      // Styling header
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#0D5C3A');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Arial');
      sheet.setFrozenRows(1);
      results.push('Dibuat sheet: ' + sheetName);
    } else {
      // Pastikan baris 1 adalah header jika kosong
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground('#0D5C3A');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setFontWeight('bold');
        sheet.setFrozenRows(1);
        results.push('Header ditambahkan ke sheet: ' + sheetName);
      } else {
        results.push('Sheet sudah ada: ' + sheetName);
      }
    }
    
    // Auto resize column
    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch (e) {}
  }
  
  // Hapus sheet default "Sheet1" jika ada dan kosong
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  return results;
}

/**
 * Seed data demo jika database masih kosong
 */
function seedDemoData() {
  const ss = getSpreadsheet();
  initDatabase();
  
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const tariffSheet = getSheet(CONFIG.SHEETS.TARIFFS);
  const settingsSheet = getSheet(CONFIG.SHEETS.SETTINGS);
  
  // 1. Seed Users (1 Admin, 2 Users)
  if (userSheet.getLastRow() <= 1) {
    const adminPassHash = hashPassword('admin123');
    const userPassHash = hashPassword('user123');
    const now = nowISO();
    
    userSheet.appendRow([
      'USR-ADMIN-01', 'Ustadz Admin Maisya', '19850101001', 'Kepala Sarpras', 
      'Sarana & Prasarana', '081234567890', 'admin@imamsyafii.ponpes.id', 
      adminPassHash, CONFIG.ROLES.ADMIN, CONFIG.STATUS.USER.ACTIVE, now, now, 'SYSTEM', now
    ]);
    
    userSheet.appendRow([
      'USR-GURU-01', 'Ustadz Ahmad Fauzi', '19900215002', 'Guru Pengajar', 
      'Pendidikan & Asrama', '081298765432', 'ahmad@imamsyafii.ponpes.id', 
      userPassHash, CONFIG.ROLES.USER, CONFIG.STATUS.USER.ACTIVE, now, now, 'USR-ADMIN-01', now
    ]);

    userSheet.appendRow([
      'USR-STAF-02', 'Ustadz Muhammad Rizqi', '19930720003', 'Staf Administrasi', 
      'Tata Usaha & Logistik', '085712345678', 'rizqi@imamsyafii.ponpes.id', 
      userPassHash, CONFIG.ROLES.USER, CONFIG.STATUS.USER.ACTIVE, now, now, 'USR-ADMIN-01', now
    ]);
  }
  
  // 2. Seed Vehicles (2 Motor, 1 Mobil)
  if (vehicleSheet.getLastRow() <= 1) {
    const now = nowISO();
    const lastDate = '2026-08-15';
    
    // Motor 1: Honda Vario
    vehicleSheet.appendRow([
      'VEH-MTR-01', 'MOTOR', 'Honda', 'Vario 160 CBS', 'G 2841 QX', '2023', 'Hitam Metalik',
      12450, 11000, lastDate, 11000, lastDate, 2000, 5000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Motor operasional utama asrama putra. Kondisi prima.', now
    ]);

    // Motor 2: Yamaha NMAX
    vehicleSheet.appendRow([
      'VEH-MTR-02', 'MOTOR', 'Yamaha', 'NMAX 155 VVA', 'G 3912 BZ', '2022', 'Abu-Abu Doff',
      18850, 17000, lastDate, 17000, lastDate, 2000, 5000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Motor dinas ustadz luar kota / koordinasi daerah.', now
    ]);

    // Mobil 1: Toyota Avanza
    vehicleSheet.appendRow([
      'VEH-MBL-01', 'MOBIL', 'Toyota', 'Grand New Avanza 1.3 G', 'G 1420 SY', '2021', 'Putih Mutiara',
      35200, 30000, lastDate, 30000, lastDate, 5000, 10000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Mobil dinas pondok pesantren kapasitas 7 penumpang.', now
    ]);
  }
  
  // 3. Seed Default Tariff
  if (tariffSheet.getLastRow() <= 1) {
    tariffSheet.appendRow([
      'TRF-001', CONFIG.DEFAULT_TARIFF_PER_KM, nowISO(), 'SYSTEM', 'ACTIVE'
    ]);
  }
  
  // 4. Seed Settings
  if (settingsSheet.getLastRow() <= 1) {
    const settings = [
      ['APP_NAME', 'MAISYA-TRANS', 'Nama Aplikasi', nowISO(), 'SYSTEM'],
      ['TAGLINE', 'Mobilitas Aman, Tertib, dan Terdata', 'Slogan Aplikasi', nowISO(), 'SYSTEM'],
      ['PONDOK_NAME', 'Pondok Pesantren Imam Syafi’i Brebes', 'Nama Lembaga', nowISO(), 'SYSTEM'],
      ['DEFAULT_TARIFF', '1000', 'Tarif per KM standar (Rupiah)', nowISO(), 'SYSTEM'],
      ['APPROVAL_REQUIRED', 'true', 'Apakah booking memerlukan persetujuan admin', nowISO(), 'SYSTEM'],
      ['ALLOW_REGISTRATION', 'true', 'Apakah registrasi mandiri diaktifkan', nowISO(), 'SYSTEM']
    ];
    settings.forEach(row => settingsSheet.appendRow(row));
  }
  
  return { success: true, message: 'Data demo dan inisialisasi tabel berhasil dibuat.' };
}
