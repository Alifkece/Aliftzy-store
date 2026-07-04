# 🛍️ Aliftzy Store

Website Store resmi **Aliftzy Store** yang dikembangkan menggunakan **HTML5, CSS3, JavaScript (ES Modules), Firebase Authentication, Cloud Firestore**, serta backend pembayaran terpisah.

Repository ini berisi **website yang digunakan oleh pelanggan (User)** untuk melakukan login, melihat produk, melakukan pembelian, dan melihat status pesanan secara realtime.

> Dashboard Admin dikembangkan pada repository terpisah agar keamanan, struktur proyek, dan proses maintenance menjadi lebih baik.

---

# ✨ Fitur

## 👤 Authentication

- Login
- Register
- Logout
- Session Login
- Firebase Authentication

---

## 🛒 Store

- Menampilkan daftar produk
- Detail produk
- Kategori produk
- Harga produk
- Badge stok
- Responsive Layout

---

## 💳 Checkout

- Membuat pesanan
- Integrasi Backend Payment
- Status pembayaran realtime
- Riwayat pesanan

---

## 📦 Orders

- Melihat seluruh pesanan milik pengguna
- Status pesanan
- Detail pesanan
- Informasi akun setelah pesanan diproses Admin

---

## 📢 Announcements

- Menampilkan pengumuman
- Sinkronisasi realtime dari Firestore

---

## 🎵 Music

- Playlist lagu
- Pemutar musik
- Pengaturan lagu dari Firestore

---

## ⚙️ Settings

Mengambil konfigurasi Store secara realtime melalui Firestore.

Contohnya:

- Nama toko
- Informasi toko
- Pengaturan lainnya

---

# 🛠️ Teknologi

- HTML5
- CSS3
- JavaScript (ES Modules)
- Firebase Authentication
- Cloud Firestore
- Firebase SDK
- Railway
- SiTransfer
- Netlify
- GitHub

---

# 📁 Struktur Project

```text
Aliftzy-Store/
│
├── api/
│   ├── create-payment.js
│   └── webhook.js
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   └── firebase-config.js
│
├── lib/
│   └── firebase.js
│
├── index.html
└── package.json
```

---

# 🔥 Database

Website ini menggunakan satu **Firebase Project** yang sama dengan Dashboard Admin.

Collection yang digunakan:

```text
products
songs
settings
announcements
stock
orders
```

Semua perubahan yang dilakukan melalui Dashboard Admin akan langsung tersinkronisasi ke Website Store menggunakan Cloud Firestore secara realtime.

---

# 🔒 Keamanan

Repository ini hanya berisi **Website Store**.

Hak akses seluruh data dikendalikan menggunakan **Firestore Security Rules**.

Store **tidak memiliki hak** untuk melakukan operasi Admin.

Proteksi dilakukan melalui:

- Firebase Authentication
- Firestore Security Rules
- Validasi Data
- Ownership Validation pada Order

---

# 🚀 Deployment

Repository ini dapat di-deploy menggunakan:

- Netlify
- Vercel
- Firebase Hosting

Pastikan menggunakan konfigurasi Firebase Project yang sama dengan Dashboard Admin agar data tetap tersinkronisasi.

---

# 👨‍💻 Developer

Website **Aliftzy Store** dirancang dan dikembangkan oleh:

## Muhammad Alifudin

**Mahasiswa SMK Industri Kreatif Kota Bekasi**

🌐 **Official Developer Website**  
**https://privatealif.netlify.app**

Project ini dikembangkan dengan tujuan membangun sebuah website digital store modern yang aman, responsif, cepat, dan mudah dikelola.

Arsitektur project menggunakan konsep **pemisahan Website Store dan Dashboard Admin**, sehingga keamanan, performa, dan proses maintenance menjadi jauh lebih baik.

Seluruh autentikasi, penyimpanan data, dan sinkronisasi informasi dilakukan menggunakan **Firebase Authentication** dan **Cloud Firestore** secara realtime.

---

# 📅 Timeline Project

| Tahap | Tanggal |
|-------|----------|
| 🚀 Project Dimulai | **12 Juni 2026** |
| 🎉 Project Selesai | **4 Juli 2026** |

Durasi pengembangan sekitar **22 hari**, meliputi:

- Perancangan UI / UX
- Pengembangan Frontend
- Integrasi Firebase
- Sistem Authentication
- Sistem Checkout
- Realtime Database
- Refactor Kode
- Peningkatan Keamanan
- Pemisahan Website Store & Dashboard Admin
- Debugging
- Optimasi Performa
- Final Testing
- Deployment

---

# 🙏 Special Thanks

Terima kasih kepada seluruh layanan, platform, teknologi, dokumentasi resmi, dan komunitas open-source yang telah membantu proses pengembangan **Aliftzy Store** hingga selesai.

## 🤖 Artificial Intelligence

- **ChatGPT (OpenAI)** — Membantu brainstorming, debugging, audit keamanan, dokumentasi, refactor kode, serta memberikan berbagai solusi selama proses pengembangan.
- **Claude AI (Anthropic)** — Membantu proses refactor repository, pengembangan Dashboard Admin, audit kode, optimasi struktur project, dan debugging.

---

## ☁️ Backend & Database

- Firebase Authentication
- Cloud Firestore
- Firebase Console
- Firebase SDK

---

## 🚀 Deployment & Hosting

- GitHub
- Netlify
- Railway
- Vercel

---

## 💳 Payment Services

- SiTransfer
- QRIS

---

## 💻 Development Tools

- Visual Studio Code
- Git
- GitHub Desktop
- Node.js
- npm

---

## 🌐 Web Technologies

- HTML5
- CSS3
- JavaScript (ES Modules)

---

## ❤️ Appreciation

Terima kasih kepada seluruh dokumentasi resmi, komunitas developer, layanan cloud, platform deployment, serta teknologi modern yang telah membantu proses pengembangan **Aliftzy Store** hingga selesai.

Project ini juga menjadi bagian dari proses pembelajaran dan pengembangan kemampuan dalam bidang **Web Development**, **UI/UX**, **Firebase**, serta **Frontend Engineering**.

---

# 📌 Catatan

Repository ini merupakan **Frontend Website Store**.

Dashboard Admin dikembangkan pada repository terpisah agar:

- Struktur project lebih rapi
- Maintenance lebih mudah
- Keamanan lebih baik
- Kode Admin tidak pernah dikirim ke browser pengguna
- Pengembangan Store dan Admin dapat dilakukan secara independen

Meskipun dipisahkan menjadi dua repository, keduanya tetap terhubung menggunakan **Firebase Authentication** dan **Cloud Firestore** yang sama sehingga seluruh perubahan dari Dashboard Admin akan langsung tersinkronisasi ke Website Store secara realtime.

---

# 📄 License

**© 2026 Muhammad Alifudin**

Seluruh source code dan desain pada repository ini dibuat untuk kebutuhan **Aliftzy Store**.

Dilarang memperbanyak, memodifikasi, mendistribusikan, atau menggunakan sebagian maupun seluruh isi project ini untuk kepentingan komersial tanpa izin dari pemilik project.

---

> **Aliftzy Store v1.0**  
> Developed with ❤️ by **Muhammad Alifudin**  
> Official Developer Website: **https://privatealif.netlify.app**
