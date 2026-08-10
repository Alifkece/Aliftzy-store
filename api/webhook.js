import { validateStockAndDeliver, markOrderTerminalStatus } from "../lib/orders.js";
import { verifyWebhookSignature } from "../lib/casaku.js";

// MIGRASI PAYMENT GATEWAY: SiTransfer -> Casaku (lihat lib/casaku.js).
//
// CATATAN: endpoint ini (project Store) TIDAK dipanggil oleh Frontend Store
// saat ini — payment production berjalan lewat project backend terpisah
// (https://aliftzy-backend.vercel.app/webhook). File ini tetap dimigrasikan
// atas permintaan pemilik project supaya tidak ada endpoint live yang masih
// bergantung pada SiTransfer.
//
// WAJIB verifikasi signature (HMAC-SHA256 atas RAW body + header
// X-Casaku-Signature) SEBELUM memproses apa pun.
//
// bodyParser Vercel DIMATIKAN (lihat `config` di bawah) supaya raw body
// bisa dibaca apa adanya — signature Casaku dihitung dari raw body sebelum
// di-parse. Versi SiTransfer lama file ini memakai `req.text()`, yang
// sebenarnya TIDAK didukung di Node.js Serverless Function (bukan Edge) -
// diganti dengan pembacaan stream manual yang konsisten dengan endpoint
// lain di project ini (mis. api/auth/verify-otp.js).
//
// Payload Casaku (event "paid"): { transactionId, amount, packageName,
// appName, status, paidAt } - berbeda dari struktur SiTransfer
// ({ success, data: { transaction_id, status, type } }), jadi field yang
// dibaca menyesuaikan.
//
// Logic validateStockAndDeliver/markOrderTerminalStatus di lib/orders.js
// TIDAK DIUBAH - fungsi itu sudah idempotent terhadap webhook duplicate
// (cek order.status === "PAID" / "PAID_OUT_OF_STOCK" sebelum memproses).

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (err) {
    console.error("WEBHOOK: gagal membaca raw body:", err.message);
    return res.status(400).json({ error: "Gagal membaca body" });
  }

  const signature = req.headers["x-casaku-signature"];
  const isValidSignature = verifyWebhookSignature(raw, signature);

  if (!isValidSignature) {
    console.error("WEBHOOK: signature TIDAK VALID — request ditolak.");
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const body = JSON.parse(raw || "{}");

    console.log("WEBHOOK CASAKU RECEIVED:", body);

    const trx = body?.transactionId;

    if (!trx) {
      return res.status(400).json({
        error: "transactionId tidak ditemukan"
      });
    }

    const status = String(body?.status || "").toLowerCase();
    const isSuccess = status === "paid";

    if (!isSuccess) {
      // Casaku hanya mengirim webhook untuk status "paid" (lihat
      // dokumentasi resmi) - status lain (expired/cancel) tidak pernah
      // masuk lewat webhook ini, tapi kode ini tetap aman kalau suatu saat
      // Casaku menambah event lain.
      if (status === "failed" || status === "expired" || status === "cancel") {
        try {
          await markOrderTerminalStatus(trx, status.toUpperCase());
        } catch (err) {
          console.error("WEBHOOK: gagal update status terminal:", trx, err);
        }
      }

      return res.status(200).json({
        message: "Not paid or invalid payload"
      });
    }

    const paymentType = body?.appName || body?.packageName || "casaku";

    // Validasi ulang stok + auto delivery (Firestore transaction,
    // race-condition safe, idempotent terhadap webhook retry)
    const result = await validateStockAndDeliver(trx, paymentType);

    if (!result.ok && result.reason === "ORDER_NOT_FOUND") {
      console.error("WEBHOOK: order tidak ditemukan untuk transactionId", trx);
      return res.status(200).json({
        status: "ok",
        message: "order not found, ignored"
      });
    }

    if (result.reason === "OUT_OF_STOCK_ON_PAYMENT") {
      console.error(
        "WEBHOOK: pembayaran sukses tapi stok habis saat validasi ulang untuk",
        trx
      );
    }

    console.log("ORDER UPDATED:", trx, result.reason);

    return res.status(200).json({
      status: "ok",
      message: "payment processed",
      detail: result.reason
    });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
