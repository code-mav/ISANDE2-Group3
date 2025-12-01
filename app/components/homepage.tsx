import { useRole, type UserRole } from "~/contexts/RoleContext";
import { useNavigate } from "react-router";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrator", description: "Full access to all modules" },
  { value: "purchasing", label: "Purchasing", description: "Dashboard, Inventory, Stock Requests" },
  { value: "sales", label: "Sales", description: "Dashboard, Inventory, Orders" },
  { value: "staff", label: "Staff", description: "Inventory access only" },
  { value: "manager", label: "Manager", description: "Dashboard, Inventory, Reports" },
];

export default function HomePage() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    navigate("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5DC]">
      <div className="bg-white shadow-2xl rounded-3xl p-12 max-w-2xl text-center border border-[#E0DCC7]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo2.png"
            alt="Jerton Industrial Logo"
            className="h-20 w-20 rounded-full shadow-lg object-cover"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-[#0A400C]">
          Welcome to Jerton Industrial Sales Corporation
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-lg text-[#5C6844]">
          Manage your <span className="font-semibold">Inventory</span>, streamline{" "}
          <span className="font-semibold">Procurement</span>, and generate insightful{" "}
          <span className="font-semibold">Reports</span>.
        </p>

        {/* Role Selection */}
        {!role ? (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-[#0A400C] mb-6">Select Your Role</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLES.map((roleOption) => (
                <button
                  key={roleOption.value}
                  onClick={() => handleRoleSelect(roleOption.value)}
                  className="p-4 border-2 border-[#E0DCC7] rounded-lg hover:border-[#0A400C] hover:bg-[#F9F8F4] transition text-left group"
                >
                  <div className="font-semibold text-[#0A400C] group-hover:text-green-700">
                    {roleOption.label}
                  </div>
                  <div className="text-sm text-[#5C6844] mt-1">{roleOption.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-10">
            <div className="bg-[#F9F8F4] rounded-lg p-6 mb-6">
              <p className="text-[#0A400C] font-semibold">
                Current Role:{" "}
                <span className="text-green-700">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </p>
            </div>
            <div className="flex justify-center gap-6">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 bg-[#0A400C] text-white font-medium rounded-lg hover:bg-green-900 transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => setRole(null)}
                className="px-6 py-3 bg-[#E0DCC7] text-[#0A400C] font-medium rounded-lg hover:bg-[#D6D1B1] transition"
              >
                Change Role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
