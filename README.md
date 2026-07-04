# 🛍️ Aliftzy Store

Website Store resmi **Aliftzy Store** yang dibuat menggunakan HTML, CSS, JavaScript (ES Modules), Firebase Authentication, Cloud Firestore, dan backend pembayaran terpisah.

Repository ini berisi **website yang digunakan oleh pelanggan (User)** untuk melakukan login, melihat produk, melakukan pembelian, serta melihat status pesanan secara realtime.

> Dashboard Admin berada pada repository terpisah agar keamanan, struktur proyek, dan proses maintenance menjadi lebih baik.

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
- Responsive layout

---

## 💳 Checkout

- Membuat pesanan
- Integrasi backend pembayaran
- Status pembayaran realtime
- Riwayat pesanan

---

## 📦 Orders

- Melihat seluruh pesanan milik pengguna
- Status pesanan
- Detail pesanan
- Informasi akun setelah pesanan diproses Admin

---

## 📢 Announcement

- Menampilkan pengumuman dari Admin
- Update otomatis melalui Firestore

---

## 🎵 Music

- Playlist lagu
- Pemutar musik
- Pengaturan musik dari Firestore

---

## ⚙️ Settings

Mengambil konfigurasi Store secara realtime dari Firestore seperti:

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
- Firebase Hosting / Netlify
- Backend Payment API

---

# 📁 Struktur Project

```
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

Website ini menggunakan satu Firebase Project yang sama dengan Dashboard Admin.

Collection yang digunakan:

```
products
songs
settings
announcements
stock
orders
```

Semua perubahan yang dilakukan melalui Dashboard Admin akan langsung tersinkronisasi ke Website Store melalui Cloud Firestore.

---

# 🔒 Keamanan

Repository ini hanya berisi Website Store.

Hak akses seluruh data dikendalikan menggunakan **Firestore Security Rules**.

Store **tidak memiliki hak** untuk melakukan operasi Admin.

Proteksi dilakukan melalui:

- Firebase Authentication
- Firestore Security Rules
- Validasi data
- Ownership validation pada Order

---

# 🚀 Deployment

Repository ini dapat di-deploy menggunakan:

- Netlify
- Firebase Hosting
- Vercel (Frontend)

Pastikan menggunakan konfigurasi Firebase Project yang sama dengan Dashboard Admin agar data tetap tersinkronisasi.

---

# 📌 Catatan

Repository ini merupakan **Frontend Store**.

Dashboard Admin berada pada repository terpisah agar:

- Struktur proyek lebih rapi
- Maintenance lebih mudah
- Keamanan lebih baik
- Tidak ada kode Admin yang terkirim ke browser pengguna

Kedua repository tetap saling terhubung melalui Firebase Authentication dan Cloud Firestore yang sama.

---

# 📄 License

Project ini dibuat untuk kebutuhan **Aliftzy Store**.

Unauthorized redistribution or commercial reuse without permission is not permitted.
