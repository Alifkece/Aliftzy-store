import { db } from "./firebase.js";
import admin from "firebase-admin";

const FieldValue = admin.firestore.FieldValue;

/**
 * Logika stok/order/auto-delivery ini SENGAJA disamakan persis dengan
 * lib/orders.js di project backend (Railway) — supaya endpoint mana pun
 * yang menerima request (Railway atau Vercel), aturannya identik:
 * cek stok sebelum generate QRIS, validasi ulang stok + auto delivery
 * secara atomik saat webhook pembayaran sukses.
 */

export async function getAvailableStockCount(productId) {
  const snap = await db
    .collection("stock")
    .where("productId", "==", productId)
    .where("sold", "==", false)
    .count()
    .get();

  return snap.data().count || 0;
}

export async function createPendingOrder({
  transactionId,
  userId,
  username,
  productId,
  productName,
  price,
  packageName,
  expiredAt
}) {
  const orderRef = db.collection("orders").doc(transactionId);

  await orderRef.set(
    {
      userId: userId || null,
      username: username || null,
      productId,
      productName: productName || null,
      price: Number(price) || 0,
      packageName: packageName || null,
      status: "PENDING",
      deliveryStatus: "PENDING",
      payment: null,
      createdAt: FieldValue.serverTimestamp(),
      paidAt: null,
      expiredAt: expiredAt || null
    },
    { merge: true }
  );

  return orderRef;
}

export async function getOrder(transactionId) {
  const snap = await db.collection("orders").doc(transactionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function validateStockAndDeliver(transactionId, paymentType) {
  const orderRef = db.collection("orders").doc(transactionId);

  return db.runTransaction(async (t) => {
    const orderSnap = await t.get(orderRef);

    if (!orderSnap.exists) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }

    const order = orderSnap.data();

    if (order.status === "PAID" || order.status === "PAID_OUT_OF_STOCK") {
      return { ok: true, reason: "ALREADY_PROCESSED", order };
    }

    const stockQuery = db
      .collection("stock")
      .where("productId", "==", order.productId)
      .where("sold", "==", false)
      .limit(1);

    const stockSnap = await t.get(stockQuery);

    if (stockSnap.empty) {
      t.update(orderRef, {
        status: "PAID_OUT_OF_STOCK",
        deliveryStatus: "NEEDS_ADMIN_ACTION",
        payment: paymentType || null,
        paidAt: FieldValue.serverTimestamp()
      });
      return { ok: true, reason: "OUT_OF_STOCK_ON_PAYMENT" };
    }

    const stockDoc = stockSnap.docs[0];
    const stockData = stockDoc.data();

    t.update(stockDoc.ref, {
      sold: true,
      orderId: transactionId,
      soldAt: FieldValue.serverTimestamp()
    });

    t.update(orderRef, {
      status: "PAID",
      deliveryStatus: "DELIVERED",
      payment: paymentType || null,
      paidAt: FieldValue.serverTimestamp(),
      deliveredEmail: stockData.email || null,
      deliveredPassword: stockData.password || null,
      deliveredLoginUrl: stockData.loginUrl || null,
      deliveredNote: stockData.note || null
    });

    return { ok: true, reason: "DELIVERED" };
  });
}

export async function markOrderTerminalStatus(transactionId, status) {
  const orderRef = db.collection("orders").doc(transactionId);
  const snap = await orderRef.get();
  if (!snap.exists) return null;

  const current = snap.data();
  if (current.status === "PAID" || current.status === "PAID_OUT_OF_STOCK") {
    return current;
  }
  if (current.status === status) {
    return current;
  }

  await orderRef.update({ status });
  return { ...current, status };
}
