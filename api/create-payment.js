import { getAvailableStockCount, createPendingOrder } from "../lib/orders.js";
import { generateQris, qrStringToImageDataUrl } from "../lib/casaku.js";

// MIGRASI PAYMENT GATEWAY: SiTransfer -> Casaku (lihat lib/casaku.js).
//
// CATATAN: endpoint ini (project Store) TIDAK dipanggil oleh js/app.js saat
// ini — Frontend Store selalu memakai https://aliftzy-backend.vercel.app
// (project backend terpisah). File ini tetap dimigrasikan atas permintaan
// pemilik project supaya tidak ada endpoint live yang masih bergantung pada
// SiTransfer, seandainya suatu saat dipakai lagi.
//
// Validasi stok, createPendingOrder, dan urutan logic lain TIDAK diubah -
// hanya pemanggilan payment gateway yang diganti. Bentuk response
// distandarkan mengikuti adapter yang sama dengan project backend
// ({ success, data: { qris_image, transaction_id, amount, expired_at } })
// supaya kedua endpoint konsisten kalau nanti dipakai kembali.

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }

  try {

    let raw = "";

    await new Promise((resolve) => {
      req.on("data", chunk => {
        raw += chunk;
      });

      req.on("end", resolve);
    });


    const body = JSON.parse(raw || "{}");

    const amount = body.amount;
    const username = body.username;
    const productId = body.productId;
    const productName = body.productName;
    const packageName = body.packageName;
    const userId = body.userId;


    if (!amount || !username) {
      return res.status(400).json({
        error: "amount dan username wajib diisi"
      });
    }

    // productId + packageName wajib supaya stok bisa divalidasi PER PAKET
    // sebelum QRIS dibuat (bukan cuma per productId) — kalau paket yang
    // dipilih buyer stoknya kosong, QRIS/order/pending TIDAK boleh dibuat
    // sekalipun paket lain dari produk yang sama masih ada stok.
    if (!productId) {
      return res.status(400).json({
        error: "productId wajib diisi untuk validasi stok"
      });
    }
    if (!packageName) {
      return res.status(400).json({
        error: "packageName wajib diisi untuk validasi stok"
      });
    }

    const cleanAmount = Number(amount);
    if (!cleanAmount || isNaN(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({
        error: "amount tidak valid"
      });
    }

    // ===== CEK STOK PER PAKET SEBELUM GENERATE QRIS =====
    let availableStock;
    try {
      availableStock = await getAvailableStockCount(productId, packageName);
    } catch (err) {
      return res.status(500).json({
        error: "Gagal memeriksa stok, coba lagi"
      });
    }

    if (availableStock <= 0) {
      // Stok paket ini kosong: jangan generate QRIS, jangan buat order,
      // jangan panggil payment gateway sama sekali — meskipun paket lain
      // dari produk yang sama masih tersedia.
      return res.status(409).json({
        success: false,
        outOfStock: true,
        error: "Stock paket ini sedang habis."
      });
    }

    let casakuTrx;
    try {
      casakuTrx = await generateQris(cleanAmount);
    } catch (casakuErr) {
      console.error("CASAKU GENERATE ERROR:", casakuErr.message, casakuErr.raw || "");
      return res.status(502).json({
        success: false,
        error: "Gagal membuat transaksi QRIS. Coba lagi sebentar lagi."
      });
    }

    const qrisImageDataUrl = await qrStringToImageDataUrl(casakuTrx.qrString);
    const expiredAt = new Date(
      Date.now() + casakuTrx.expiredInMinutes * 60 * 1000
    ).toISOString();

    if (casakuTrx.transactionId) {
      try {
        await createPendingOrder({
          transactionId: casakuTrx.transactionId,
          userId,
          username,
          productId,
          productName,
          price: casakuTrx.totalAmount,
          packageName,
          expiredAt
        });
      } catch (err) {
        console.error("GAGAL SIMPAN ORDER PENDING:", casakuTrx.transactionId, err);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        transaction_id: casakuTrx.transactionId,
        qris_image: qrisImageDataUrl,
        amount: casakuTrx.totalAmount,
        expired_at: expiredAt
      }
    });


  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }

}
