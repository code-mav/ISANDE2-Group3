// components/dashboard.tsx

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import StockLevelBarChart from "./stockLevelBarChart";


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

// Pie chart component for warehouse stock distribution
function WarehouseStockPie({ items }: { items: Item[] }) {
  const warehouseData = items.reduce((acc: Record<string, number>, item) => {
    if (typeof item.stock === "object" && item.stock) {
      Object.entries(item.stock).forEach(([warehouse, qty]) => {
        acc[warehouse] = (acc[warehouse] || 0) + Number(qty ?? 0);
      });
    } else {
      const warehouse = item.warehouseLoc || "Unknown";
      acc[warehouse] = (acc[warehouse] || 0) + totalStock(item.stock);
    }
    return acc;
  }, {});

  const chartData = Object.entries(warehouseData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#0A400C", "#DC2626", "#2563EB", "#F59E0B", "#8B5CF6", "#10B981", "#EC4899"];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value} units`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
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
