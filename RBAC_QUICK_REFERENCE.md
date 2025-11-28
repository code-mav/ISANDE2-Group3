# Role-Based Access Control - Quick Reference

## 5 Roles at a Glance

### 🔑 Administrator
- **All Modules** ✅
- Full system access
- For IT & system managers

### 🛒 Purchasing  
- Dashboard ✅
- Inventory ✅
- Stock Requests ✅
- For procurement officers

### 📦 Sales
- Dashboard ✅
- Inventory ✅
- Orders ✅
- For sales representatives

👥 **Staff**
- Inventory ✅
- For warehouse staff

📊 **Manager**
- Dashboard ✅
- Reports ✅
- For supervisors & managers

---

## Getting Started

1. **Open Application** → Home screen appears
2. **Select Your Role** → Click role button showing description
3. **Confirm Role** → Navigation bar updates automatically
4. **Access Modules** → Only your role's modules are visible

---

## Changing Your Role

1. Click **Home** in navigation
2. Click **Change Role**
3. Select new role
4. Navigation updates instantly

---

## What Happens If You Try to Access a Module You Don't Have Access To?

You'll see an "Access Denied" message with an option to:
- Go Back Home
- Select a different role

---

## Your Role is Saved

Your selected role is automatically saved to your browser. When you:
- Refresh the page → Role persists
- Close and reopen browser → Role persists
- Access from different tab → Role persists

---

## Module Descriptions

| Module | Purpose | Use By |
|--------|---------|--------|
| **Dashboard** | KPI overview & performance metrics | Managers, planning |
| **Inventory** | Add/edit/delete items, track stock | Warehouse, procurement |
| **Orders** | Create & manage customer orders | Sales team |
| **Stock Requests** | Submit & track incoming shipments | Procurement team |
| **Reports** | Analytics, PDF export, audit logs | Management |

---

## Admin Only Features

- Access all modules simultaneously
- View all role-level analytics
- Manage complete system operations
- Audit all user actions across system

---

## Common Scenarios

### Scenario 1: Purchasing Officer
- Arrives at system
- Selects "Purchasing" role
- Sees Dashboard, Inventory, Stock Requests
- Cannot access Orders or Reports
- Can manage stock requests and inventory planning

### Scenario 2: Sales Rep
- Arrives at system  
- Selects "Sales" role
- Sees Dashboard, Inventory, Orders
- Cannot access Stock Requests or Reports
- Can create orders and check inventory

### Scenario 3: Warehouse Staff
- Arrives at system
- Selects "Staff" role
- Only sees Inventory module
- Cannot access any other modules
- Can update inventory items and stock levels

### Scenario 4: Operations Manager
- Arrives at system
- Selects "Manager" role
- Sees Dashboard and Reports
- Cannot access operational modules
- Can review KPIs and generate analytics reports

---

## Key Features of RBAC System

✅ **Role Selection on Home Screen** - Choose role on startup
✅ **Dynamic Navigation** - Only see accessible modules
✅ **Route Protection** - Can't access restricted routes directly
✅ **Role Persistence** - Role saved across sessions
✅ **Visual Feedback** - Clear "Access Denied" messages
✅ **Easy Role Switching** - Change roles anytime from home

---

## Browser Compatibility

Works on all modern browsers supporting:
- localStorage (for role persistence)
- React 18+
- JavaScript enabled

---

## Questions?

Refer to the full **USER_MANUAL.md** for detailed module documentation.
