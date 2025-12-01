import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

function addToWarehouse(stockObj: any, warehouse: string, qty: number) {
  stockObj[warehouse] = (stockObj[warehouse] ?? 0) + qty;
  return stockObj;
}

function subtractFromWarehouse(stockObj: any, warehouse: string, qty: number) {
  stockObj[warehouse] = Math.max(0, (stockObj[warehouse] ?? 0) - qty);
  return stockObj;
}

type InventoryItemUpdate = {
  sku: string;
  warehouseCode: string;
  qty: number;
};

type LogAction = "create" | "update" | "delete" | "order" | "stockrequest";

function toNum(v: any): number {
  return Number(v ?? 0);
}

// Helper to get low stock threshold by category
function getLowStockThreshold(category: string): number {
  if (category === "Spare Parts" || category === "Tools") {
    return 15;
  } else if (category === "Miscellaneous") {
    return 10;
  }
  // Default for Machinery and Electrical
  return 5;
}

async function generateRequestId(db: any): Promise<string> {
  const t = new Date();
  const YYYY = t.getFullYear();
  const MM = String(t.getMonth() + 1).padStart(2, "0");
  const DD = String(t.getDate()).padStart(2, "0");
  const prefix = `SR${YYYY}${MM}${DD}`;
  const regex = new RegExp(`^${prefix}`);
  const count = await db
    .collection("StockRequests")
    .countDocuments({ requestId: { $regex: regex } });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

// Meta log row for stockrequest lifecycle (create / update / delete)
async function logStockRequestMeta(
  db: any,
  requestId: string,
  requester: string | undefined,
  note: string
) {
  await db.collection("AuditLogs").insertOne({
    ts: new Date(),
    action: "stockrequest" as LogAction,
    sku: null,
    name:  null,
    stockBefore: null,
    stockAfter: null,
    delta: null,
    note: requester ? `${note} (checked by ${requester})` : note,
    orderId: null,
    stockRequestId: requestId,
  });
}

// Apply inventory changes + per-SKU logs
async function applyInventory(
  db: any,
  items: InventoryItemUpdate[],
  note: string,
  stockRequestId: string
) {
  const logs = db.collection("AuditLogs");

  for (const it of items) {
    const inv = await db.collection("Inventory").findOne({ sku: it.sku });
    if (!inv) continue;

    const warehouseCodes: string[] = Array.isArray(inv.warehouseCode)
      ? [...inv.warehouseCode]
      : inv.warehouseCode
      ? [inv.warehouseCode]
      : [];

    // Capture before stock (object if exists, else numeric)
    let beforeStock: number | Record<string, number> | null = null;
    if (inv.stock) {
      beforeStock = typeof inv.stock === "object" ? inv.stock : inv.stock;
    }

    const qty = Number(it.qty);
    let stockObj = typeof inv.stock === "object"
      ? { ...inv.stock }
      : { VL1: Number(inv.stock ?? 0) };

    stockObj = addToWarehouse(stockObj, it.warehouseCode, qty);

    const totalStock = (Object.values(stockObj).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);

    if (!warehouseCodes.includes(it.warehouseCode)) {
      warehouseCodes.push(it.warehouseCode);
    }

    const status =
      totalStock <= 0
        ? "Out of Stock"
        : totalStock <= getLowStockThreshold(inv.category || "")
        ? "Low Stock"
        : "Available";

    await db.collection("Inventory").updateOne(
      { _id: inv._id },
      {
        $set: {
          warehouseCode: warehouseCodes,
          stock: stockObj,
          status,
          updatedAt: new Date(),
        },
      }
    );

    // Calculate numeric delta for display
    const beforeNum = beforeStock !== null
      ? typeof beforeStock === "number"
        ? beforeStock
        : (Object.values(beforeStock).map((v: any) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0)
      : null;
    const numericDelta = beforeNum !== null ? totalStock - beforeNum : qty;

    await logs.insertOne({
      ts: new Date(),
      action: "stockrequest" as LogAction,
      sku: it.sku,
      name: inv.name ?? null,
      stockBefore: beforeStock,
      stockAfter: stockObj,
      delta: numericDelta,
      note,
      orderId: null,
      stockRequestId,
    });
  }
}

export async function loader() {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const data = await db
    .collection("StockRequests")
    .find({})
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const method = request.method.toUpperCase();

  // ---------------- POST (CREATE) ----------------
  if (method === "POST") {
    const body = await request.json();
    if (
      !body.requester?.trim() ||
      !body.items?.length ||
      !body.warehouse?.trim()
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing requester, items, or warehouse",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const items: InventoryItemUpdate[] = body.items.map(
      (it: any) => ({
        sku: it.sku,
        warehouseCode: body.warehouse,
        qty: Number(it.qty),
      })
    );

    const requestId = await generateRequestId(db);
    const doc = {
      requestId,
      date: body.date || new Date().toISOString().split("T")[0],
      supplier:
        body.supplier === "Other"
          ? body.supplierOther
          : body.supplier,
      requester: body.requester,
      warehouse: body.warehouse,
      items: body.items.map((it: any) => ({
        sku: it.sku,
        name: it.name,
        qty: Number(it.qty),
        warehouseCode: body.warehouse,
      })),
      status: body.status || "Pending",
      note: body.note || "",
      applied: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deliveredAt:
        body.status === "Delivered" ? new Date() : null,
    };

    const res = await db.collection("StockRequests").insertOne(doc);

    // meta log
    await logStockRequestMeta(
      db,
      requestId,
      body.requester,
      `Stock request ${requestId} created with status ${doc.status}`
    );

    if (doc.status === "Delivered") {
      await applyInventory(
        db,
        items,
        `Stock request ${requestId} marked Delivered`,
        requestId
      );
      await db.collection("StockRequests").updateOne(
        { _id: res.insertedId },
        { $set: { applied: true } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: res.insertedId,
        status: doc.status,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ---------------- PUT (UPDATE) ----------------
  if (method === "PUT") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id)
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );

    const body = await request.json();
    const rid = new ObjectId(id);
    const old = await db
      .collection("StockRequests")
      .findOne({ _id: rid });
    if (!old)
      return new Response(
        JSON.stringify({
          success: false,
          message: "Not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );

    const items: InventoryItemUpdate[] = (body.items || []).map(
      (it: any) => ({
        sku: it.sku,
        warehouseCode: body.warehouse || old.warehouse,
        qty: Number(it.qty),
      })
    );

    let applied = old.applied || false;
    let deliveredAt = old.deliveredAt || null;
    const newStatus = body.status || old.status;

    if (body.status === "Delivered" && !old.applied) {
      await applyInventory(
        db,
        items,
        `Stock request ${old.requestId || String(id)} marked Delivered`,
        old.requestId || String(id)
      );
      applied = true;
      deliveredAt = new Date();
    }

    await db.collection("StockRequests").updateOne(
      { _id: rid },
      {
        $set: {
          requester: body.requester || old.requester,
          date: body.date || old.date,
          supplier:
            body.supplier === "Other"
              ? body.supplierOther
              : body.supplier || old.supplier,
          warehouse: body.warehouse || old.warehouse,
          items: body.items.map((it: any) => ({
            sku: it.sku,
            name: it.name,
            qty: Number(it.qty),
            warehouseCode: body.warehouse || old.warehouse,
          })),
          status: newStatus,
          note: body.note || old.note,
          applied,
          deliveredAt,
          updatedAt: new Date(),
        },
      }
    );

    await logStockRequestMeta(
      db,
      old.requestId || id,
      old.requester,
      `Stock request ${old.requestId || id} updated: status ${old.status} → ${newStatus}`
    );

    return new Response(
      JSON.stringify({ success: true, status: body.status }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ---------------- DELETE ----------------
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id)
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );

    const rid = new ObjectId(id);
    const old = await db
      .collection("StockRequests")
      .findOne({ _id: rid });
    if (!old) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    await db.collection("StockRequests").deleteOne({ _id: rid });

    await logStockRequestMeta(
      db,
      old.requestId || id,
      old.requester,
      `Stock request ${old.requestId || id} deleted`
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: "Unsupported method",
    }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
