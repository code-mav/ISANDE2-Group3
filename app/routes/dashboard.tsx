import Dashboard from "../components/dashboard";
import { ProtectedRoute } from "~/components/ProtectedRoute";

export function meta() {
  return [
    { title: "Dashboard - IMS" },
    { name: "description", content: "View inventory performance overview" },
  ];
}

export default function DashboardRoute() {
  return (
    <ProtectedRoute allowedModules={["dashboard"]}>
      <Dashboard />
    </ProtectedRoute>
  );
}
