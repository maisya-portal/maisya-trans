/**
 * MAISYA-TRANS - Frontend Configuration
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const APP_CONFIG = {
  APP_NAME: 'MAISYA-TRANS',
  TAGLINE: 'Mobilitas Aman, Tertib, dan Terdata',
  SPLASH_TAGLINE: 'Perjalanan Lebih Tertib, Kendaraan Lebih Terawat',
  INSTITUTION: 'Pondok Pesantren Imam Syafi’i Brebes',
  SPREADSHEET_ID: '1yFoEsYrBqF33kvvungnHJU511wwKNI3_gQbK0QrRXI8',
  PROJECT_ID: '14TIGDX5_TvoaOzw9t6teCBkAy_fbaY_pw1H4HKZyaPa6oGE2CSojwKmB',
  
  // URL Deployment Web App Google Apps Script
  DEFAULT_GAS_API_URL: 'https://script.google.com/macros/s/AKfycbz7IHLds3V4sywzxL2ZOXVs-tyEMSkur1gpBStPpSkGME9YVyEKatiHOLm5hGSIuifF/exec',
  
  // Polling interval untuk update realtime status dashboard (20 detik)
  POLLING_INTERVAL_MS: 20000,
  
  // Default tariff (Rp/KM)
  DEFAULT_TARIFF_PER_KM: 1000,
  
  // Google Sign-In Client ID (Google Identity Services)
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com',
  
  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'maisya_trans_token',
    AUTH_USER: 'maisya_trans_user',
    REMEMBER_ME: 'maisya_trans_remember_me',
    REMEMBERED_CREDENTIALS: 'maisya_trans_saved_credentials',
    GOOGLE_AUTH_SESSION: 'maisya_trans_google_session',
    API_URL: 'maisya_trans_api_url',
    THEME: 'maisya_trans_theme',
    FAVORITES: 'maisya_trans_fav_vehicles',
    DEMO_MODE: 'maisya_trans_demo_mode',
    LOCAL_DB: 'maisya_trans_local_db'
  }
};

/**
 * Mendapatkan API URL aktif (dari localStorage atau default)
 */
function getActiveApiUrl() {
  const savedUrl = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.API_URL);
  return (savedUrl && savedUrl.trim() !== '') ? savedUrl.trim() : APP_CONFIG.DEFAULT_GAS_API_URL;
}

/**
 * Menyimpan API URL baru
 */
function setActiveApiUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.API_URL, url.trim());
  } else {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.API_URL);
  }
}
