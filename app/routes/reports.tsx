import ReportsModule from "../components/reportsmodule";

export function meta() {
  return [
    { title: "Reports - IMS" },
    { name: "description", content: "View and generate reports" },
  ];
}

export default function ReportsRoute() {
  return <ReportsModule />;
}
