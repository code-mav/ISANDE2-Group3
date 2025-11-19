import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";
import { useState, useEffect } from "react";
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

interface Alert {
  warehouse: string;
  supply: string;
  sku: string;
  stock: number;
  status: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch low stock items from inventory
  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        const res = await fetch('/api/items');
        const data = await res.json();
        
        // Filter for low stock and out of stock items
        const lowStockItems = data.filter((item: any) => 
          item.status === "Low Stock" || item.status === "Out of Stock"
        );

        // Format the alerts
        const formattedAlerts = lowStockItems.map((item: any) => ({
          warehouse: Array.isArray(item.warehouseLoc) 
            ? item.warehouseLoc.join(', ') 
            : item.warehouseLoc || 'Unknown',
          supply: item.name,
          sku: item.sku,
          stock: item.stock,
          status: item.status
        }));

        setAlerts(formattedAlerts);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStockItems();
    
    // Optional: Refresh alerts every 30 seconds
    const interval = setInterval(fetchLowStockItems, 30000);
    return () => clearInterval(interval);
  }, []);

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
                    {loading ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : alerts.length === 0 ? (
                      <p className="text-sm text-gray-500">No low stock alerts</p>
                    ) : (
                      alerts.map((a, i) => (
                        <div key={i} className="bg-white shadow rounded-lg p-3 border-l-4 border-[#0A400C]">
                          <p className="text-sm text-[#0A400C]">
                            <span className="font-semibold">{a.supply}</span> ({a.sku})
                          </p>
                          <p className="text-xs text-[#819067] mt-1">
                            {a.warehouse} - Stock: {a.stock} - {a.status}
                          </p>
                        </div>
                      ))
                    )}
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

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }
  throw error;
}

export default function App() {
  return <Outlet />;
}
