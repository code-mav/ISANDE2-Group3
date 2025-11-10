import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

/**
 * Allowed action names for audit logging.
 */
type ActionName = "create" | "update" | "delete";

/**
 * Derive item availability status from a numeric stock value.
 */
const computeStatus = (stock: number) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return "Low Stock";
  return "Available";
};

/**
 * Write a single audit-log entry.
 * - action: what happened (create/update/delete)
 * - itemData: the "after" document (for create/update), may be null for delete
 * - beforeData: the "before" document (for update/delete), null for create
 *
 * We also compute delta = stockAfter - stockBefore when both are present.
 */
async function logAction(
  db: any,
  action: ActionName,
  itemData: any,
  beforeData: any = null
) {
  const logs = db.collection("AuditLogs");

  // Normalize numeric stock values from before/after objects
  const beforeStock =
    beforeData && typeof beforeData.stock === "number"
      ? Number(beforeData.stock)
      : null;
  const afterStock =
    itemData && typeof itemData.stock === "number"
      ? Number(itemData.stock)
      : null;

  // Change in stock if both sides are known
  const delta =
    beforeStock !== null && afterStock !== null ? afterStock - beforeStock : null;

  // Insert the audit trail record
  await logs.insertOne({
    ts: new Date(), // timestamp of the action
    action,
    // Prefer "after" values, fallback to "before" if missing
    sku: (itemData && itemData.sku) ?? (beforeData && beforeData.sku) ?? null,
    name: (itemData && itemData.name) ?? (beforeData && beforeData.name) ?? null,
    stockBefore: beforeStock,
    stockAfter: afterStock,
    delta,
    // Carry forward note if present on either side
    note:
      (itemData && itemData.note) ??
      (beforeData && beforeData.note) ??
      "",
  });
}

/**
 * GET handler:
 * - If query param action=logs → returns paginated/searchable audit logs.
 * - Otherwise → returns all inventory items.
 */
export async function loader({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const url = new URL(request.url);
  const mode = url.searchParams.get("action");

  // /api/items?action=logs  → fetch audit logs
  if (mode === "logs") {
    const q = (url.searchParams.get("q") || "").trim();          // search text
    const type = url.searchParams.get("type") || "All";          // action filter
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "20"));
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const skip = (page - 1) * limit;

    // Build MongoDB filter for search + action
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

  // Default: return all inventory items
  const items = await db.collection("Inventory").find({}).toArray();
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST/PUT/DELETE handler for inventory items.
 * - POST   → create item, log "create"
 * - PUT    → update item, log "update" with before/after
 * - DELETE → delete item, log "delete" with before
 */
export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const collection = db.collection("Inventory");
  const method = request.method.toUpperCase();

  // CREATE
  if (method === "POST") {
    const body: any = await request.json();
    const stockNum = Number(body.stock ?? 0) || 0;

    // Enforce unique SKU or name
    const dup = await collection.findOne({
      $or: [{ sku: body.sku }, { name: body.name }],
    });
    if (dup) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Duplicate SKU or Item Name exists.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build new document with server-computed fields
    const newItem: any = {
      sku: body.sku ?? "",
      name: body.name ?? "",
      category: body.category ?? "",
      warehouseLoc: body.warehouseLoc ?? "",
      warehouseCode: body.warehouseCode ?? "",
      stock: stockNum,
      status: computeStatus(stockNum),
      note: body.note ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newItem);

    // Write audit trail (no "before" on create)
    await logAction(db, "create", newItem, null);

    return new Response(JSON.stringify({ success: true, id: result.insertedId }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // UPDATE
  if (method === "PUT") {
    const body: any = await request.json();
    if (!body._id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing _id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const _id = new ObjectId(String(body._id));

    // Load the current document for duplicate checks and logging
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(
        JSON.stringify({ success: false, message: "Item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Enforce unique SKU/name excluding the current document
    const dup = await collection.findOne({
      $or: [{ sku: body.sku }, { name: body.name }],
      _id: { $ne: _id },
    });
    if (dup) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Duplicate SKU or Item Name exists.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Normalize stock and compute status
    const stockNum = Number(body.stock ?? oldItem.stock) || 0;

    // Prepare the "after" document
    const updatedItem: any = {
      sku: body.sku ?? oldItem.sku,
      name: body.name ?? oldItem.name,
      category: body.category ?? oldItem.category,
      warehouseLoc: body.warehouseLoc ?? oldItem.warehouseLoc,
      warehouseCode: body.warehouseCode ?? oldItem.warehouseCode,
      stock: stockNum,
      status: computeStatus(stockNum),
      note: body.note ?? oldItem.note ?? "",
      updatedAt: new Date(),
    };

    // Persist changes
    await collection.updateOne({ _id }, { $set: updatedItem });

    // Write audit trail with before/after
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
      return new Response(
        JSON.stringify({ success: false, message: "Missing id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const _id = new ObjectId(String(id));

    // Load the current document for logging before deletion
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(
        JSON.stringify({ success: false, message: "Item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Remove the item
    await collection.deleteOne({ _id });

    // Write audit trail with "before" only
    await logAction(db, "delete", null, oldItem);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Method not supported
  return new Response(
    JSON.stringify({ success: false, message: "Unsupported method" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
