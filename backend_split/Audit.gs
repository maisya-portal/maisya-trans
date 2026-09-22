/**
 * MAISYA-TRANS - Audit Logging, Notifications & System Settings
 * Pondok Pesantren Imam Syafi'i Brebes
 * 
 * File: Audit.gs
 */

/**
 * Catat aktivitas penting ke sheet AUDIT_LOG
 */
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

/**
 * Buat notifikasi internal baru
 */
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
      false, // is_read
      nowISO()
    ]);
  } catch (err) {
    console.error('Gagal membuat notifikasi:', err.message);
  }
}

/**
 * Mengambil daftar notifikasi untuk user / admin
 */
function getNotifications(userId, role) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.NOTIFICATIONS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const notifications = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const targetUser = row[1];
      
      // Jika Admin, tampilkan notif untuk 'ADMIN', 'ALL', atau userId sendiri
      // Jika User biasa, tampilkan notif untuk targetUser === userId atau 'ALL'
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

/**
 * Tandai notifikasi sudah dibaca
 */
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

/**
 * Helper Membaca Nilai Pengaturan
 */
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

/**
 * Helper Menyimpan Nilai Pengaturan
 */
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
    
    // Jika belum ada, buat baris baru
    sheet.appendRow([key, value, 'Pengaturan Sistem', now, updatedBy]);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Ambil semua pengaturan
 */
function getAllSettings() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}
