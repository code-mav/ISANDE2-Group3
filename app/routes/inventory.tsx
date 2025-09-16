// routes/inventory.tsx
import Inventory from "../components/inventorymodule";

export function meta() {
  return [
    { title: "Inventory - IMS" },
    { name: "description", content: "Manage your inventory items" },
  ];
}

export default function InventoryRoute() {
  return <Inventory />;
}
