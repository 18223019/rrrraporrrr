# Panduan Serah Terima (Handover Guide) - Rapor Asrama

Dokumen ini dibuat untuk memandu pengelola baru (*maintainer*) dalam me-rebuild dan mengambil alih sistem Rapor Asrama untuk periode kepengurusan selanjutnya. 

Karena setiap periode menggunakan basis data yang terpisah, Anda harus membuat **Infrastruktur Baru** (seperti project Firebase dan Spreadsheet baru) agar data tidak bercampur dengan tahun sebelumnya.

Untuk memahami bagaimana aplikasi ini bekerja secara konseptual, silakan baca `SYSTEM-ARCHITECTURE.md`. Setelah memahaminya, ikuti langkah-langkah di bawah ini untuk memulai ulang sistem.

---

## 🗺️ Gambaran Besar Apa yang Harus Disiapkan

Untuk memulai periode baru, inilah 4 komponen utama yang harus disiapkan:
1. **Google Spreadsheet Baru**: Tempat menyimpan nilai dan database anggota.
2. **Google Apps Script Baru**: Sebagai Backend API pembaca nilai.
3. **Firebase Project Baru**: Untuk mengelola autentikasi (login aplikasi).
4. **Cloudflare Project Baru (Opsional namun disarankan)**: Untuk caching performa tinggi dan menghindari limitasi Google API.

---

## 🛠️ Langkah 1: Siapkan Database (Google Spreadsheet)

Aplikasi ini bergantung 100% pada struktur Google Spreadsheet.
1. Buat Google Spreadsheet baru (atau *make a copy* dari spreadsheet milik kepengurusan lalu).
2. Pastikan memiliki **1 sheet bernama `metadata`**. Sheet ini sangat penting karena berisi daftar semua anggota beserta data dasar mereka (Nama, Panggilan/Username, Email, Role).
3. Buat sheet bulan-bulanan (misal: `Agustus26`, `September26`). Format baris pertamanya (header) harus sama dengan format penilaian tahun sebelumnya (Nama, Panggilan, Skor Total, Kehadiran, Tahfidz, dsb).

---

## 🛠️ Langkah 2: Deploy Google Apps Script (Backend)

1. Buka Spreadsheet baru Anda -> Klik menu **Extensions** -> **Apps Script**.
2. Salin seluruh isi dari file `gas/Code.gs` di repo ini dan tempel (*paste*) ke Apps Script Anda.
3. Ubah variabel `SPREADSHEET_ID` di baris atas `Code.gs` dengan ID Spreadsheet Anda yang baru.
4. Klik **Deploy** -> **New Deployment**.
   *   Pilih tipe: **Web App**.
   *   Execute as: **Me** (Penting! Agar script memiliki izin membaca sheet Anda).
   *   Who has access: **Anyone** (Agar Cloudflare/Frontend bisa memanggilnya).
5. Anda akan mendapatkan **URL Web App**. Simpan URL ini baik-baik. (Bentuknya seperti `https://script.google.com/macros/s/..../exec`).

---

## 🛠️ Langkah 3: Setup Firebase (Autentikasi & Hosting)

Anda perlu menampung data login pengguna. Sebaiknya buat project baru agar data periode sebelumnya tetap aman.

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru.
2. Aktifkan **Authentication** -> Pilih **Email/Password**.
3. Daftarkan "Web App" di Firebase Console untuk mendapatkan konfigurasi `firebaseConfig`.
4. Buka file `.env` (berdasarkan `.env.example`) di laptop, lalu ganti nilai-nilai `VITE_FIREBASE_...` dengan data dari project baru Anda.
5. Unduh **Service Account JSON** dari *Project Settings* -> *Service Accounts*, lalu simpan di folder utama proyek dengan nama `firebaseServiceAccount.json`.
6. **Sinkronisasi Akun:** Jalankan perintah `npm run sync-accounts`. Script ini akan membaca sheet `metadata` dari Spreadsheet Anda, lalu secara otomatis mendaftarkan semua nama panggilan menjadi akun di Firebase.

---

## 🛠️ Langkah 4: Setup Lingkungan Lokal (.env)

Edit file `.env` di komputer Anda:

```env
# Masukkan konfigurasi Firebase Anda yang baru
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...

# Jika ingin jalan murni tanpa Cloudflare (Direct to GAS)
VITE_API_BASE=/api
VITE_RENDER_MODE=csr
VITE_GAS_URL=https://script.google.com/macros/s/SIMPAN_URL_GAS_ANDA_DISINI/exec
```

Uji coba lokal dengan menjalankan:
```bash
npm install
npm run dev
```
Coba login dengan salah satu nama panggilan dari spreadsheet. Jika berhasil masuk dashboard dan nilai muncul, integrasi dasar sudah selesai!

---

## 🛠️ Langkah 5: Setup Cloudflare (Untuk Produksi / Kecepatan Tinggi)

*Opsional namun wajib jika tidak ingin aplikasi terkena limit (Rate Limit) dari Google karena sering diakses bersamaan.*

1. Buat akun Cloudflare dan buka menu **Pages**.
2. Deploy folder `dist/` aplikasi ini ke Cloudflare Pages (selengkapnya di `DEPLOYMENT.md`).
3. Buka pengaturan Cloudflare Pages Anda -> **Functions** -> **KV Namespace bindings**. Buat namespace baru bernama `RAPOR_CACHE` dan hubungkan ke variabel `RAPOR_CACHE`.
4. Buka pengaturan Cloudflare Pages -> **Environment variables**. Setel:
   *   `GAS_BASE_URL` = URL Web App Google Script Anda.
   *   `RENDER_MODE` = `isr` (untuk mengaktifkan caching).

Selesai! Sekarang Cloudflare akan mencegat semua panggilan ke Google Sheet, menyimpannya di cache (KV), dan merespons dalam hitungan milidetik.

---

## 💡 Alternatif yang Lebih Sederhana

Arsitektur aplikasi ini dibuat dengan mempertimbangkan optimalisasi (*edge computing*, *caching*, dll). Jika Anda merasa pengelolaan Cloudflare terlalu kompleks, **sistem Cloudflare bisa dilewati sepenuhnya**.

Aplikasi ini dapat dijalankan sebagai *Single Page Application* (React biasa) yang memanggil API Google Apps Script secara langsung. 
Caranya: 
1. Setel `VITE_RENDER_MODE=csr`.
2. Pastikan `VITE_GAS_URL` terisi di `.env`. 
3. Lakukan deploy proyek murni ke Firebase Hosting, Vercel, atau Netlify seperti biasa. 

Sistem tetap akan berfungsi penuh secara fungsionalitas, meski tanpa cache dari Cloudflare.
