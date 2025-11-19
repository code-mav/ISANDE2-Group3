// components/StockRequestsModule.tsx
import { useEffect, useMemo, useState } from "react";

type ReqItem = {
  sku: string;
  name: string;
  qty: number;
  warehouseCode: string;
};

type StockRequest = {
  _id?: string;
  requestId?: string;
  date: string;
  supplier: string;
  supplierOther?: string;
  requester: string;
  warehouse?: string;
  items: ReqItem[];
  status: "Pending" | "In Transit" | "Delivered" | "Cancelled";
  note?: string;
  applied?: boolean;
  createdAt?: string;
  deliveredAt?: string | null;
};

type InventoryItem = {
  _id?: string;
  sku: string;
  name: string;
  stock: number;         
  warehouseCode: string[];           
  warehouseLoc?: string[];           
  unitPrice?: number;
  category?: string;
  status?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

const SUPPLIERS = ["Megasun Taiwan", "Hubei YongXiang", "Weima China", "Other"];
const STATUSES = ["Pending", "In Transit", "Delivered", "Cancelled"];

export default function StockRequestsModule() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const emptyForm = (): StockRequest => ({
    date: new Date().toISOString().split("T")[0],
    supplier: SUPPLIERS[0],
    supplierOther: "",
    requester: "",
    warehouse: "",
    items: [],
    status: "Pending",
    note: "",
    applied: false,
    deliveredAt: null,
  });

  const [form, setForm] = useState<StockRequest>(emptyForm());

  const fetchRequests = async () => {
  const res = await fetch("/api/stockrequests");
  if (!res.ok) return [];
  const data = await res.json();
  setRequests(data || []);
  return data;
};


  const fetchInventory = async () => {
    const res = await fetch("/api/items");
    if (!res.ok) return;
    const data = await res.json();
    setInventory(data || []);
  };

  // Warehouse dropdown should use warehouseCode, not warehouseLoc
  const warehouseList = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.warehouseCode && Array.isArray(i.warehouseCode)) {
        i.warehouseCode.forEach((w) => set.add(w));
      }
    });
    return Array.from(set);
  }, [inventory]);

  useEffect(() => {
    fetchRequests();
    fetchInventory();
  }, []);

  const findInv = (sku?: string) => inventory.find((i) => i.sku === sku);
  const totalQty = (r: StockRequest) => r.items.reduce((s, it) => s + (it.qty || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Cancelled": return "text-red-600 font-semibold";
      case "Delivered": return "text-green-600 font-semibold";
      case "In Transit": return "text-orange-600 font-semibold";
      default: return "text-yellow-700 font-semibold";
    }
  };

  const openCreate = () => { setIsEditMode(false); setSelectedId(null); setForm(emptyForm()); setIsModalOpen(true); };
  const openEdit = (r: StockRequest) => {
    setIsEditMode(true);
    setSelectedId(r._id || r.requestId || null);
    setForm({
      ...r,
      supplierOther: r.supplier && !SUPPLIERS.includes(r.supplier) ? r.supplier : r.supplierOther || "",
    });
    setIsModalOpen(true);
  };

  // Add item from inventory
const addItem = (it: InventoryItem) => {
  if (!form.warehouse) return alert("Select a warehouse first");

  const existingIndex = form.items.findIndex(
    (i) => i.sku === it.sku && i.warehouseCode === form.warehouse
  );

  if (existingIndex !== -1) {
    const updatedItems = [...form.items];
    updatedItems[existingIndex].qty += 1;
    setForm({ ...form, items: updatedItems });
  } else {
    setForm({
      ...form,
      items: [
        ...form.items,
        { sku: it.sku, name: it.name, qty: 1, warehouseCode: form.warehouse },
      ],
    });
  }
};

// Update qty for specific SKU + warehouse
const updateQty = (sku: string, warehouseCode: string, qty: number) => {
  if (qty < 1) return;
  setForm({
    ...form,
    items: form.items.map((it) =>
      it.sku === sku && it.warehouseCode === warehouseCode ? { ...it, qty } : it
    ),
  });
};

// Remove SKU + warehouse
const removeItem = (sku: string, warehouseCode: string) => {
  setForm({
    ...form,
    items: form.items.filter(
      (it) => !(it.sku === sku && it.warehouseCode === warehouseCode)
    ),
  });
};

  const save = async () => {
  if (!form.requester?.trim()) return alert("Please enter requester.");
  if (!form.items.length) return alert("Add at least one item.");
  if (!form.warehouse?.trim()) return alert("Select warehouse.");
  for (const it of form.items) {
    if (!it.qty || it.qty < 1) return alert("Each item must have qty >= 1.");
  }

  // --- MERGE DUPLICATES BY SKU + WAREHOUSE ---
  const mergedItems: ReqItem[] = [];
  const map: Record<string, ReqItem> = {};
  form.items.forEach(it => {
    const key = `${it.sku}::${it.warehouseCode}`;
    if (map[key]) {
      map[key].qty += it.qty; 
    } else {
      map[key] = { ...it };
    }
  });
  Object.values(map).forEach(it => mergedItems.push(it));

  const payload: any = {
    ...form,
    items: mergedItems,
    deliveredAt: form.status === "Delivered" ? new Date().toISOString() : form.deliveredAt,
  };

  if (payload.supplier === "Other" && payload.supplierOther) {
    payload.supplier = payload.supplierOther;
    delete payload.supplierOther;
  }

  const method = isEditMode ? "PUT" : "POST";
  const url = isEditMode ? `/api/stockrequests?id=${selectedId}` : "/api/stockrequests";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return alert(data?.message || "Failed to save request");

  await fetchRequests();
  await fetchInventory();
  setIsModalOpen(false);
};


  const deleteReq = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this request? (Delivered additions will NOT be reverted)")) return;
    const res = await fetch(`/api/stockrequests?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.message || "Delete failed");
      return;
    }
    alert("Deleted");
    fetchRequests();
    fetchInventory();
  };

  const processed = useMemo(() => {
    let out = [...requests];
    if (filterStatus !== "All") out = out.filter((r) => r.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(
        (r) =>
          (r.requestId || "").toLowerCase().includes(q) ||
          (r.requester || "").toLowerCase().includes(q) ||
          (r.supplier || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "newest") out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (sortBy === "supplier") out.sort((a, b) => (a.supplier || "").localeCompare(b.supplier || ""));
    if (sortBy === "qty") out.sort((a, b) => totalQty(b) - totalQty(a));
    return out;
  }, [requests, filterStatus, searchQuery, sortBy]);

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Stock Requests</h1>
        <p className="mt-2 text-[#819067] text-lg">Create and manage incoming stock requests.</p>
        <button onClick={openCreate} className="mt-4 px-6 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 transition">
          + Create New Request
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center p-4 bg-white rounded-2xl shadow">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by requester / supplier / id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-[#0A400C] font-medium">Sort by:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 border rounded-lg">
            <option value="newest">Newest</option>
            <option value="supplier">Supplier</option>
            <option value="qty">Total Qty</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-[#0A400C] font-medium">Status:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded-lg">
            <option value="All">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button onClick={() => { setSearchQuery(""); setFilterStatus("All"); setSortBy("newest"); }} className="px-3 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]">Reset</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow p-4 mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b">
            <tr className="text-[#0A400C]">
              <th className="p-2">Req ID</th>
              <th className="p-2">Date</th>
              <th className="p-2">Requested By</th>
              <th className="p-2">Supplier</th>
              <th className="p-2">Warehouse</th>
              <th className="p-2">Items</th>
              <th className="p-2">Total Qty</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processed.length ? processed.map((r, idx) => (
              <tr key={r._id || r.requestId || idx} className="border-b hover:bg-gray-50">
                <td className="p-2">{r.requestId || "—"}</td>
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.requester}</td>
                <td className="p-2">{r.supplier}</td>
                <td className="p-2">{r.warehouse || "—"}</td>
                <td className="p-2">{r.items.length} item(s)</td>
                <td className="p-2">{totalQty(r)}</td>
                <td className={`p-2 ${getStatusColor(r.status)}`}>{r.status}</td>
                <td className="p-2 flex gap-2 justify-center">
                  <button onClick={() => openEdit(r)} className="px-2 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-md text-sm hover:bg-[#D6D1B1]">✏️</button>
                  <button onClick={() => deleteReq(r._id)} className="px-2 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">🗑️</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="p-4 text-center text-[#819067] italic">No requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-xl border border-[#E0DCC7]">
            <h2 className="text-xl font-bold text-[#0A400C] mb-4">{isEditMode ? "Edit Stock Request" : "Create Stock Request"}</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Requested By</label>
                <input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} className="w-full p-2 border rounded-lg mt-1" placeholder="e.g., Juan Dela Cruz"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full p-2 border rounded-lg mt-1"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Supplier</label>
                <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full p-2 border rounded-lg mt-1">
                  {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.supplier === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-[#0A400C]">Other supplier</label>
                  <input value={form.supplierOther} onChange={(e) => setForm({ ...form, supplierOther: e.target.value })} className="w-full p-2 border rounded-lg mt-1" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Warehouse</label>
                <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} className="w-full p-2 border rounded-lg mt-1">
                  <option value="">Select warehouse</option>
                  {warehouseList.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full p-2 border rounded-lg mt-1">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C]">Note</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full p-2 border rounded-lg mt-1"/>
              </div>
            </div>

            {/* Inventory quick-add */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#0A400C]">Add Items (from inventory)</label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-36 overflow-y-auto">
                {inventory.map(it => {
                  const stockArr = Array.isArray(it.stock) ? it.stock : [it.stock || 0];
                  return (
                    <button key={it._id} onClick={() => addItem(it)} className="px-3 py-1 border rounded bg-[#E0DCC7] hover:bg-[#D6D1B1]">
                      {it.name} ({it.sku}) — {stockArr.reduce((a, b) => a + b, 0)} in {it.warehouseCode.join(", ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected items */}
            {form.items.length > 0 && (
              <div className="mb-4 mt-4">
                <table className="w-full border text-sm">
                  <thead className="bg-[#F8F7F2]">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Item Name</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Available</th>
                      <th className="p-2">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map(it => (
  <tr key={`${it.sku}-${it.warehouseCode}`} className="border-t">
    <td className="p-2">{it.sku}</td>
    <td className="p-2">{it.name}</td>
    <td className="p-2">
      <input
        type="number"
        min={1}
        value={it.qty}
        onChange={(e) =>
          updateQty(it.sku, it.warehouseCode, Number(e.target.value || 1))
        }
        className="w-20 p-1 border rounded text-center"
      />
    </td>
    <td className="p-2">
      {(() => {
        const inv = findInv(it.sku);
        if (!inv) return 0;
        const stocks = Array.isArray(inv.stock)
          ? inv.stock.map(n => Number(n || 0))
          : [Number(inv.stock || 0)];
        return stocks.reduce((a, b) => a + b, 0);
      })()}
    </td>
    <td className="p-2">
      <button onClick={() => removeItem(it.sku, it.warehouseCode)} className="px-2 py-1 text-red-600">
        ✖️
      </button>
    </td>
  </tr>
))}

                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900">{isEditMode ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
