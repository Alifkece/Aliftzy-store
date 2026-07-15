import { validateStockAndDeliver, markOrderTerminalStatus } from "../lib/orders.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔥 FIX VERCEL: ambil raw body biar gak undefined
    const raw = await req.text();
    const body = JSON.parse(raw || "{}");

    console.log("WEBHOOK RECEIVED:", body);

    const trx = body?.data?.transaction_id;

    if (!trx) {
      return res.status(400).json({
        error: "transaction_id tidak ditemukan"
      });
    }

    const status = String(body?.data?.status || "").toLowerCase();

    // 🔥 VALIDASI DATA DARI SITRANSFER
    const isSuccess = body?.success === true && status === "success";

    if (!isSuccess) {
      // Sinkronkan status order untuk status terminal lain (failed/expired)
      // supaya order tidak stuck PENDING selamanya.
      if (status === "failed" || status === "expired") {
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

    const paymentType = body?.data?.type || "unknown";

    // 🔥 VALIDASI ULANG STOK + AUTO DELIVERY (Firestore transaction,
    // race-condition safe, idempotent terhadap webhook retry)
    const result = await validateStockAndDeliver(trx, paymentType);

    if (!result.ok && result.reason === "ORDER_NOT_FOUND") {
      console.error("WEBHOOK: order tidak ditemukan untuk transaction_id", trx);
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
