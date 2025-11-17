import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

type OrderItem = {
  sku: string;
  quantity: number;
  name?: string;
  unitPrice?: number;
};

function toNum(v: any) {
  return Number(v ?? 0);
}

export async function loader() {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const orders = await db.collection("Orders").find({}).sort({ orderDate: -1 }).toArray();

  return new Response(JSON.stringify(orders), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const method = request.method.toUpperCase();

  // --- Helper: check if inventory has enough for required qty ---
  async function checkAvailability(reqMap: Record<string, number>) {
    const insufficient: Array<{ sku: string; have: number; need: number }> = [];

    for (const sku of Object.keys(reqMap)) {
      const need = reqMap[sku];
      const inv = await db.collection("Inventory").findOne({ sku });
      const have = inv ? toNum(inv.stock) : 0;
      if (have < need) insufficient.push({ sku, have, need });
    }

    return { ok: insufficient.length === 0, insufficient };
  }

  // --- Helper: adjust inventory ---
  async function applyInventoryDeltas(deltaMap: Record<string, number>) {
    for (const sku of Object.keys(deltaMap)) {
      const delta = deltaMap[sku];
      await db.collection("Inventory").updateOne(
        { sku },
        { $inc: { stock: delta } }
      );
      console.log(`Inventory ${sku} updated by ${delta}`);
    }
  }

  /* =====================================================================
     POST (CREATE ORDER)
     - Deduct inventory immediately for new order
     ===================================================================== */
  if (method === "POST") {
    const body = await request.json();
    const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];

    // Build required map
    const needMap: Record<string, number> = {};
    for (const it of items) {
      const qty = Math.max(0, toNum(it.quantity));
      needMap[it.sku] = (needMap[it.sku] || 0) + qty;
    }

    // Check availability
    const avail = await checkAvailability(needMap);
    if (!avail.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: "Insufficient stock",
        details: avail.insufficient
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Insert order as Pending
    const order = {
  customerName: body.customerName,
  orderDate: body.orderDate,
  items,
  totalAmount: Number(body.totalAmount || 0),
  status: body.status ?? "Pending", // <-- allow Completed
  createdAt: new Date(),
};

    const insertResult = await db.collection("Orders").insertOne(order);

    // Deduct inventory immediately
    const deltaMap: Record<string, number> = {};
    for (const sku of Object.keys(needMap)) deltaMap[sku] = -needMap[sku];
    await applyInventoryDeltas(deltaMap);

    return new Response(JSON.stringify({ success: true, id: insertResult.insertedId }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /* =====================================================================
   PUT (UPDATE ORDER)
   - Treat Pending & Processing as reserved
   - Delta = oldReserved - newReserved
   ===================================================================== */
if (method === "PUT") {
  console.log("📩 PUT / Update Order");
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ success: false, message: "Missing order ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const newStatus: string = body.status ?? "Pending";
  const newItems: OrderItem[] = Array.isArray(body.items) ? body.items : [];

  const orderId = new ObjectId(String(id));
  const oldOrder = await db.collection("Orders").findOne({ _id: orderId });

  if (!oldOrder) {
    return new Response(JSON.stringify({ success: false, message: "Order not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const oldStatus: string = oldOrder.status ?? "Pending";
  const oldItems: OrderItem[] = Array.isArray(oldOrder.items) ? oldOrder.items : [];

  // Helper to build map sku -> qty from items array
  const buildMap = (arr: OrderItem[]) => {
    const m: Record<string, number> = {};
    for (const it of arr) {
      m[it.sku] = (m[it.sku] || 0) + Math.max(0, toNum(it.quantity));
    }
    return m;
  };

  const oldMap = buildMap(oldItems);
  const newMap = buildMap(newItems);

  console.log("Old status:", oldStatus, "New status:", newStatus);
  console.log("OldMap:", oldMap, "NewMap:", newMap);

  // Compute delta for inventory adjustments
  const deltaMap: Record<string, number> = {};
  const allSkus = new Set<string>([...Object.keys(oldMap), ...Object.keys(newMap)]);
  for (const sku of allSkus) {
    // Treat Pending and Processing as reserved
  // Treat Pending, Processing, and Completed as reserved
const oldReserved = (oldStatus === "Pending" || oldStatus === "Processing" || oldStatus === "Completed") 
    ? (oldMap[sku] || 0) : 0;

const newReserved = (newStatus === "Pending" || newStatus === "Processing" || newStatus === "Completed") 
    ? (newMap[sku] || 0) : 0;

    const delta = oldReserved - newReserved; // positive -> add back, negative -> subtract
    if (delta !== 0) deltaMap[sku] = delta;
  }

  console.log("Computed inventory deltaMap:", deltaMap);

  // Check if negative deltas exceed current stock
  const requiredToSubtract: Record<string, number> = {};
  for (const sku of Object.keys(deltaMap)) {
    const change = deltaMap[sku];
    if (change < 0) requiredToSubtract[sku] = Math.abs(change);
  }

  if (Object.keys(requiredToSubtract).length > 0) {
    const avail = await checkAvailability(requiredToSubtract);
    if (!avail.ok) {
      console.warn("❌ PUT - insufficient stock for update", avail.insufficient);
      return new Response(JSON.stringify({
        success: false,
        message: "Insufficient stock for update",
        details: avail.insufficient
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  }

  // Update order in DB
  const updateData = {
    customerName: body.customerName,
    orderDate: body.orderDate,
    items: newItems,
    totalAmount: Number(body.totalAmount || 0),
    status: newStatus,
    updatedAt: new Date(),
  };

  const result = await db.collection("Orders").updateOne(
    { _id: orderId },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    return new Response(JSON.stringify({ success: false, message: "Order not found (concurrent?)" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Apply inventory changes
  if (Object.keys(deltaMap).length > 0) {
    await applyInventoryDeltas(deltaMap);
    console.log("✅ PUT inventory deltas applied");
  } else {
    console.log("No inventory changes required for PUT");
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}


  /* =====================================================================
     DELETE (REMOVE ORDER)
     - Restore inventory if Pending (deducted) or Processing
     ===================================================================== */
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ success: false, message: "Missing order ID" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const orderId = new ObjectId(id);
    const order = await db.collection("Orders").findOne({ _id: orderId });
    if (!order) return new Response(JSON.stringify({ success: false, message: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    // Restore inventory if previously deducted
    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const restoreMap: Record<string, number> = {};
    for (const it of items) restoreMap[it.sku] = (restoreMap[it.sku] || 0) + toNum(it.quantity);

    await applyInventoryDeltas(restoreMap);
    await db.collection("Orders").deleteOne({ _id: orderId });

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: false, message: "Unsupported method" }), { status: 405, headers: { "Content-Type": "application/json" } });
}
