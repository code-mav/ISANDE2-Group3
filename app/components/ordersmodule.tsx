import { useEffect, useState } from "react";

interface OrderItem {
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  warehouseCode?: string;
}

interface Order {
  _id?: string;
  customerName: string;
  orderDate: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  stock: number | Record<string, number>;
  unitPrice?: number;
}

// 🔹 Helper: get local date as "YYYY-MM-DD"
function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const todayLocal = getLocalDateString();

  const [newOrder, setNewOrder] = useState<Order>({
    customerName: "",
    orderDate: todayLocal,
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
      orderDate: todayLocal,
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

  // Add item to order — only used in create mode
  const addItemToOrder = (item: InventoryItem, warehouseCode?: string) => {
    const key = (sku: string, wh?: string) => `${sku}::${wh ?? ""}`;
    if (
      newOrder.items.find(
        (i) => key(i.sku, i.warehouseCode) === key(item.sku, warehouseCode)
      )
    )
      return;

    const itemAvailable =
      typeof item.stock === "object" && item.stock
        ? (Object.values(item.stock).map((v) => Number(v ?? 0)) as number[]).reduce(
            (a, b) => a + b,
            0
          )
        : Number(item.stock ?? 0);

    if (itemAvailable <= 0) {
      alert(`Cannot add ${item.name}: Out of stock`);
      return;
    }

    const updatedItems = [
      ...newOrder.items,
      {
        sku: item.sku,
        name: item.name,
        unitPrice: item.unitPrice ?? 0,
        quantity: 1,
        subtotal: item.unitPrice ?? 0,
        warehouseCode: warehouseCode,
      },
    ];
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Update item quantity — used only in create mode
  const updateItemQuantity = (
    sku: string,
    quantity: number,
    warehouseCode?: string
  ) => {
    const inventoryItem = inventory.find((i) => i.sku === sku);
    const available =
      typeof inventoryItem?.stock === "object" && inventoryItem?.stock
        ? (Object.values(inventoryItem.stock).map((v) => Number(v ?? 0)) as number[]).reduce(
            (a, b) => a + b,
            0
          )
        : Number(inventoryItem?.stock ?? 0);

    if (quantity > available) {
      alert(`Cannot set quantity beyond available stock (${available})`);
      return;
    }

    const updatedItems = newOrder.items.map((item) =>
      item.sku === sku && item.warehouseCode === warehouseCode
        ? { ...item, quantity, subtotal: item.unitPrice * quantity }
        : item
    );
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Remove item from order — used only in create mode
  const removeItem = (sku: string, warehouseCode?: string) => {
    const updatedItems = newOrder.items.filter(
      (i) =>
        !(
          i.sku === sku &&
          (warehouseCode === undefined || i.warehouseCode === warehouseCode)
        )
    );
    const total = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    setNewOrder({ ...newOrder, items: updatedItems, totalAmount: total });
  };

  // Save order
  const saveOrder = async () => {
    if (!newOrder.customerName || newOrder.items.length === 0) {
      alert("Please add a customer name and at least one item.");
      return;
    }


    if (newOrder.orderDate < todayLocal) {
      alert("Order date cannot be earlier than today.");
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

  // Delete order
  const deleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    const res = await fetch(`/api/orders?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      alert("Order deleted!");
      fetchOrders();
    } else {
      alert("Failed to delete.");
    }
  };

  // Sort orders (use createdAt if available for "newest")
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortBy === "name") return a.customerName.localeCompare(b.customerName);
    if (sortBy === "total") return b.totalAmount - a.totalAmount;
    if (sortBy === "newest") {
      const dateA = new Date(a.createdAt || a.orderDate).getTime();
      const dateB = new Date(b.createdAt || b.orderDate).getTime();
      return dateB - dateA;
    }
    return 0;
  });

  // Filter + Search (by customer OR Ref ID)
  const filteredOrders = sortedOrders
    .filter((o) => (filterStatus === "All" ? true : o.status === filterStatus))
    .filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const customerMatch = o.customerName.toLowerCase().includes(q);
      const refId = o._id ? o._id.toLowerCase() : "";
      const refMatch = refId.includes(q);

      return customerMatch || refMatch;
    });

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Cancelled":
        return "text-red-600 font-semibold";
      case "Completed":
        return "text-green-600 font-semibold";
      case "Processing":
        return "text-yellow-600 font-semibold";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#FAF8F0]">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A400C]">Order Management</h1>
        <p className="mt-2 text-[#819067] text-lg">
          Create and view customer orders.
        </p>
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
            placeholder="Search by customer or Ref ID..."
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
      <div className="bg-white rounded-2xl shadow p-4 mt-2 overflow-x-auto border border-[#E0DCC7]">
        <table className="w-full text-left bg-white">
          <thead className="border-b bg-[#F9F8F4]">
            <tr className="text-[#0A400C]">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Ref ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Items</th>
              <th className="p-3 text-right">Total (₱)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((o, index) => (
                <tr
                  key={o._id || index}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 text-xs text-gray-500 font-mono">
                    {o._id ? o._id.substring(0, 8) + "..." : "—"}
                  </td>
                  <td className="p-3">{o.customerName}</td>
                  <td className="p-3">{o.orderDate}</td>
                  <td className="p-3">{o.items.length} item(s)</td>
                  <td className="p-3 text-right font-semibold">
                    ₱{o.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                        o.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : o.status === "Processing"
                          ? "bg-yellow-100 text-yellow-700"
                          : o.status === "Cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2 justify-center">
                    <button
                      onClick={() => openEditModal(o)}
                      className="px-2 py-1 bg-[#E0DCC7] text-[#0A400C] rounded-md text-sm hover:bg-[#D6D1B1]"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => o._id && deleteOrder(o._id)}
                      className="px-2 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="p-4 text-center text-[#819067] italic"
                >
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
              {isEditMode ? (
                <input
                  type="text"
                  value={newOrder.customerName}
                  disabled
                  className="w-full p-2 border rounded-lg mt-1 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  value={newOrder.customerName}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      customerName: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-lg mt-1"
                  placeholder="e.g., Juan Dela Cruz"
                />
              )}
            </div>

            {/* Order Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0A400C]">
                Order Date
              </label>
              <input
                type="date"
                value={newOrder.orderDate}
                min={todayLocal}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    orderDate: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg mt-1"
                disabled={isEditMode} 
              />
              <p className="text-xs text-[#819067] mt-1">
                You cannot set an order date earlier than today.
              </p>
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0A400C]">
                Status
              </label>

              {isEditMode ? (
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
              ) : (
                <input
                  type="text"
                  value="Pending"
                  disabled
                  className="w-full p-2 border rounded-lg mt-1 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              )}
            </div>

            {/* Inventory selection */}
            {!isEditMode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#0A400C]">
                  Select Items
                </label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {inventory.map((item) => {
                    if (typeof item.stock === "object" && item.stock) {
                      return Object.entries(item.stock).map(([wh, v]) => (
                        <button
                          key={`${item._id}-${wh}`}
                          onClick={() => addItemToOrder(item, wh)}
                          className="px-3 py-1 border rounded-lg bg-[#E0DCC7] hover:bg-[#D6D1B1]"
                        >
                          {item.name} ({wh}: {Number(v ?? 0)})
                        </button>
                      ));
                    }
                    return (
                      <button
                        key={item._id}
                        onClick={() => addItemToOrder(item)}
                        className="px-3 py-1 border rounded-lg bg-[#E0DCC7] hover:bg-[#D6D1B1]"
                      >
                        {item.name} (₱{item.unitPrice?.toFixed(2) ?? 0})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected items*/}
            {newOrder.items.length > 0 && (
              <div className="mb-4">
                <table className="w-full border text-sm">
                  <thead className="bg-[#F8F7F2]">
                    <tr>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Item Name</th>
                      <th className="p-2 text-center">Warehouse</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Subtotal</th>
                      {!isEditMode && (
                        <th className="p-2 text-center">Remove</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {newOrder.items.map((item) => (
                      <tr
                        key={`${item.sku}-${item.warehouseCode ?? ""}`}
                        className="border-t"
                      >
                        <td className="p-2 text-left">{item.sku}</td>
                        <td className="p-2 text-left">{item.name}</td>
                        <td className="p-2 text-center">
                          {item.warehouseCode ?? "—"}
                        </td>
                        <td className="p-2 text-center">
                          {isEditMode ? (
                            <span>{item.quantity}</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.sku,
                                  Number(e.target.value),
                                  item.warehouseCode
                                )
                              }
                              className="w-16 border rounded p-1 text-center"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          ₱{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          ₱{item.subtotal.toFixed(2)}
                        </td>
                        {!isEditMode && (
                          <td className="p-2 text-center">
                            <button
                              onClick={() =>
                                removeItem(item.sku, item.warehouseCode)
                              }
                              className="text-red-600 hover:underline text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        )}
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
                  Close
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
