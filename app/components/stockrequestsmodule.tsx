export default function StockRequestsModule() {
  const requests = [
    { id: "SR20250721001", date: "2025-07-21", requester: "Warehouse A", item: "Generator", qty: 1, status: "Pending" },
    { id: "SR20250721002", date: "2025-07-21", requester: "Warehouse B", item: "Rice Mill", qty: 2, status: "In Transit" },
  ];

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0A400C]">Stock Requests</h1>
      <p className="mt-2 text-[#819067]">Monitor and manage internal stock requests.</p>

      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Request ID</th>
              <th className="p-2">Date</th>
              <th className="p-2">Requested By</th>
              <th className="p-2">Item</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.requester}</td>
                <td className="p-2">{r.item}</td>
                <td className="p-2">{r.qty}</td>
                <td className="p-2 font-semibold text-[#0A400C]">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
