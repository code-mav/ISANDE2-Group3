import { useEffect, useState } from "react";

interface OrderItem {
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  _id?: string;
  customerName: string;
  orderDate: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
}

interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  stock: number;
  unitPrice?: number;
}

export default function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, name, total

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [newOrder, setNewOrder] = useState<Order>({
    customerName: "",
    orderDate: new Date().toISOString().split("T")[0],
    items: [],
    totalAmount: 0,
    status: "Pending",
  });

  // Fetch orders and inventory
  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
  };

  const fetchInventory = async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setInventory(data);
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  // Open create modal
  const openModal = () => {
    setIsEditMode(false);
    setSelectedOrderId(null);
    setNewOrder({
      customerName: "",
      orderDate: new Date().toISOString().split("T")[0],
      items: [],
      totalAmount: 0,
      status: "Pending",
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (order: Order) => {
    setIsEditMode(true);
    setSelectedOrderId(order._id || null);
    setNewOrder({ ...order });
    setIsModalOpen(true);
  };

  // Add item to order
  const addItemToOrder = (item: InventoryItem) => {
    if (newOrder.items.find((i) => i.sku === item.sku)) return;
    const updatedItems = [
      ...newOrder.items,
      {
        sku: item.sku,
        name: item.name,
        unitPrice: item.unitPrice ?? 0,
        quantity: 1,
        subtotal: item.unitPrice ?? 0,
      },
    ];
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Update item quantity
  const updateItemQuantity = (sku: string, quantity: number) => {
    const updatedItems = newOrder.items.map((item) =>
      item.sku === sku
        ? { ...item, quantity, subtotal: item.unitPrice * quantity }
        : item
    );
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Remove item from order
  const removeItem = (sku: string) => {
    const updatedItems = newOrder.items.filter((i) => i.sku !== sku);
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Save order
  const saveOrder = async () => {
    if (!newOrder.customerName || newOrder.items.length === 0) {
      alert("Please add a customer name and at least one item.");
      return;
    }

    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode ? `/api/orders?id=${selectedOrderId}` : "/api/orders";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    });

    if (res.ok) {
      alert(isEditMode ? "Order updated!" : "Order saved!");
      setIsModalOpen(false);
      setIsEditMode(false);
      fetchOrders();
    } else {
      alert("Failed to save order.");
    }
  };

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortBy === "name") return a.customerName.localeCompare(b.customerName);
    if (sortBy === "total") return b.totalAmount - a.totalAmount;
    if (sortBy === "newest") return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    return 0;
  });

  // Filter + Search
  const filteredOrders = sortedOrders
    .filter((o) => (filterStatus === "All" ? true : o.status === filterStatus))
    .filter((o) => o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Order Management</h1>
        <p className="mt-2 text-[#819067] text-lg">Create and view customer orders.</p>
        <button
          onClick={openModal}
          className="mt-4 px-6 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900 transition"
        >
          + Create New Order
        </button>
      </div>

      {/* Controls: Search, Sort, Filter, Reset */}
      <div className="flex flex-wrap gap-4 mb-4 items-center p-4 bg-white rounded-2xl shadow">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2 items-center">
          <span className="text-[#0A400C] font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="newest">Newest</option>
            <option value="name">Customer Name</option>
            <option value="total">Total Amount</option>
          </select>
        </div>

        {/* Filter */}
        <div className="flex gap-2 items-center">
          <span className="text-[#0A400C] font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            setSearchQuery("");
            setFilterStatus("All");
            setSortBy("newest");
          }}
          className="px-3 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
        >
          Reset
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow p-4 mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b">
            <tr className="text-[#0A400C]">
              <th className="p-2">#</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Date</th>
              <th className="p-2">Items</th>
              <th className="p-2">Total (₱)</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((o, index) => (
                <tr key={o._id || index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{o.customerName}</td>
                  <td className="p-2">{o.orderDate}</td>
                  <td className="p-2">{o.items.length} item(s)</td>
                  <td className="p-2 font-semibold">₱{o.totalAmount.toFixed(2)}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => openEditModal(o)}
                      className="px-2 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-md text-sm hover:bg-[#D6D1B1]"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-4 text-center text-[#819067] italic">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-xl border border-[#E0DCC7]">
            <h2 className="text-xl font-bold text-[#0A400C] mb-4">
              {isEditMode ? "Edit Order" : "Create New Order"}
            </h2>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0A400C]">
                Customer Name
              </label>
              <input
                type="text"
                value={newOrder.customerName}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, customerName: e.target.value })
                }
                className="w-full p-2 border rounded-lg mt-1"
                placeholder="e.g., Juan Dela Cruz"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0A400C]">
                Status
              </label>
              <select
                value={newOrder.status}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, status: e.target.value })
                }
                className="w-full p-2 border rounded-lg mt-1"
              >
                <option>Pending</option>
                <option>Processing</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>

            {/* Inventory selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0A400C]">
                Select Items
              </label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {inventory.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => addItemToOrder(item)}
                    className="px-3 py-1 border rounded-lg bg-[#E0DCC7] hover:bg-[#D6D1B1]"
                  >
                    {item.name} (₱{item.unitPrice?.toFixed(2) ?? 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Selected items */}
            {newOrder.items.length > 0 && (
              <div className="mb-4">
                <table className="w-full border text-sm">
                  <thead className="bg-[#F8F7F2]">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Item Name</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Unit Price</th>
                      <th className="p-2">Subtotal</th>
                      <th className="p-2">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newOrder.items.map((item) => (
                      <tr key={item.sku} className="border-t">
                        <td className="p-2">{item.sku}</td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.sku, Number(e.target.value))
                            }
                            className="w-16 border rounded p-1 text-center"
                          />
                        </td>
                        <td className="p-2">₱{item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 font-semibold">₱{item.subtotal.toFixed(2)}</td>
                        <td className="p-2">
                          <button
                            onClick={() => removeItem(item.sku)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total & Actions */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-lg font-bold text-[#0A400C]">
                Total: ₱{newOrder.totalAmount.toFixed(2)}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#E0DCC7] text-[#0A400C] rounded-lg hover:bg-[#D6D1B1]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveOrder}
                  className="px-4 py-2 bg-[#0A400C] text-white rounded-lg hover:bg-green-900"
                >
                  {isEditMode ? "Save Changes" : "Save Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
