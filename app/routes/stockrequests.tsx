import StockRequestsModule from "../components/stockrequestsmodule";

export function meta() {
  return [
    { title: "Stock Requests - IMS" },
    { name: "description", content: "View and manage internal stock requests" },
  ];
}

export default function StockRequestsRoute() {
  return <StockRequestsModule />;
}
