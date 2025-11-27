// components/notificationsmodule.tsx

import { useEffect, useState } from "react";

interface Alert {
  _id: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string | string[];
  warehouseCode: string | string[];
  stock: number | Record<string, number>;
  status: string;
  unitPrice?: number;
}

export default function NotificationsModule() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        const res = await fetch('/api/items');
        if (!res.ok) return;
        const data = await res.json();
        
        // Filter for low stock and out of stock items
        const lowStockItems = data.filter((item: any) => 
          item.status === "Low Stock" || item.status === "Out of Stock"
        );

        setAlerts(lowStockItems);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStockItems();
    
    // Optional: Refresh alerts every 30 seconds
    const interval = setInterval(fetchLowStockItems, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalStock = (stockValue: number | Record<string, number>): number => {
    if (typeof stockValue === "number") return stockValue;
    return (Object.values(stockValue).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0A400C]">Notifications</h1>
      <p className="mt-2 text-[#819067]">Alerts for low-stock items.</p>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="bg-white shadow rounded-2xl p-4">
            <p className="text-[#819067]">Loading notifications...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white shadow rounded-2xl p-4">
            <p className="text-[#819067]">No low stock alerts at this time.</p>
          </div>
        ) : (
          alerts.map((item) => (
            <div key={item._id} className="bg-white shadow rounded-2xl p-4 border-l-4 border-[#0A400C]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[#0A400C] font-medium">
                    <span className="font-semibold">{item.name}</span> (SKU: {item.sku})
                  </p>
                  <p className="text-sm text-[#819067] mt-1">
                    Category: {item.category}
                  </p>
                  <p className="text-sm text-[#819067]">
                    Warehouse: {Array.isArray(item.warehouseLoc) 
                      ? item.warehouseLoc.join(', ') 
                      : item.warehouseLoc}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    item.status === "Out of Stock" 
                      ? "bg-red-100 text-red-700" 
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {item.status}
                  </span>
                  <p className="text-sm text-[#819067] mt-2">
                    {typeof item.stock === "object" && item.stock
                      ? Object.entries(item.stock)
                          .map(([wh, qty]) => `${wh}: ${qty}`)
                          .join(", ")
                      : `Stock: ${item.stock}`}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
