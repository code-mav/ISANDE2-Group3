import { useEffect, useState } from "react";

interface Item {
  _id?: string;
  sku: string;
  name: string;
  category: string;
  warehouseLoc: string;
  warehouseCode: string;
  stock: number;
  status: string;
}

export default function InventoryModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Item>({
    sku: "",
    name: "",
    category: "Machinery",
    warehouseLoc: "Valenzuela",
    warehouseCode: "WH1",
    stock: 0,
    status: "Available",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // Load items from MongoDB
  const fetchItems = async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // ✅ Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewItem({
      sku: "",
      name: "",
      category: "Machinery",
      warehouseLoc: "Valenzuela",
      warehouseCode: "WH1",
      stock: 0,
      status: "Available",
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

    await fetch("/api/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

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

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse =
      filterWarehouse === "All" || item.warehouseLoc === filterWarehouse;
    const matchesCategory =
      filterCategory === "All" || item.category === filterCategory;
    return matchesSearch && matchesWarehouse && matchesCategory;
  });

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <h1 className="text-2xl font-bold text-[#0A400C]">Inventory</h1>
      <p className="mt-2 text-[#819067]">
        Manage and view stock items across warehouses.
      </p>

      {/* Add Item Button */}
      <button
        onClick={openAddModal}
        className="mt-4 px-5 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 transition"
      >
        + Add New Item
      </button>

      {/* Search & Filters */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 flex flex-wrap items-center gap-4 border border-[#E0DCC7]">
        <input
          type="text"
          placeholder="Search by item name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[220px] p-2 border rounded-lg focus:ring-2 focus:ring-[#0A400C]"
        />
        <select
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="All">All Warehouses</option>
          <option value="Valenzuela">Valenzuela</option>
          <option value="Malabon">Malabon</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="All">All Categories</option>
          <option value="Machinery">Machinery</option>
          <option value="Spare Parts">Spare Parts</option>
          <option value="Electrical">Electrical</option>
          <option value="Tools">Tools</option>
          <option value="Miscellaneous">Miscellaneous</option>
        </select>
        <button
          onClick={() => {
            setSearchTerm("");
            setFilterWarehouse("All");
            setFilterCategory("All");
          }}
          className="px-4 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b">
            <tr className="text-[#0A400C]">
              <th className="p-2">#</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Item Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Warehouse</th>
              <th className="p-2">Code</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <tr key={item._id || index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2 font-semibold">{item.sku}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.category}</td>
                  <td className="p-2">{item.warehouseLoc}</td>
                  <td className="p-2">{item.warehouseCode}</td>
                  <td
                    className={`p-2 font-semibold ${
                      item.stock <= 5 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {item.stock}
                  </td>
                  <td
                      className={`p-2 font-semibold ${
                                 item.stock <= 5 ? "text-red-600" : "text-green-700"
                                }`}
>
                                {item.status}
                              </td>


                  <td className="p-2 text-center space-x-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-3 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-4 text-center text-[#819067] italic">
                  No items found matching your search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <label className="block text-sm font-medium text-[#0A400C]">
                  Item Code (SKU)
                </label>
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
                <label className="block text-sm font-medium text-[#0A400C]">
                  Item Name
                </label>
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
                <label className="block text-sm font-medium text-[#0A400C]">
                  Category
                </label>
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

              <div>
                <label className="block text-sm font-medium text-[#0A400C]">
                  Warehouse Location
                </label>
                <select
                  name="warehouseLoc"
                  value={newItem.warehouseLoc}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                >
                  <option>Valenzuela</option>
                  <option>Malabon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A400C]">
                  Warehouse Code
                </label>
                <select
                  name="warehouseCode"
                  value={newItem.warehouseCode}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                >
                  <option>WH1</option>
                  <option>WH2</option>
                  <option>WH3</option>
                  <option>WH4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A400C]">
                  Current Stock
                </label>
                <input
                  type="number"
                  name="stock"
                  value={newItem.stock}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                  min="0"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#0A400C]">
                  Status
                </label>
                <select
                  name="status"
                  value={newItem.status}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg mt-1"
                >
                  <option>Available</option>
                  <option>Low Stock</option>
                  <option>Out of Stock</option>
                </select>
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
