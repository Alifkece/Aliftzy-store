 export default async function handler(req,res){

 if(req.method !== "POST"){
  return res.status(405).json({
   message:"Method not allowed"
  });
 }


 try {

 const body = req.body || {};

 console.log("BODY:", body);


 const amount = body.amount;
 const username = body.username;


 if(!amount || !username){
  return res.status(400).json({
   error:"amount atau username kosong",
   body:body
  });
 }


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


 return res.status(200).json(result);


 } catch(error){

 return res.status(500).json({
  error:error.message
 });

 }

 }
