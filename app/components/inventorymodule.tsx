// components/inventorymodule.tsx

import { useState } from "react";

export default function InventoryModule() {
  const [items, setItems] = useState([
    { id: 1, name: "Rice Milling Machine", category: "Machinery", stock: 12 },
    { id: 2, name: "Electric Motor", category: "Spare Parts", stock: 3 },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: items.length + 1, name: "New Item", category: "Misc", stock: 5 },
    ]);
  };

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      <h1 className="text-2xl font-bold text-[#0A400C]">Inventory</h1>
      <p className="mt-2 text-[#819067]">Manage and view stock items.</p>

      {/* Add Item Button */}
      <button
        onClick={addItem}
        className="mt-4 px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
      >
        Add Item
      </button>

      {/* Inventory Table */}
      <div className="mt-6 bg-white rounded-2xl shadow p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Item</th>
              <th className="p-2">Category</th>
              <th className="p-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.category}</td>
                <td
                  className={`p-2 font-semibold ${
                    item.stock <= 5 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {item.stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
