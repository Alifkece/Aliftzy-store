import admin from "firebase-admin";
import "../../lib/firebase.js"; // memastikan admin.initializeApp() sudah jalan
import { grantFirstSessionIfNew } from "../../lib/otp.js";

/**
 * Dipanggil frontend SEKALI, tepat setelah createUserWithEmailAndPassword
 * berhasil (lihat js/app.js handleRegister + runOtpGate), supaya user
 * yang baru saja daftar langsung masuk ke toko tanpa perlu OTP dulu.
 *
 * Keamanannya dijaga di lib/otp.js grantFirstSessionIfNew(): endpoint ini
 * cuma akan berhasil kalau uid tersebut memang belum pernah punya sesi
 * OTP sama sekali (benar-benar akun baru). Kalau dipanggil lagi untuk uid
 * yang sama nanti-nanti, akan selalu ditolak — jadi tidak bisa dipakai
 * untuk melewati OTP di login-login berikutnya.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: "Token tidak ditemukan" });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "Token tidak valid" });
    }

    const result = await grantFirstSessionIfNew(decoded.uid, decoded.auth_time);
    return res.status(200).json({ granted: result.ok });
  } catch (err) {
    console.error("register-session error:", err);
    // Gagal-aman: kalau error, anggap TIDAK granted supaya jatuh balik ke
    // alur OTP normal (check-session), bukan malah membuka akses.
    return res.status(200).json({ granted: false });
  }
}
