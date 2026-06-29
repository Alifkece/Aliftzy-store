export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }


  let body = {};

try {
  body = JSON.parse(req.body);
} catch {
  body = req.body || {};
}


    const {
      amount,
      username
    } = body || {};


    if (!amount || !username) {
      return res.status(400).json({
        error: "amount dan username wajib diisi",
        received: body
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

          key: process.env.SITRANSFER_KEY,

          channel: "QRIS",

          amount: Number(amount),

          player_username: username

        })
      }
    );


    const result = await response.json();


    return res.status(200).json(result);


  } catch (error) {


    return res.status(500).json({
      error: error.message
    });


  }

}
