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


    const body = JSON.parse(raw);

    const amount = body.amount;
    const username = body.username;


    if (!amount || !username) {
      return res.status(400).json({
        error: "amount dan username wajib diisi"
      });
    }


    const response = await fetch(
      "https://rest.sitranfer.com/payment/api/generate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          channel: "QRIS",

          amount: Number(amount),

          player_username: username,

          key: process.env.SITRANSFER_KEY

        })
      }
    );


    const result = await response.json();


    return res.status(200).json(result);


  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }

}
