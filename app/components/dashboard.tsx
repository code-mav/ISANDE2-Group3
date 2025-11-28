// components/dashboard.tsx

import { useEffect, useState } from "react";
import StockLevelBarChart from "./stockLevelBarChart";
import WarehouseStockPie from "./warehouseStockPie";


interface Item {
  _id?: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string;
  warehouseCode: string;
  stock: number | Record<string, number>;
  status: string;
}

// Helper to compute total stock across all warehouses
function totalStock(stockValue: number | Record<string, number>): number {
  if (typeof stockValue === "number") return stockValue;
  return (Object.values(stockValue).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch items from API
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  // Fetch stock requests
  const fetchStockRequests = async () => {
    try {
      const res = await fetch("/api/stockrequests");
      const data = await res.json();
      setStockRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching stock requests:", err);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchStockRequests(), fetchOrders()]);
  }, []);

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter((item) => totalStock(item.stock) <= 5).length;
  const incomingShipments = stockRequests.filter((sr) => sr.status === "Pending" || sr.status === "In Transit").length;
  const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;

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
        <div className="grid grid-cols-4 gap-6 mt-6">
          {[
            { title: "Total Items", value: totalItems.toString() },
            { title: "Low Stock Items", value: lowStockItems.toString() },
            { title: "Incoming Shipments", value: incomingShipments.toString() },
            { title: "Pending Orders", value: pendingOrders.toString() },
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
          <h2 className="font-semibold text-[#0A400C] mb-4">Stock Levels by Item</h2>
          {isLoading ? (
            <p className="text-[#819067] italic">Loading chart...</p>
          ) : (
            <StockLevelBarChart items={items} />
          )}
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-[#0A400C] mb-4">Stock by Warehouse</h2>
          {isLoading ? (
            <p className="text-[#819067] italic">Loading chart...</p>
          ) : (
            <WarehouseStockPie items={items} />
          )}
        </div>
      </div>
    </div>
  );
}
