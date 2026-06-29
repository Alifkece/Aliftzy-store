import { db } from "../lib/firebase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const amount = Number(body.amount);
    const username = body.username;
    const product = body.product || "unknown";

    if (!amount || !username) {
      return res.status(400).json({
        error: "amount atau username kosong",
        body
      });
    }

    // 🔥 1. buat transaction id
    const transaction_id =
      "trx_" + Date.now() + "_" + Math.floor(Math.random() * 9999);

    // 🔥 2. simpan order ke firebase dulu (PENDING)
    await db.collection("orders")
      .doc(transaction_id)
      .set({
        transaction_id,
        username,
        amount,
        product,
        status: "PENDING",
        createdAt: new Date(),
        paidAt: null
      });

    // 🔥 3. request ke Sitranfer
    const response = await fetch(
      "https://rest.sitranfer.com/payment/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: process.env.SITRANSFER_KEY,
          channel: "QRIS",
          amount,
          player_username: username,
          order_id: transaction_id
        })
      }
    );

    const result = await response.json();

    console.log("CREATE PAYMENT RESULT:", result);

    // 🔥 4. kirim balik ke frontend + transaction id
    return res.status(200).json({
      transaction_id,
      sitranfer: result
    });

  } catch (error) {
    console.error("CREATE PAYMENT ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
