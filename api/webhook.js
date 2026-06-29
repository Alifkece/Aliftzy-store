import { db } from "../lib/firebase.js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }


  const body = req.body;

  console.log("SiTransfer Callback:", body);


  if (
    body.success === true &&
    body.data.status === "success"
  ) {

    const trx = body.data.transaction_id;


    await db.collection("orders")
    .doc(trx)
    .update({

      status: "PAID",

      payment: body.data.type,

      paidAt: new Date()

    });


    console.log("ORDER LUNAS:", trx);

  }


  res.status(200).json({
    status:"ok"
  });

}
