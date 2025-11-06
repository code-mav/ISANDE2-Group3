// components/dashboard.tsx

import { useEffect, useState } from "react";

interface Item {
  _id?: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string;
  warehouseCode: string;
  stock: number;
  status: string;
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch items from API
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter((item) => item.stock <= 5).length;
  const incomingShipments = 5; // Placeholder — replace later with live data if available

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Dashboard</h1>
        <p className="mt-2 text-[#819067] text-lg">
          Real-time overview of your inventory performance.
        </p>
      </div>

      {/* Summary Tiles */}
      {isLoading ? (
        <p className="text-center text-[#819067] italic">Loading data...</p>
      ) : (
        <div className="grid grid-cols-3 gap-6 mt-6">
          {[
            { title: "Total Items", value: totalItems.toString() },
            { title: "Low Stock Items", value: lowStockItems.toString() },
            { title: "Incoming Shipments", value: incomingShipments.toString() },
          ].map((tile, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl shadow-lg text-center border border-[#E0DCC7]"
            >
              <h2 className="text-xl font-semibold text-[#0A400C]">
                {tile.title}
              </h2>
              <p className="text-3xl font-bold text-[#819067] mt-2">
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      )}

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
