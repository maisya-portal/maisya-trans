/**
 * MAISYA-TRANS - Google Apps Script Backend
 * Pondok Pesantren Imam Syafi'i Brebes
 * "Mobilitas Aman, Tertib, dan Terdata"
 * 
 * File: Config.gs
 */

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
  
  // Security
  SALT: 'MAISYA_TRANS_BREBES_SECURE_SALT_2026',
  SESSION_EXPIRY_HOURS: 72
};

/**
 * Mendapatkan instance Spreadsheet aktif atau berdasarkan ID
 */
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

/**
 * Mendapatkan sheet berdasarkan nama
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Silakan jalankan initDatabase() terlebih dahulu.');
  }
  return sheet;
}

/**
 * JSON Response Helper
 */
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

/**
 * Generate UUID unik sederhana
 */
function generateUUID(prefix = 'ID') {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + new Date().getTime().toString(36).toUpperCase() + '-' + randomStr;
}

/**
 * Format timestamp ISO standar
 */
function nowISO() {
  return new Date().toISOString();
}
