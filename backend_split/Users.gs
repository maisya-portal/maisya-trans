/**
 * MAISYA-TRANS - User Management & Approval Workflow
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Users.gs
 */

/**
 * Mendapatkan seluruh daftar user (Password hash disembunyikan untuk keamanan)
 */
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
      // password_hash tidak disertakan demi keamanan!
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

/**
 * Menyetujui user baru (Admin Approval)
 */
function handleApproveUser(params) {
  const { targetUserId, adminId } = params;
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const rowIdx = i + 1;
      const now = nowISO();
      
      sheet.getRange(rowIdx, 10).setValue(CONFIG.STATUS.USER.ACTIVE); // status
      sheet.getRange(rowIdx, 12).setValue(now); // approved_at
      sheet.getRange(rowIdx, 13).setValue(adminId || 'ADMIN'); // approved_by
      
      // Kirim notifikasi selamat datang ke user
      addNotification({
        userId: targetUserId,
        type: 'AKUN_DISETUJUI',
        title: 'Akun Anda Telah Disetujui!',
        message: 'Alhamdulillah, akun Anda telah diaktifkan oleh Admin Sarpras. Anda sekarang dapat melakukan peminjaman kendaraan.'
      });
      
      logAudit(adminId, 'APPROVE_USER', 'USERS', targetUserId, `Setujui user ${data[i][1]} (${data[i][6]})`);
      return { success: true, message: `Pengguna ${data[i][1]} berhasil disetujui dan diaktifkan.` };
    }
  }
  return { success: false, message: 'User tidak ditemukan.' };
}

/**
 * Menolak pendaftaran user baru
 */
function handleRejectUser(params) {
  const { targetUserId, adminId, reason } = params;
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const rowIdx = i + 1;
      const now = nowISO();
      
      sheet.getRange(rowIdx, 10).setValue(CONFIG.STATUS.USER.REJECTED);
      sheet.getRange(rowIdx, 12).setValue(now);
      sheet.getRange(rowIdx, 13).setValue(adminId || 'ADMIN');
      
      logAudit(adminId, 'REJECT_USER', 'USERS', targetUserId, `Tolak user ${data[i][1]}: ${reason || 'Tidak memenuhi syarat'}`);
      return { success: true, message: `Pendaftaran pengguna ${data[i][1]} telah ditolak.` };
    }
  }
  return { success: false, message: 'User tidak ditemukan.' };
}

/**
 * Mengubah status aktif / nonaktif user
 */
function handleToggleUserStatus(params) {
  const { targetUserId, newStatus, adminId } = params;
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, 10).setValue(newStatus);
      logAudit(adminId, 'TOGGLE_USER_STATUS', 'USERS', targetUserId, `Ubah status user ${data[i][1]} menjadi ${newStatus}`);
      return { success: true, message: `Status pengguna berhasil diubah menjadi ${newStatus}.` };
    }
  }
  return { success: false, message: 'User tidak ditemukan.' };
}
