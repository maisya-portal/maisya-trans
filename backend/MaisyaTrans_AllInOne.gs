/**
 * ============================================================================
 * MAISYA-TRANS - Google Apps Script Backend (ALL-IN-ONE PRODUCTION BUNDLE)
 * Sistem Peminjaman & Monitoring Kendaraan
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * Project ID: 14TIGDX5_TvoaOzw9t6teCBkAy_fbaY_pw1H4HKZyaPa6oGE2CSojwKmB
 * Spreadsheet ID: 1yFoEsYrBqF33kvvungnHJU511wwKNI3_gQbK0QrRXI8
 * 
 * PETUNJUK DEPLOYMENT 1-KALI TEMPEL (SUPER CEPAT):
 * 1. Buka https://script.google.com/d/14TIGDX5_TvoaOzw9t6teCBkAy_fbaY_pw1H4HKZyaPa6oGE2CSojwKmB/edit
 * 2. Hapus seluruh isi default Code.gs di editor Apps Script.
 * 3. Salin dan tempelkan (Paste) SELURUH isi file ini ke dalam Code.gs tersebut.
 * 4. Klik ikon Simpan (Ctrl + S).
 * 5. Pilih fungsi 'seedDemoData' pada dropdown atas lalu klik 'Run' (Jalankan)
 *    untuk otomatis membuat 9 Sheet berformat rapi dan data awal pondok.
 * 6. Klik 'Deploy' -> 'New deployment' -> Pilih jenis 'Web app'
 *    - Execute as: 'Me' (akun Anda)
 *    - Who has access: 'Anyone'
 * 7. Salin Web App URL (berakhiran /exec) dan simpan ke menu Admin MAISYA-TRANS.
 * ============================================================================
 */

// ============================================================================
// BAGIAN 1: KONFIGURASI & KONSTANTA (CONFIG)
// ============================================================================

const CONFIG = {
  // Google Spreadsheet ID (Single Source of Truth)
  SPREADSHEET_ID: '1yFoEsYrBqF33kvvungnHJU511wwKNI3_gQbK0QrRXI8',
  PROJECT_ID: '14TIGDX5_TvoaOzw9t6teCBkAy_fbaY_pw1H4HKZyaPa6oGE2CSojwKmB',
  
  // Sheet Names
  SHEETS: {
    USERS: 'USERS',
    VEHICLES: 'VEHICLES',
    BOOKINGS: 'BOOKINGS',
    TRIPS: 'TRIPS',
    TARIFFS: 'TARIFFS',
    MAINTENANCE: 'MAINTENANCE',
    NOTIFICATIONS: 'NOTIFICATIONS',
    SETTINGS: 'SETTINGS',
    AUDIT_LOG: 'AUDIT_LOG'
  },
  
  // Default Values
  DEFAULT_TARIFF_PER_KM: 1000,
  DEFAULT_OIL_INTERVAL_KM: 2000,
  DEFAULT_TUNEUP_INTERVAL_KM: 5000,
  OIL_ALERT_THRESHOLD_KM: 150,
  TUNEUP_ALERT_THRESHOLD_KM: 200,
  
  // Status Constants
  STATUS: {
    USER: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      REJECTED: 'REJECTED',
      INACTIVE: 'INACTIVE'
    },
    VEHICLE: {
      AVAILABLE: 'AVAILABLE',
      IN_USE: 'IN_USE',
      BOOKED: 'BOOKED',
      MAINTENANCE: 'MAINTENANCE',
      INACTIVE: 'INACTIVE'
    },
    BOOKING: {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED'
    },
    TRIP: {
      ACTIVE: 'ACTIVE',
      FINISHED: 'FINISHED',
      CANCELLED: 'CANCELLED'
    }
  },
  
  // Roles
  ROLES: {
    ADMIN: 'ADMIN',
    USER: 'USER'
  },
  
  // Security (Token valid for 1 year so sessions persist)
  SALT: 'MAISYA_TRANS_BREBES_SECURE_SALT_2026',
  SESSION_EXPIRY_HOURS: 8760
};

function getSpreadsheet() {
  try {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== '') {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    throw new Error('Gagal membuka spreadsheet: ' + err.message);
  }
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Jalankan fungsi seedDemoData() terlebih dahulu.');
  }
  return sheet;
}

function jsonResponse(data, success = true, message = '', code = 200) {
  const output = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateUUID(prefix = 'ID') {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + new Date().getTime().toString(36).toUpperCase() + '-' + randomStr;
}

function nowISO() {
  return new Date().toISOString();
}

// ============================================================================
// BAGIAN 2: INISIALISASI DATABASE & SCHEMA TABEL (DATABASE)
// ============================================================================

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

function initDatabase() {
  const ss = getSpreadsheet();
  const results = [];
  
  for (const sheetName in SHEET_SCHEMAS) {
    let sheet = ss.getSheetByName(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#0D5C3A');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Arial');
      sheet.setFrozenRows(1);
      results.push('Dibuat sheet: ' + sheetName);
    } else {
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
    
    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch (e) {}
  }
  
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  return results;
}

function seedDemoData() {
  const ss = getSpreadsheet();
  initDatabase();
  
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const tariffSheet = getSheet(CONFIG.SHEETS.TARIFFS);
  const settingsSheet = getSheet(CONFIG.SHEETS.SETTINGS);
  
  // Seed Users jika kosong
  if (userSheet.getLastRow() <= 1) {
    const adminPassHash = hashPassword('admin123');
    const kesantrianPassHash = hashPassword('99158kesantrian');
    const userPassHash = hashPassword('user123');
    const now = nowISO();
    
    userSheet.appendRow([
      'USR-ADMIN-01', 'Ustadz Admin Maisya', '19850101001', 'Kepala Sarpras', 
      'Sarana & Prasarana', '081234567890', 'admin@imamsyafii.ponpes.id', 
      adminPassHash, CONFIG.ROLES.ADMIN, CONFIG.STATUS.USER.ACTIVE, now, now, 'SYSTEM', now
    ]);

    // Admin Kesantrian PPISB
    userSheet.appendRow([
      'USR-ADMIN-KSN', 'Admin Kesantrian PPISB', 'KSN-2026', 'Kepala Kesantrian',
      'Kesantrian', '081999158001', 'kesantrian.ppisb@gmail.com',
      kesantrianPassHash, CONFIG.ROLES.ADMIN, CONFIG.STATUS.USER.ACTIVE, now, now, 'SYSTEM', now
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
  } else {
    seedAdminKesantrian(userSheet);
  }
  
  // Seed Kendaraan jika kosong
  if (vehicleSheet.getLastRow() <= 1) {
    const now = nowISO();
    const lastDate = '2026-08-15';
    
    vehicleSheet.appendRow([
      'VEH-MTR-01', 'MOTOR', 'Honda', 'Vario 160 CBS', 'G 2841 QX', '2023', 'Hitam Metalik',
      12450, 11000, lastDate, 11000, lastDate, 2000, 5000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Motor operasional utama asrama putra. Kondisi prima.', now
    ]);

    vehicleSheet.appendRow([
      'VEH-MTR-02', 'MOTOR', 'Yamaha', 'NMAX 155 VVA', 'G 3912 BZ', '2022', 'Abu-Abu Doff',
      18850, 17000, lastDate, 17000, lastDate, 2000, 5000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Motor dinas luar kota / koordinasi daerah.', now
    ]);

    vehicleSheet.appendRow([
      'VEH-MBL-01', 'MOBIL', 'Toyota', 'Grand New Avanza 1.3 G', 'G 1420 SY', '2021', 'Putih Mutiara',
      35200, 30000, lastDate, 30000, lastDate, 5000, 10000, CONFIG.STATUS.VEHICLE.AVAILABLE, 
      'Mobil dinas pondok pesantren kapasitas 7 penumpang.', now
    ]);
  }
  
  // Seed Tarif
  if (tariffSheet.getLastRow() <= 1) {
    tariffSheet.appendRow([
      'TRF-001', CONFIG.DEFAULT_TARIFF_PER_KM, nowISO(), 'SYSTEM', 'ACTIVE'
    ]);
  }
  
  // Seed Settings
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
  
  Logger.log('Inisialisasi tabel dan seed data demo berhasil.');
  return { success: true, message: 'Inisialisasi tabel dan seed data demo berhasil.' };
}

// ============================================================================
// BAGIAN 3: AUDIT & NOTIFIKASI (AUDIT)
// ============================================================================

function logAudit(userId, action, entity, entityId, description, ipOrDevice = '') {
  try {
    const sheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
    const logId = generateUUID('LOG');
    sheet.appendRow([
      logId,
      userId || 'GUEST',
      action,
      entity,
      entityId || '',
      description || '',
      nowISO(),
      ipOrDevice
    ]);
  } catch (err) {
    console.error('Gagal mencatat audit log:', err.message);
  }
}

function addNotification(params) {
  try {
    const { userId, type, title, message } = params;
    const sheet = getSheet(CONFIG.SHEETS.NOTIFICATIONS);
    const notifId = generateUUID('NTF');
    
    sheet.appendRow([
      notifId,
      userId || 'ALL',
      type || 'INFO',
      title,
      message,
      false,
      nowISO()
    ]);
  } catch (err) {
    console.error('Gagal membuat notifikasi:', err.message);
  }
}

function getNotifications(userId, role) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.NOTIFICATIONS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const notifications = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const targetUser = row[1];
      const isForThisUser = (role === CONFIG.ROLES.ADMIN) 
        ? (targetUser === 'ADMIN' || targetUser === 'ALL' || targetUser === userId)
        : (targetUser === userId || targetUser === 'ALL');
        
      if (isForThisUser) {
        notifications.push({
          notificationId: row[0],
          userId: targetUser,
          type: row[2],
          title: row[3],
          message: row[4],
          isRead: row[5] === true || row[5] === 'TRUE',
          createdAt: row[6]
        });
      }
    }
    return notifications;
  } catch (err) {
    return [];
  }
}

function markNotificationRead(notificationId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.NOTIFICATIONS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === notificationId) {
        sheet.getRange(i + 1, 6).setValue(true);
        return { success: true };
      }
    }
  } catch (err) {}
  return { success: false };
}

function getSettingValue(key, defaultValue = '') {
  try {
    const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return String(data[i][1]);
      }
    }
  } catch (e) {}
  return defaultValue;
}

function setSettingValue(key, value, updatedBy = 'ADMIN') {
  try {
    const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    const now = nowISO();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        sheet.getRange(i + 1, 4).setValue(now);
        sheet.getRange(i + 1, 5).setValue(updatedBy);
        return true;
      }
    }
    
    sheet.appendRow([key, value, 'Pengaturan Sistem', now, updatedBy]);
    return true;
  } catch (e) {
    return false;
  }
}

function getAllSettings() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}

// ============================================================================
// BAGIAN 4: AUTENTIKASI & KEAMANAN (AUTH)
// ============================================================================

function hashPassword(password) {
  if (!password) return '';
  const rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    password + CONFIG.SALT, 
    Utilities.Charset.UTF_8
  );
  let hash = '';
  for (let i = 0; i < rawBytes.length; i++) {
    let byteHex = (rawBytes[i] & 0xFF).toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hash += byteHex;
  }
  return hash;
}

function createSessionToken(userId, role) {
  const payload = {
    userId: userId,
    role: role,
    timestamp: new Date().getTime(),
    expiry: new Date().getTime() + (CONFIG.SESSION_EXPIRY_HOURS * 3600 * 1000)
  };
  return Utilities.base64Encode(JSON.stringify(payload));
}

function validateSessionToken(token) {
  if (!token) return null;
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const session = JSON.parse(decoded);
    if (new Date().getTime() > session.expiry) return null;
    return session;
  } catch (e) {
    return null;
  }
}

function handleRegister(params) {
  const { nama, nip, jabatan, divisi, no_hp, email, password } = params;
  
  if (!nama || !email || !password || !no_hp) {
    return { success: false, message: 'Harap lengkapi semua kolom wajib (Nama, Email, No HP, Password).' };
  }
  
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const data = userSheet.getDataRange().getValues();
  
  const emailLower = email.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    const existingEmail = String(data[i][6]).toLowerCase().trim();
    const existingHp = String(data[i][5]).trim();
    if (existingEmail === emailLower) {
      return { success: false, message: 'Email sudah terdaftar. Silakan login atau gunakan email lain.' };
    }
    if (existingHp === no_hp.trim()) {
      return { success: false, message: 'Nomor WhatsApp sudah terdaftar.' };
    }
  }
  
  const userId = generateUUID('USR');
  const passwordHash = hashPassword(password);
  const now = nowISO();
  
  const newRow = [
    userId,
    nama.trim(),
    nip ? nip.trim() : '-',
    jabatan ? jabatan.trim() : 'Guru/Karyawan',
    divisi ? divisi.trim() : 'Umum',
    no_hp.trim(),
    emailLower,
    passwordHash,
    CONFIG.ROLES.USER,
    CONFIG.STATUS.USER.PENDING,
    now,
    '',
    '',
    ''
  ];
  
  userSheet.appendRow(newRow);
  
  addNotification({
    userId: 'ADMIN',
    type: 'USER_BARU',
    title: 'Registrasi Pengguna Baru',
    message: `${nama} (${divisi || 'Pondok'}) telah mendaftar dan menunggu persetujuan.`
  });
  
  logAudit(userId, 'REGISTER', 'USERS', userId, `Pendaftaran user baru: ${nama} (${emailLower})`);
  
  return {
    success: true,
    message: 'Alhamdulillah, registrasi berhasil! Akun Anda sedang menunggu persetujuan Admin Sarpras.',
    data: { userId, nama, status: CONFIG.STATUS.USER.PENDING }
  };
}

function handleLogin(params) {
  const { username, password } = params;
  
  if (!username || !password) {
    return { success: false, message: 'Username/Email dan Password wajib diisi.' };
  }
  
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const data = userSheet.getDataRange().getValues();
  const inputLower = username.toLowerCase().trim();
  const passHash = hashPassword(password);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uId = row[0];
    const uName = row[1];
    const uNip = String(row[2]);
    const uEmail = String(row[6]).toLowerCase().trim();
    const uPass = row[7];
    const uRole = row[8];
    const uStatus = row[9];
    
    if (uEmail === inputLower || uNip === inputLower) {
      if (uPass !== passHash) {
        return { success: false, message: 'Password yang Anda masukkan salah.' };
      }
      
      if (uStatus === CONFIG.STATUS.USER.PENDING) {
        return { 
          success: false, 
          message: 'Akun Anda masih berstatus PENDING menunggu persetujuan Admin Sarpras.' 
        };
      }
      if (uStatus === CONFIG.STATUS.USER.REJECTED) {
        return { 
          success: false, 
          message: 'Mohon maaf, pendaftaran akun Anda telah ditolak oleh Admin.' 
        };
      }
      if (uStatus === CONFIG.STATUS.USER.INACTIVE) {
        return { 
          success: false, 
          message: 'Akun Anda sedang dinonaktifkan sementara oleh Admin.' 
        };
      }
      
      const now = nowISO();
      userSheet.getRange(i + 1, 14).setValue(now);
      const token = createSessionToken(uId, uRole);
      logAudit(uId, 'LOGIN', 'USERS', uId, `User ${uName} berhasil login`);
      
      return {
        success: true,
        message: 'Login berhasil. Selamat datang kembali!',
        data: {
          token: token,
          user: {
            userId: uId,
            nama: uName,
            nip: uNip,
            jabatan: row[3],
            divisi: row[4],
            no_hp: row[5],
            email: uEmail,
            role: uRole,
            status: uStatus,
            lastLogin: now
          }
        }
      };
    }
  }
  
  return { success: false, message: 'Pengguna tidak ditemukan. Silakan periksa kembali email/NIP Anda.' };
}

/**
 * Google Auth — WAJIB verifikasi password untuk keamanan tambahan
 */
function handleGoogleAuth(params) {
  const { email, name, picture, googleId, password } = params;
  if (!email) return { success: false, message: 'Alamat email Google tidak terdeteksi.' };
  
  const emailLower = String(email).toLowerCase().trim();
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const data = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uEmail = String(row[6]).toLowerCase().trim();
    if (uEmail === emailLower) {
      const uId = row[0];
      const uName = row[1];
      const uRole = row[8];
      const uStatus = row[9];
      const uPassHash = row[7];
      
      if (uStatus === CONFIG.STATUS.USER.REJECTED) {
        return { success: false, message: 'Mohon maaf, akun Anda berstatus ditolak oleh Admin Sarpras.' };
      }
      if (uStatus === CONFIG.STATUS.USER.INACTIVE) {
        return { success: false, message: 'Akun Anda sedang dinonaktifkan sementara oleh Admin.' };
      }
      if (uStatus === CONFIG.STATUS.USER.PENDING) {
        return { success: false, message: 'Akun Anda masih menunggu persetujuan Admin Sarpras.' };
      }

      // Verifikasi password jika akun memiliki password_hash
      if (uPassHash && uPassHash.trim() !== '') {
        if (!password) {
          return { 
            success: false, 
            requirePassword: true,
            message: 'Akun ini memerlukan verifikasi password. Harap masukkan password Maisya-Trans Anda.'
          };
        }
        const inputHash = hashPassword(password);
        if (inputHash !== uPassHash) {
          return { success: false, message: 'Password yang Anda masukkan salah. Periksa kembali password Maisya-Trans Anda.' };
        }
      }
      
      const now = nowISO();
      userSheet.getRange(i + 1, 14).setValue(now);
      const token = createSessionToken(uId, uRole);
      logAudit(uId, 'LOGIN_GOOGLE', 'USERS', uId, `User ${uName} (${emailLower}) login dengan Google`);
      
      return {
        success: true,
        message: 'Alhamdulillah, berhasil masuk dengan Google!',
        data: {
          token: token,
          user: {
            userId: uId,
            nama: uName,
            nip: row[2],
            jabatan: row[3],
            divisi: row[4],
            no_hp: row[5],
            email: uEmail,
            role: uRole,
            status: uStatus,
            picture: picture || '',
            lastLogin: now
          }
        }
      };
    }
  }

  // Belum terdaftar — wajib isi password untuk keamanan
  if (!password || password.trim().length < 6) {
    return {
      success: false,
      requirePassword: true,
      message: 'Akun baru ditemukan. Harap buat password (min. 6 karakter) untuk keamanan akun Maisya-Trans Anda.'
    };
  }

  const userId = generateUUID('USR');
  const displayName = name ? String(name).trim() : emailLower.split('@')[0];
  const now = nowISO();
  const passHash = hashPassword(password);
  
  const newRow = [
    userId, displayName, '-', 'Guru / Karyawan', 'Pondok', '-', emailLower, passHash,
    CONFIG.ROLES.USER, CONFIG.STATUS.USER.ACTIVE, now, now, 'GOOGLE_AUTO', now
  ];
  userSheet.appendRow(newRow);
  
  addNotification({
    userId: 'ADMIN',
    type: 'USER_BARU',
    title: 'Pengguna Baru via Google',
    message: `${displayName} (${emailLower}) telah terdaftar dan aktif via Google.`
  });
  
  logAudit(userId, 'REGISTER_GOOGLE', 'USERS', userId, `User baru terdaftar via Google: ${displayName} (${emailLower})`);
  const token = createSessionToken(userId, CONFIG.ROLES.USER);
  
  return {
    success: true,
    message: 'Alhamdulillah, pendaftaran akun Google berhasil dan Anda langsung masuk!',
    data: {
      token: token,
      user: {
        userId: userId,
        nama: displayName,
        nip: '-',
        jabatan: 'Guru / Karyawan',
        divisi: 'Pondok',
        no_hp: '-',
        email: emailLower,
        role: CONFIG.ROLES.USER,
        status: CONFIG.STATUS.USER.ACTIVE,
        picture: picture || '',
        lastLogin: now
      }
    }
  };
}

/**
 * Buat atau perbarui akun Admin Kesantrian PPISB
 * Jalankan dari Apps Script Editor jika akun belum ada di spreadsheet
 */
function seedAdminKesantrian(userSheetArg) {
  const sheet = userSheetArg || getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const targetEmail = 'kesantrian.ppisb@gmail.com';
  const passHash = hashPassword('99158kesantrian');
  const now = nowISO();

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][6]).toLowerCase().trim();
    if (rowEmail === targetEmail) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, 8).setValue(passHash);
      sheet.getRange(rowIdx, 9).setValue(CONFIG.ROLES.ADMIN);
      sheet.getRange(rowIdx, 10).setValue(CONFIG.STATUS.USER.ACTIVE);
      Logger.log('[seedAdminKesantrian] Akun diperbarui: ' + targetEmail);
      return { success: true, message: 'Akun Admin Kesantrian diperbarui.' };
    }
  }

  sheet.appendRow([
    'USR-ADMIN-KSN', 'Admin Kesantrian PPISB', 'KSN-2026', 'Kepala Kesantrian',
    'Kesantrian', '081999158001', targetEmail,
    passHash, CONFIG.ROLES.ADMIN, CONFIG.STATUS.USER.ACTIVE, now, now, 'SYSTEM', now
  ]);
  Logger.log('[seedAdminKesantrian] Akun baru dibuat: ' + targetEmail);
  return { success: true, message: 'Akun Admin Kesantrian berhasil dibuat.' };
}

// ============================================================================
// BAGIAN 5: KELOLA ARMADA & MONITORING KESEHATAN (VEHICLES)
// ============================================================================

function getAllVehicles() {
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const activeTripsMap = getActiveTripsMap();
  const vehicles = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const vehicleId = row[0];
    const currentKm = Number(row[7]) || 0;
    const lastServiceKm = Number(row[8]) || 0;
    const lastServiceDate = row[9];
    const lastOilKm = Number(row[10]) || 0;
    const lastOilDate = row[11];
    const oilInterval = Number(row[12]) || CONFIG.DEFAULT_OIL_INTERVAL_KM;
    const tuneupInterval = Number(row[13]) || CONFIG.DEFAULT_TUNEUP_INTERVAL_KM;
    const status = row[14] || CONFIG.STATUS.VEHICLE.AVAILABLE;
    
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
      tuneupStatusText = `Tune-up sudah jatuh tempo`;
    } else if (remainingTuneupKm <= CONFIG.TUNEUP_ALERT_THRESHOLD_KM) {
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
    
    const activeTrip = activeTripsMap[vehicleId] || null;
    
    vehicles.push({
      vehicleId,
      jenis: row[1],
      merk: row[2],
      model: row[3],
      nomorPolisi: row[4],
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
      notes: row[15] || '',
      activeTrip,
      createdAt: row[16]
    });
  }
  
  return vehicles;
}

function getActiveTripsMap() {
  const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
  const data = tripSheet.getDataRange().getValues();
  const map = {};
  if (data.length <= 1) return map;
  
  const userMap = getUserNameMap();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[15] === CONFIG.STATUS.TRIP.ACTIVE) {
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

function handleAddVehicle(params) {
  const { jenis, merk, model, nomor_polisi, tahun, warna, current_km, oil_interval_km, tuneup_interval_km, notes, userId } = params;
  
  if (!nomor_polisi || !merk || !model || !jenis) {
    return { success: false, message: 'Nomor Polisi, Merk, Model, dan Jenis wajib diisi.' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  const cleanNopol = nomor_polisi.toUpperCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][4]).toUpperCase().trim() === cleanNopol) {
      return { success: false, message: `Kendaraan dengan plat ${cleanNopol} sudah terdaftar.` };
    }
  }
  
  const vehicleId = generateUUID('VEH');
  const now = nowISO();
  const km = Number(current_km) || 0;
  const oilInterval = Number(oil_interval_km) || (jenis === 'MOBIL' ? 5000 : 2000);
  const tuneupInterval = Number(tuneup_interval_km) || (jenis === 'MOBIL' ? 10000 : 5000);
  
  sheet.appendRow([
    vehicleId,
    jenis.toUpperCase(),
    merk.trim(),
    model.trim(),
    cleanNopol,
    tahun || new Date().getFullYear(),
    warna || 'Standar',
    km,
    km,
    now.substring(0, 10),
    km,
    now.substring(0, 10),
    oilInterval,
    tuneupInterval,
    CONFIG.STATUS.VEHICLE.AVAILABLE,
    notes || '',
    now
  ]);
  
  logAudit(userId || 'ADMIN', 'ADD_VEHICLE', 'VEHICLES', vehicleId, `Tambah armada: ${cleanNopol} (${merk} ${model})`);
  return { success: true, message: 'Armada berhasil ditambahkan.', data: { vehicleId } };
}

/**
 * Update / Edit Data Kendaraan (Khusus Admin)
 */
function handleUpdateVehicle(params) {
  const { vehicleId, merk, model, nomor_polisi, tahun, warna, status, notes, oil_interval_km, tuneup_interval_km, userId } = params;

  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vehicleId) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) return { success: false, message: 'Kendaraan tidak ditemukan.' };

  if (merk)           sheet.getRange(foundRow, 3).setValue(merk.trim());
  if (model)          sheet.getRange(foundRow, 4).setValue(model.trim());
  if (nomor_polisi)   sheet.getRange(foundRow, 5).setValue(nomor_polisi.toUpperCase().trim());
  if (tahun)          sheet.getRange(foundRow, 6).setValue(tahun);
  if (warna)          sheet.getRange(foundRow, 7).setValue(warna);
  if (oil_interval_km)    sheet.getRange(foundRow, 13).setValue(Number(oil_interval_km));
  if (tuneup_interval_km) sheet.getRange(foundRow, 14).setValue(Number(tuneup_interval_km));
  if (status)         sheet.getRange(foundRow, 15).setValue(status);
  if (notes !== undefined) sheet.getRange(foundRow, 16).setValue(notes);

  logAudit(userId || 'ADMIN', 'UPDATE_VEHICLE', 'VEHICLES', vehicleId, `Update kendaraan ID ${vehicleId}`);
  return { success: true, message: 'Data kendaraan berhasil diperbarui.' };
}

/**
 * Hapus Kendaraan dari Sistem (Khusus Admin)
 * Tidak bisa menghapus kendaraan yang sedang digunakan
 */
function handleDeleteVehicle(params) {
  const { vehicleId, userId } = params;
  if (!vehicleId) return { success: false, message: 'ID kendaraan tidak valid.' };

  const sheet = getSheet(CONFIG.SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vehicleId) {
      const nopol  = data[i][4];
      const merk   = data[i][2];
      const model  = data[i][3];
      const status = data[i][14];

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


// ============================================================================

function handleCreateBooking(params) {
  const { userId, vehicleId, tanggal, start_time, estimated_end_time, purpose, notes } = params;
  
  if (!userId || !vehicleId || !tanggal || !start_time || !purpose) {
    return { success: false, message: 'Harap lengkapi semua kolom wajib peminjaman.' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000); // GAS: throw exception jika gagal, bukan return false
    lockAcquired = true;
    
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vehicleData = vehicleSheet.getDataRange().getValues();
    let targetVehicle = null;
    for (let i = 1; i < vehicleData.length; i++) {
      if (vehicleData[i][0] === vehicleId) {
        targetVehicle = vehicleData[i];
        break;
      }
    }
    if (!targetVehicle) return { success: false, message: 'Kendaraan tidak ditemukan.' };
    if (targetVehicle[14] === CONFIG.STATUS.VEHICLE.MAINTENANCE) {
      return { success: false, message: 'Kendaraan sedang dalam perawatan di bengkel.' };
    }
    
    // Validasi server-side bentrok booking
    const bookingSheet = getSheet(CONFIG.SHEETS.BOOKINGS);
    const bookingData = bookingSheet.getDataRange().getValues();
    const reqDate = tanggal.substring(0, 10);
    const reqStart = start_time;
    const reqEnd = estimated_end_time || '23:59';
    
    for (let i = 1; i < bookingData.length; i++) {
      const b = bookingData[i];
      if (b[2] === vehicleId && String(b[3]).substring(0, 10) === reqDate && 
          (b[8] === CONFIG.STATUS.BOOKING.APPROVED || b[8] === CONFIG.STATUS.BOOKING.PENDING)) {
        if (reqStart < String(b[5]) && reqEnd > String(b[4])) {
          return { 
            success: false, 
            message: `Kendaraan sudah dipesan untuk jam ${b[4]} - ${b[5]}. Silakan pilih waktu lain.` 
          };
        }
      }
    }
    
    const bookingId = generateUUID('BKG');
    const now = nowISO();
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
    
    addNotification({
      userId: 'ADMIN',
      type: 'PEMINJAMAN_BARU',
      title: 'Pengajuan Peminjaman Baru',
      message: `Peminjaman diajukan untuk ${targetVehicle[2]} ${targetVehicle[3]} (${targetVehicle[4]}).`
    });
    
    logAudit(userId, 'CREATE_BOOKING', 'BOOKINGS', bookingId, `Pengajuan pinjam ${targetVehicle[4]}`);
    return {
      success: true,
      message: isApprovalRequired 
        ? 'Alhamdulillah, pengajuan peminjaman berhasil. Menunggu konfirmasi admin.' 
        : 'Peminjaman telah disetujui otomatis.',
      data: { bookingId, status: initialStatus }
    };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('lock')) {
      return { success: false, message: 'Server sedang sibuk. Silakan coba lagi.' };
    }
    return { success: false, message: 'Gagal membuat peminjaman: ' + err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

// ============================================================================
// BAGIAN 7: MULAI & SELESAI PEMAKAIAN (TRIPS)
// ============================================================================

function handleStartTrip(params) {
  const { userId, vehicleId, bookingId, start_km, purpose, start_checklist } = params;
  const startKmNum = Number(start_km);
  if (isNaN(startKmNum) || startKmNum <= 0) {
    return { success: false, message: 'Kilometer awal tidak valid.' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000); // GAS: throw exception jika gagal, bukan return false
    lockAcquired = true;
    
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vData = vehicleSheet.getDataRange().getValues();
    let vRowIdx = -1;
    let targetVehicle = null;
    
    for (let i = 1; i < vData.length; i++) {
      if (vData[i][0] === vehicleId) {
        vRowIdx = i + 1;
        targetVehicle = vData[i];
        break;
      }
    }
    
    if (!targetVehicle) return { success: false, message: 'Kendaraan tidak ditemukan.' };
    if (targetVehicle[14] === CONFIG.STATUS.VEHICLE.IN_USE) {
      return { success: false, message: 'Kendaraan baru saja digunakan oleh pengguna lain.' };
    }
    if (targetVehicle[14] === CONFIG.STATUS.VEHICLE.MAINTENANCE) {
      return { success: false, message: 'Kendaraan sedang berstatus perawatan servis.' };
    }
    
    const currentKm = Number(targetVehicle[7]) || 0;
    if (startKmNum < currentKm) {
      return { 
        success: false, 
        message: `Kilometer awal (${startKmNum} KM) tidak boleh lebih kecil dari odometer tercatat (${currentKm} KM).` 
      };
    }
    
    const tripId = generateUUID('TRP');
    const now = nowISO();
    const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
    
    tripSheet.appendRow([
      tripId,
      bookingId || '',
      userId,
      vehicleId,
      now,
      '',
      startKmNum,
      '',
      0,
      0,
      0,
      purpose || 'Operasional Pondok',
      typeof start_checklist === 'object' ? JSON.stringify(start_checklist) : (start_checklist || ''),
      '',
      '',
      CONFIG.STATUS.TRIP.ACTIVE,
      now
    ]);
    
    vehicleSheet.getRange(vRowIdx, 15).setValue(CONFIG.STATUS.VEHICLE.IN_USE);
    if (startKmNum > currentKm) vehicleSheet.getRange(vRowIdx, 8).setValue(startKmNum);
    
    logAudit(userId, 'START_TRIP', 'TRIPS', tripId, `Mulai trip ${targetVehicle[4]} pada KM ${startKmNum}`);
    return {
      success: true,
      message: 'Bismillah! Pemakaian kendaraan berhasil dimulai.',
      data: { tripId, vehicleId, startKm: startKmNum, startTime: now }
    };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('lock')) {
      return { success: false, message: 'Server sedang sibuk. Silakan coba sesaat lagi.' };
    }
    return { success: false, message: 'Gagal memulai pemakaian: ' + err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function handleFinishTrip(params) {
  const { tripId, end_km, return_condition, damage_notes, userId } = params;
  const endKmNum = Number(end_km);
  if (isNaN(endKmNum) || endKmNum <= 0) {
    return { success: false, message: 'Kilometer akhir tidak valid.' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000); // GAS: throw exception jika gagal, bukan return false
    lockAcquired = true;
    
    const tripSheet = getSheet(CONFIG.SHEETS.TRIPS);
    const tripData = tripSheet.getDataRange().getValues();
    let tripRowIdx = -1;
    let targetTrip = null;
    
    for (let i = 1; i < tripData.length; i++) {
      if (tripData[i][0] === tripId) {
        tripRowIdx = i + 1;
        targetTrip = tripData[i];
        break;
      }
    }
    
    if (!targetTrip) return { success: false, message: 'Data perjalanan tidak ditemukan.' };
    if (targetTrip[15] === CONFIG.STATUS.TRIP.FINISHED) {
      return { success: false, message: 'Perjalanan ini sudah diselesaikan.' };
    }
    
    const startKm = Number(targetTrip[6]);
    const vehicleId = targetTrip[3];
    if (endKmNum < startKm) {
      return { 
        success: false, 
        message: `Kilometer akhir (${endKmNum}) tidak boleh lebih kecil dari kilometer awal (${startKm}).` 
      };
    }
    
    const distanceKm = endKmNum - startKm;
    const now = nowISO();
    const activeRate = getActiveTariff();
    const totalCost = distanceKm * activeRate;
    
    tripSheet.getRange(tripRowIdx, 6).setValue(now);
    tripSheet.getRange(tripRowIdx, 8).setValue(endKmNum);
    tripSheet.getRange(tripRowIdx, 9).setValue(distanceKm);
    tripSheet.getRange(tripRowIdx, 10).setValue(activeRate); // SNAPSHOT
    tripSheet.getRange(tripRowIdx, 11).setValue(totalCost);
    tripSheet.getRange(tripRowIdx, 14).setValue(
      typeof return_condition === 'object' ? JSON.stringify(return_condition) : (return_condition || '')
    );
    tripSheet.getRange(tripRowIdx, 15).setValue(damage_notes || '');
    tripSheet.getRange(tripRowIdx, 16).setValue(CONFIG.STATUS.TRIP.FINISHED);
    
    const vehicleSheet = getSheet(CONFIG.SHEETS.VEHICLES);
    const vData = vehicleSheet.getDataRange().getValues();
    let vehicleName = 'Kendaraan';
    let nopol = '';
    
    for (let i = 1; i < vData.length; i++) {
      if (vData[i][0] === vehicleId) {
        const vRow = i + 1;
        vehicleName = `${vData[i][2]} ${vData[i][3]}`;
        nopol = vData[i][4];
        vehicleSheet.getRange(vRow, 8).setValue(endKmNum);
        vehicleSheet.getRange(vRow, 15).setValue(CONFIG.STATUS.VEHICLE.AVAILABLE);
        break;
      }
    }
    
    const diffMins = Math.max(1, Math.round((new Date(now).getTime() - new Date(targetTrip[4]).getTime()) / 60000));
    const durationText = diffMins >= 60 ? `${Math.floor(diffMins/60)} jam ${diffMins%60} menit` : `${diffMins} menit`;
    
    logAudit(userId || targetTrip[2], 'FINISH_TRIP', 'TRIPS', tripId, `Selesai trip ${nopol}: ${distanceKm} KM, Rp${totalCost}`);
    return {
      success: true,
      message: 'Alhamdulillah, pemakaian selesai!',
      data: {
        tripId,
        vehicleName,
        nomorPolisi: nopol,
        startKm,
        endKm: endKmNum,
        distanceKm,
        ratePerKm: activeRate,
        totalCost,
        durationText,
        purpose: targetTrip[11]
      }
    };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('lock')) {
      return { success: false, message: 'Server sedang sibuk. Silakan coba sesaat lagi.' };
    }
    return { success: false, message: 'Gagal menyelesaikan pemakaian: ' + err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function getActiveTariff() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TARIFFS);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][4] === 'ACTIVE') return Number(data[i][1]) || CONFIG.DEFAULT_TARIFF_PER_KM;
    }
  } catch (e) {}
  return CONFIG.DEFAULT_TARIFF_PER_KM;
}

function getTripHistory(filterParams = {}) {
  const sheet = getSheet(CONFIG.SHEETS.TRIPS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const userMap = getUserNameMap();
  const vehicles = getAllVehicles();
  const vehicleMap = {};
  vehicles.forEach(v => { vehicleMap[v.vehicleId] = v; });
  
  const { filterUserId, role, vehicleType } = filterParams;
  const trips = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const tripUserId = row[2];
    if (role === CONFIG.ROLES.USER && tripUserId !== filterUserId) continue;
    
    const vId = row[3];
    const vehicle = vehicleMap[vId] || {};
    if (vehicleType && vehicle.jenis && vehicle.jenis !== vehicleType) continue;
    
    trips.push({
      tripId: row[0],
      bookingId: row[1],
      userId: tripUserId,
      userName: userMap[tripUserId] || 'Pengguna Pondok',
      vehicleId: vId,
      vehicleName: vehicle.merk ? `${vehicle.merk} ${vehicle.model}` : 'Kendaraan',
      nomorPolisi: vehicle.nomorPolisi || '-',
      jenis: vehicle.jenis || 'MOTOR',
      startTime: row[4],
      endTime: row[5],
      startKm: Number(row[6]) || 0,
      endKm: Number(row[7]) || 0,
      distanceKm: Number(row[8]) || 0,
      ratePerKm: Number(row[9]) || CONFIG.DEFAULT_TARIFF_PER_KM,
      totalCost: Number(row[10]) || 0,
      purpose: row[11],
      damageNotes: row[14],
      status: row[15],
      createdAt: row[16]
    });
  }
  return trips;
}

// ============================================================================
// BAGIAN 8: PENGGUNA & APPROVAL (USERS)
// ============================================================================

function getAllUsers() {
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    users.push({
      userId: row[0],
      nama: row[1],
      nip: row[2],
      jabatan: row[3],
      divisi: row[4],
      no_hp: row[5],
      email: row[6],
      role: row[8],
      status: row[9],
      createdAt: row[10],
      approvedAt: row[11],
      approvedBy: row[12],
      lastLogin: row[13]
    });
  }
  return users;
}

function handleApproveUser(params) {
  const { targetUserId, adminId } = params;
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const rowIdx = i + 1;
      const now = nowISO();
      sheet.getRange(rowIdx, 10).setValue(CONFIG.STATUS.USER.ACTIVE);
      sheet.getRange(rowIdx, 12).setValue(now);
      sheet.getRange(rowIdx, 13).setValue(adminId || 'ADMIN');
      logAudit(adminId, 'APPROVE_USER', 'USERS', targetUserId, `Setujui user ${data[i][1]}`);
      return { success: true, message: `Pengguna ${data[i][1]} berhasil disetujui.` };
    }
  }
  return { success: false, message: 'User tidak ditemukan.' };
}

function handleRejectUser(params) {
  const { targetUserId, adminId, reason } = params;
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, 10).setValue(CONFIG.STATUS.USER.REJECTED);
      sheet.getRange(rowIdx, 12).setValue(nowISO());
      sheet.getRange(rowIdx, 13).setValue(adminId || 'ADMIN');
      logAudit(adminId, 'REJECT_USER', 'USERS', targetUserId, `Tolak user ${data[i][1]}: ${reason}`);
      return { success: true, message: `Pendaftaran pengguna ${data[i][1]} ditolak.` };
    }
  }
  return { success: false, message: 'User tidak ditemukan.' };
}

// ============================================================================
// BAGIAN 9: STATISTIK & LAPORAN (REPORTS)
// ============================================================================

function getFullStatistics() {
  const users = getAllUsers();
  const vehicles = getAllVehicles();
  const trips = getTripHistory({});
  
  let countInUse = vehicles.filter(v => v.status === CONFIG.STATUS.VEHICLE.IN_USE).length;
  let totalKm = 0;
  let totalCost = 0;
  const userMap = {};
  
  trips.forEach(t => {
    if (t.status === CONFIG.STATUS.TRIP.FINISHED) {
      totalKm += t.distanceKm;
      totalCost += t.totalCost;
      if (!userMap[t.userId]) {
        userMap[t.userId] = { userId: t.userId, userName: t.userName, tripCount: 0, totalKm: 0, totalCost: 0 };
      }
      userMap[t.userId].tripCount++;
      userMap[t.userId].totalKm += t.distanceKm;
      userMap[t.userId].totalCost += t.totalCost;
    }
  });
  
  const userList = Object.values(userMap);
  return {
    kpi: {
      totalVehicles: vehicles.length,
      countMotor: vehicles.filter(v => v.jenis === 'MOTOR').length,
      countMobil: vehicles.filter(v => v.jenis === 'MOBIL').length,
      countAvailable: vehicles.filter(v => v.status === CONFIG.STATUS.VEHICLE.AVAILABLE).length,
      countInUse: countInUse,
      countMaintenance: vehicles.filter(v => v.status === CONFIG.STATUS.VEHICLE.MAINTENANCE).length,
      totalUsers: users.length,
      pendingUsers: users.filter(u => u.status === CONFIG.STATUS.USER.PENDING).length,
      totalTripsMonth: trips.length,
      totalKmMonth: totalKm,
      totalCostMonth: totalCost,
      activeTariff: getActiveTariff()
    },
    rankings: {
      topByCount: [...userList].sort((a, b) => b.tripCount - a.tripCount).slice(0, 5),
      topByKm: [...userList].sort((a, b) => b.totalKm - a.totalKm).slice(0, 5),
      topByCost: [...userList].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5)
    }
  };
}

function handleUpdateTariff(params) {
  const { newRate, adminId } = params;
  const rateNum = Number(newRate);
  if (isNaN(rateNum) || rateNum <= 0) return { success: false, message: 'Tarif tidak valid.' };
  
  const sheet = getSheet(CONFIG.SHEETS.TARIFFS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'ACTIVE') sheet.getRange(i + 1, 5).setValue('INACTIVE');
  }
  sheet.appendRow([generateUUID('TRF'), rateNum, nowISO(), adminId || 'ADMIN', 'ACTIVE']);
  setSettingValue('DEFAULT_TARIFF', String(rateNum), adminId);
  return { success: true, message: `Tarif diubah menjadi Rp${rateNum.toLocaleString('id-ID')} / KM.` };
}

// ============================================================================
// BAGIAN 10: WEB APP HTTP ROUTER (doGet & doPost)
// ============================================================================

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'ping';
    const token = params.token || '';
    const session = validateSessionToken(token);
    const userId = session ? session.userId : (params.userId || '');
    const role = session ? session.role : (params.role || CONFIG.ROLES.USER);
    
    switch (action) {
      case 'ping':
        return jsonResponse({ app: 'MAISYA-TRANS', status: 'online' }, true, 'API Siap');
      case 'initDatabase':
        return jsonResponse(initDatabase(), true);
      case 'seedDemoData':
        return jsonResponse(seedDemoData(), true);
      case 'getDashboard': {
        const vehicles = getAllVehicles();
        const trips = getTripHistory({ filterUserId: userId, role });
        const notifications = getNotifications(userId, role);
        const inUseCount = vehicles.filter(v => v.status === CONFIG.STATUS.VEHICLE.IN_USE).length;
        return jsonResponse({
          overview: {
            allAvailable: inUseCount === 0,
            totalVehicles: vehicles.length,
            totalInUse: inUseCount,
            motorAvailableCount: vehicles.filter(v => v.jenis === 'MOTOR' && v.status === 'AVAILABLE').length,
            mobilAvailableCount: vehicles.filter(v => v.jenis === 'MOBIL' && v.status === 'AVAILABLE').length,
            unreadNotifCount: notifications.filter(n => !n.isRead).length,
            pendingUserCount: role === CONFIG.ROLES.ADMIN ? getAllUsers().filter(u => u.status === 'PENDING').length : 0
          },
          activeMotor: vehicles.find(v => v.jenis === 'MOTOR' && v.status === 'IN_USE') || null,
          activeMobil: vehicles.find(v => v.jenis === 'MOBIL' && v.status === 'IN_USE') || null,
          vehicles,
          recentTrips: trips.slice(0, 5),
          notifications: notifications.slice(0, 5)
        }, true);
      }
      case 'getVehicles':
        return jsonResponse(getAllVehicles(), true);
      case 'getHistory':
        return jsonResponse(getTripHistory({ filterUserId: userId, role, vehicleType: params.jenis }), true);
      case 'getUsers':
        return jsonResponse(getAllUsers(), true);
      case 'getStatistics':
        return jsonResponse(getFullStatistics(), true);
      case 'getNotifications':
        return jsonResponse(getNotifications(userId, role), true);
      case 'googleAuth':
        return wrapResult(handleGoogleAuth(params));
      default:
        return jsonResponse(null, false, `Aksi '${action}' tidak dikenali.`);
    }
  } catch (err) {
    return jsonResponse(null, false, err.message, 500);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (e) { body = e.parameter || {}; }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const action = body.action || '';
    const session = validateSessionToken(body.token || '');
    body.userId = session ? session.userId : (body.userId || '');
    body.role = session ? session.role : (body.role || CONFIG.ROLES.USER);
    
    switch (action) {
      case 'login':
        return wrapResult(handleLogin(body));
      case 'register':
        return wrapResult(handleRegister(body));
      case 'googleAuth':
        return wrapResult(handleGoogleAuth(body));
      case 'approveUser':
        return wrapResult(handleApproveUser(body));
      case 'rejectUser':
        return wrapResult(handleRejectUser(body));
      case 'addVehicle':
        return wrapResult(handleAddVehicle(body));
      case 'createBooking':
        return wrapResult(handleCreateBooking(body));
      case 'startTrip':
        return wrapResult(handleStartTrip(body));
      case 'finishTrip':
        return wrapResult(handleFinishTrip(body));
      case 'updateTariff':
        return wrapResult(handleUpdateTariff(body));
      case 'markNotificationRead':
        return wrapResult(markNotificationRead(body.notificationId));
      default:
        return jsonResponse(null, false, `Aksi POST '${action}' tidak dikenali.`);
    }
  } catch (err) {
    return jsonResponse(null, false, err.message, 500);
  }
}

function wrapResult(res) {
  return jsonResponse(res ? res.data : null, res ? res.success : false, res ? res.message : '');
}
