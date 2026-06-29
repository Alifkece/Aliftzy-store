import { db } from "../lib/firebase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔥 FIX VERCEL BODY ISSUE
    const raw = await req.text();
    const body = JSON.parse(raw || "{}");

    console.log("WEBHOOK INCOMING:", body);

    // 🔥 CEK STATUS PAYMENT
    if (
      body?.success === true &&
      body?.data?.status === "success"
    ) {
      const trx = body?.data?.transaction_id;

      if (!trx) {
        return res.status(400).json({
          error: "transaction_id tidak ada"
        });
      }

      // 🔥 UPDATE FIREBASE ORDER
      await db.collection("orders")
        .doc(trx)
        .update({
          status: "PAID",
          payment: body.data.type || "unknown",
          paidAt: new Date()
        });

      console.log("ORDER SUCCESS:", trx);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
    console.log("ORDER LUNAS:", trx);

  }


  res.status(200).json({
    status:"ok"
  });

}
