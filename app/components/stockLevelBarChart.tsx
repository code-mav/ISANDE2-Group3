import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Item {
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string;
  warehouseCode: string;
  stock: number;
  status: string;
}

export default function StockLevelBarChart({ items }: { items: Item[] }) {
  const chartData = items.map((item) => ({
    name: item.name,
    stock: item.stock,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" hide /> 
          <YAxis />
          <Tooltip />
          <Bar dataKey="stock" fill="#819067" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
