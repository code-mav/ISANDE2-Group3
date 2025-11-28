import ReportsModule from "../components/reportsmodule";
import { ProtectedRoute } from "~/components/ProtectedRoute";

export function meta() {
  return [
    { title: "Reports - IMS" },
    { name: "description", content: "View and generate reports" },
  ];
}

export default function ReportsRoute() {
  return (
    <ProtectedRoute allowedModules={["reports"]}>
      <ReportsModule />
    </ProtectedRoute>
  );
}
