import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";
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
        <nav className="bg-[#0A400C] text-white p-4 flex flex-wrap justify-center gap-6 shadow-md">
          {[
            { to: "/", label: "Home" },
            { to: "/dashboard", label: "Dashboard" },
            { to: "/inventory", label: "Inventory" },
            { to: "/orders", label: "Orders" },
            { to: "/stockrequests", label: "Stock Requests" },
            { to: "/notifications", label: "Notifications" },
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
