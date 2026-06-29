export default async function handler(req,res){

 if(req.method !== "POST"){
  return res.status(405).json({
   message:"Method not allowed"
  });
 }


 const {amount, username} = req.body;


 const response = await fetch(
 "https://rest.sitranfer.com/payment/api/generate",
 {
  method:"POST",
  headers:{
   "Content-Type":"application/json"
  },
  body:JSON.stringify({

   key: process.env.SITRANSFER_KEY,

   channel:"QRIS",

   amount:amount,

   player_username:username

  })
 });


 const result = await response.json();


 res.status(200).json(result);

}
