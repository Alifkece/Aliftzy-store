import { db } from "../lib/firebase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔥 FIX VERCEL: ambil raw body biar gak undefined
    const raw = await req.text();
    const body = JSON.parse(raw || "{}");

    console.log("WEBHOOK RECEIVED:", body);

    // 🔥 VALIDASI DATA DARI SITRANSFER
    const isSuccess =
      body?.success === true &&
      body?.data?.status === "success";

    if (!isSuccess) {
      return res.status(200).json({
        message: "Not paid or invalid payload"
      });
    }

    const trx = body?.data?.transaction_id;
    const paymentType = body?.data?.type || "unknown";

    if (!trx) {
      return res.status(400).json({
        error: "transaction_id tidak ditemukan"
      });
    }

    // 🔥 UPDATE ORDER DI FIREBASE
    await db.collection("orders")
      .doc(trx)
      .update({
        status: "PAID",
        payment: paymentType,
        paidAt: new Date()
      });

    console.log("ORDER UPDATED TO PAID:", trx);

    return res.status(200).json({
      status: "ok",
      message: "payment processed"
    });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
