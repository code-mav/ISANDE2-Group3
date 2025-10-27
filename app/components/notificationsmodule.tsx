export default function NotificationsModule() {
  const alerts = [
    { warehouse: "Warehouse A", supply: "Generator" },
    { warehouse: "Warehouse B", supply: "Rice Mill" },
  ];

  return (
    <div className="p-6 bg-[#FAF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0A400C]">Notifications</h1>
      <p className="mt-2 text-[#819067]">Alerts for low-stock items.</p>

      <div className="mt-6 space-y-4">
        {alerts.map((a, i) => (
          <div key={i} className="bg-white shadow rounded-2xl p-4 border-l-4 border-[#0A400C]">
            <p className="text-[#0A400C] font-medium">
              {a.warehouse} has low stocks of <span className="font-semibold">{a.supply}</span>.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
