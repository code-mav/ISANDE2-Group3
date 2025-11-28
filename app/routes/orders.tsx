import OrdersModule from "../components/ordersmodule";
import { ProtectedRoute } from "~/components/ProtectedRoute";

export function meta() {
  return [
    { title: "Orders - IMS" },
    { name: "description", content: "Manage and track customer orders" },
  ];
}

export default function OrdersRoute() {
  return (
    <ProtectedRoute allowedModules={["orders"]}>
      <OrdersModule />
    </ProtectedRoute>
  );
}
