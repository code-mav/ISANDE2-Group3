import NotificationsModule from "../components/notificationsmodule";

export function meta() {
  return [
    { title: "Notifications - IMS" },
    { name: "description", content: "View system alerts and low-stock warnings" },
  ];
}

export default function NotificationsRoute() {
  return <NotificationsModule />;
}
