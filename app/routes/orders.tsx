import OrdersModule from "../components/ordersmodule";

export function meta() {
  return [
    { title: "Orders - IMS" },
    { name: "description", content: "Manage and track customer orders" },
  ];
}

export default function OrdersRoute() {
  return <OrdersModule />;
}
