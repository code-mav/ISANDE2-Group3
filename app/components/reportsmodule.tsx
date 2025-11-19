// components/reportsmodule.tsx

export default function ReportsModule() {
  const reports = [
    { name: "Granulator", type: "Inventory Valuation", date: "July 25, 2023" },
    { name: "Weeder", type: "Inventory Valuation", date: "July 24, 2023" },
    { name: "Low Stock", type: "Low Stock", date: "July 21, 2023" },
  ];

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0A400C]">Reports</h1>
      <p className="mt-2 text-[#819067]">View and generate inventory-related reports.</p>

      <div className="mt-6 bg-white rounded-2xl shadow p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
