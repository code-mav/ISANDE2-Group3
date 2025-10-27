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

  if (method === "POST") {
    const body = await request.json();
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

  if (method === "PUT") {
    const body = await request.json();
    if (!body._id)
      return new Response(JSON.stringify({ success: false, message: "Missing _id" }), { status: 400 });

    const _id = new ObjectId(body._id);
    await collection.updateOne({ _id }, { $set: body });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id)
      return new Response(JSON.stringify({ success: false, message: "Missing id" }), { status: 400 });

    await collection.deleteOne({ _id: new ObjectId(id) });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: false, message: "Unsupported method" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
