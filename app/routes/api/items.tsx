import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

function ensureStockObject(stock: any) {
  if (stock && typeof stock === "object") return stock;
  // convert old numeric → store under default "VL1"
  return { VL1: Number(stock ?? 0) };
}

/** Allowed action names for audit logging. */
type ActionName = "create" | "update" | "delete";

/** Derive item availability status from a numeric stock value and category. */
const computeStatus = (stock: number, category: string = "") => {
  // Determine low stock threshold based on category
  let lowStockThreshold = 5; // default for Machinery and Electrical
  
  if (category === "Spare Parts" || category === "Tools") {
    lowStockThreshold = 15;
  } else if (category === "Miscellaneous") {
    lowStockThreshold = 10;
  }
  
  if (stock <= 0) return "Out of Stock";
  if (stock <= lowStockThreshold) return "Low Stock";
  return "Available";
};

/** Write a single audit-log entry. */
async function logAction(
  db: any,
  action: ActionName,
  itemData: any,
  beforeData: any = null
) {
  const logs = db.collection("AuditLogs");

  // Get before stock (support both number and object)
  let beforeStock: number | Record<string, number> | null = null;
  if (beforeData) {
    if (typeof beforeData.stock === "number") {
      beforeStock = beforeData.stock;
    } else if (typeof beforeData.stock === "object") {
      beforeStock = beforeData.stock;
    }
  }

  // Get after stock (support both number and object)
  let afterStock: number | Record<string, number> | null = null;
  if (itemData) {
    if (typeof itemData.stock === "number") {
      afterStock = itemData.stock;
    } else if (typeof itemData.stock === "object") {
      afterStock = itemData.stock;
    }
  }

  // Calculate delta (only for numeric comparison)
  let delta: number | null = null;
  if (beforeStock !== null && afterStock !== null) {
    const beforeNum = typeof beforeStock === "number" 
      ? beforeStock 
      : (Object.values(beforeStock).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
    const afterNum = typeof afterStock === "number"
      ? afterStock
      : (Object.values(afterStock).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
    delta = afterNum - beforeNum;
  }

  await logs.insertOne({
    ts: new Date(),
    action,
    sku:
      (itemData && itemData.sku) ??
      (beforeData && beforeData.sku) ??
      null,
    name:
      (itemData && itemData.name) ??
      (beforeData && beforeData.name) ??
      null,
    stockBefore: beforeStock,
    stockAfter: afterStock,
    delta,
    note:
      (itemData && itemData.note) ??
      (beforeData && beforeData.note) ??
      "",
    warehouseLoc:
      (itemData && itemData.warehouseLoc) ??
      (beforeData && beforeData.warehouseLoc) ??
      [],
    warehouseCode:
      (itemData && itemData.warehouseCode) ??
      (beforeData && beforeData.warehouseCode) ??
      [],
    unitPrice:
      itemData?.unitPrice ?? beforeData?.unitPrice ?? 0,

    // new fields for consistency with order / stockrequest logs
    orderId: null,
    stockRequestId: null,
  });
}

/** GET handler */
export async function loader({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const url = new URL(request.url);
  const mode = url.searchParams.get("action");

  // ------------------------------------------------------------------
  // Audit log fetch (Reports page logs table)
  // ------------------------------------------------------------------
  if (mode === "logs") {
    const q = (url.searchParams.get("q") || "").trim();
    const type = url.searchParams.get("type") || "All";
    const limit = Math.min(
      100,
      Number(url.searchParams.get("limit") || "20")
    );
    const page = Math.max(
      1,
      Number(url.searchParams.get("page") || "1")
    );
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      filter.$or = [
        { sku: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        // 🔍 search also by Ref ID
        { orderId: { $regex: q, $options: "i" } },
        { stockRequestId: { $regex: q, $options: "i" } },
      ];
    }
    if (type !== "All") filter.action = type;

    const col = db.collection("AuditLogs");
    const [total, data] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter)
        .sort({ ts: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    return new Response(
      JSON.stringify({ data, total, page, limit }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ------------------------------------------------------------------
  // Report range: Orders + StockRequests + inventory snapshot
  // GET /api/items?action=report-range&from=YYYY-MM-DD&to=YYYY-MM-DD
  // ------------------------------------------------------------------
  if (mode === "report-range") {
    let from = url.searchParams.get("from") || "";
    let to = url.searchParams.get("to") || "";

    // Default: today if none provided
    if (!from && !to) {
      const today = new Date().toISOString().split("T")[0];
      from = today;
      to = today;
    } else if (!from) {
      from = to;
    } else if (!to) {
      to = from;
    }

    // Ensure from <= to (YYYY-MM-DD is lexicographically sortable)
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const ordersCol = db.collection("Orders");
    const stockReqCol = db.collection("StockRequests");

    const orderFilter = {
      orderDate: { $gte: from, $lte: to },
    };
    const stockReqFilter = {
      date: { $gte: from, $lte: to },
    };

    const [orders, stockRequests, items] = await Promise.all([
      ordersCol.find(orderFilter).sort({ orderDate: 1 }).toArray(),
      stockReqCol.find(stockReqFilter).sort({ date: 1 }).toArray(),
      db.collection("Inventory").find({}).toArray(),
    ]);

    // ---- Build order summary ----
    const orderStatusCounts: Record<string, number> = {};
    let totalOrderAmount = 0;

    for (const o of orders) {
      const s = o.status || "Unknown";
      orderStatusCounts[s] = (orderStatusCounts[s] || 0) + 1;
      totalOrderAmount += Number(o.totalAmount || 0);
    }

    const orderSummary = {
      total: orders.length,
      totalAmount: totalOrderAmount,
      byStatus: orderStatusCounts,
    };

    // ---- Build stock request summary ----
    const srStatusCounts: Record<string, number> = {};
    for (const sr of stockRequests) {
      const s = sr.status || "Unknown";
      srStatusCounts[s] = (srStatusCounts[s] || 0) + 1;
    }

    const stockRequestSummary = {
      total: stockRequests.length,
      byStatus: srStatusCounts,
    };

    return new Response(
      JSON.stringify({
        items,
        orders,
        stockRequests,
        orderSummary,
        stockRequestSummary,
        from,
        to,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ------------------------------------------------------------------
  // Default: inventory list (used across app)
  // ------------------------------------------------------------------
  const items = await db
    .collection("Inventory")
    .find({})
    .toArray();
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
  const url = new URL(request.url);
  const mode = url.searchParams.get("action");

  // ------------------------------------------------------------------
  // DELETE LOGS (for Reports page)
  // ------------------------------------------------------------------
  if (method === "DELETE" && mode === "logs-delete") {
    const body: any = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No log IDs provided",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const logCol = db.collection("AuditLogs");
    await logCol.deleteMany({
      _id: {
        $in: ids.map((id) => new ObjectId(String(id))),
      },
    });

    return new Response(
      JSON.stringify({ success: true, deleted: ids.length }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ------------------------------------------------------------------
  // CREATE INVENTORY ITEM
  // ------------------------------------------------------------------
  if (method === "POST") {
    const body: any = await request.json();
    const stockNum = Number(body.stock ?? 0) || 0;

    const dup = await collection.findOne({
      $or: [{ sku: body.sku }, { name: body.name }],
    });
    if (dup) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Duplicate SKU or Item Name exists.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newItem: any = {
      sku: body.sku ?? "",
      name: body.name ?? "",
      category: body.category ?? "",
      warehouseLoc: Array.isArray(body.warehouseLoc)
        ? body.warehouseLoc
        : [body.warehouseLoc ?? ""],
      warehouseCode: Array.isArray(body.warehouseCode)
        ? body.warehouseCode
        : [body.warehouseCode ?? ""],
      stock: ensureStockObject(body.stock),
      status: computeStatus(
        (Object.values(ensureStockObject(body.stock)).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0),
        body.category ?? ""
      ),
      note: body.note ?? "",
      unitPrice: Number(body.unitPrice ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newItem);
    await logAction(db, "create", newItem, null);

    return new Response(
      JSON.stringify({ success: true, id: result.insertedId }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ------------------------------------------------------------------
  // UPDATE INVENTORY ITEM
  // ------------------------------------------------------------------
  if (method === "PUT") {
    const body: any = await request.json();
    if (!body._id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing _id",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const _id = new ObjectId(String(body._id));
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Item not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newStockObj = ensureStockObject(body.stock ?? oldItem.stock);
    const updatedItem: any = {
      sku: body.sku ?? oldItem.sku,
      name: body.name ?? oldItem.name,
      category: body.category ?? oldItem.category,
      warehouseLoc: Array.isArray(body.warehouseLoc)
        ? body.warehouseLoc
        : [body.warehouseLoc ?? ""],
      warehouseCode: Array.isArray(body.warehouseCode)
        ? body.warehouseCode
        : [body.warehouseCode ?? ""],
      stock: newStockObj,
      status: computeStatus(
        (Object.values(newStockObj).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0),
        body.category ?? oldItem.category
      ),
      note: body.note ?? oldItem.note ?? "",
      unitPrice: Number(
        body.unitPrice ?? oldItem.unitPrice ?? 0
      ),
      updatedAt: new Date(),
    };

    await collection.updateOne({ _id }, { $set: updatedItem });
    await logAction(db, "update", updatedItem, oldItem);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ------------------------------------------------------------------
  // DELETE INVENTORY ITEM
  // ------------------------------------------------------------------
  if (method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing id",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Authorization: only admin or manager may delete inventory items
    const roleHeader = request.headers.get("x-user-role") || null;
    if (roleHeader !== "admin" && roleHeader !== "manager") {
      return new Response(
        JSON.stringify({ success: false, message: "Forbidden: insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const _id = new ObjectId(String(id));
    const oldItem = await collection.findOne({ _id });
    if (!oldItem) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Item not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await collection.deleteOne({ _id });
    await logAction(db, "delete", null, oldItem);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: "Unsupported method",
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}
