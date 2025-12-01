// components/inventorymodule.tsx

import { useEffect, useState } from "react";

interface Item {
  _id?: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string[];   // array
  warehouseCode: string[];  // array
  stock: number | Record<string, number>;
  unitPrice?: number;
  status: string;
  note?: string;           
  createdAt?: string;
}

// Utility function to get low stock threshold by category
const getLowStockThreshold = (category: string): number => {
  if (category === "Spare Parts" || category === "Tools") {
    return 15;
  } else if (category === "Miscellaneous") {
    return 10;
  }
  // Default for Machinery and Electrical
  return 5;
};

export default function InventoryModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Item>({
    sku: "",
    name: "",
    category: "Machinery",
    warehouseLoc: ["Valenzuela"],
    warehouseCode: ["VL1"],
    stock: 0,
    unitPrice: 0,
    status: "Available",
    note: "",            
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("All");
  const [filterWarehouseCode, setFilterWarehouseCode] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load items from MongoDB
  const fetchItems = async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(
      data.map((item: any) => ({
        ...item,
        warehouseLoc: Array.isArray(item.warehouseLoc)
          ? item.warehouseLoc
          : [item.warehouseLoc || ""],
        warehouseCode: Array.isArray(item.warehouseCode)
          ? item.warehouseCode
          : [item.warehouseCode || ""],
        note: item.note || "",  
      }))
    );
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, options } = e.target as HTMLSelectElement;

    if (name === "warehouseLoc") {
      const selected = Array.from(options)
        .filter((o: any) => o.selected)
        .map((o: any) => o.value);
      setNewItem({
        ...newItem,
        warehouseLoc: selected,
        warehouseCode: getWarehouseCodes(selected),
      });
    } else if (name === "warehouseCode") {
      const selected = Array.from(options)
        .filter((o: any) => o.selected)
        .map((o: any) => o.value);
      setNewItem({ ...newItem, warehouseCode: selected });
    } else {
      // coerce numeric fields
      if (name === "stock" || name === "unitPrice") {
        const num = Number(value);
        setNewItem({ ...newItem, [name]: isNaN(num) ? 0 : num });
      } else {
        setNewItem({ ...newItem, [name]: value });
      }
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewItem({
      sku: "",
      name: "",
      category: "Machinery",
      warehouseLoc: ["Valenzuela"],
      warehouseCode: ["VL1"],
      stock: 0,
      status: "Available",
      note: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setIsEditMode(true);
    setSelectedItemId(item._id || null);
    setNewItem({ ...item });
    setIsModalOpen(true);
  };

  // Add or Update in MongoDB
  const addOrUpdateItem = async () => {
    if (!newItem.sku || !newItem.name) {
      alert("Please fill in all required fields.");
      return;
    }

    const method = isEditMode ? "PUT" : "POST";
    const body = JSON.stringify({ ...newItem, _id: selectedItemId });

    const res = await fetch("/api/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to save item. Please try again.");
      return;
    }

    setIsModalOpen(false);
    await fetchItems();
  };

  // Delete item
  const deleteItem = async (id: string | undefined) => {
    if (!id) return;
    const confirmDelete = confirm("Are you sure you want to delete this item?");
    if (confirmDelete) {
      await fetch(`/api/items?id=${id}`, { method: "DELETE" });
      await fetchItems();
    }
  };

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWarehouse =
        filterWarehouse === "All" || item.warehouseLoc.includes(filterWarehouse);
      const matchesWarehouseCode =
        filterWarehouseCode === "All" || item.warehouseCode.includes(filterWarehouseCode);
      const matchesCategory =
        filterCategory === "All" || item.category === filterCategory;
      return matchesSearch && matchesWarehouse && matchesWarehouseCode && matchesCategory;
    })
    .sort((a, b) => {
      const totalStock = (s: number | Record<string, number> | undefined) => {
        if (s === undefined || s === null) return 0;
        if (typeof s === "number") return Number(s || 0);
        return (Object.values(s).map((v) => Number(v ?? 0)) as number[]).reduce((x, y) => x + y, 0);
      };
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stock") return totalStock(a.stock) - totalStock(b.stock);
      if (sortBy === "newest") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper: compute total across warehouses
  const totalStock = (s: number | Record<string, number> | undefined) => {
    if (s === undefined || s === null) return 0;
    if (typeof s === "number") return Number(s || 0);
    return (Object.values(s).map((v) => Number(v ?? 0)) as number[]).reduce((a, b) => a + b, 0);
  };

  const getStatusBadge = (stock: number | Record<string, number> | undefined, category: string = "") => {
    const t = totalStock(stock);
    const threshold = getLowStockThreshold(category);
    let label = "Available";
    let color = "bg-green-100 text-green-700";
    if (t <= 0) {
      label = "Out of Stock";
      color = "bg-red-100 text-red-700";
    } else if (t <= threshold) {
      label = "Low Stock";
      color = "bg-orange-100 text-orange-700";
    }
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{label}</span>;
  };

  // Map warehouse location to codes
  const getWarehouseCodes = (locations: string[]) => {
    const codes: string[] = [];
    locations.forEach((loc) => {
      if (loc === "Malabon") codes.push("MB1");
      if (loc === "Valenzuela") codes.push("VL1", "VL2", "VL3", "VL4");
    });
    return codes;
  };

  const formatArrayField = (field: string[] | string | undefined) => {
    if (!field) return "";
    return Array.isArray(field) ? field.join(", ") : field;
  };

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Inventory Management</h1>
        <p className="mt-2 text-[#819067] text-lg">
          Manage and view stock items across warehouses.
        </p>
        <button
          onClick={openAddModal}
          className="mt-4 px-6 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 transition"
        >
          + Add New Item
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 flex flex-wrap items-center gap-4 border border-[#E0DCC7]">
        <input
          type="text"
          placeholder="Search by item name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[220px] p-2 border rounded-lg focus:ring-2 focus:ring-[#0A400C]"
        />
        <select
          value={filterWarehouseCode}
          onChange={(e) => setFilterWarehouseCode(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="All">All Codes</option>
          <option value="VL1">VL1</option>
          <option value="VL2">VL2</option>
          <option value="VL3">VL3</option>
          <option value="VL4">VL4</option>
          <option value="MB1">MB1</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="All">All Categories</option>
          <option>Machinery</option>
          <option>Spare Parts</option>
          <option>Electrical</option>
          <option>Tools</option>
          <option>Miscellaneous</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="newest">Sort by: Newest</option>
          <option value="name">Sort by: Name</option>
          <option value="stock">Sort by: Stock</option>
        </select>
        <button
          onClick={() => {
            setSearchTerm("");
            setFilterWarehouse("All");
            setFilterWarehouseCode("All");
            setFilterCategory("All");
            setSortBy("newest");
          }}
          className="px-4 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
        >
          Reset
        </button>
      </div>

      {/* Low stock legend*/}
      <div className="mt-2 text-xs text-[#819067] flex justify-start">
        <div className="px-3 py-2 bg-[#F9F8F4] border border-[#E0DCC7] rounded-lg">
          <span className="font-semibold text-[#0A400C] mr-1">Low Stock Thresholds:</span>
          <span>Machinery & Electrical ≤ 5 • Spare Parts & Tools ≤ 15 • Miscellaneous ≤ 10</span>
        </div>
      </div>


      {/* Table */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto border border-[#E0DCC7]">
        <table className="w-full text-left bg-white">
          <thead className="border-b bg-[#F9F8F4]">
            <tr className="text-[#0A400C]">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Item Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Warehouse</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-right">Unit Price (₱)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3">Note</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => (
                <tr
                  key={item._id || index}
                  className="border-b hover:bg-gray-50 bg-white transition-colors"
                >
                  <td className="p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="p-2 font-semibold">{item.sku}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.category}</td>
                  <td className="p-2">{formatArrayField(item.warehouseLoc)}</td>
                  <td className="p-2 align-top">
                    <div className="flex flex-wrap gap-2">
                      {typeof item.stock === "object"
                        ? Object.entries(item.stock).map(([wh, q]) => {
                            const threshold = getLowStockThreshold(item.category);
                            const isLow = Number(q) <= threshold;
                            return (
                              <span
                                key={wh}
                                className={`inline-block px-2 py-1 text-xs rounded-md border ${
                                  isLow
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-green-50 border-green-200 text-green-700"
                                }`}
                                title={`${wh}: ${q}`}
                              >
                                {wh}: {Number(q)}
                              </span>
                            );
                          })
                        : (
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-md ${
                              totalStock(item.stock) <= getLowStockThreshold(item.category)
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {Number(item.stock)}
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="p-2 text-right">{item.unitPrice?.toFixed(2) ?? "—"}</td>
                  <td className="p-2 text-center">{getStatusBadge(item.stock, item.category)}</td>

                  {/* Note column */}
                  <td
                    className="p-2 max-w-[160px] truncate whitespace-nowrap overflow-hidden text-ellipsis text-sm"
                    title={item.note || ""}
                  >
                    {item.note || "—"}
                  </td>

                  {/* Edit/Delete buttons */}
                  <td className="p-2 text-center space-x-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-2 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-md text-sm hover:bg-[#D6D1B1] transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteItem(item._id)}
                      className="px-2 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="p-4 text-center text-[#819067] italic bg-white">
                  No items found matching your search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          ⬅ Prev
        </button>
        <span className="text-[#0A400C] font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg disabled:opacity-50"
        >
          Next ➡
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl border border-[#E0DCC7]">
            <h2 className="text-xl font-bold text-[#0A400C] mb-4">
              {isEditMode ? "Edit Item" : "Add New Item"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Item Code (SKU)</label>
                <input
                  type="text"
                  name="sku"
                  value={newItem.sku}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                  placeholder="e.g., RM-003"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={newItem.name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                  placeholder="e.g., Granulator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A400C]">Category</label>
                <select
                  name="category"
                  value={newItem.category}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                >
                  <option>Machinery</option>
                  <option>Spare Parts</option>
                  <option>Electrical</option>
                  <option>Tools</option>
                  <option>Miscellaneous</option>
                </select>
              </div>

              {/* Warehouse Selection */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C] mb-1">
                  Warehouse Selection
                </label>
                {Object.entries({
                  Valenzuela: ["VL1", "VL2", "VL3", "VL4"],
                  Malabon: ["MB1"]
                }).map(([loc, codes]) => (
                  <div key={loc} className="mb-2">
                    <strong className="block">{loc}</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {codes.map((code) => (
                        <label key={code} className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            value={code}
                            checked={newItem.warehouseCode.includes(code)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let updatedCodes = [...newItem.warehouseCode];
                              if (checked) {
                                updatedCodes.push(code);
                              } else {
                                updatedCodes = updatedCodes.filter((c) => c !== code);
                              }
                              const updatedLocs = Array.from(
                                new Set(
                                  updatedCodes.map((c) =>
                                    c.startsWith("VL") ? "Valenzuela" : "Malabon"
                                  )
                                )
                              );
                              setNewItem({
                                ...newItem,
                                warehouseCode: updatedCodes,
                                warehouseLoc: updatedLocs,
                              });
                            }}
                            className="h-4 w-4"
                          />
                          {code}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C]">Current Stock</label>
                {Array.isArray(newItem.warehouseCode) && newItem.warehouseCode.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {newItem.warehouseCode.map((code) => {
                      const val =
                        typeof newItem.stock === "object"
                          ? Number((newItem.stock as Record<string, number>)[code] ?? 0)
                          : Number(newItem.stock ?? 0);
                      return (
                        <div key={code} className="flex items-center gap-2">
                          <span className="w-20">{code}</span>
                          <input
                            type="number"
                            min={0}
                            value={val}
                            onChange={(e) => {
                              const n = Number(e.target.value || 0);
                              const stockObj: Record<string, number> =
                                typeof newItem.stock === "object" && newItem.stock
                                  ? { ...(newItem.stock as Record<string, number>) }
                                  : {};
                              stockObj[code] = isNaN(n) ? 0 : n;
                              setNewItem({ ...newItem, stock: stockObj });
                            }}
                            className="w-full p-2 border rounded-lg mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="number"
                    name="stock"
                    value={typeof newItem.stock === "number" ? newItem.stock : 0}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg mt-1"
                    min="0"
                  />
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C]">Unit Price (₱)</label>
                <input
                  type="number"
                  name="unitPrice"
                  value={newItem.unitPrice}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 1500.00"
                />
              </div>

              {/* Note field */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C]">Adjustment Note</label>
                <textarea
                  name="note"
                  value={newItem.note}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                  placeholder="Optional note..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
              >
                Cancel
              </button>
              <button
                onClick={addOrUpdateItem}
                className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
              >
                {isEditMode ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
