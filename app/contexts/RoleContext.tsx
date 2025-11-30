import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "admin" | "purchasing" | "sales" | "staff" | "manager" | null;

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load role from localStorage on client mount only
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("userRole") as UserRole;
      if (savedRole) {
        setRoleState(savedRole);
      }
    }
    setIsHydrated(true);
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole && typeof window !== "undefined") {
      localStorage.setItem("userRole", newRole);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
  };

  const clearRole = () => {
    setRoleState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
  };

  // Don't block rendering during hydration
  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}

// Hook to check if user has access to a module
export function useHasAccess(module: string): boolean {
  const { role } = useRole();

  if (!role) return false;

  const moduleAccess: Record<Exclude<UserRole, null>, string[]> = {
    admin: ["dashboard", "inventory", "orders", "stockrequests", "reports"],
    purchasing: ["dashboard", "inventory", "stockrequests"],
    sales: ["dashboard", "inventory", "orders"],
    staff: ["inventory"],
    manager: ["dashboard", "reports"],
  };

  return moduleAccess[role]?.includes(module) ?? false;
}

// Hook to get all accessible modules for current role
export function useAccessibleModules() {
  const { role } = useRole();

  const modules: Record<Exclude<UserRole, null>, Array<{ to: string; label: string }>> = {
    admin: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/inventory", label: "Inventory" },
      { to: "/orders", label: "Orders" },
      { to: "/stockrequests", label: "Stock Requests" },
      { to: "/reports", label: "Reports" },
    ],
    purchasing: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/inventory", label: "Inventory" },
      { to: "/stockrequests", label: "Stock Requests" },
    ],
    sales: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/inventory", label: "Inventory" },
      { to: "/orders", label: "Orders" },
    ],
    staff: [{ to: "/inventory", label: "Inventory" }],
    manager: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/reports", label: "Reports" },
    ],
  };

  return role ? modules[role] : [];
}
