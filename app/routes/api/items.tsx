import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

/** Allowed action names for audit logging. */
type ActionName = "create" | "update" | "delete";

/** Derive item availability status from a numeric stock value. */
const computeStatus = (stock: number) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return "Low Stock";
  return "Available";
};

/** Write a single audit-log entry. */
async function logAction(db: any, action: ActionName, itemData: any, beforeData: any = null) {
  const logs = db.collection("AuditLogs");

  const beforeStock = beforeData && typeof beforeData.stock === "number" ? Number(beforeData.stock) : null;
  const afterStock = itemData && typeof itemData.stock === "number" ? Number(itemData.stock) : null;
  const delta = beforeStock !== null && afterStock !== null ? afterStock - beforeStock : null;

  await logs.insertOne({
    ts: new Date(),
    action,
    sku: (itemData && itemData.sku) ?? (beforeData && beforeData.sku) ?? null,
    name: (itemData && itemData.name) ?? (beforeData && beforeData.name) ?? null,
    stockBefore: beforeStock,
    stockAfter: afterStock,
    delta,
    note: (itemData && itemData.note) ?? (beforeData && beforeData.note) ?? "",
    warehouseLoc: (itemData && itemData.warehouseLoc) ?? (beforeData && beforeData.warehouseLoc) ?? [],
    warehouseCode: (itemData && itemData.warehouseCode) ?? (beforeData && beforeData.warehouseCode) ?? [],
    unitPrice: itemData?.unitPrice ?? beforeData?.unitPrice ?? 0,
  });
}

/** GET handler */
export async function loader({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const url = new URL(request.url);
  const mode = url.searchParams.get("action");

  // Audit log fetch
  if (mode === "logs") {
    const q = (url.searchParams.get("q") || "").trim();
    const type = url.searchParams.get("type") || "All";
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "20"));
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      filter.$or = [
        { sku: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }
    if (type !== "All") filter.action = type;

    const col = db.collection("AuditLogs");
    const [total, data] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ ts: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    return new Response(JSON.stringify({ data, total, page, limit }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch inventory items
  const items = await db.collection("Inventory").find({}).toArray();
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}

/** POST/PUT/DELETE handler */
export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const collection = db.collection("Inventory");
  const method = request.method.toUpperCase();

  // CREATE
  if (method === "POST") {
    const body: any = await request.json();
    const stockNum = Number(body.stock ?? 0) || 0;

    const dup = await collection.findOne({ $or: [{ sku: body.sku }, { name: body.name }] });
    if (dup) {
      return new Response(JSON.stringify({ success: false, message: "Duplicate SKU or Item Name exists." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newItem: any = {
      sku: body.sku ?? "",
      name: body.name ?? "",
      category: body.category ?? "",
      warehouseLoc: Array.isArray(body.warehouseLoc) ? body.warehouseLoc : [body.warehouseLoc ?? ""],
      warehouseCode: Array.isArray(body.warehouseCode) ? body.warehouseCode : [body.warehouseCode ?? ""],
      stock: stockNum,
      status: computeStatus(stockNum),
      note: body.note ?? "",
      unitPrice: Number(body.unitPrice ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newItem);
    await logAction(db, "create", newItem, null);

    return new Response(JSON.stringify({ success: true, id: result.insertedId }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // UPDATE
  if (method === "PUT") {
    const body: any = await request.json();
    if (!body._id) {
      return new Response(JSON.stringify({ success: false, message: "Missing _id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const _id = new ObjectId(String(body._id));
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(JSON.stringify({ success: false, message: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const dup = await collection.findOne({
      $or: [{ sku: body.sku }, { name: body.name }],
      _id: { $ne: _id },
    });
    if (dup) {
      return new Response(JSON.stringify({ success: false, message: "Duplicate SKU or Item Name exists." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stockNum = Number(body.stock ?? oldItem.stock) || 0;
    const updatedItem: any = {
      sku: body.sku ?? oldItem.sku,
      name: body.name ?? oldItem.name,
      category: body.category ?? oldItem.category,
      warehouseLoc: Array.isArray(body.warehouseLoc) ? body.warehouseLoc : [body.warehouseLoc ?? ""],
      warehouseCode: Array.isArray(body.warehouseCode) ? body.warehouseCode : [body.warehouseCode ?? ""],
      stock: stockNum,
      status: computeStatus(stockNum),
      note: body.note ?? oldItem.note ?? "",
      unitPrice: Number(body.unitPrice ?? oldItem.unitPrice ?? 0),
      updatedAt: new Date(),
    };

    await collection.updateOne({ _id }, { $set: updatedItem });
    await logAction(db, "update", updatedItem, oldItem);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // DELETE
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const _id = new ObjectId(String(id));
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(JSON.stringify({ success: false, message: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await collection.deleteOne({ _id });
    await logAction(db, "delete", null, oldItem);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: false, message: "Unsupported method" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
