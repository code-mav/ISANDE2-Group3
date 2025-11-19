import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";
import { useState } from "react";
import { Bell } from "lucide-react";
import "./app.css";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const alerts = [
    { warehouse: "Warehouse A", supply: "Generator" },
    { warehouse: "Warehouse B", supply: "Rice Mill" },
  ];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[#F5F5DC] text-gray-800 font-inter">

        {/* Navigation Bar */}
        <nav className="bg-[#0A400C] text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex flex-wrap justify-center gap-6 flex-1">
            {[
              { to: "/", label: "Home" },
              { to: "/dashboard", label: "Dashboard" },
              { to: "/inventory", label: "Inventory" },
              { to: "/orders", label: "Orders" },
              { to: "/stockrequests", label: "Stock Requests" },
              { to: "/reports", label: "Reports" },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `transition hover:underline ${
                    isActive
                      ? "font-semibold underline decoration-2 underline-offset-4 text-[#D6D1B1]"
                      : "text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          
          {/* Notification Bell Icon */}
          <div className="relative ml-4">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 hover:bg-[#0A400C]/80 rounded-full transition"
            >
              <Bell className="h-6 w-6" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg p-4 z-20">
                  <h3 className="font-semibold text-[#0A400C]">Notifications</h3>
                  <p className="text-sm text-[#819067] mt-1">Alerts for low-stock items.</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto mt-3">
                    {alerts.map((a, i) => (
                      <div key={i} className="bg-white shadow rounded-lg p-3 border-l-4 border-[#0A400C]">
                        <p className="text-sm text-[#0A400C]">
                          {a.warehouse} has low stocks of <span className="font-semibold">{a.supply}</span>.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 p-6 min-h-screen">{children}</main>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: any) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-gray-800">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
