// ===== FIREBASE CONFIG & INIT =====
// Catatan: apiKey Firebase di bawah ini MEMANG publik by design (bukan secret).
// Web apps Firebase selalu mengirim config ini ke browser klien.
// Yang menjaga keamanan data adalah Firestore Security Rules (diatur di Firebase Console),
// bukan menyembunyikan config ini. Jangan taruh secret/API key lain (mis. SITRANSFER_KEY) di sini.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXiLMf3C6mqMTNfIWwMYRf9nTeYJjYx8E",
  authDomain: "aliftzy-store.firebaseapp.com",
  projectId: "aliftzy-store",
  storageBucket: "aliftzy-store.firebasestorage.app",
  messagingSenderId: "261265881032",
  appId: "1:261265881032:web:f8ca312b8f6e2c9c78f2fd",
  measurementId: "G-N09N17CCQF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
