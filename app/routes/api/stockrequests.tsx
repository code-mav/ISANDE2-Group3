import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

type InventoryItemUpdate = {
  sku: string;
  warehouseCode: string;
  qty: number;
};

function toNum(v: any): number { return Number(v ?? 0); }

async function generateRequestId(db: any): Promise<string> {
  const t = new Date();
  const YYYY = t.getFullYear();
  const MM = String(t.getMonth() + 1).padStart(2, "0");
  const DD = String(t.getDate()).padStart(2, "0");
  const prefix = `SR${YYYY}${MM}${DD}`;
  const regex = new RegExp(`^${prefix}`);
  const count = await db.collection("StockRequests").countDocuments({ requestId: { $regex: regex } });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

async function applyInventory(db: any, items: InventoryItemUpdate[]) {
  for (const it of items) {
    const inv = await db.collection("Inventory").findOne({ sku: it.sku });
    if (!inv) continue;

    // Ensure warehouseCodes is an array
    const warehouseCodes: string[] = Array.isArray(inv.warehouseCode)
      ? [...inv.warehouseCode]
      : inv.warehouseCode ? [inv.warehouseCode] : [];

    // Total stock as a single number
    let totalStock = typeof inv.stock === "number"
      ? inv.stock
      : Array.isArray(inv.stock)
      ? inv.stock.reduce((a: number, b: any) => a + Number(b ?? 0), 0)
      : 0;

    // Add the new quantity
    totalStock += Number(it.qty);

    // Add new warehouse if not already present
    if (!warehouseCodes.includes(it.warehouseCode)) {
      warehouseCodes.push(it.warehouseCode);
    }

    // Determine status
    const status =
      totalStock <= 0 ? "Out of Stock" :
      totalStock <= 5 ? "Low Stock" :
      "Available";

    await db.collection("Inventory").updateOne(
      { _id: inv._id },
      {
        $set: {
          warehouseCode: warehouseCodes,
          stock: totalStock, // now a number
          status,
          updatedAt: new Date(),
        }
      }
    );
  }
}


export async function loader() {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const data = await db.collection("StockRequests").find({}).sort({ date: -1, createdAt: -1 }).toArray();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const method = request.method.toUpperCase();

  // ---------------- POST ----------------
  if (method === "POST") {
    const body = await request.json();
    if (!body.requester?.trim() || !body.items?.length || !body.warehouse?.trim()) {
      return new Response(JSON.stringify({ success: false, message: "Missing requester, items, or warehouse" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Build inventory updates
    const items: InventoryItemUpdate[] = body.items.map((it: any) => ({
      sku: it.sku,
      warehouseCode: body.warehouse,
      qty: Number(it.qty),
    }));

    const requestId = await generateRequestId(db);
    const doc = {
      requestId,
      date: body.date || new Date().toISOString().split("T")[0],
      supplier: body.supplier === "Other" ? body.supplierOther : body.supplier,
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
      deliveredAt: body.status === "Delivered" ? new Date() : null,
    };

    const res = await db.collection("StockRequests").insertOne(doc);

    if (doc.status === "Delivered") {
      await applyInventory(db, items);
      await db.collection("StockRequests").updateOne({ _id: res.insertedId }, { $set: { applied: true } });
    }

    return new Response(JSON.stringify({ success: true, id: res.insertedId, status: doc.status }), { headers: { "Content-Type": "application/json" } });
  }

  // ---------------- PUT ----------------
  if (method === "PUT") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ success: false, message: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const body = await request.json();
    const rid = new ObjectId(id);
    const old = await db.collection("StockRequests").findOne({ _id: rid });
    if (!old) return new Response(JSON.stringify({ success: false, message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const items: InventoryItemUpdate[] = (body.items || []).map((it: any) => ({
      sku: it.sku,
      warehouseCode: body.warehouse || old.warehouse,
      qty: Number(it.qty),
    }));

    let applied = old.applied || false;
    let deliveredAt = old.deliveredAt || null;
    if (body.status === "Delivered" && !old.applied) {
      await applyInventory(db, items);
      applied = true;
      deliveredAt = new Date();
    }

    await db.collection("StockRequests").updateOne(
      { _id: rid },
      { $set: {
        requester: body.requester || old.requester,
        date: body.date || old.date,
        supplier: body.supplier === "Other" ? body.supplierOther : body.supplier || old.supplier,
        warehouse: body.warehouse || old.warehouse,
        items: body.items.map((it: any) => ({
          sku: it.sku,
          name: it.name,
          qty: Number(it.qty),
          warehouseCode: body.warehouse || old.warehouse,
        })),
        status: body.status || old.status,
        note: body.note || old.note,
        applied,
        deliveredAt,
        updatedAt: new Date(),
      } }
    );

    return new Response(JSON.stringify({ success: true, status: body.status }), { headers: { "Content-Type": "application/json" } });
  }

  // ---------------- DELETE ----------------
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ success: false, message: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const rid = new ObjectId(id);
    await db.collection("StockRequests").deleteOne({ _id: rid });
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: false, message: "Unsupported method" }), { status: 405, headers: { "Content-Type": "application/json" } });
}
