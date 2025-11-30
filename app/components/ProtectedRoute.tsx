import { useRole } from "~/contexts/RoleContext";
import { Navigate } from "react-router";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedModules: string[];
}

export function ProtectedRoute({ children, allowedModules }: ProtectedRouteProps) {
  const { role } = useRole();

  const moduleAccess: Record<string, string[]> = {
    admin: ["dashboard", "inventory", "orders", "stockrequests", "reports"],
    purchasing: ["dashboard", "inventory", "stockrequests"],
    sales: ["dashboard", "inventory", "orders"],
    staff: ["inventory"],
    manager: ["dashboard", "reports"],
  };

  // If no role is selected, require role selection first
  if (!role) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = allowedModules.some((module) =>
    moduleAccess[role]?.includes(module)
  );

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5DC]">
        <div className="bg-white shadow-2xl rounded-3xl p-12 max-w-xl text-center border border-[#E0DCC7]">
          <h1 className="text-4xl font-extrabold text-[#0A400C]">Access Denied</h1>
          <p className="mt-4 text-lg text-[#5C6844]">
            Your role <span className="font-semibold text-red-600">{role}</span> does not have access to this module.
          </p>
          <a
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-[#0A400C] text-white font-medium rounded-lg hover:bg-green-900 transition"
          >
            Go Back Home
          </a>
        </div>
      </div>
    );
  }

  return children;
}
