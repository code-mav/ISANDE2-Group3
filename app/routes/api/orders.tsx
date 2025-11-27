import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

function deductFromWarehouses(stockObj: any, amount: number) {
  const entries = Object.entries(stockObj)
    .map(([k, v]) => [k, Number(v ?? 0)] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  let remaining = amount;

  for (const [wh, qty] of entries) {
    if (remaining <= 0) break;
    const take = Math.min(qty, remaining);
    stockObj[wh] = qty - take;
    remaining -= take;
  }

  return stockObj;
}

function addBackToWarehouse(stockObj: any, warehouse: string, amount: number) {
  stockObj[warehouse] = (stockObj[warehouse] ?? 0) + amount;
  return stockObj;
}

type OrderItem = {
  sku: string;
  quantity: number;
  name?: string;
  unitPrice?: number;
  warehouseCode?: string;
};

type LogAction = "create" | "update" | "delete" | "order" | "stockrequest";

function toNum(v: any) {
  return Number(v ?? 0);
}

export async function loader() {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const orders = await db
    .collection("Orders")
    .find({})
    .sort({ orderDate: -1 })
    .toArray();

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
    const insufficient: Array<{
      sku: string;
      have: number;
      need: number;
    }> = [];

    for (const sku of Object.keys(reqMap)) {
      const need = reqMap[sku];
      // support keys like "SKU::WH" or just "SKU"
      const parts = sku.split("::");
      const skuOnly = parts[0];
      const wh = parts[1];
      const inv = await db.collection("Inventory").findOne({ sku: skuOnly });
      let have = 0;
      if (!inv) {
        have = 0;
      } else if (wh) {
        // check specific warehouse qty
        if (inv.stock && typeof inv.stock === "object") {
          have = Number(inv.stock[wh] ?? 0);
        } else {
          // no per-warehouse data, treat whole stock as available
          have = toNum(inv.stock);
        }
      } else {
        // total across warehouses
        if (inv && typeof inv.stock === "number") have = Number(inv.stock);
        else if (inv && typeof inv.stock === "object")
          have = (Object.values(inv.stock).map((v: any) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
        else have = 0;
      }

      if (have < need) insufficient.push({ sku: skuOnly, have, need });
    }

    return { ok: insufficient.length === 0, insufficient };
  }

  // --- Helper: adjust inventory + log as "order" action ---
  async function applyInventoryDeltas(
    deltaMap: Record<string, number>,
    note: string,
    orderId: string
  ) {
    const invCol = db.collection("Inventory");
    const logs = db.collection("AuditLogs");

    for (const sku of Object.keys(deltaMap)) {
      const delta = deltaMap[sku];
      // key may be "SKU::WH" or "SKU"
      const parts = sku.split("::");
      const skuOnly = parts[0];
      const wh = parts[1];
      const inv = await invCol.findOne({ sku: skuOnly });

      // Capture before stock (object if exists, else numeric)
      let beforeStock: number | Record<string, number> | null = null;
      if (inv) {
        beforeStock = typeof inv.stock === "object" ? inv.stock : inv.stock;
      }

      let stockObj = inv && typeof inv.stock === "object" ? { ...inv.stock } : { VL1: Number(inv?.stock ?? 0) };

      if (delta < 0) {
        const qty = Math.abs(delta);
        if (wh) {
          stockObj[wh] = Math.max(0, (stockObj[wh] ?? 0) - qty);
        } else {
          stockObj = deductFromWarehouses(stockObj, qty);
        }
      } else if (delta > 0) {
        if (wh) {
          stockObj = addBackToWarehouse(stockObj, wh, delta);
        } else {
          stockObj = addBackToWarehouse(stockObj, "VL1", delta);
        }
      }

      // Capture after stock (object)
      const afterStock = stockObj;

      // Calculate numeric delta for display
      const beforeNum = beforeStock !== null
        ? typeof beforeStock === "number"
          ? beforeStock
          : (Object.values(beforeStock).map((v: any) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0)
        : null;
      const afterNum = typeof afterStock === "object"
        ? (Object.values(afterStock).map((v: any) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0)
        : Number(afterStock);
      const numericDelta = beforeNum !== null ? afterNum - beforeNum : null;

      await invCol.updateOne({ sku: skuOnly }, { $set: { stock: stockObj } });

      await logs.insertOne({
        ts: new Date(),
        action: "order" as LogAction,
        sku: skuOnly,
        name: inv?.name ?? null,
        stockBefore: beforeStock,
        stockAfter: afterStock,
        delta: numericDelta,
        note,
        orderId,
        stockRequestId: null,
      });
    }
  }

  /* =====================================================================
     POST (CREATE ORDER)
     ===================================================================== */
  if (method === "POST") {
    const body = await request.json();
    const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];

    // Build required map
    const needMap: Record<string, number> = {};
    for (const it of items) {
      const qty = Math.max(0, toNum(it.quantity));
      const key = it.sku + (it.warehouseCode ? `::${it.warehouseCode}` : "");
      needMap[key] = (needMap[key] || 0) + qty;
    }

    // Check availability
    const avail = await checkAvailability(needMap);
    if (!avail.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient stock",
          details: avail.insufficient,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert order
    const order = {
      customerName: body.customerName,
      orderDate: body.orderDate,
      items,
      totalAmount: Number(body.totalAmount || 0),
      status: body.status ?? "Pending",
      createdAt: new Date(),
    };

    const insertResult = await db.collection("Orders").insertOne(order);

    // Deduct inventory + log
    const deltaMap: Record<string, number> = {};
    for (const sku of Object.keys(needMap)) deltaMap[sku] = -needMap[sku];

    await applyInventoryDeltas(
      deltaMap,
      `Order created (${insertResult.insertedId}) – status ${order.status} – (for ${order.customerName})`,
      insertResult.insertedId.toString()
    );

    return new Response(
      JSON.stringify({ success: true, id: insertResult.insertedId }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /* =====================================================================
     PUT (UPDATE ORDER)
     ===================================================================== */
  if (method === "PUT") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing order ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const newStatus: string = body.status ?? "Pending";
    const newItems: OrderItem[] = Array.isArray(body.items) ? body.items : [];

    const orderId = new ObjectId(String(id));
    const oldOrder = await db.collection("Orders").findOne({ _id: orderId });

    if (!oldOrder) {
      return new Response(
        JSON.stringify({ success: false, message: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const oldStatus = oldOrder.status ?? "Pending";
    const oldItems: OrderItem[] = Array.isArray(oldOrder.items)
      ? oldOrder.items
      : [];

    const buildMap = (arr: OrderItem[]) => {
      const m: Record<string, number> = {};
      for (const it of arr) {
        const key = it.sku + (it.warehouseCode ? `::${it.warehouseCode}` : "");
        m[key] = (m[key] || 0) + Math.max(0, toNum(it.quantity));
      }
      return m;
    };

    const oldMap = buildMap(oldItems);
    const newMap = buildMap(newItems);

    const deltaMap: Record<string, number> = {};
    const allSkus = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

    for (const sku of allSkus) {
      const oldReserved =
        ["Pending", "Processing", "Completed"].includes(oldStatus)
          ? oldMap[sku] || 0
          : 0;

      const newReserved =
        ["Pending", "Processing", "Completed"].includes(newStatus)
          ? newMap[sku] || 0
          : 0;

      const delta = oldReserved - newReserved;
      if (delta !== 0) deltaMap[sku] = delta;
    }

    const requiredToSubtract: Record<string, number> = {};
    for (const sku of Object.keys(deltaMap)) {
      if (deltaMap[sku] < 0) requiredToSubtract[sku] = Math.abs(deltaMap[sku]);
    }

    if (Object.keys(requiredToSubtract).length > 0) {
      const avail = await checkAvailability(requiredToSubtract);
      if (!avail.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Insufficient stock for update",
            details: avail.insufficient,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    await db.collection("Orders").updateOne(
      { _id: orderId },
      {
        $set: {
          customerName: body.customerName,
          orderDate: body.orderDate,
          items: newItems,
          totalAmount: Number(body.totalAmount || 0),
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    const logs = db.collection("AuditLogs");

    if (Object.keys(deltaMap).length > 0) {
      // Inventory + status change log
      await applyInventoryDeltas(
        deltaMap,
        `Order updated (${id}) – status ${oldStatus} → ${newStatus} – (for ${oldOrder.customerName})`,
        id
      );
    } else if (oldStatus !== newStatus) {
      // Status-only change log
      await logs.insertOne({
        ts: new Date(),
        action: "order" as LogAction,
        sku: null,
        name: null,
        stockBefore: null,
        stockAfter: null,
        delta: null,
        note: `Order status updated (${id}) – status ${oldStatus} → ${newStatus} – (for ${oldOrder.customerName})`,
        orderId: id,
        stockRequestId: null,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /* =====================================================================
     DELETE ORDER
     ===================================================================== */
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing order ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const orderId = new ObjectId(id);
    const order = await db.collection("Orders").findOne({ _id: orderId });
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const restoreMap: Record<string, number> = {};
    for (const it of order.items as OrderItem[]) {
      const key = it.sku + (it.warehouseCode ? `::${it.warehouseCode}` : "");
      restoreMap[key] = (restoreMap[key] || 0) + toNum(it.quantity);
    }

    await applyInventoryDeltas(
      restoreMap,
      `Order deleted (${id}) – inventory restored – (for ${order.customerName})`,
      id
    );

    await db.collection("Orders").deleteOne({ _id: orderId });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, message: "Unsupported method" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
