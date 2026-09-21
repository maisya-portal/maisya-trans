/**
 * MAISYA-TRANS - Utility Helpers
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const Utils = {
  /**
   * Format Rupiah
   */
  formatRupiah(amount) {
    const num = Number(amount) || 0;
    return 'Rp' + num.toLocaleString('id-ID');
  },

  /**
   * Format Kilometer
   */
  formatKM(km) {
    const num = Number(km) || 0;
    return num.toLocaleString('id-ID') + ' KM';
  },

  /**
   * Format Tanggal & Jam Indonesia
   */
  formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (e) {
      return isoString;
    }
  },

  /**
   * Format Tanggal Saja
   */
  formatDate(isoString) {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
    } catch (e) {
      return isoString;
    }
  },

  /**
   * Hitung durasi berjalan dari start_time ke sekarang
   */
  calculateElapsed(startTimeIso) {
    if (!startTimeIso) return '0 menit';
    const start = new Date(startTimeIso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours} jam ${minutes} menit`;
    }
    return `${minutes} menit`;
  },

  /**
   * Client-side SHA-256 Hash via Web Crypto API
   */
  async sha256(message) {
    if (!window.crypto || !window.crypto.subtle) {
      return message; // Fallback
    }
    const salt = 'MAISYA_TRANS_BREBES_SECURE_SALT_2026';
    const msgBuffer = new TextEncoder().encode(message + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Debounce helper
   */
  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Buat Link WhatsApp Ringkasan Pemakaian
   */
  generateWhatsAppShareUrl(data) {
    const text = 
`*RINGKASAN PEMAKAIAN KENDARAAN*
*Pondok Pesantren Imam Syafi'i Brebes*
_Maisya-Trans - Mobilitas Aman & Tertib_
----------------------------------
Kendaraan : ${data.vehicleName} (${data.nomorPolisi})
Keperluan : ${data.purpose || '-'}
Durasi : ${data.durationText || '-'}
KM Awal : ${data.startKm.toLocaleString('id-ID')} KM
KM Akhir : ${data.endKm.toLocaleString('id-ID')} KM
Jarak Tempuh : *${data.distanceKm} KM*
Tarif per KM : Rp${data.ratePerKm.toLocaleString('id-ID')}
*TOTAL BIAYA : Rp${data.totalCost.toLocaleString('id-ID')}*
----------------------------------
_Alhamdulillah, kendaraan telah dikembalikan dalam kondisi baik._`;

    return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  },

  /**
   * Download CSV Helper
   */
  downloadCSV(csvString, filename = 'laporan.csv') {
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
