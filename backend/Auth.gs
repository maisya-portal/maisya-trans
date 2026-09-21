/**
 * MAISYA-TRANS - Authentication & Session Management
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Auth.gs
 */

/**
 * Hash password menggunakan SHA-256 + Salt
 */
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

/**
 * Buat session token
 */
function createSessionToken(userId, role) {
  const payload = {
    userId: userId,
    role: role,
    timestamp: new Date().getTime(),
    expiry: new Date().getTime() + (CONFIG.SESSION_EXPIRY_HOURS * 3600 * 1000)
  };
  const jsonStr = JSON.stringify(payload);
  return Utilities.base64Encode(jsonStr);
}

/**
 * Validasi session token
 */
function validateSessionToken(token) {
  if (!token) return null;
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const session = JSON.parse(decoded);
    if (new Date().getTime() > session.expiry) {
      return null; // Expired
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Registrasi pengguna baru
 */
function handleRegister(params) {
  const { nama, nip, jabatan, divisi, no_hp, email, password } = params;
  
  if (!nama || !email || !password || !no_hp) {
    return { success: false, message: 'Harap lengkapi semua kolom wajib (Nama, Email, No HP, Password).' };
  }
  
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const data = userSheet.getDataRange().getValues();
  
  // Cek duplikasi email / no_hp
  const emailLower = email.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    const existingEmail = String(data[i][6]).toLowerCase().trim();
    const existingHp = String(data[i][5]).trim();
    if (existingEmail === emailLower) {
      return { success: false, message: 'Email sudah terdaftar. Silakan login atau gunakan email lain.' };
    }
    if (existingHp === no_hp.trim()) {
      return { success: false, message: 'Nomor WhatsApp/HP sudah terdaftar.' };
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
    '', // approved_at
    '', // approved_by
    ''  // last_login
  ];
  
  userSheet.appendRow(newRow);
  
  // Kirim notifikasi internal untuk Admin
  addNotification({
    userId: 'ADMIN',
    type: 'USER_BARU',
    title: 'Registrasi Pengguna Baru',
    message: `Ustadz/Karyawan ${nama} (${divisi || 'Pondok'}) telah mendaftar dan menunggu persetujuan.`
  });
  
  logAudit(userId, 'REGISTER', 'USERS', userId, `Pendaftaran user baru: ${nama} (${emailLower})`);
  
  return {
    success: true,
    message: 'Alhamdulillah, registrasi berhasil! Akun Anda sedang menunggu persetujuan dari Admin Sarpras.',
    data: { userId, nama, status: CONFIG.STATUS.USER.PENDING }
  };
}

/**
 * Login pengguna
 */
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
    
    // Pencocokan email atau NIP
    if (uEmail === inputLower || uNip === inputLower) {
      if (uPass !== passHash) {
        return { success: false, message: 'Password yang Anda masukkan salah.' };
      }
      
      // Validasi Status Pengguna
      if (uStatus === CONFIG.STATUS.USER.PENDING) {
        return { 
          success: false, 
          message: 'Akun Anda masih berstatus PENDING menunggu persetujuan Admin Sarpras. Silakan hubungi admin.' 
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
      
      // Update last_login
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
 * Autentikasi & Pendaftaran dengan Akun Google
 */
function handleGoogleAuth(params) {
  const { email, name, picture, googleId } = params;
  
  if (!email) {
    return { success: false, message: 'Alamat email Google tidak terdeteksi.' };
  }
  
  const emailLower = String(email).toLowerCase().trim();
  const userSheet = getSheet(CONFIG.SHEETS.USERS);
  const data = userSheet.getDataRange().getValues();
  
  // 1. Cek jika user sudah terdaftar di Spreadsheet
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uEmail = String(row[6]).toLowerCase().trim();
    if (uEmail === emailLower) {
      const uId = row[0];
      const uName = row[1];
      const uRole = row[8];
      const uStatus = row[9];
      
      if (uStatus === CONFIG.STATUS.USER.REJECTED) {
        return { success: false, message: 'Mohon maaf, akun Anda berstatus ditolak oleh Admin Sarpras.' };
      }
      if (uStatus === CONFIG.STATUS.USER.INACTIVE) {
        return { success: false, message: 'Akun Anda sedang dinonaktifkan sementara oleh Admin.' };
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
  
  // 2. Jika belum terdaftar, otomatis buat akun baru (Pendaftaran via Google)
  const userId = generateUUID('USR');
  const displayName = name ? String(name).trim() : emailLower.split('@')[0];
  const now = nowISO();
  
  const newRow = [
    userId,
    displayName,
    '-', // nip
    'Guru / Karyawan', // jabatan
    'Pondok', // divisi
    '-', // no_hp
    emailLower,
    '', // password_hash
    CONFIG.ROLES.USER,
    CONFIG.STATUS.USER.ACTIVE, // Otomatis aktif karena terverifikasi oleh Google
    now,
    now, // approved_at
    'GOOGLE_AUTO', // approved_by
    now // last_login
  ];
  
  userSheet.appendRow(newRow);
  
  addNotification({
    userId: 'ADMIN',
    type: 'USER_BARU',
    title: 'Pendaftaran Pengguna Baru (Google)',
    message: `${displayName} (${emailLower}) telah terdaftar dan langsung aktif menggunakan Google.`
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
