import { useEffect, useMemo, useState } from "react";

interface LogEntry {
  _id?: string;
  ts: string;
  action: "create" | "update" | "delete";
  sku?: string;
  name?: string;
  stockBefore?: number | null;
  stockAfter?: number | null;
  delta?: number | null;
  note?: string;
}

interface Item {
  _id?: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string;
  warehouseCode: string;
  stock: number;
  status: string;      
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ReportsModule() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"All" | "create" | "update" | "delete">("All");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  const debouncedSearch = useMemo(() => search, [search]);

  const fetchLogs = async (toPage = page) => {
    const params = new URLSearchParams();
    params.set("action", "logs");
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (action) params.set("type", action);
    params.set("page", String(toPage));
    params.set("limit", String(limit));

    const res = await fetch(`/api/items?${params.toString()}`);
    const json = await res.json();
    setLogs(json.data || []);
    setTotal(json.total || 0);
    setPage(json.page || 1);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, action]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openReport = async () => {
    setReportLoading(true);
    setReportOpen(true);
    try {
      const res = await fetch("/api/items");
      const data: Item[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setGeneratedAt(new Date().toLocaleString("en-PH"));
    } finally {
      setReportLoading(false);
    }
  };

  // Derive label from numeric stock so UI is always correct
  const statusFromStock = (stock: number) => {
    if (Number(stock) <= 0) return "Out of Stock";
    if (Number(stock) <= 5) return "Low Stock";
    return "Available";
  };

  const summary = useMemo(() => {
    if (items.length === 0) {
      return {
        totalSkus: 0,
        totalUnits: 0,
        lowStock: 0,
        outOfStock: 0,
        byCategory: [] as { key: string; skus: number; units: number }[],
        byWarehouse: [] as { key: string; skus: number; units: number }[],
        updatedRange: "—",
      };
    }

    const totalSkus = items.length;
    const totalUnits = items.reduce((sum, it) => sum + (Number(it.stock) || 0), 0);
    const lowStock = items.filter((it) => Number(it.stock) > 0 && Number(it.stock) <= 5).length;
    const outOfStock = items.filter((it) => Number(it.stock) <= 0).length;

    const catMap = new Map<string, { skus: number; units: number }>();
    const whMap = new Map<string, { skus: number; units: number }>();

    items.forEach((it) => {
      const cat = it.category || "Uncategorized";
      const wh = it.warehouseLoc || "Unknown";

      catMap.set(cat, {
        skus: (catMap.get(cat)?.skus || 0) + 1,
        units: (catMap.get(cat)?.units || 0) + (Number(it.stock) || 0),
      });

      whMap.set(wh, {
        skus: (whMap.get(wh)?.skus || 0) + 1,
        units: (whMap.get(wh)?.units || 0) + (Number(it.stock) || 0),
      });
    });

    const byCategory = Array.from(catMap.entries()).map(([key, v]) => ({ key, ...v }));
    const byWarehouse = Array.from(whMap.entries()).map(([key, v]) => ({ key, ...v }));

    const dates = items
      .map((it) => (it.updatedAt ? new Date(it.updatedAt).getTime() : null))
      .filter((t): t is number => t !== null);

    const minTs = dates.length ? Math.min(...dates) : null;
    const maxTs = dates.length ? Math.max(...dates) : null;
    const updatedRange =
      minTs && maxTs
        ? `${new Date(minTs).toLocaleString("en-PH")} → ${new Date(maxTs).toLocaleString("en-PH")}`
        : "—";

    return { totalSkus, totalUnits, lowStock, outOfStock, byCategory, byWarehouse, updatedRange };
  }, [items]);

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0A400C]">Reports</h1>
          <p className="mt-2 text-[#819067]">Inventory activity logs and changes.</p>
        </div>

        <button
          onClick={openReport}
          className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
        >
          Generate Report
        </button>
      </div>

      {/* Filters for Logs */}
      <div className="flex flex-wrap items-center gap-3 mt-6 bg-white p-4 rounded-2xl border border-[#E0DCC7] shadow">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU or item name..."
          className="p-2 border rounded-lg flex-1 min-w-[200px]"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as any)}
          className="p-2 border rounded-lg"
        >
          <option value="All">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <button
          onClick={() => fetchLogs(1)}
          className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
        >
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b text-[#0A400C]">
            <tr>
              <th className="p-2">Date/Time</th>
              <th className="p-2">Action</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Item</th>
              <th className="p-2">Before</th>
              <th className="p-2">After</th>
              <th className="p-2">Change</th>
              <th className="p-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <tr key={(log._id as any) || i} className="border-b hover:bg-gray-50">
                  <td className="p-2">{new Date(log.ts).toLocaleString("en-PH")}</td>
                  <td
                    className={`p-2 font-semibold ${
                      log.action === "create"
                        ? "text-green-700"
                        : log.action === "update"
                        ? "text-blue-700"
                        : "text-red-700"
                    }`}
                  >
                    {log.action}
                  </td>
                  <td className="p-2">{log.sku || "—"}</td>
                  <td className="p-2">{log.name || "—"}</td>
                  <td className="p-2">{log.stockBefore ?? "—"}</td>
                  <td className="p-2">{log.stockAfter ?? "—"}</td>
                  <td className="p-2 font-semibold">
                    {typeof log.delta === "number" ? (log.delta > 0 ? `+${log.delta}` : log.delta) : "—"}
                  </td>
                  <td className="p-2">{log.note || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-[#819067] italic">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-4">
        <button
          onClick={() => { if (page > 1) fetchLogs(page - 1); }}
          disabled={page === 1}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          ⬅ Prev
        </button>
        <span className="text-[#0A400C] font-medium">Page {page} of {totalPages}</span>
        <button
          onClick={() => { if (page < totalPages) fetchLogs(page + 1); }}
          disabled={page === totalPages}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          Next ➡
        </button>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-[#E0DCC7] p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0A400C]">Inventory Report</h2>
                <p className="text-sm text-[#819067]">Generated: {generatedAt || "—"}</p>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
              >
                Close
              </button>
            </div>

            {reportLoading ? (
              <div className="py-12 text-center text-[#819067]">Generating…</div>
            ) : (
              <>
                {/* summary cards ... (unchanged) */}

                {/* Detailed items table */}
                <div className="mt-6 bg-white rounded-xl border border-[#E0DCC7] p-4 overflow-x-auto">
                  <h3 className="font-semibold text-[#0A400C] mb-2">Detailed Items (Latest)</h3>
                  <table className="w-full text-left">
                    <thead className="border-b">
                      <tr className="text-[#0A400C]">
                        <th className="p-2">SKU</th>
                        <th className="p-2">Item</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Warehouse</th>
                        <th className="p-2">Code</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Note</th>
                        <th className="p-2">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items
                        .slice()
                        .sort((a, b) => {
                          const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                          const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                          return tB - tA;
                        })
                        .map((it, idx) => {
                          const stockNum = Number(it.stock) || 0;
                          const statusText = statusFromStock(stockNum); // <-- use derived label
                          return (
                            <tr key={it._id || idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-semibold">{it.sku}</td>
                              <td className="p-2">{it.name}</td>
                              <td className="p-2">{it.category}</td>
                              <td className="p-2">{it.warehouseLoc}</td>
                              <td className="p-2">{it.warehouseCode}</td>
                              <td className={`p-2 font-semibold ${stockNum <= 5 ? "text-red-600" : "text-green-700"}`}>
                                {stockNum}
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    stockNum <= 0
                                      ? "bg-red-100 text-red-700"
                                      : stockNum <= 5
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {statusText}
                                </span>
                              </td>
                              <td className="p-2">{it.note || "—"}</td>
                              <td className="p-2">
                                {new Date(it.updatedAt || it.createdAt || "").toLocaleString("en-PH")}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
