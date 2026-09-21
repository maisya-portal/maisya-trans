# MAISYA-TRANS
### Sistem Peminjaman & Monitoring Kendaraan
**Pondok Pesantren Imam Syafi’i Brebes**  
*Tagline: "Mobilitas Aman, Tertib, dan Terdata"*  
*Splash Tagline: "Perjalanan Lebih Tertib, Kendaraan Lebih Terawat"*

---

## 1. Ringkasan Proyek

**MAISYA-TRANS** adalah Progressive Web Application (PWA) modern, profesional, ringan, dan mobile-first yang dibangun khusus untuk mengelola peminjaman dan pengawasan armada kendaraan operasional (Motor dan Mobil) internal Pondok Pesantren Imam Syafi’i Brebes.

Sistem ini menghubungkan frontend web PWA dengan **Google Apps Script (GAS)** sebagai backend API dan **Google Spreadsheet** sebagai basis data utama (*Single Source of Truth*), sehingga tidak memerlukan biaya hosting database berbayar dan dapat diakses langsung oleh guru, asatidzah, staf pondok, serta pengurus Sarana & Prasarana (Sarpras).

---

## 2. Fitur Utama

- **🟢🔴 Real-time Vehicle Monitoring**:
  - Kartu monitoring besar untuk MOTOR dan MOBIL di dashboard utama.
  - Lampu indikator status berkedip (*pulse effect*): Hijau (*Tersedia*) & Merah (*Sedang Digunakan*).
  - Menampilkan nama pengemudi, jam mulai, odometer awal, dan **progress bar visual** dengan durasi berjalan realtime.
- **⚡ Fitur "Pinjam Sekarang" (Quick Borrow)**:
  - Alur cepat 3 langkah untuk pemakaian mendadak / darurat tanpa birokrasi berbelit.
- **🛡️ Checklist Sebelum Berangkat**:
  - Pemeriksaan kondisi ban, rem, lampu, spion, ketersediaan BBM, dan pernyataan tanggung jawab kelayakan operasional.
- **⏹️ Selesai Pemakaian & Perhitungan Biaya Otomatis**:
  - Validasi odometer: KM akhir tidak boleh lebih kecil dari KM awal.
  - Formula: `Jarak Tempuh = KM Akhir - KM Awal`
  - Biaya: `Total = Jarak Tempuh × Tarif per KM saat transaksi` (Default: Rp1.000 / KM).
  - Snapshot tarif: Tarif transaksi disimpan permanen agar perubahan tarif di masa depan tidak mengubah histori transaksi lama.
  - Checklist kondisi kepulangan (kebersihan, BBM, dan formulir laporan jika ada kerusakan).
- **🧾 Struk Ringkasan & Bagikan ke WhatsApp**:
  - Tampilan struk invoice pemakaian dinas lengkap dengan rincian biaya dan tombol *"Bagikan ke WhatsApp"* otomatis.
- **🔧 Smart Maintenance & Pengingat Servis**:
  - Perhitungan sisa kilometer ganti oli dan tune-up mesin.
  - Indikator peringatan:
    - 🟢 *Kondisi Baik*
    - 🟡 *Perhatian: Ganti oli dalam 150 KM*
    - 🔴 *PERLU SERVIS: Ganti oli telah jatuh tempo*
  - Pencatatan riwayat bengkel dan biaya servis.
- **👥 Sistem Autentikasi & Persetujuan User (Admin Approval)**:
  - Registrasi mandiri oleh guru/karyawan pondok.
  - Status awal pendaftar: `PENDING` (tidak dapat meminjam kendaraan sebelum disetujui Admin Sarpras).
  - Admin dapat menyetujui (*APPROVE*) atau menolak (*REJECT*) pengguna.
- **📊 Statistik Pemakaian & Ranking**:
  - KPI Dashboard (Total armada, sedang aktif, total jarak tempuh, total biaya operasional bulanan).
  - Peringkat pengguna teraktif:
    - Peringkat berdasarkan frekuensi pemakaian
    - Peringkat berdasarkan total kilometer
    - Peringkat berdasarkan total biaya pemakaian
- **📥 Ekspor Laporan CSV**:
  - Ekspor seluruh histori peminjaman ke dalam format CSV / Microsoft Excel dalam satu klik.
- **📲 Progressive Web App (PWA)**:
  - Dapat di-install di Android, iOS, Windows, macOS seperti aplikasi native.
  - Caching App Shell untuk performa kilat.
  - Notifikasi offline saat internet terputus.

---

## 3. Arsitektur & Teknologi

```
[ Frontend PWA (GitHub Pages) ]
      |
      | HTTPS REST JSON / CORS
      v
[ Google Apps Script (Backend API) ]
  LockService (Server-side anti bentrok / race condition)
  SHA-256 Hashing & Session Token
      |
      | SpreadsheetApp
      v
[ Google Spreadsheet (Single Source of Truth) ]
```

- **Frontend**: HTML5 Semantic, Modern Vanilla CSS3 (Islamic Modern Palette: Deep Emerald Green `#0D5C3A`, Cream `#F7F9F6`, Warm Gold `#D4AF37`), Vanilla JavaScript ES6+, Web App Manifest, Service Worker.
- **Backend**: Google Apps Script (GAS) dengan endpoint `doGet()` dan `doPost()`.
- **Database**: Google Sheets (Spreadsheet ID: `1yFoEsYrBqF33kvvungnHJU511wwKNI3_gQbK0QrRXI8`).
- **Hosting Frontend**: GitHub Pages.
- **Repository**: [https://github.com/maisya-portal/maisya-trans.git](https://github.com/maisya-portal/maisya-trans.git)

---

## 4. Struktur Database Google Spreadsheet

Spreadsheet ID: `1yFoEsYrBqF33kvvungnHJU511wwKNI3_gQbK0QrRXI8`

Sistem menggunakan 9 sheet:
1. **`USERS`**: `user_id`, `nama`, `nip`, `jabatan`, `divisi`, `no_hp`, `email`, `password_hash`, `role`, `status`, `created_at`, `approved_at`, `approved_by`, `last_login`
2. **`VEHICLES`**: `vehicle_id`, `jenis`, `merk`, `model`, `nomor_polisi`, `tahun`, `warna`, `current_km`, `last_service_km`, `last_service_date`, `last_oil_km`, `last_oil_date`, `oil_interval_km`, `tuneup_interval_km`, `status`, `notes`, `created_at`
3. **`BOOKINGS`**: `booking_id`, `user_id`, `vehicle_id`, `tanggal`, `start_time`, `estimated_end_time`, `purpose`, `notes`, `status`, `approved_by`, `approved_at`, `created_at`
4. **`TRIPS`**: `trip_id`, `booking_id`, `user_id`, `vehicle_id`, `start_time`, `end_time`, `start_km`, `end_km`, `distance_km`, `rate_per_km`, `total_cost`, `purpose`, `start_checklist`, `return_condition`, `damage_notes`, `status`, `created_at`
5. **`TARIFFS`**: `tariff_id`, `rate_per_km`, `effective_date`, `created_by`, `status`
6. **`MAINTENANCE`**: `maintenance_id`, `vehicle_id`, `type`, `date`, `km`, `description`, `cost`, `next_due_km`, `next_due_date`, `created_by`
7. **`NOTIFICATIONS`**: `notification_id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`
8. **`SETTINGS`**: `key`, `value`, `description`, `updated_at`, `updated_by`
9. **`AUDIT_LOG`**: `log_id`, `user_id`, `action`, `entity`, `entity_id`, `description`, `timestamp`, `ip_or_device_if_available`

---

## 5. Panduan Instalasi & Deployment Backend (Google Apps Script)

Project ID Apps Script: `14TIGDX5_TvoaOzw9t6teCBkAy_fbaY_pw1H4HKZyaPa6oGE2CSojwKmB`

1. Buka [Google Apps Script](https://script.google.com/) dan buka project Anda.
2. Salin seluruh file dari folder `backend/`:
   - `Config.gs`
   - `Database.gs`
   - `Auth.gs`
   - `Vehicles.gs`
   - `Bookings.gs`
   - `Trips.gs`
   - `Maintenance.gs`
   - `Users.gs`
   - `Reports.gs`
   - `Audit.gs`
   - `Code.gs`
3. Jalankan fungsi `seedDemoData()` di editor Apps Script satu kali untuk menginisialisasi seluruh sheet dan data awal pondok secara otomatis.
4. Klik tombol **Deploy** -> **New deployment**.
5. Pilih type: **Web app**:
   - Description: `MAISYA-TRANS Production API`
   - Execute as: `Me (akun Anda)`
   - Who has access: `Anyone` (Penting agar PWA frontend dapat mengakses API).
6. Salin **Web App URL** yang dihasilkan (berakhiran `/exec`).
7. Buka aplikasi web frontend, masuk sebagai Admin, buka menu **Kelola & Approval** (atau menu Pengaturan), dan tempelkan URL tersebut ke kolom **URL Web App Deployment**. Klik **Simpan URL**.

---

## 6. Panduan Deployment Frontend (GitHub Pages)

1. Pastikan repository git sudah disinkronkan:
   ```bash
   git add .
   git commit -m "feat: complete MAISYA-TRANS PWA production ready"
   git branch -M main
   git remote add origin https://github.com/maisya-portal/maisya-trans.git
   git push -u origin main
   ```
2. Buka repository di GitHub: `https://github.com/maisya-portal/maisya-trans`
3. Masuk ke tab **Settings** -> **Pages**.
4. Di bagian **Build and deployment** -> **Branch**: pilih `main` dan folder `/ (root)`.
5. Klik **Save**. Dalam 1-2 menit, aplikasi akan aktif di:
   `https://maisya-portal.github.io/maisya-trans/`

---

## 7. Akun Pengujian / Demo Bawaan

| Role | Email / NIP | Password | Keterangan |
|---|---|---|---|
| **Admin Sarpras** | `admin@imamsyafii.ponpes.id` / `19850101001` | `admin123` | Hak akses penuh: persetujuan user, ganti tarif, kelola armada, laporan |
| **Guru (User)** | `ahmad@imamsyafii.ponpes.id` / `19900215002` | `user123` | Peminjaman motor/mobil, input KM awal/akhir, riwayat |
| **Staf (User)** | `rizqi@imamsyafii.ponpes.id` / `19930720003` | `user123` | Operasional logistik dan belanja dapur santri |
| **Pending User** | `abdullah@imamsyafii.ponpes.id` | `user123` | Contoh akun baru menunggu persetujuan admin |

*(Tersedia tombol 1-klik di halaman login dan profil untuk memudahkan review)*

---

## 8. Lisensi & Hak Cipta

Aplikasi ini dikembangkan untuk kepentingan internal **Pondok Pesantren Imam Syafi’i Brebes**.  
Semua hak cipta dan aset lembaga dilindungi.
