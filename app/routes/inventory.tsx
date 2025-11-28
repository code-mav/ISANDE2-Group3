//routes/inventory.tsx
import { useEffect, useState } from "react";
import { ProtectedRoute } from "~/components/ProtectedRoute";

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

function InventoryContent() {
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

  const fetchItems = async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => {
    fetchItems();
  }, []);

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

  const addOrUpdateItem = async () => {
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

  const deleteItem = async (id?: string) => {
    if (!id) return;
    const confirmDelete = confirm("Are you sure?");
    if (confirmDelete) {
      await fetch(`/api/items?id=${id}`, { method: "DELETE" });
      await fetchItems();
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      {/* ... same table + modal UI ... */}
    </div>
  );
}

export default function InventoryModule() {
  return (
    <ProtectedRoute allowedModules={["inventory"]}>
      <InventoryContent />
    </ProtectedRoute>
  );
}
