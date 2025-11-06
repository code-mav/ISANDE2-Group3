// components/ordersmodule.tsx

export default function OrdersModule() {
  const orders = [
    { id: "2025072100001", date: "2025-07-21", buyer: "ABC Company", summary: "1x Generator", status: "Processing" },
    { id: "2025072100002", date: "2025-07-21", buyer: "ABC Company", summary: "1x Rice Mill", status: "Delivered" },
  ];

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0A400C]">Orders</h1>
      <p className="mt-2 text-[#819067]">Track and manage customer orders.</p>

      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Order ID</th>
              <th className="p-2">Date</th>
              <th className="p-2">Buyer</th>
              <th className="p-2">Summary</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{o.id}</td>
                <td className="p-2">{o.date}</td>
                <td className="p-2">{o.buyer}</td>
                <td className="p-2">{o.summary}</td>
                <td className="p-2 font-semibold text-[#0A400C]">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
