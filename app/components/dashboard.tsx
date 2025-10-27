export default function Dashboard() {
  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <h1 className="text-2xl font-bold text-[#0A400C]">Dashboard</h1>
      <p className="mt-2 text-[#819067]">Real-time overview of your inventory performance.</p>

      {/* Summary Tiles */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {[
          { title: "Total Items", value: "1,450" },
          { title: "Low Stock Items", value: "12" },
          { title: "Incoming Shipments", value: "5" },
        ].map((tile, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <h2 className="text-xl font-semibold text-[#0A400C]">{tile.title}</h2>
            <p className="text-3xl font-bold text-[#819067] mt-2">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-[#0A400C] mb-4">Stock Levels</h2>
          <div className="h-48 flex items-center justify-center text-gray-500">
            [Stock Level Chart Placeholder]
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-[#0A400C] mb-4">Stock by Supplier</h2>
          <div className="h-48 flex items-center justify-center text-gray-500">
            [Supplier Breakdown Chart Placeholder]
          </div>
        </div>
      </div>
    </div>
  );
}
