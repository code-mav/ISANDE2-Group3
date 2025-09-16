// routes/home.tsx

import HomePage from "../components/homepage";

export function meta() {
  return [
    { title: "Inventory Management System" },
    { name: "description", content: "Welcome to IMS!" },
  ];
}

export default function Home() {
  return <HomePage />;
}
