import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useState } from "react";

interface Item {
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

interface Props {
  items: Item[];
}

export default function StockLevelBarChart({ items }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = Array.from(new Set(items.map((item) => item.category)));

  const filteredItems = items.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  const chartData = filteredItems.map((item) => ({
    name: item.name,
    stock: totalStock(item.stock),
  }));

  return (
    <div className="w-full">
      {/* Category Dropdown */}
      <div className="mb-4">
        <label className="mr-2">Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="All">All</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.stock <= 5 ? "#DC2626" : "#0A400C"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}