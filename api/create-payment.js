import { getAvailableStockCount, createPendingOrder } from "../lib/orders.js";

const SITRANSFER_GENERATE_URL = "https://rest.sitranfer.com/payment/api/generate";

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

    // productId wajib supaya stok bisa divalidasi sebelum QRIS dibuat,
    // sama seperti aturan di backend Railway.
    if (!productId) {
      return res.status(400).json({
        error: "productId wajib diisi untuk validasi stok"
      });
    }

    const cleanAmount = Number(amount);
    if (!cleanAmount || isNaN(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({
        error: "amount tidak valid"
      });
    }

    // ===== CEK STOK SEBELUM GENERATE QRIS =====
    let availableStock;
    try {
      availableStock = await getAvailableStockCount(productId);
    } catch (err) {
      return res.status(500).json({
        error: "Gagal memeriksa stok, coba lagi"
      });
    }

    if (availableStock <= 0) {
      // Stok kosong: jangan generate QRIS, jangan buat order, jangan panggil
      // payment gateway sama sekali.
      return res.status(409).json({
        success: false,
        outOfStock: true,
        error: "Stok habis"
      });
    }

    const key = process.env.SITRANSFER_KEY;


    if (!key) {
      return res.status(500).json({
        error: "SITRANSFER_KEY tidak terbaca di Vercel"
      });
    }


    const response = await fetch(
      SITRANSFER_GENERATE_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          channel: "QRIS",
          amount: cleanAmount,
          player_username: username,
          key: key
        })
      }
    );


    const result = await response.json();

    if (!response.ok || result?.success === false || result?.error) {
      return res.status(response.ok ? 400 : response.status).json(result);
    }

    const data = result.data || result;
    const transactionId = data.transaction_id;

    if (transactionId) {
      try {
        await createPendingOrder({
          transactionId,
          userId,
          username,
          productId,
          productName,
          price: cleanAmount,
          packageName,
          expiredAt: data.expired_at || null
        });
      } catch (err) {
        console.error("GAGAL SIMPAN ORDER PENDING:", transactionId, err);
      }
    }

    return res.status(200).json(result);


  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }

}
