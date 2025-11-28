import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

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

// Helper: total stock for any format
function totalStock(value: number | Record<string, number>): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce((sum, qty) => sum + Number(qty ?? 0), 0);
  }
  return 0;
}

export default function WarehouseStockPie({ items }: { items: Item[] }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState("All");

  // -------------------------------------
  // FILTER DROPDOWNS
  // -------------------------------------
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];

  const itemsInSelectedCategory =
    selectedCategory === "All"
      ? items
      : items.filter((i) => i.category === selectedCategory);

  const itemNames = ["All", ...Array.from(new Set(itemsInSelectedCategory.map((i) => i.name)))];

  // -------------------------------------
  // APPLY FILTERS TO ITEMS
  // -------------------------------------
  const filteredItems = items.filter((item) => {
    const catMatch = selectedCategory === "All" || item.category === selectedCategory;
    const itemMatch = selectedItem === "All" || item.name === selectedItem;
    return catMatch && itemMatch;
  });

  // -------------------------------------
  // PROCESS FILTERED STOCK
  // -------------------------------------
  const warehouseData = filteredItems.reduce((acc: Record<string, number>, item) => {
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

  const COLORS = [
    "#0A400C",
    "#DC2626",
    "#2563EB",
    "#F59E0B",
    "#8B5CF6",
    "#10B981",
    "#EC4899",
    "#6366F1",
  ];

  // -------------------------------------
  // RENDER
  // -------------------------------------
  return (
    <div className="w-full space-y-4">

      {/* FILTER CONTROLS */}
      <div className="flex gap-4">
        {/* Category Filter */}
        <div className="flex flex-col">
          <label className="font-semibold text-[#0A400C]">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedItem("All"); // Reset item filter
            }}
            className="border rounded-lg p-2 bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Item Filter */}
        <div className="flex flex-col">
          <label className="font-semibold text-[#0A400C]">Item:</label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="border rounded-lg p-2 bg-white"
          >
            {itemNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PIE CHART */}
      <ResponsiveContainer width="100%" height={330}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} units`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
