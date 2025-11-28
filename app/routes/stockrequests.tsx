import StockRequestsModule from "../components/stockrequestsmodule";
import { ProtectedRoute } from "~/components/ProtectedRoute";

export function meta() {
  return [
    { title: "Stock Requests - IMS" },
    { name: "description", content: "View and manage internal stock requests" },
  ];
}

export default function StockRequestsRoute() {
  return (
    <ProtectedRoute allowedModules={["stockrequests"]}>
      <StockRequestsModule />
    </ProtectedRoute>
  );
}
