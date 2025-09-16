// components/homepage.tsx

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5DC]">
      <div className="bg-white shadow-2xl rounded-3xl p-12 max-w-xl text-center border border-[#E0DCC7]">
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
          Manage your <span className="font-semibold">Inventory</span>, 
          streamline <span className="font-semibold">Procurement</span>, and generate insightful <span className="font-semibold">Reports</span>.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex justify-center gap-6">
          <a
            href="/inventory"
            className="px-6 py-3 bg-[#0A400C] text-white font-medium rounded-lg hover:bg-green-900 transition"
          >
            Get Started
          </a>
          <a
            href="/reports"
            className="px-6 py-3 bg-[#E0DCC7] text-[#0A400C] font-medium rounded-lg hover:bg-[#D6D1B1] transition"
          >
            View Reports
          </a>
        </div>
      </div>
    </div>
  );
}
