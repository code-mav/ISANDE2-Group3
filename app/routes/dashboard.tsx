import Dashboard from "../components/dashboard";

export function meta() {
  return [
    { title: "Dashboard - IMS" },
    { name: "description", content: "View inventory performance overview" },
  ];
}

export default function DashboardRoute() {
  return <Dashboard />;
}
