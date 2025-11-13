import clientPromise from "~/utils/mongo.server";
import { ObjectId } from "mongodb"; 

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

  if (method === "POST") {
    const body = await request.json();
    const order = {
      customerName: body.customerName,
      orderDate: body.orderDate,
      items: body.items,
      totalAmount: Number(body.totalAmount || 0),
      status: body.status || "Pending",
      createdAt: new Date(),
    };

    await db.collection("Orders").insertOne(order);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "PUT") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: "Missing order ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const updateData = {
      customerName: body.customerName,
      orderDate: body.orderDate,
      items: body.items,
      totalAmount: Number(body.totalAmount || 0),
      status: body.status,
      updatedAt: new Date(),
    };

    const result = await db.collection("Orders").updateOne(
      { _id: new ObjectId(id) }, // ✅ Use imported ObjectId
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ success: false, message: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "GET") {
    const orders = await db.collection("Orders").find({}).sort({ createdAt: -1 }).toArray();
    return new Response(JSON.stringify(orders), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, message: "Unsupported method" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
