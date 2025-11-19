import { useEffect, useMemo, useState } from "react";

type LogAction =
  | "create"
  | "update"
  | "delete"
  | "order"
  | "stockrequest";

interface LogEntry {
  _id?: string;
  ts: string;
  action: LogAction;
  sku?: string;
  name?: string;
  stockBefore?: number | null;
  stockAfter?: number | null;
  delta?: number | null;
  note?: string;

  orderId?: string | null;
  stockRequestId?: string | null;
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

interface OrderSummary {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
}

interface StockRequestSummary {
  total: number;
  byStatus: Record<string, number>;
}

interface OrderInRange {
  _id?: string;
  orderDate: string;
  customerName?: string;
  status?: string;
  totalAmount?: number;
}

interface StockRequestInRange {
  _id?: string;
  requestId?: string;
  date: string;
  requester?: string;
  warehouse?: string;
  status?: string;
}

const ACTION_LABEL: Record<LogAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  order: "Order",
  stockrequest: "Stock Request",
};

const actionColor = (action: LogAction) => {
  switch (action) {
    case "create":
      return "text-green-700";
    case "update":
      return "text-blue-700";
    case "delete":
      return "text-red-700";
    case "order":
      return "text-purple-700";
    case "stockrequest":
      return "text-amber-700";
    default:
      return "text-gray-700";
  }
};

// Helper to format Date -> "YYYY-MM-DD"
function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper: CSV escaping
function csvEscape(value: any): string {
  const s = value === null || value === undefined ? "" : String(value);
  const mustQuote = s.includes(",") || s.includes('"') || s.includes("\n");
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export default function ReportsModule() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"All" | LogAction>("All");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  const todayStr = formatDateLocal(new Date());
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [orderSummary, setOrderSummary] =
    useState<OrderSummary | null>(null);
  const [stockSummary, setStockSummary] =
    useState<StockRequestSummary | null>(null);
  const [reportRange, setReportRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const [ordersInRange, setOrdersInRange] = useState<
    OrderInRange[]
  >([]);
  const [stockRequestsInRange, setStockRequestsInRange] =
    useState<StockRequestInRange[]>([]);

  // ✅ Selected log IDs (for delete)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    setSelectedIds([]); // clear selection whenever we refetch
  };

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, action]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 🔹 Quick range helpers
  const setTodayRange = () => {
    const today = new Date();
    const d = formatDateLocal(today);
    setFromDate(d);
    setToDate(d);
  };

  const setThisWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const mondayOffset = (day + 6) % 7; // Monday as start
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - mondayOffset
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 6
    );
    setFromDate(formatDateLocal(start));
    setToDate(formatDateLocal(end));
  };

  const setThisMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(formatDateLocal(start));
    setToDate(formatDateLocal(end));
  };

  const openReport = async () => {
    setReportLoading(true);
    setReportOpen(true);
    try {
      const params = new URLSearchParams();
      params.set("action", "report-range");
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();

      setItems(Array.isArray(data.items) ? data.items : []);
      setOrderSummary(data.orderSummary || null);
      setStockSummary(data.stockRequestSummary || null);
      setOrdersInRange(Array.isArray(data.orders) ? data.orders : []);
      setStockRequestsInRange(
        Array.isArray(data.stockRequests)
          ? data.stockRequests
          : []
      );
      if (data.from && data.to) {
        setReportRange({ from: data.from, to: data.to });
      } else {
        setReportRange(null);
      }
      setGeneratedAt(new Date().toLocaleString("en-PH"));
    } finally {
      setReportLoading(false);
    }
  };

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
        byCategory: [] as {
          key: string;
          skus: number;
          units: number;
        }[],
        byWarehouse: [] as {
          key: string;
          skus: number;
          units: number;
        }[],
        updatedRange: "—",
      };
    }

    const totalSkus = items.length;
    const totalUnits = items.reduce(
      (sum, it) => sum + (Number(it.stock) || 0),
      0
    );
    const lowStock = items.filter(
      (it) =>
        Number(it.stock) > 0 && Number(it.stock) <= 5
    ).length;
    const outOfStock = items.filter(
      (it) => Number(it.stock) <= 0
    ).length;

    const catMap = new Map<
      string,
      { skus: number; units: number }
    >();
    const whMap = new Map<
      string,
      { skus: number; units: number }
    >();

    items.forEach((it) => {
      const cat = it.category || "Uncategorized";
      const wh = it.warehouseLoc || "Unknown";

      catMap.set(cat, {
        skus: (catMap.get(cat)?.skus || 0) + 1,
        units:
          (catMap.get(cat)?.units || 0) +
          (Number(it.stock) || 0),
      });

      whMap.set(wh, {
        skus: (whMap.get(wh)?.skus || 0) + 1,
        units:
          (whMap.get(wh)?.units || 0) +
          (Number(it.stock) || 0),
      });
    });

    const byCategory = Array.from(catMap.entries()).map(
      ([key, v]) => ({ key, ...v })
    );
    const byWarehouse = Array.from(whMap.entries()).map(
      ([key, v]) => ({ key, ...v })
    );

    const dates = items
      .map((it) =>
        it.updatedAt
          ? new Date(it.updatedAt).getTime()
          : null
      )
      .filter((t): t is number => t !== null);

    const minTs = dates.length ? Math.min(...dates) : null;
    const maxTs = dates.length ? Math.max(...dates) : null;
    const updatedRange =
      minTs && maxTs
        ? `${new Date(minTs).toLocaleString(
            "en-PH"
          )} → ${new Date(maxTs).toLocaleString("en-PH")}`
        : "—";

    return {
      totalSkus,
      totalUnits,
      lowStock,
      outOfStock,
      byCategory,
      byWarehouse,
      updatedRange,
    };
  }, [items]);

  // ---------- Selection + delete logs ----------
  const toggleSelectAll = () => {
    const ids = logs
      .map((l) => l._id)
      .filter((id): id is string => Boolean(id));
    if (ids.length && selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const toggleSelectOne = (id?: string) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const ok = window.confirm(
      `Delete ${selectedIds.length} log(s)? This cannot be undone.`
    );
    if (!ok) return;

    const res = await fetch("/api/items?action=logs-delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });

    if (res.ok) {
      await fetchLogs(page);
    } else {
      alert("Failed to delete logs.");
    }
  };

  const allRowIds = logs
    .map((l) => l._id)
    .filter((id): id is string => Boolean(id));
  const allSelected =
    allRowIds.length > 0 &&
    selectedIds.length === allRowIds.length;

  // ---------- Download CSV for current report ----------
  const handleDownloadReport = () => {
    const lines: string[] = [];

    // Metadata / header
    lines.push("Section,Field,Value");
    lines.push(
      [
        "Report",
        "Generated At",
        csvEscape(generatedAt || "")
      ].join(",")
    );
    lines.push([
      "Report",
      "From",
      csvEscape(reportRange?.from || "")
    ].join(","));
    lines.push([
      "Report",
      "To",
      csvEscape(reportRange?.to || "")
    ].join(","));
    lines.push([
      "Inventory",
      "Total SKUs",
      csvEscape(summary.totalSkus)
    ].join(","));
    lines.push([
      "Inventory",
      "Total Units",
      csvEscape(summary.totalUnits)
    ].join(","));
    lines.push([
      "Inventory",
      "Low Stock",
      csvEscape(summary.lowStock)
    ].join(","));
    lines.push([
      "Inventory",
      "Out of Stock",
      csvEscape(summary.outOfStock)
    ].join(","));

    if (orderSummary) {
      lines.push([
        "Orders",
        "Total Orders",
        csvEscape(orderSummary.total)
      ].join(","));
      lines.push([
        "Orders",
        "Total Amount",
        csvEscape(orderSummary.totalAmount.toFixed(2))
      ].join(","));
    }

    if (stockSummary) {
      lines.push([
        "Stock Requests",
        "Total Requests",
        csvEscape(stockSummary.total)
      ].join(","));
    }

    lines.push(""); // blank line

    // Orders table
    lines.push("Orders");
    lines.push(
      [
        "Order Date",
        "Order ID",
        "Customer",
        "Status",
        "Total Amount"
      ].map(csvEscape).join(",")
    );
    ordersInRange.forEach((o) => {
      lines.push(
        [
          o.orderDate || "",
          o._id || "",
          o.customerName || "",
          o.status || "",
          typeof o.totalAmount === "number"
            ? o.totalAmount.toFixed(2)
            : ""
        ].map(csvEscape).join(",")
      );
    });

    lines.push(""); // blank line

    // Stock Requests table
    lines.push("Stock Requests");
    lines.push(
      [
        "Date",
        "Request ID",
        "Requester",
        "Warehouse",
        "Status"
      ].map(csvEscape).join(",")
    );
    stockRequestsInRange.forEach((sr) => {
      lines.push(
        [
          sr.date || "",
          sr.requestId || "",
          sr.requester || "",
          sr.warehouse || "",
          sr.status || ""
        ].map(csvEscape).join(",")
      );
    });

    lines.push(""); // blank line

    // Inventory snapshot table
    lines.push("Inventory Snapshot");
    lines.push(
      [
        "SKU",
        "Item Name",
        "Category",
        "Warehouse",
        "Code",
        "Stock",
        "Status",
        "Note",
        "Updated At"
      ].map(csvEscape).join(",")
    );
    items.forEach((it) => {
      const stockNum = Number(it.stock) || 0;
      lines.push(
        [
          it.sku,
          it.name,
          it.category,
          it.warehouseLoc,
          it.warehouseCode,
          stockNum,
          it.status,
          it.note || "",
          it.updatedAt || it.createdAt || ""
        ].map(csvEscape).join(",")
      );
    });

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const filenameBase =
      reportRange && reportRange.from && reportRange.to
        ? `inventory-report_${reportRange.from}_to_${reportRange.to}`
        : "inventory-report";
    const filename = `${filenameBase}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0A400C]">
            Reports
          </h1>
          <p className="mt-2 text-[#819067]">
            Inventory activity logs, orders, and stock requests.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-[#0A400C] font-medium">
              Report range:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-1 border rounded-lg text-sm"
            />
            <span className="text-sm text-[#0A400C]">
              to
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-1 border rounded-lg text-sm"
            />
          </div>

          {/* Quick range buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={setTodayRange}
              className="px-2 py-1 text-xs border border-[#E0DCC7] rounded-full bg-white hover:bg-[#F1EFE2]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={setThisWeekRange}
              className="px-2 py-1 text-xs border border-[#E0DCC7] rounded-full bg-white hover:bg-[#F1EFE2]"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={setThisMonthRange}
              className="px-2 py-1 text-xs border border-[#E0DCC7] rounded-full bg-white hover:bg-[#F1EFE2]"
            >
              This Month
            </button>
            <button
              onClick={openReport}
              className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 text-sm"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Filters for Logs */}
      <div className="flex flex-wrap items-center gap-3 mt-6 bg-white p-4 rounded-2xl border border-[#E0DCC7] shadow">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU, item name, or Ref ID..."
          className="p-2 border rounded-lg flex-1 min-w-[200px]"
        />
        <select
          value={action}
          onChange={(e) =>
            setAction(e.target.value as any)
          }
          className="p-2 border rounded-lg"
        >
          <option value="All">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="order">Orders</option>
          <option value="stockrequest">Stock Requests</option>
        </select>
        <button
          onClick={() => fetchLogs(1)}
          className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
        >
          Refresh
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700"
        >
          Delete Selected
        </button>
      </div>

      {/* Logs Table */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b text-[#0A400C]">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2">Date/Time</th>
              <th className="p-2">Action</th>
              <th className="p-2">Ref ID</th>
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
              logs.map((log, i) => {
                const id = (log._id as any) || "";
                const checked = id
                  ? selectedIds.includes(id)
                  : false;
                return (
                  <tr
                    key={id || i}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectOne(id)}
                        disabled={!id}
                      />
                    </td>
                    <td className="p-2">
                      {new Date(log.ts).toLocaleString(
                        "en-PH"
                      )}
                    </td>
                    <td
                      className={`p-2 font-semibold ${actionColor(
                        log.action
                      )}`}
                    >
                      {ACTION_LABEL[log.action]}
                    </td>
                    <td className="p-2">
                      {log.orderId ||
                        log.stockRequestId ||
                        "—"}
                    </td>
                    <td className="p-2">
                      {log.sku || "—"}
                    </td>
                    <td className="p-2">
                      {log.name || "—"}
                    </td>
                    <td className="p-2">
                      {log.stockBefore ?? "—"}
                    </td>
                    <td className="p-2">
                      {log.stockAfter ?? "—"}
                    </td>
                    <td className="p-2 font-semibold">
                      {typeof log.delta === "number"
                        ? log.delta > 0
                          ? `+${log.delta}`
                          : log.delta
                        : "—"}
                    </td>
                    <td className="p-2">
                      {log.note || "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="p-4 text-center text-[#819067] italic"
                >
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
          onClick={() => {
            if (page > 1) fetchLogs(page - 1);
          }}
          disabled={page === 1}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          ⬅ Prev
        </button>
        <span className="text-[#0A400C] font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => {
            if (page < totalPages) fetchLogs(page + 1);
          }}
          disabled={page === totalPages}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          Next ➡
        </button>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-xl border border-[#E0DCC7] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0A400C]">
                  Inventory & Activity Report
                </h2>
                <p className="text-sm text-[#819067]">
                  Generated: {generatedAt || "—"}
                </p>
                <p className="text-sm text-[#0A400C] mt-1">
                  Period:{" "}
                  {reportRange
                    ? `${reportRange.from} → ${reportRange.to}`
                    : "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadReport}
                  className="px-3 py-1 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 text-sm"
                  disabled={reportLoading}
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setReportOpen(false)}
                  className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
                >
                  Close
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div className="py-12 text-center text-[#819067]">
                Generating…
              </div>
            ) : (
              <>
                {/* Summary of Orders + Stock Requests */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Orders summary */}
                  <div className="border border-[#E0DCC7] rounded-xl p-4 bg-[#FAF8F0]">
                    <h3 className="font-semibold text-[#0A400C] mb-2">
                      Orders Summary
                    </h3>
                    {orderSummary ? (
                      <>
                        <p className="text-sm text-[#0A400C] mb-1">
                          Total orders:{" "}
                          <span className="font-semibold">
                            {orderSummary.total}
                          </span>
                        </p>
                        <p className="text-sm text-[#0A400C] mb-2">
                          Total amount:{" "}
                          <span className="font-semibold">
                            ₱
                            {orderSummary.totalAmount.toFixed(
                              2
                            )}
                          </span>
                        </p>
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-[#0A400C] border-b">
                              <th className="py-1 text-left">
                                Status
                              </th>
                              <th className="py-1 text-right">
                                Count
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(
                              orderSummary.byStatus
                            ).map(([status, count]) => (
                              <tr
                                key={status}
                                className="border-b last:border-b-0"
                              >
                                <td className="py-1">
                                  {status}
                                </td>
                                <td className="py-1 text-right">
                                  {count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <p className="text-sm text-[#819067] italic">
                        No orders found in this range.
                      </p>
                    )}
                  </div>

                  {/* Stock requests summary */}
                  <div className="border border-[#E0DCC7] rounded-xl p-4 bg-[#FAF8F0]">
                    <h3 className="font-semibold text-[#0A400C] mb-2">
                      Stock Requests Summary
                    </h3>
                    {stockSummary ? (
                      <>
                        <p className="text-sm text-[#0A400C] mb-2">
                          Total stock requests:{" "}
                          <span className="font-semibold">
                            {stockSummary.total}
                          </span>
                        </p>
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-[#0A400C] border-b">
                              <th className="py-1 text-left">
                                Status
                              </th>
                              <th className="py-1 text-right">
                                Count
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(
                              stockSummary.byStatus
                            ).map(([status, count]) => (
                              <tr
                                key={status}
                                className="border-b last:border-b-0"
                              >
                                <td className="py-1">
                                  {status}
                                </td>
                                <td className="py-1 text-right">
                                  {count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <p className="text-sm text-[#819067] italic">
                        No stock requests found in this range.
                      </p>
                    )}
                  </div>
                </div>

                {/* Orders in range */}
                <div className="mt-6 border border-[#E0DCC7] rounded-xl p-4 bg-white overflow-x-auto">
                  <h3 className="font-semibold text-[#0A400C] mb-2">
                    Orders in Period
                  </h3>
                  {ordersInRange.length > 0 ? (
                    <table className="w-full text-left text-sm">
                      <thead className="border-b">
                        <tr className="text-[#0A400C]">
                          <th className="p-2">Date</th>
                          <th className="p-2">Order ID</th>
                          <th className="p-2">Customer</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right">
                            Total (₱)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersInRange.map((o, idx) => (
                          <tr
                            key={o._id || idx}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <td className="p-2">
                              {o.orderDate}
                            </td>
                            <td className="p-2">
                              {o._id || "—"}
                            </td>
                            <td className="p-2">
                              {o.customerName || "—"}
                            </td>
                            <td className="p-2">
                              {o.status || "—"}
                            </td>
                            <td className="p-2 text-right">
                              {typeof o.totalAmount === "number"
                                ? o.totalAmount.toFixed(2)
                                : "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-[#819067] italic">
                      No orders within this period.
                    </p>
                  )}
                </div>

                {/* Stock requests in range */}
                <div className="mt-4 border border-[#E0DCC7] rounded-xl p-4 bg-white overflow-x-auto">
                  <h3 className="font-semibold text-[#0A400C] mb-2">
                    Stock Requests in Period
                  </h3>
                  {stockRequestsInRange.length > 0 ? (
                    <table className="w-full text-left text-sm">
                      <thead className="border-b">
                        <tr className="text-[#0A400C]">
                          <th className="p-2">Date</th>
                          <th className="p-2">Request ID</th>
                          <th className="p-2">Requester</th>
                          <th className="p-2">Warehouse</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockRequestsInRange.map((sr, idx) => (
                          <tr
                            key={sr._id || idx}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <td className="p-2">
                              {sr.date}
                            </td>
                            <td className="p-2">
                              {sr.requestId || "—"}
                            </td>
                            <td className="p-2">
                              {sr.requester || "—"}
                            </td>
                            <td className="p-2">
                              {sr.warehouse || "—"}
                            </td>
                            <td className="p-2">
                              {sr.status || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-[#819067] italic">
                      No stock requests within this period.
                    </p>
                  )}
                </div>

                {/* Detailed inventory table (snapshot) */}
                <div className="mt-6 bg-white rounded-xl border border-[#E0DCC7] p-4 overflow-x-auto">
                  <h3 className="font-semibold text-[#0A400C] mb-2">
                    Detailed Items (Current Snapshot)
                  </h3>
                  <p className="text-xs text-[#819067] mb-2">
                    Total SKUs: {summary.totalSkus} | Total units:{" "}
                    {summary.totalUnits} | Low stock:{" "}
                    {summary.lowStock} | Out of stock:{" "}
                    {summary.outOfStock}
                  </p>
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
                          const tA = new Date(
                            a.updatedAt ||
                              a.createdAt ||
                              0
                          ).getTime();
                          const tB = new Date(
                            b.updatedAt ||
                              b.createdAt ||
                              0
                          ).getTime();
                          return tB - tA;
                        })
                        .map((it, idx) => {
                          const stockNum =
                            Number(it.stock) || 0;
                          const statusText =
                            statusFromStock(stockNum);
                          return (
                            <tr
                              key={it._id || idx}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-2 font-semibold">
                                {it.sku}
                              </td>
                              <td className="p-2">
                                {it.name}
                              </td>
                              <td className="p-2">
                                {it.category}
                              </td>
                              <td className="p-2">
                                {it.warehouseLoc}
                              </td>
                              <td className="p-2">
                                {it.warehouseCode}
                              </td>
                              <td
                                className={`p-2 font-semibold ${
                                  stockNum <= 5
                                    ? "text-red-600"
                                    : "text-green-700"
                                }`}
                              >
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
                              <td className="p-2">
                                {it.note || "—"}
                              </td>
                              <td className="p-2">
                                {new Date(
                                  it.updatedAt ||
                                    it.createdAt ||
                                    ""
                                ).toLocaleString("en-PH")}
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
