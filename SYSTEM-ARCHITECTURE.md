# Rapor Asrama - System Architecture & Documentation

Dokumen ini merupakan panduan lengkap mengenai arsitektur, teknologi, dan alur kerja aplikasi **Rapor Asrama** berdasarkan implementasi kode aktual (*live code*).

---

## 1. Ringkasan Sistem (System Overview)
Rapor Asrama adalah aplikasi web modern yang dirancang untuk menampilkan laporan penilaian anggota/santri asrama. Alih-alih menggunakan database konvensional (seperti PostgreSQL atau MongoDB), aplikasi ini menggunakan **Google Spreadsheet sebagai basis data (CMS)**. 

Untuk memastikan aplikasi tetap cepat, responsif, dan tidak terhalang oleh *limit/quota* API Google, sistem ini mengimplementasikan lapisan perantara (*middleware*) dan mekanisme **Caching ganda** (di sisi klien dan di sisi Cloudflare Edge).

---

## 2. Tech Stack (Teknologi yang Digunakan)

### Frontend (Client-side)
*   **Framework:** React 19 dengan TypeScript.
*   **Build Tool:** Vite.
*   **Styling:** Tailwind CSS v4 (mengadopsi desain *Bento Grid*) & Framer Motion (untuk *micro-animations*).
*   **State & Data Fetching:** React Query (`@tanstack/react-query`) untuk manajemen caching di level UI.
*   **Routing:** React Router v7 (`react-router-dom`).
*   **PDF Generation:** `jspdf` & `html2canvas` (men-generate PDF dari DOM di sisi klien).

### Backend & Database (Data Source)
*   **Database Asli:** Google Spreadsheet (berisi lembar penilaian: Tahfidz, Kebersihan, Ketertiban, dsb.).
*   **Backend API:** Google Apps Script / GAS (`gas/Code.gs`) — di-deploy sebagai Web App. Mengubah data spreadsheet menjadi JSON.

### Middleware, Caching & Hosting
*   **Hosting Aplikasi:** Cloudflare Pages (utama) dan konfigurasi Firebase Hosting (`firebase.json` tersedia sebagai alternatif).
*   **Edge Functions:** Cloudflare Pages Functions (`functions/api/`) bertindak sebagai proxy dan cache server.
*   **Storage (Cache):** Cloudflare KV (`RAPOR_CACHE`) untuk menyimpan cache JSON dan Cloudflare R2 (`ASRAMA_BUCKET`) untuk penyimpanan aset.
*   **Worker Khusus:** Terdapat standalone Cloudflare Worker (`worker/worker.js`) untuk skenario routing khusus.

### Authentication
*   **Provider:** Firebase Authentication.
*   **Metode:** Sintetis Email & Password.

---

## 3. Arsitektur Autentikasi (Authentication Flow)

Sistem autentikasi sengaja dibuat ramah pengguna (*user-friendly*) sehingga santri/anggota tidak perlu menggunakan alamat email yang panjang.

1.  **Form Login:** Pengguna hanya memasukkan **Nama Panggilan** (Username) dan **Password**.
2.  **Email Sintetis (Synthetic Email):** Di belakang layar (`src/services/auth.ts`), sistem secara otomatis merangkai nama panggilan menjadi email. Contoh: user memasukkan nama panggilan `budi`, maka sistem akan login ke Firebase menggunakan email `budi@asrama.com`.
3.  **Role Management:** Firebase *Custom Claims* digunakan untuk memisahkan hak akses:
    *   **Coach (Pembina):** Memiliki akses ke `/coach` dan metrik keseluruhan.
    *   **Member (Santri):** Hanya bisa melihat rapor milik sendiri di rute `/:slug`.

---

## 4. Arsitektur Data (Bagaimana Data Mengalir?)

Aplikasi memiliki mekanisme penarikan data berlapis yang sangat dioptimasi.

### Alur Tarik Data (Data Fetching Flow)
1.  **Request Frontend:** Komponen React meminta data melalui `src/services/api.ts`.
2.  **Lapis 1 - In-Memory Cache (Client):** API client (`ApiCache`) akan mengecek memori lokal *browser*. Jika data pernah diminta kurang dari 10 menit yang lalu (TTL: 10 * 60 * 1000), data dari cache memori langsung dikembalikan secara instan.
3.  **Dynamic Routing:** Jika data di klien kosong, API client akan menentukan ke mana ia harus mengirim request. Berdasarkan status *Canary* dan mode *Render*, API akan diarahkan ke:
    *   `pages`: Proxy melalui Cloudflare Pages (Rute default & optimal).
    *   `worker`: Proxy melalui standalone Cloudflare Worker.
    *   `gas`: Mode bypass, menembak langsung URL Google Apps Script.
4.  **Lapis 2 - Edge Cache (Cloudflare):** Jika request masuk ke proxy Cloudflare, fungsi edge (`functions/api/rapor.ts`) akan mengecek **Cloudflare KV**. Jika ada JSON yang tersimpan (Cache Hit), respons langsung dikirim ke *browser* dalam satuan milidetik tanpa menyentuh Google.
5.  **Lapis 3 - Google Apps Script (Origin):** Apabila semua *cache* kosong (Cache Miss), barulah Cloudflare (atau klien secara langsung) me-request data ke server Google Apps Script. Script ini membaca baris dan kolom di Google Sheet, menyusun ulang (*serialize*) menjadi array JSON, lalu mengirimnya kembali ke atas untuk disimpan di KV (sebagai cache) dan diteruskan ke klien.

### Revalidasi Data (On-Demand ISR)
Jika pembina memperbarui nilai di Google Spreadsheet, data di klien bisa saja tertahan (*stale*) karena *cache* Cloudflare. Oleh karena itu, terdapat sistem **Revalidate** (`/api/revalidate.ts`).
Melalui GAS atau Trigger tertentu, URL revalidasi Cloudflare dipanggil dengan secret key, lalu Cloudflare KV akan menghapus *cache* lama (atau melakukan *pre-warm* / mengambil ulang JSON terbaru secara otomatis di *background*).

---

## 5. Fitur Canary (A/B Testing & Eksperimen)

Sistem mengadopsi fitur uji coba/eksperimen infrastruktur yang disebut **Canary**.
Berlokasi di `/canary` (melalui komponen `CanaryAutoEnroll`), fitur ini mengatur *cookies* (`rapor_canary=v1`) atau menangkap *query parameter* (`?use=pages`).

**Fungsi Canary:**
Mengubah jalur (*routing*) API klien tanpa perlu mengubah *source code*. Jika Canary aktif, aplikasi klien secara paksa mengalihkan request API dari origin default menuju arsitektur Edge Cloudflare untuk membandingkan stabilitas, *latency*, atau keandalan struktur baru tanpa mengorbankan pengalaman pengguna umum (*fallback safe*).

---

## 6. Struktur Repositori Utama

Berikut adalah navigasi folder terpenting yang menyusun arsitektur sistem:

```text
rapor-asrama/
├── functions/             # Cloudflare Pages Functions (API Middleware/Backend Edge)
│   ├── api/               # Endpoint API proxy & metrics (rapor.ts, metrics.ts, revalidate.ts)
│   └── _middleware.ts     # Proteksi path /api, /dashboard & Static assets routing
├── gas/                   # Source Code Google Apps Script (Backend Origin)
│   └── Code.gs            # Logika pembacaan Google Sheet menjadi REST JSON API
├── src/                   # Kode Sumber Frontend (React)
│   ├── components/        # Komponen UI Reusable (ProtectedRoute, Layout, Cards, dll)
│   ├── pages/             # Komponen Halaman (DashboardPage, CoachPage, MetricsPage, dll)
│   ├── services/          # Integrasi layanan luar:
│   │   ├── api.ts         # Inti dari API Client dengan In-Memory Caching & Routing
│   │   └── auth.ts        # Implementasi Firebase Auth dengan Synthetic Email
│   ├── utils/             # Fungsi helper & monitoring Web Vitals
│   ├── App.tsx            # Sistem routing React Router (Proteksi peran user)
│   └── main.tsx           # Entry point dengan tracking Web Vitals
├── worker/                # (Opsional) Standalone Cloudflare Worker untuk API terpisah
├── firebase.json          # Konfigurasi jika di-deploy ke Firebase Hosting
└── wrangler.toml          # Konfigurasi KV & infrastruktur Cloudflare
```

---

## 7. Metrics & Pemantauan (Telemetry)

Aplikasi memiliki fitur pemantauan lalu lintas dan metrik *built-in* (`functions/api/metrics.ts` dan `src/main.tsx`).
Setiap interaksi klien dengan API dicatat dan diklasifikasikan ke dalam "bucket" (contoh: beban request langsung ke GAS vs *cache hits* Cloudflare vs *error*). Hal ini membantu administrator (pembina/developer) mengetahui kesehatan akses aplikasi dan beban API (kuota).
