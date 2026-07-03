import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUser = null;
let products = [];
let songs = [];
let storeProfile = { avatarUrl: "" };
let pendingImgDataUrl = "";
let pendingProductImgDataUrl = "";
let currentOrderLink = "";
let currentOrderPayment = null; // { amount, username } - untuk QRIS Railway
let currentOrderProduct = null;
let currentOrderPackages = [];
let currentSelectedPackageIndex = 0;
let orderCountdownInterval = null;
let orderStatusPollInterval = null;
let orderTransactionId = null;
let orderExpiredAt = null;
let currentTrackIdx = 0;
let audioPlayer = null;
let isPlaying = false;
let stockItems = [];
let stockFilter = 'all';
let myOrders = [];
let stockUnsubscribe = null;
let currentHomeTab = 0;

// Expose globals — HANYA fungsi untuk Store/User. Tidak ada satupun
// fungsi/CRUD Admin yang di-expose ke window pada repository ini.
window.showPage = showPage;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.toggleUserMenu = toggleUserMenu;
window.filterProducts = filterProducts;
window.closeModal = closeModal;
window.orderProduct = orderProduct;
window.orderMembership = orderMembership;
window.goOrder = goOrder;
window.togglePlay = togglePlay;
window.prevTrack = prevTrack;
window.nextTrack = nextTrack;
window.setVolume = setVolume;
window.seekAudio = seekAudio;
window.toggleTrackMenu = toggleTrackMenu;
window.switchHomeTab = switchHomeTab;
window.loadMyOrders = loadMyOrders;
window.selectPackage = selectPackage;
window.downloadQris = downloadQris;

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    updateNavUI();
    showPage('home');
    loadPublicData();
  } else {
    currentUser = null;
    updateNavUI();
    showPage('auth', 'login');
  }
});

async function loadPublicData() {
  await loadProducts();
  await loadSongs();
  await loadStoreProfile();
  await loadAnnouncements();
  await loadStockPublic();
  renderProducts(products);
  renderTrackDropdown();
  updateBellDot();
  showBellIcon(true);
  // Show announcement popup after login
  const active = announcements.filter(a => a.active !== false);
  if (active.length) {
    setTimeout(() => openAnnPopup(), 600);
  }
}

async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));
  } catch(e) {
    if (!products.length) products = getDefaultProducts();
  }
}

async function loadSongs() {
  try {
    const snap = await getDocs(collection(db, "songs"));
    songs = [];
    snap.forEach(d => songs.push({ id: d.id, ...d.data() }));
    if (!songs.length) songs = getDefaultSongs();
  } catch(e) {
    if (!songs.length) songs = getDefaultSongs();
  }
}

async function loadStoreProfile() {
  try {
    const d = await getDoc(doc(db, "settings", "store"));
    if (d.exists()) storeProfile = d.data();
    applyStoreProfile();
  } catch(e) {}
}

function applyStoreProfile() {
  const avatarImg   = document.getElementById('avatar-img');
  const placeholder = document.getElementById('avatar-placeholder');
  const videoEl     = document.querySelector('#-wrap video');
  const url         = storeProfile.avatarUrl || '';
  const isVideo     = url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video'));

  if (url) {
    if (isVideo) {
      // Pakai video element yang sudah ada, ganti source-nya
      if (videoEl) {
        const src = videoEl.querySelector('source');
        if (src) src.src = url;
        videoEl.load();
        videoEl.style.display = 'block';
        videoEl.style.zIndex = '2';
      }
      avatarImg.style.display = 'none';
    } else {
      // Gambar biasa (jpg/png/gif/webp)
      avatarImg.src = url;
      avatarImg.style.display = 'block';
      avatarImg.style.zIndex = '2';
      if (videoEl) videoEl.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'none';
  } else {
    // Default — tampilkan video bawaan
    avatarImg.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    if (videoEl) { videoEl.style.display = 'block'; videoEl.style.zIndex = '1'; }
  }
}

function getDefaultProducts() {
  return [
    { id:'1', name:'Spotify Premium', category:'musik', price:15000, desc:'Nikmati musik tanpa iklan, download lagu favorit dan kualitas audio terbaik.', badge:'POPULER', img:'', link:'https://wa.me/' },
    { id:'2', name:'Netflix', category:'streaming', price:25000, desc:'Tonton film dan serial pilihan dari seluruh dunia dengan kualitas HD hingga 4K.', badge:'', img:'', link:'https://wa.me/' },
    { id:'3', name:'ChatGPT Plus', category:'produktivitas', price:20000, desc:'Akses GPT-4 tanpa batas, lebih cepat dan canggih untuk produktivitas harian.', badge:'', img:'', link:'https://wa.me/' },
    { id:'4', name:'Canva Pro', category:'kreatif', price:12000, desc:'Desain grafis tanpa batas dengan ribuan template premium dan fitur eksklusif.', badge:'', img:'', link:'https://wa.me/' },
    { id:'5', name:'YouTube Premium', category:'streaming', price:13000, desc:'Tonton tanpa iklan, unduh video, dan nikmati YouTube Music secara gratis.', badge:'', img:'', link:'https://wa.me/' },
    { id:'6', name:'Duolingo Plus', category:'edukasi', price:10000, desc:'Belajar bahasa baru tanpa iklan dengan akses ke semua konten premium.', badge:'', img:'', link:'https://wa.me/' },
    { id:'7', name:'Disney+', category:'streaming', price:18000, desc:'Marvel, Star Wars, Pixar, National Geographic — semua dalam satu platform.', badge:'', img:'', link:'https://wa.me/' },
    { id:'8', name:'Apple Music', category:'musik', price:14000, desc:'Lebih dari 100 juta lagu dengan kualitas audio lossless dan Spatial Audio.', badge:'', img:'', link:'https://wa.me/' },
    { id:'9', name:'Prime Video', category:'streaming', price:16000, desc:'Film dan serial Amazon Original berkualitas tinggi dari seluruh dunia.', badge:'', img:'', link:'https://wa.me/' },
    { id:'10', name:'Picsart Gold', category:'kreatif', price:11000, desc:'Edit foto dan video dengan fitur AI terdepan dan ribuan stiker premium.', badge:'', img:'', link:'https://wa.me/' },
    { id:'11', name:'Alight Motion', category:'kreatif', price:12000, desc:'Aplikasi motion graphic dan video editing terbaik untuk kreator konten.', badge:'', img:'', link:'https://wa.me/' },
    { id:'12', name:'VIU', category:'streaming', price:10000, desc:'Drama Korea, Jepang, dan konten Asia terlengkap dengan subtitle Indonesia.', badge:'', img:'', link:'https://wa.me/' },
  ];
}

function getDefaultSongs() {
  return [
    { id:'s1', title:'The fate of ophelia', artist:'Taylor Swift', url:'https://smail.my.id/cloud/9PsdBNHy1' },
    { id:'s2', title:'One of the girls', artist:'The Weeknd', url:'https://smail.my.id/cloud/ZaYsHomt1' },
    { id:'s3', title:'Starboy', artist:'The Weeknd', url:'https://cdn.yupra.my.id/yp/qfburybd.mp3' },
    { id:'s4', title:'Saturn', artist:'sza', url:'https://cdn.yupra.my.id/yp/adw31owk.mp3' },
    { id:'s5', title:'What it is', artist:'Doechii', url:'https://cdn.yupra.my.id/yp/zd5pti9o.mp3' },
    { id:'s6', title:'Daddy s home', artist:'Users', url:'https://cdn.yupra.my.id/yp/ord6bhz7.mp3' },
    { id:'s7', title:'Unforgettable', artist:'PNB ROCK', url:'https://cdn.yupra.my.id/yp/t5rfbaeh.mp3' },
    { id:'s8', title:'Timeless', artist:'The Weeknd', url:'https://cdn.yupra.my.id/yp/cks7evku.mp3' },
  ];
}

// ===== NAVIGATION =====
function showPage(page, sub) {
  document.getElementById('page-home').style.display = 'none';
  document.getElementById('page-auth').style.display = 'none';

  if (page === 'home') {
    if (!currentUser) { showPage('auth', 'login'); return; }
    document.getElementById('page-home').style.display = 'block';
    updateSettingsPanel();
  }
  if (page === 'auth') {
    document.getElementById('page-auth').style.display = 'flex';
    if (sub) switchAuthTab(sub);
    document.getElementById('auth-back-home').style.display = currentUser ? 'block' : 'none';
  }
  document.getElementById('user-menu').style.display = 'none';
}

function updateSettingsPanel() {
  const uname = document.getElementById('settings-username');
  const uemail = document.getElementById('settings-email');
  if (uname && currentUser) {
    uname.textContent = currentUser.displayName || 'Pengguna';
    uemail.textContent = currentUser.email || '';
  }
}

function updateNavUI() {
  const authEl = document.getElementById('nav-auth');
  const userEl = document.getElementById('nav-user');
  const avatarEl = document.getElementById('nav-avatar');
  if (currentUser) {
    authEl.classList.add('hidden');
    userEl.classList.remove('hidden');
    avatarEl.textContent = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
  } else {
    authEl.classList.remove('hidden');
    userEl.classList.add('hidden');
  }
}

function toggleUserMenu() {
  const m = document.getElementById('user-menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', e => {
  if (!e.target.closest('#nav-user')) document.getElementById('user-menu').style.display = 'none';
});

// ===== AUTH =====
function switchAuthTab(tab) {
  document.getElementById('auth-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('btn-login');
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showNotif('Berhasil masuk', 'success');
  } catch(e) {
    errEl.textContent = getAuthError(e.code);
    errEl.style.display = 'block';
  }
  btn.innerHTML = '<span>Masuk</span>';
  btn.disabled = false;
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-error');
  const succEl = document.getElementById('reg-success');
  errEl.style.display = 'none'; succEl.style.display = 'none';
  if (!name) { errEl.textContent = 'Nama tidak boleh kosong.'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('btn-register');
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    succEl.textContent = 'Akun berhasil dibuat. Silakan masuk.';
    succEl.style.display = 'block';
    setTimeout(() => switchAuthTab('login'), 1500);
  } catch(e) {
    errEl.textContent = getAuthError(e.code);
    errEl.style.display = 'block';
  }
  btn.innerHTML = '<span>Buat Akun</span>';
  btn.disabled = false;
}

async function handleLogout() {
  await signOut(auth);
  showNotif('Berhasil keluar', 'success');
}

function getAuthError(code) {
  const map = {
    'auth/user-not-found': 'Email tidak terdaftar.',
    'auth/wrong-password': 'Kata sandi salah.',
    'auth/email-already-in-use': 'Email sudah digunakan.',
    'auth/weak-password': 'Kata sandi minimal 6 karakter.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/invalid-credential': 'Email atau kata sandi salah.',
    'auth/network-request-failed': 'Koneksi gagal. Cek internet.',
  };
  return map[code] || 'Terjadi kesalahan. Coba lagi.';
}

// ===== PRODUCTS =====
function renderProducts(list) {
  const grid = document.getElementById('product-grid');
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 16px;color:var(--text2);font-size:14px;">Tidak ada produk ditemukan.</div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    // Hitung stock
    const pStock = stockItems.filter(s => s.productId === p.id);
    const availableCount = pStock.filter(s => !s.sold).length;
    const totalCount = pStock.length;
    const hasStock = availableCount > 0;
    const hasStockData = totalCount > 0;

    const stockBadgeHtml = hasStockData
      ? `<div class="stock-badge ${hasStock ? 'stock-badge-available' : 'stock-badge-empty'}">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          ${hasStock ? `${availableCount}/${totalCount} tersedia` : 'STOCK HABIS'}
        </div>`
      : '';

    const buyBtn = hasStockData && !hasStock
      ? `<button class="btn-order-disabled" disabled>Habis</button>`
      : `<button class="btn-order" onclick="event.stopPropagation();orderProduct('${p.id}')">Pesan</button>`;

    return `
    <div class="product-card" onclick="orderProduct('${p.id}')">
      <div style="position:relative;">
        ${p.img
          ? `<img src="${p.img}" class="product-thumb" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="product-thumb-placeholder" style="display:none;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
          : `<div class="product-thumb-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
        }
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc || ''}</div>
        ${stockBadgeHtml}
        <div class="product-footer">
          <div class="product-price">Rp${Number(p.price||0).toLocaleString('id-ID')}<span>/bulan</span></div>
          ${buyBtn}
        </div>
      </div>
    </div>
  `;
  }).join('');
  applyRevealToCards();
}

function filterProducts(cat, btn) {
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(cat === 'all' ? products : products.filter(p => p.category === cat));
}

function orderProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (!currentUser) { showNotif('Silakan masuk terlebih dahulu', 'error'); showPage('auth', 'login'); return; }

  console.log("SELECTED PRODUCT", p);

  document.getElementById('modal-order-title').textContent = p.name;
  currentOrderProduct = p;
  // Jika produk punya banyak paket, pakai itu. Kalau tidak, fallback ke 1 paket dari harga utama (perilaku lama tetap jalan).
  currentOrderPackages = (Array.isArray(p.packages) && p.packages.length > 0)
    ? p.packages
    : [{ name: p.name, price: Number(p.price || 0) }];
  currentSelectedPackageIndex = 0;
  currentOrderLink = p.link || '#';

  renderOrderModalBody();
  openModal('modal-order');
}

function renderOrderModalBody() {
  const p = currentOrderProduct;
  const pkgs = currentOrderPackages;
  const selected = pkgs[currentSelectedPackageIndex];
  const hasMultiPkg = pkgs.length > 1;

  // Fallback berantai: harga paket terpilih → harga produk utama → 0
  const resolvedAmount = Number(selected.price) || Number(p.price) || 0;
  currentOrderPayment = {
    amount: resolvedAmount,
    username: (currentUser && (currentUser.displayName || currentUser.email)) || 'guest'
  };

  const bodyHtml = hasMultiPkg ? `
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Pilih paket untuk <strong style="color:var(--text);">${escHtml(p.name)}</strong>:</div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px;">
      ${pkgs.map((pkg, i) => {
        const isActive = i === currentSelectedPackageIndex;
        return `<div onclick="selectPackage(${i})" style="cursor:pointer;border:1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'};background:${isActive ? 'rgba(79,140,255,0.1)' : 'var(--surface2)'};border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:9px;">
            <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${isActive ? 'var(--accent)' : 'var(--border)'};background:${isActive ? 'var(--accent)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;">${isActive ? '<div style="width:6px;height:6px;border-radius:50%;background:#fff;"></div>' : ''}</div>
            <span style="font-size:13.5px;color:var(--text);font-weight:${isActive ? '700' : '500'};">${escHtml(pkg.name)}</span>
          </div>
          <span style="font-size:14px;color:${isActive ? 'var(--accent)' : 'var(--text2)'};font-weight:700;font-family:'Syne',sans-serif;">Rp${Number(pkg.price||0).toLocaleString('id-ID')}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:12.5px;color:var(--text2);">Total bayar</span>
      <span style="font-size:18px;font-weight:800;color:var(--accent);font-family:'Syne',sans-serif;">Rp${resolvedAmount.toLocaleString('id-ID')}<span style="font-size:11px;font-weight:400;font-family:'DM Sans';color:var(--text2);margin-left:3px;">/bulan</span></span>
    </div>
    <div id="order-qris-wrap"></div>
  ` : `
    <div style="margin-bottom:10px;">Anda akan memesan:</div>
    <div style="background:var(--surface2);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:15px;font-weight:600;color:var(--text);font-family:'Syne',sans-serif;">${escHtml(p.name)}</div>
      <div style="font-size:12.5px;color:var(--text2);margin-top:3px;">${escHtml(p.desc || '')}</div>
      <div style="font-size:18px;font-weight:800;color:var(--accent);font-family:'Syne',sans-serif;margin-top:8px;">Rp${resolvedAmount.toLocaleString('id-ID')}<span style="font-size:11px;font-weight:400;font-family:'DM Sans';color:var(--text2);margin-left:3px;">/bulan</span></div>
    </div>
    <div id="order-qris-wrap"></div>
    Klik tombol di bawah untuk membayar via QRIS.
  `;

  document.getElementById('modal-order-body').innerHTML = bodyHtml;

  const btn = document.getElementById('btn-order-go');
  btn.style.display = '';
  btn.disabled = false;
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Bayar Sekarang';
  document.getElementById('btn-order-cancel').style.display = 'none';
}

function selectPackage(i) {
  currentSelectedPackageIndex = i;
  renderOrderModalBody();
}

async function downloadQris(imgUrl, txId) {
  if (!imgUrl) { showNotif('Gambar QRIS tidak tersedia', 'error'); return; }
  try {
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `QRIS-${txId || 'aliftzy'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    window.open(imgUrl, '_blank');
    showNotif('Tidak bisa auto-download, tekan lama gambar untuk simpan', 'error');
  }
}

function orderMembership(type) {
  currentOrderPayment = null;
  currentOrderProduct = null;
  currentOrderPackages = [];
  if (!currentUser) { showNotif('Silakan masuk terlebih dahulu', 'error'); showPage('auth', 'login'); return; }
  const data = {
    reseller: { title:'Daftar Reseller', price:'Rp10.000', desc:'Paket Reseller ALIFTZY STORE — dapatkan stok app premium, bahan jualan, dan dukungan penuh.', link:'https://wa.me/6285122108079' },
    owner: { title:'Daftar Owner', price:'Rp20.000', desc:'Paket Owner ALIFTZY STORE — buka reseller sendiri, akses semua bahan dan group eksklusif.', link:'https://wa.me/6285122108079' },
  }[type];
  document.getElementById('modal-order-title').textContent = data.title;
  document.getElementById('modal-order-body').innerHTML = `
    <div style="background:var(--surface2);border-radius:10px;padding:12px 14px;margin-bottom:12px;">
      <div style="font-size:20px;font-weight:800;color:${type==='owner'?'var(--gold)':'var(--accent)'};font-family:'Syne',sans-serif;">${data.price}<span style="font-size:12px;font-weight:400;font-family:'DM Sans';color:var(--text2);margin-left:3px;">/ sekali</span></div>
    </div>
    ${data.desc}<br><br>Klik tombol untuk menghubungi admin.
  `;
  currentOrderLink = data.link;
  const btn = document.getElementById('btn-order-go');
  btn.style.display = '';
  btn.disabled = false;
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Hubungi Sekarang';
  document.getElementById('btn-order-cancel').style.display = 'none';
  openModal('modal-order');
}

function goOrder() {
  console.log("ORDER STATE", {
    currentOrderProduct,
    currentOrderPackages,
    currentOrderPayment
  });

  // Jika ini order produk (punya data pembayaran), generate QRIS via backend Railway
  if (currentOrderPayment && currentOrderPayment.amount > 0) {
    generateQrisPayment();
    return;
  }
  // Selain itu (membership dll), perilaku lama: buka link WhatsApp
  if (currentOrderLink && currentOrderLink !== '#') window.open(currentOrderLink, '_blank');
}

// Bersihkan nilai amount jadi angka murni: hapus "Rp", titik, koma, spasi.
// Ini yang menyebabkan produk selain YouTube gagal — kalau price tersimpan
// sebagai string ("Rp8.000") atau kosong/undefined, backend menolaknya.
function sanitizeAmount(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return cleaned ? Number(cleaned) : NaN;
}

async function generateQrisPayment() {
  const btn = document.getElementById('btn-order-go');
  const cancelBtn = document.getElementById('btn-order-cancel');
  const wrap = document.getElementById('order-qris-wrap');
  const originalBtnHtml = btn.innerHTML;
  const paymentToSend = currentOrderPayment;

  const selectedPackage = currentOrderPackages[currentSelectedPackageIndex];
  const cleanAmount = sanitizeAmount(paymentToSend.amount);
  const cleanUsername = paymentToSend.username || '';

  // DEBUG TOTAL — bandingkan log ini antara produk yang berhasil (YouTube) vs yang gagal
  console.log("PAYMENT DEBUG", {
    currentOrderProduct,
    currentOrderPackages,
    currentOrderPayment,
    selectedPackage,
    amount: cleanAmount,
    typeofAmount: typeof cleanAmount,
    username: cleanUsername
  });

  if (!cleanAmount || isNaN(cleanAmount) || cleanAmount <= 0) {
    showNotif('Harga produk/paket ini tidak valid (bukan angka). Cek data produk di admin.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = 'Memproses...';

  try {
    console.log("REQUEST BODY", {
      amount: cleanAmount,
      username: cleanUsername
    });

    const res = await fetch('https://aliftzy-backend-production.up.railway.app/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: cleanAmount,
        username: cleanUsername
      })
    });

    const result = await res.json();
    console.log("RESPONSE create-payment", { ok: res.ok, status: res.status, result });

    // Backend Railway membungkus hasil SiTransfer di { success, data: { qris_image, transaction_id, amount } }
    if (!res.ok || result.success === false || result.error) {
      showNotif(result.error || 'Gagal membuat pembayaran QRIS', 'error');
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
      return;
    }

    const data = result.data || result; // jaga-jaga kalau suatu saat backend kirim tanpa wrapper "data"

    if (!data.qris_image) {
      showNotif('Respons backend tidak berisi data QRIS', 'error');
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
      return;
    }

    wrap.innerHTML = `
      <div style="margin-top:6px;margin-bottom:14px;background:var(--surface2);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:13px;color:var(--text2);margin-bottom:10px;">Scan QRIS untuk membayar</div>
        <img src="${data.qris_image}" alt="QRIS" style="max-width:220px;width:100%;border-radius:8px;background:#fff;padding:8px;" onerror="this.alt='Gagal memuat gambar QRIS';this.style.border='1px solid var(--danger)';">
        <div style="font-size:18px;font-weight:800;color:var(--accent);font-family:'Syne',sans-serif;margin-top:10px;">Rp${Number(data.amount || paymentToSend.amount).toLocaleString('id-ID')}</div>
        <div style="font-size:11.5px;color:var(--text2);margin-top:6px;">ID Transaksi: ${data.transaction_id || '-'}</div>
        <button type="button" class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="downloadQris('${data.qris_image}','${data.transaction_id || 'qris'}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download QRIS
        </button>
        <div id="order-countdown" style="font-size:13px;color:var(--text);margin-top:10px;font-weight:600;"></div>
        <div id="order-status-msg" style="font-size:13px;margin-top:6px;font-weight:700;"></div>
      </div>
    `;

    btn.style.display = 'none';
    cancelBtn.style.display = '';
    currentOrderPayment = null; // cegah generate ulang ganda selagi QR masih tampil

    orderTransactionId = data.transaction_id || null;
    orderExpiredAt = data.expired_at || null;
    startPaymentCountdown(orderExpiredAt);
    if (orderTransactionId) startStatusPolling(orderTransactionId);
  } catch (err) {
    showNotif('Gagal terhubung ke server pembayaran', 'error');
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}

// ===== COUNTDOWN PEMBAYARAN =====
function stopPaymentCountdown() {
  if (orderCountdownInterval) { clearInterval(orderCountdownInterval); orderCountdownInterval = null; }
}

function startPaymentCountdown(expiredAt) {
  stopPaymentCountdown();
  const el = document.getElementById('order-countdown');
  if (!el || !expiredAt) return;

  const expiredTime = new Date(expiredAt).getTime();
  if (isNaN(expiredTime)) return;

  const tick = () => {
    const el2 = document.getElementById('order-countdown');
    if (!el2) { stopPaymentCountdown(); return; }
    const remainMs = expiredTime - Date.now();
    if (remainMs <= 0) {
      stopPaymentCountdown();
      stopStatusPolling();
      el2.textContent = '';
      markPaymentExpired();
      return;
    }
    const totalSec = Math.floor(remainMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    el2.textContent = `Waktu pembayaran tersisa: ${mm}:${ss}`;
  };
  tick();
  orderCountdownInterval = setInterval(tick, 1000);
}

function markPaymentExpired() {
  const statusEl = document.getElementById('order-status-msg');
  if (statusEl) {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = 'Pembayaran Kadaluarsa';
  }
  const btn = document.getElementById('btn-order-go');
  if (btn) btn.style.display = 'none';
  const wrap = document.getElementById('order-qris-wrap');
  if (wrap) {
    const img = wrap.querySelector('img');
    if (img) img.style.opacity = '0.3';
  }
}

// ===== POLLING STATUS PEMBAYARAN =====
function stopStatusPolling() {
  if (orderStatusPollInterval) { clearInterval(orderStatusPollInterval); orderStatusPollInterval = null; }
}

function startStatusPolling(transactionId) {
  stopStatusPolling();
  orderStatusPollInterval = setInterval(() => checkPaymentStatus(transactionId), 4000);
}

async function checkPaymentStatus(transactionId) {
  try {
    const res = await fetch('https://aliftzy-backend-production.up.railway.app/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId })
    });
    const result = await res.json();
    const data = result.data || result;
    const status = (data.status || '').toLowerCase();

    if (status === 'success' || status === 'paid' || status === 'completed') {
      stopStatusPolling();
      stopPaymentCountdown();
      const countdownEl = document.getElementById('order-countdown');
      if (countdownEl) countdownEl.textContent = '';
      const statusEl = document.getElementById('order-status-msg');
      if (statusEl) {
        statusEl.style.color = 'var(--success)';
        statusEl.textContent = 'Pembayaran Berhasil';
      }
      const cancelBtn = document.getElementById('btn-order-cancel');
      if (cancelBtn) cancelBtn.textContent = 'Tutup';
    } else if (status === 'expired' || status === 'failed') {
      stopStatusPolling();
      stopPaymentCountdown();
      markPaymentExpired();
    }
    // status "pending" -> lanjut polling, tidak perlu aksi
  } catch (err) {
    // jangan hentikan polling hanya karena 1 request gagal (jaringan dsb)
  }
}

// ===== MUSIC PLAYER — EQUALIZER FIXED =====
function renderTrackDropdown() {
  const dd = document.getElementById('track-dropdown');
  dd.innerHTML = songs.map((s, i) => `
    <div class="track-item ${i === currentTrackIdx ? 'active' : ''}" onclick="selectTrack(${i})">
      <div class="track-num">${i + 1}</div>
      <div class="track-name">${s.title || 'Unknown'}</div>
    </div>
  `).join('');
}

window.selectTrack = function(idx) {
  currentTrackIdx = idx;
  loadTrack();
  if (audioPlayer) {
    audioPlayer.play()
      .then(() => { isPlaying = true; updatePlayUI(); })
      .catch(() => {});
  }
  document.getElementById('track-dropdown').classList.remove('open');
  renderTrackDropdown();
};

function loadTrack() {
  const s = songs[currentTrackIdx];
  if (!s) return;
  document.getElementById('music-title').textContent = s.title || 'Unknown';
  document.getElementById('music-artist').textContent = s.artist || '—';
  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.volume = 0.7;
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', () => {
      document.getElementById('time-total').textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', nextTrack);
  }
  audioPlayer.src = s.url;
  audioPlayer.load();
}

function togglePlay() {
  if (!songs.length) { showNotif('Tidak ada lagu', 'error'); return; }
  if (!audioPlayer || !audioPlayer.src) loadTrack();
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
  } else {
    audioPlayer.play()
      .then(() => { isPlaying = true; updatePlayUI(); })
      .catch(() => showNotif('Gagal memutar. Cek URL lagu.', 'error'));
    return; // updatePlayUI dipanggil di .then()
  }
  updatePlayUI();
}

function updatePlayUI() {
  document.getElementById('play-icon').style.display = isPlaying ? 'none' : 'block';
  document.getElementById('pause-icon').style.display = isPlaying ? 'block' : 'none';

  // Equalizer — toggle class "playing" untuk aktifkan animasi CSS
  const eq = document.getElementById('equalizer');
  if (isPlaying) {
    eq.classList.add('playing');
  } else {
    eq.classList.remove('playing');
  }
}

function prevTrack() {
  currentTrackIdx = (currentTrackIdx - 1 + songs.length) % songs.length;
  loadTrack();
  if (isPlaying) audioPlayer.play().catch(() => {});
  renderTrackDropdown();
}

function nextTrack() {
  currentTrackIdx = (currentTrackIdx + 1) % songs.length;
  loadTrack();
  if (isPlaying) audioPlayer.play().catch(() => {});
  renderTrackDropdown();
}

function setVolume(v) { if (audioPlayer) audioPlayer.volume = v; }

function updateProgress() {
  if (!audioPlayer || !audioPlayer.duration) return;
  const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('time-current').textContent = formatTime(audioPlayer.currentTime);
}

function seekAudio(e) {
  if (!audioPlayer || !audioPlayer.duration) return;
  const wrap = document.getElementById('progress-wrap');
  const rect = wrap.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = pct * audioPlayer.duration;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function toggleTrackMenu(e) {
  e.stopPropagation();
  document.getElementById('track-dropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.music-track-select')) {
    document.getElementById('track-dropdown').classList.remove('open');
  }
});

// ===== MODAL =====
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
window.openModal = openModal;
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'modal-order') resetOrderModalState();
}

function resetOrderModalState() {
  stopPaymentCountdown();
  stopStatusPolling();
  orderTransactionId = null;
  orderExpiredAt = null;
  currentOrderPayment = null;
  currentOrderProduct = null;
  currentOrderPackages = [];
  currentSelectedPackageIndex = 0;
  currentOrderLink = '';
  const wrap = document.getElementById('order-qris-wrap');
  if (wrap) wrap.innerHTML = '';
  const btn = document.getElementById('btn-order-go');
  if (btn) {
    btn.style.display = '';
    btn.disabled = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Hubungi Sekarang';
  }
  const cancelBtn = document.getElementById('btn-order-cancel');
  if (cancelBtn) { cancelBtn.style.display = 'none'; cancelBtn.textContent = 'Batalkan Pembelian'; }
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ===== NOTIF =====
let notifTimer;
function showNotif(msg, type='success') {
  const el = document.getElementById('notif');
  document.getElementById('notif-text').textContent = msg;
  el.className = 'notif notif-' + type + ' show';
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ===== SCROLL REVEAL OBSERVER =====
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => observer.observe(el));
  setTimeout(() => els.forEach(el => el.classList.add('visible')), 900);
}

// Apply reveal to product cards dynamically
function applyRevealToCards() {
  document.querySelectorAll('.product-card').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.transitionDelay = (i % 4 * 0.07) + 's';
    card.classList.remove('visible');
  });
  setTimeout(initScrollReveal, 50);
}

// ===== BACKGROUND PARTICLES =====
function initParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
  const colors = ['rgba(79,140,255,0.4)', 'rgba(120,80,255,0.35)', 'rgba(255,79,140,0.25)', 'rgba(79,200,255,0.3)'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'left:' + Math.random() * 100 + '%',
      'background:' + colors[Math.floor(Math.random() * colors.length)],
      'animation-duration:' + (Math.random() * 14 + 10) + 's',
      'animation-delay:' + (Math.random() * 10) + 's',
    ].join(';');
    container.appendChild(p);
  }
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initScrollReveal();
});

window.applyRevealToCards = applyRevealToCards;

window.showNotif = showNotif;

// ===== ANNOUNCEMENTS SYSTEM =====
let announcements = [];

async function loadAnnouncements() {
  try {
    const snap = await getDocs(collection(db, "announcements"));
    announcements = [];
    snap.forEach(d => announcements.push({ id: d.id, ...d.data() }));
    announcements.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  } catch(e) {
    announcements = [];
  }
}

function getAnnIcon(type) {
  const icons = {
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ab0ff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    danger:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  return icons[type] || icons.info;
}

function getAnnLabel(type) {
  return { info:'Info', warning:'Peringatan', success:'Update', danger:'Penting' }[type] || 'Info';
}

function openAnnPopup() {
  const active = announcements.filter(a => a.active !== false);
  const popup = document.getElementById('ann-overlay');
  const list = document.getElementById('ann-list');

  if (!active.length) {
    list.innerHTML = `<div class="ann-empty">
      <div class="ann-empty-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      Tidak ada notifikasi saat ini
    </div>`;
  } else {
    list.innerHTML = active.map(a => `
      <div class="ann-item">
        <div class="ann-item-icon ann-item-icon-${a.type||'info'}">${getAnnIcon(a.type||'info')}</div>
        <div class="ann-item-body">
          <div class="ann-item-title">${escHtml(a.title||'')}</div>
          <div class="ann-item-msg">${escHtml(a.msg||'').replace(/\n/g,'<br>')}</div>
          <div class="ann-item-time">${formatAnnDate(a.createdAt)}</div>
        </div>
      </div>
    `).join('');
  }

  // Update header icon/badge based on highest priority type
  const priority = ['danger','warning','success','info'];
  const topType = priority.find(t => active.some(a => a.type === t)) || 'info';
  document.getElementById('ann-main-icon').className = 'ann-icon ann-icon-' + topType;
  document.getElementById('ann-main-icon').innerHTML = getAnnIconLarge(topType);
  document.getElementById('ann-main-badge').className = 'ann-badge ann-badge-' + topType;
  document.getElementById('ann-main-badge').innerHTML = getBadgeInner(topType);
  document.getElementById('ann-main-title').textContent = active.length ? (active[0].title || 'Pemberitahuan') : 'Tidak Ada Notifikasi';
  document.getElementById('ann-main-meta').textContent = `${active.length} pemberitahuan aktif · ALIFTZY STORE`;

  popup.classList.add('open');
}

function getAnnIconLarge(type) {
  const icons = {
    info:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0ff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 14 8 12"/></svg>`,
    danger:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  };
  return icons[type] || icons.info;
}

function getBadgeInner(type) {
  const svgBell = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
  return svgBell + ' ' + getAnnLabel(type);
}

function closeAnnPopup() {
  document.getElementById('ann-overlay').classList.remove('open');
}

// Close on overlay click
document.getElementById('ann-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeAnnPopup();
});

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatAnnDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function updateBellDot() {
  const active = announcements.filter(a => a.active !== false);
  const dot = document.getElementById('nav-bell-dot');
  if (dot) dot.classList.toggle('show', active.length > 0);
}

function showBellIcon(show) {
  const bell = document.getElementById('nav-bell');
  if (bell) bell.classList.toggle('hidden', !show);
}

window.openAnnPopup = openAnnPopup;
window.closeAnnPopup = closeAnnPopup;

// ===== HOME DASHBOARD TABS (SWIPE) =====
function switchHomeTab(idx) {
  currentHomeTab = idx;
  const slider = document.getElementById('home-sections-slider');
  if (slider) slider.style.transform = `translateX(-${idx * 25}%)`;
  document.querySelectorAll('.home-nav-tab').forEach((t,i) => t.classList.toggle('active', i === idx));
  // Load orders on demand
  if (idx === 1) loadMyOrders();
}

// Touch swipe support for home sections
(function() {
  let startX = 0, startY = 0, isDragging = false;
  document.addEventListener('touchstart', e => {
    const wrap = document.getElementById('home-sections-wrap');
    if (!wrap || !wrap.contains(e.target)) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const wrap = document.getElementById('home-sections-wrap');
    if (!wrap) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < Math.abs(dy) * 1.5 || Math.abs(dx) < 40) return;
    if (dx < 0 && currentHomeTab < 3) switchHomeTab(currentHomeTab + 1);
    if (dx > 0 && currentHomeTab > 0) switchHomeTab(currentHomeTab - 1);
  }, { passive: true });
})();

// ===== MY ORDERS =====
async function loadMyOrders() {
  if (!currentUser) return;
  const container = document.getElementById('my-orders-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);font-size:13px;"><div class="spinner" style="margin:0 auto 10px;"></div>Memuat pesanan...</div>';
  try {
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    myOrders = [];
    snap.forEach(d => myOrders.push({ id: d.id, ...d.data() }));
    renderMyOrders();
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);font-size:13px;">Gagal memuat pesanan. Coba lagi.</div>';
  }
}

function renderMyOrders() {
  const container = document.getElementById('my-orders-list');
  if (!container) return;
  if (!myOrders.length) {
    container.innerHTML = `<div class="orders-empty">
      <div class="orders-empty-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div>Belum ada pesanan</div>
      <div style="font-size:12px;margin-top:6px;">Pesanan akan muncul setelah pembayaran dikonfirmasi</div>
    </div>`;
    return;
  }
  container.innerHTML = myOrders.map(o => {
    const hasDelivery = o.deliveredEmail || o.deliveredPassword;
    return `<div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-card-name">${escHtml(o.productName || 'Produk')}</div>
          <div class="order-card-date">${o.createdAt ? formatAnnDate(o.createdAt) : '-'}</div>
        </div>
        <span class="order-status-chip ${hasDelivery ? 'order-status-delivered' : 'order-status-pending'}">
          ${hasDelivery ? 'Terkirim' : 'Menunggu'}
        </span>
      </div>
      <div style="font-size:12.5px;color:var(--text2);">Rp${Number(o.price||0).toLocaleString('id-ID')} / bulan</div>
      ${hasDelivery ? `<div class="order-delivered-box">
        <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--success);letter-spacing:0.1em;margin-bottom:8px;">✓ AKUN DIKIRIM</div>
        ${o.deliveredEmail ? `<div class="order-delivered-row"><span class="order-delivered-label">Email</span><span class="order-delivered-val">${escHtml(o.deliveredEmail)}</span></div>` : ''}
        ${o.deliveredPassword ? `<div class="order-delivered-row"><span class="order-delivered-label">Password</span><span class="order-delivered-val">${escHtml(o.deliveredPassword)}</span></div>` : ''}
        ${o.deliveredLoginUrl ? `<div class="order-delivered-row"><span class="order-delivered-label">Login URL</span><a href="${escHtml(o.deliveredLoginUrl)}" target="_blank" rel="noopener" class="order-delivered-val" style="color:var(--accent);">${escHtml(o.deliveredLoginUrl)}</a></div>` : ''}
        ${o.deliveredNote ? `<div class="order-delivered-row"><span class="order-delivered-label">Catatan</span><span class="order-delivered-val">${escHtml(o.deliveredNote)}</span></div>` : ''}
      </div>` : ''}
    </div>`;
  }).join('');
}

// ===== STOCK SYSTEM =====

// Load stock untuk display publik (hanya jumlah tersedia)
async function loadStockPublic() {
  try {
    const snap = await getDocs(collection(db, "stock"));
    stockItems = [];
    snap.forEach(d => stockItems.push({ id: d.id, ...d.data() }));
  } catch(e) {
    stockItems = [];
  }
}

