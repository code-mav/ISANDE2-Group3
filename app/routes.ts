import { index } from "@react-router/dev/routes";

export default [
  index("./components/homepage.tsx"),
  { path: "dashboard", file: "./components/dashboard.tsx" },
  { path: "inventory", file: "./components/inventorymodule.tsx" },
  { path: "orders", file: "./components/ordersmodule.tsx" },
  { path: "stockrequests", file: "./components/stockrequestsmodule.tsx" },
  { path: "notifications", file: "./components/notificationsmodule.tsx" },
  { path: "reports", file: "./components/reportsmodule.tsx" },

  { path: "api/orders", file: "./routes/api/orders.tsx" },
  { path: "api/items", file: "./routes/api/items.tsx" },
];
