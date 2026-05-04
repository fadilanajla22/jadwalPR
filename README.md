# 📚 PR Scheduler

Website penjadwalan Pekerjaan Rumah (PR) berbasis web yang terintegrasi dengan **Google Sheets** sebagai database. Dibuat khusus untuk siswa SMK jurusan RPL — simpel, ringan, dan langsung bisa dipakai.

---

## ✨ Fitur Utama

- **Form input PR** — mata pelajaran, judul, deskripsi, deadline, prioritas, status
- **CRUD lengkap** — tambah, lihat, edit, hapus data (langsung ke Google Sheets)
- **Tampilan List** — diurutkan otomatis berdasarkan deadline terdekat
- **Tampilan Kalender** — lihat PR berdasarkan tanggal deadline
- **Highlight deadline** — H-2 kuning soft, H-1 merah soft, terlambat merah
- **Checkbox selesai** — klik langsung untuk tandai PR selesai
- **Dashboard** — jumlah tugas aktif, selesai, dan mendekati deadline
- **Notifikasi banner** — peringatan PR yang deadline-nya ≤ 3 hari
- **Filter** — berdasarkan mata pelajaran, prioritas, status, dan tanggal
- **Dual mode** — bisa pakai Google Sheets atau LocalStorage (offline)
- **Responsive** — nyaman di HP maupun laptop
- **Dummy data** — langsung ada contoh data saat pertama dibuka

---

## 🛠️ Tech Stack

| Bagian     | Teknologi                          |
|------------|------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript    |
| Font       | Inter (Google Fonts)               |
| Icons      | Lucide Icons (CDN)                 |
| Backend    | Google Apps Script (Web App)       |
| Database   | Google Sheets                      |
| Fallback   | LocalStorage (mode offline)        |

---

## 📁 Struktur Folder

```
pr-scheduler/
├── index.html              # Halaman utama
├── css/
│   └── style.css           # Semua styling
├── js/
│   ├── config.js           # Konfigurasi URL & mode
│   ├── api.js              # Layer komunikasi data (Sheets & LocalStorage)
│   └── app.js              # Logic utama (render, filter, CRUD, dll)
├── apps-script/
│   └── Code.gs             # Backend Google Apps Script
└── README.md               # Dokumentasi ini
```

---

## 🚀 Cara Setup

### 1. Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama spreadsheet, misalnya: **PR Scheduler**
3. Biarkan sheet kosong — header akan dibuat otomatis oleh Apps Script

Struktur kolom yang akan terbentuk:

| A  | B             | C     | D         | E        | F         | G      |
|----|---------------|-------|-----------|----------|-----------|--------|
| ID | Mata Pelajaran| Judul | Deskripsi | Deadline | Prioritas | Status |

---

### 2. Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions → Apps Script**
2. Hapus semua kode yang ada di editor
3. Copy-paste seluruh isi file `apps-script/Code.gs` ke editor
4. Klik ikon 💾 **Save** (atau Ctrl+S)
5. Beri nama project, misalnya: **PR Scheduler API**

---

### 3. Deploy sebagai Web App

1. Klik tombol **Deploy → New deployment**
2. Klik ikon ⚙️ di sebelah "Select type" → pilih **Web app**
3. Isi konfigurasi:
   - **Description**: PR Scheduler API v1
   - **Execute as**: Me *(pakai akun Google kamu)*
   - **Who has access**: Anyone *(agar bisa diakses dari frontend)*
4. Klik **Deploy**
5. Izinkan akses saat muncul popup permission (klik "Allow")
6. **Copy URL Web App** yang muncul — bentuknya seperti ini:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ Setiap kali kamu mengubah kode Apps Script, kamu harus **deploy ulang** (Deploy → Manage deployments → Edit → New version).

---

### 4. Hubungkan Frontend ke API

Buka file `js/config.js`, ganti nilai `APPS_SCRIPT_URL` dan ubah `MODE` ke `"sheets"`:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwbtKt9kTycggRWFdWll8zfrlnVYYpdP1oWwgUvWPtwA_VbZkKehGtpUsWjDCS_uQI8KA/exec", // ← paste URL kamu
  MODE: "sheets", // ← ganti dari "local" ke "sheets"
};
```

---

### 5. Jalankan di Lokal

Karena ini pure HTML/CSS/JS, cukup buka `index.html` di browser.

**Cara paling mudah (pakai VS Code):**
1. Install extension **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**
3. Browser akan otomatis terbuka

**Atau langsung dobel klik** `index.html` — tapi beberapa browser memblokir fetch ke URL eksternal dari file lokal. Kalau ada error CORS, pakai Live Server.

> 💡 **Tip**: Kalau belum setup Google Sheets, biarkan `MODE: "local"` di config.js. Data akan tersimpan di LocalStorage browser dan ada dummy data otomatis.

---

## 🔌 Contoh Endpoint API

Semua request ke URL Web App Apps Script.

### GET — Ambil semua data
```
GET https://script.google.com/macros/s/.../exec?action=getAll
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "PR_1234567890",
      "mataPelajaran": "Matematika",
      "judul": "Latihan Soal Bab 5",
      "deskripsi": "Kerjakan soal 1-20",
      "deadline": "2025-05-10",
      "prioritas": "Tinggi",
      "status": "Belum Selesai"
    }
  ]
}
```

### POST — Tambah data baru
```
POST https://script.google.com/macros/s/.../exec
Content-Type: application/json

{
  "action": "create",
  "data": {
    "mataPelajaran": "Bahasa Indonesia",
    "judul": "Rangkuman Cerpen",
    "deskripsi": "Bab 3 halaman 45",
    "deadline": "2025-05-12",
    "prioritas": "Sedang",
    "status": "Belum Selesai"
  }
}
```
Response:
```json
{ "success": true, "id": "PR_1715000000000" }
```

### POST — Update data
```json
{
  "action": "update",
  "id": "PR_1715000000000",
  "data": {
    "mataPelajaran": "Bahasa Indonesia",
    "judul": "Rangkuman Cerpen (revisi)",
    "deskripsi": "Bab 3 halaman 45-50",
    "deadline": "2025-05-13",
    "prioritas": "Tinggi",
    "status": "Sedang Dikerjakan"
  }
}
```
Response:
```json
{ "success": true }
```

### POST — Hapus data
```json
{
  "action": "delete",
  "id": "PR_1715000000000"
}
```
Response:
```json
{ "success": true }
```

---

## 🖥️ Tampilan Aplikasi

```
┌─────────────────────────────────────────────┐
│  📚 PR Scheduler              [+ Tambah PR] │
├─────────────────────────────────────────────┤
│  [3 Aktif]  [1 Selesai]  [2 Deadline Dekat] │
├─────────────────────────────────────────────┤
│  ⚠️ 2 PR mendekati deadline: "Integral"...  │
├─────────────────────────────────────────────┤
│  Filter: [Mapel ▼] [Prioritas ▼] [Status ▼] │
├─────────────────────────────────────────────┤
│  [Daftar]  [Kalender]                       │
├─────────────────────────────────────────────┤
│  ☐ Latihan Soal Integral  [Matematika][Tinggi]│
│    Kerjakan soal 1-20...                    │
│    📅 10 Mei 2025 (Besok!)          ✏️ 🗑️  │
├─────────────────────────────────────────────┤
│  ☐ Rangkuman Cerpen  [B.Indo][Sedang]       │
│    📅 12 Mei 2025 (2 hari lagi)     ✏️ 🗑️  │
└─────────────────────────────────────────────┘
```

---

## 📝 Catatan Tambahan

**Kenapa Apps Script, bukan backend Node.js?**
Karena Apps Script gratis, tidak perlu server, dan langsung terintegrasi dengan Google Sheets. Cocok banget untuk project sekolah.

**Kenapa ada mode LocalStorage?**
Biar kamu bisa langsung coba tanpa perlu setup Google Sheets dulu. Tinggal buka `index.html` dan langsung jalan.

**Batasan Google Apps Script:**
- Maksimal 6 menit eksekusi per request
- Quota harian: 20.000 request/hari (lebih dari cukup untuk pemakaian sekolah)
- Response pertama kadang lambat (~2-3 detik) karena "cold start"

**Keamanan:**
- URL Web App bersifat publik (siapa saja bisa akses jika tahu URL-nya)
- Untuk project sekolah ini sudah cukup aman
- Kalau mau lebih aman, bisa tambahkan token autentikasi di header request

---

## 👨‍💻 Dibuat untuk siswa SMK RPL

Project ini cocok dijadikan:
- Tugas akhir mata pelajaran Pemrograman Web
- Portofolio GitHub
- Bahan belajar integrasi frontend dengan API

---

*Selamat ngoding! 🚀*
