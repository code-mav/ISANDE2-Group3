// routes/api/items.tsx

import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb";

export async function loader() {
  const client = await clientPromise;
  const db = client.db("ISANDE2");
  const items = await db.collection("Inventory").find().toArray();

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: { request: Request }) {
  const client = await clientPromise;
  const db = client.db("ISANDE2"); 
  const collection = db.collection("Inventory");

  const method = request.method.toUpperCase();

  // Helper: compute status from stock value
  const computeStatus = (stock: number) => {
    if (stock <= 0) return "Out of Stock";
    if (stock <= 5) return "Low Stock";
    return "Available";
  };

  // POST → Create new item
if (method === "POST") {
  const body = await request.json();

  // Check for duplicates
  const existingItem = await collection.findOne({
    $or: [{ sku: body.sku }, { name: body.name }],
  });

  if (existingItem) {
    return new Response(
      JSON.stringify({ success: false, message: "Duplicate SKU or Item Name exists." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Proceed if no duplicates
  const result = await collection.insertOne({
    sku: body.sku,
    name: body.name,
    category: body.category,
    warehouseLoc: body.warehouseLoc,
    warehouseCode: body.warehouseCode,
    stock: Number(body.stock),
    status: body.status,
    createdAt: new Date(),
  });

  return new Response(JSON.stringify({ success: true, id: result.insertedId }), {
    headers: { "Content-Type": "application/json" },
  });
}

  // PUT → Update existing item
if (method === "PUT") {
  const body = await request.json();
  if (!body._id) {
    return new Response(JSON.stringify({ success: false, message: "Missing _id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const _id = new ObjectId(body._id);

  // Check for duplicates (excluding current item)
  const existingItem = await collection.findOne({
    $or: [{ sku: body.sku }, { name: body.name }],
    _id: { $ne: _id },
  });

  if (existingItem) {
    return new Response(
      JSON.stringify({ success: false, message: "Duplicate SKU or Item Name exists." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await collection.updateOne(
    { _id },
    {
      $set: {
        sku: body.sku,
        name: body.name,
        category: body.category,
        warehouseLoc: body.warehouseLoc,
        warehouseCode: body.warehouseCode,
        stock: Number(body.stock),
        status: body.status,
      },
    }
  );

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}


  // DELETE → Delete item
  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await collection.deleteOne({ _id: new ObjectId(id) });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, message: "Unsupported method" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );

}
