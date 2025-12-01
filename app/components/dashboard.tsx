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

function totalStock(stockValue: number | Record<string, number>): number {
  if (typeof stockValue === "number") return stockValue;
  return (Object.values(stockValue).map((v) => Number(v ?? 0)) as number[]).reduce(
    (a, b) => a + b,
    0
  );
}

function getLowStockThreshold(category: string): number {
  if (category === "Spare Parts" || category === "Tools") return 15;
  if (category === "Miscellaneous") return 10;
  return 5; // default
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTile, setActiveTile] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  const fetchStockRequests = async () => {
    try {
      const res = await fetch("/api/stockrequests");
      const data = await res.json();
      setStockRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching stock requests:", err);
    }
  };

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

  // Calculations
  const lowStockList = items.filter((item) => {
    const stock = totalStock(item.stock);
    const threshold = getLowStockThreshold(item.category);
    return stock > 0 && stock <= threshold;
  });

  const incomingShipmentList = stockRequests.filter(
    (sr) => sr.status === "Pending" || sr.status === "In Transit"
  );

  const pendingOrderList = orders.filter(
    (o) => o.status === "Pending" || o.status === "Processing"
  );

  const totalItems = items.length;
  const lowStockItems = lowStockList.length;
  const incomingShipments = incomingShipmentList.length;
  const pendingOrders = pendingOrderList.length;

  const summaryTiles = [
    {
      key: "lowStock",
      title: "Low Stock Items",
      value: lowStockItems,
      details: lowStockList.map(
        (it: Item) => `${it.name} (${it.sku}) — Total: ${totalStock(it.stock)}`
      ),
    },
    {
      key: "incoming",
      title: "Incoming Shipments",
      value: incomingShipments,
      details: incomingShipmentList.map(
        (r: any) =>
          `Request ${r.requestId || r._id?.slice(0, 6)} — ${r.items.length} item(s) — ${r.status}`
      ),
    },
    {
      key: "pendingOrders",
      title: "Pending Orders",
      value: pendingOrders,
      details: pendingOrderList.map(
        (o: any) =>
          `Order ${o._id?.slice(0, 6)} — ${o.items.length} item(s) — ${o.status}`
      ),
    },
    {
      key: "totalItems",
      title: "Total Items",
      value: totalItems,
      details: [`There are currently ${totalItems} unique SKUs in inventory.`],
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Dashboard</h1>
        <p className="mt-2 text-[#819067] text-lg">
          Real-time overview of your inventory performance.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      {isLoading ? (
        <p className="text-center text-[#819067] italic">Loading data...</p>
      ) : (
        <div className="grid grid-cols-4 gap-6 mt-6">
          {summaryTiles.map((tile) => {
            const isOpen = activeTile === tile.key;

            return (
              <div
                key={tile.key}
                onClick={() => setActiveTile(isOpen ? null : tile.key)}
                className="relative bg-white p-6 rounded-2xl shadow-lg text-center border border-[#E0DCC7] cursor-pointer hover:shadow-xl transition"
              >
                <h2 className="text-xl font-semibold text-[#0A400C]">{tile.title}</h2>
                <p className="text-3xl font-bold text-[#819067] mt-2">{tile.value}</p>
                <p className="mt-1 text-xs text-[#939f76]">
                  Click for details
                </p>

                {/* CLICK-OPEN INFO PANEL */}
                {isOpen && (
                  <div className="absolute left-1/2 top-full mt-3 w-72 -translate-x-1/2 rounded-lg bg-[#0A400C] px-4 py-3 text-white text-[12px] shadow-xl z-50 max-h-64 overflow-y-auto">
                    {tile.details.length === 0 ? (
                      <p>No additional details.</p>
                    ) : (
                      <ul className="space-y-1">
                        {tile.details.map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CHARTS */}
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
