# Role-Based Access Control (RBAC) Implementation

## Overview
This document describes the role-based access control system implemented in the Inventory Management System. The system allows users to select their role on the home screen, which determines which modules they can access.

## Architecture

### 1. RoleContext (`app/contexts/RoleContext.tsx`)
Central context provider for managing user roles globally across the application.

**Features:**
- `UserRole` type: Union of "admin" | "purchasing" | "sales" | "staff" | "manager" | null
- `RoleProvider` component: Wraps the application to provide role context
- `useRole()` hook: Access and manage the current user role
- `useHasAccess()` hook: Check if current user has access to a specific module
- `useAccessibleModules()` hook: Get list of modules accessible to current role
- **Persistence**: Saves role selection to localStorage for cross-session persistence

**Module Access Configuration:**
```typescript
admin: ["dashboard", "inventory", "orders", "stockrequests", "reports"]
purchasing: ["dashboard", "inventory", "stockrequests"]
sales: ["dashboard", "inventory", "orders"]
staff: ["inventory"]
manager: ["dashboard", "reports"]
```

### 2. ProtectedRoute Component (`app/components/ProtectedRoute.tsx`)
Wrapper component that enforces route-level access control.

**Features:**
- Validates user role against required modules
- Redirects unauthorized users to home screen
- Displays "Access Denied" message with clear explanation
- Prevents unauthorized access to protected routes

**Usage:**
```tsx
<ProtectedRoute allowedModules={["inventory"]}>
  <InventoryContent />
</ProtectedRoute>
```

### 3. Updated Homepage (`app/components/homepage.tsx`)
Home screen now includes interactive role selection interface.

**Features:**
- Displays 5 role options with descriptions
- Shows current selected role
- Allows changing roles via "Change Role" button
- Navigates to dashboard after role selection
- Responsive design with TailwindCSS styling

### 4. Updated Root Layout (`app/root.tsx`)
Navigation bar now respects role-based access control.

**Features:**
- Wrapped with `RoleProvider` for global role context
- Dynamically filters navigation links based on user role
- Only shows accessible modules in top navigation bar
- Maintains notification system (Bell icon) for all roles
- Automatically updates navigation when role changes

## Protected Routes

All route components have been wrapped with `ProtectedRoute`:

| Route | File | Protected Modules | Accessible Roles |
|-------|------|------------------|------------------|
| Dashboard | `app/routes/dashboard.tsx` | dashboard | admin, purchasing, sales, manager |
| Inventory | `app/routes/inventory.tsx` | inventory | admin, purchasing, sales, staff |
| Orders | `app/routes/orders.tsx` | orders | admin, sales |
| Stock Requests | `app/routes/stockrequests.tsx` | stockrequests | admin, purchasing |
| Reports | `app/routes/reports.tsx` | reports | admin, manager |

## User Flow

### 1. First-Time Access
```
→ Open Application
→ Home Screen (Role Selection)
→ Select Role (e.g., "Purchasing")
→ Role saved to localStorage
→ Navigate to Dashboard
→ Navigation bar shows only accessible modules
```

### 2. Subsequent Access
```
→ Open Application
→ Home Screen shows current role from localStorage
→ Click "Go to Dashboard"
→ Dashboard loads with role-based access
→ Navigation bar filtered by role
```

### 3. Unauthorized Access Attempt
```
→ Try to access restricted route (e.g., Staff accessing Orders)
→ ProtectedRoute component detects no access
→ "Access Denied" page displays
→ User can return to home or change role
```

### 4. Role Change
```
→ Click "Home" in navigation
→ Click "Change Role"
→ Select new role
→ Navigation bar updates
→ localStorage updated with new role
```

## Data Flow

```
┌─────────────────────────────────────┐
│  RoleProvider (app/root.tsx)        │
│  - Manages role state              │
│  - Persists to localStorage        │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┬────────────────┐
    │                 │                │
    ▼                 ▼                ▼
┌────────┐   ┌──────────────┐   ┌──────────┐
│Homepage│   │root Layout   │   │useRole() │
│        │   │- Nav Links   │   │ Hook     │
│Select  │   │- Filter by   │   │          │
│Role    │   │  role        │   │Access    │
└────────┘   └──────────────┘   │modules   │
    │             │              └──────────┘
    └─────────────┼──────────────────┘
                  │
         ┌────────▼────────────┐
         │ ProtectedRoute      │
         │ - Check access      │
         │ - Allow/Deny route  │
         └─────────────────────┘
```

## localStorage Key
- **Key**: `userRole`
- **Value**: One of "admin" | "purchasing" | "sales" | "staff" | "manager"
- **Cleared**: When user selects "Change Role" and clears selection

## Styling
All role selection elements use the existing color scheme:
- Primary Green: `#0A400C`
- Background: `#F5F5DC`
- Border: `#E0DCC7`
- Accent: `#D6D1B1`

## Testing Scenarios

### Test 1: Admin Access
1. Select "Admin" role
2. Verify all modules appear in navigation
3. Access each route - all should work

### Test 2: Purchasing Access
1. Select "Purchasing" role
2. Verify navigation shows: Home, Dashboard, Inventory, Stock Requests
3. Try to access Orders route - should show "Access Denied"
4. Try to access Reports route - should show "Access Denied"

### Test 3: Sales Access
1. Select "Sales" role
2. Verify navigation shows: Home, Dashboard, Inventory, Orders
3. Try to access Stock Requests - should show "Access Denied"
4. Try to access Reports - should show "Access Denied"

### Test 4: Staff Access
1. Select "Staff" role
2. Verify only Inventory appears in navigation (besides Home)
3. Try to access Dashboard - should show "Access Denied"

### Test 5: Manager Access
1. Select "Manager" role
2. Verify navigation shows: Home, Dashboard, Reports
3. Try to access Inventory - should show "Access Denied"

### Test 6: Role Persistence
1. Select "Purchasing" role
2. Refresh page (F5)
3. Verify role is still "Purchasing" and localStorage contains saved role
4. Navigate through application
5. Close browser and reopen
6. Verify role persists across sessions

### Test 7: Role Change
1. Select initial role
2. Click "Change Role" on home screen
3. Select different role
4. Verify navigation updates immediately
5. Verify new role is saved to localStorage

## Future Enhancements

1. **Database-Backed Roles**: Store user roles in MongoDB instead of localStorage
2. **User Management**: Admin interface to create users and assign roles
3. **Audit Logging**: Track role changes and access attempts
4. **Multi-Tenant Support**: Different role configurations per tenant
5. **Fine-Grained Permissions**: Module + action level (e.g., "read inventory" vs "edit inventory")
6. **Role Descriptions in Database**: Make role descriptions dynamic
7. **Default Role Assignment**: Automatic role based on user email domain

## Troubleshooting

### Role Not Persisting
- Check browser's localStorage in DevTools
- Verify `userRole` key is being set
- Check if browser privacy settings are blocking localStorage

### Navigation Not Updating
- Refresh the page (F5)
- Clear browser cache and localStorage
- Verify RoleProvider is wrapping the entire app

### Access Denied on All Routes
- Check that a role is selected (should show on home screen)
- Verify role name matches one of the 5 valid roles
- Clear localStorage and select role again

### Style Issues
- Ensure TailwindCSS is properly configured
- Check that color variables are correct
- Verify component imports are correct
