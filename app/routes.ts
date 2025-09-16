import { index } from "@react-router/dev/routes";

export default [
  index("./components/homepage.tsx"),       // Home page at "/"
  { path: "inventory", file: "./components/inventorymodule.tsx" },
  //{ path: "procurement", file: "./routes/procurement.tsx" },
  //{ path: "reports", file: "./routes/reports.tsx" },
];
