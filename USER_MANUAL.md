# Inventory Management System - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Inventory Module](#inventory-module)
5. [Orders Module](#orders-module)
6. [Stock Requests Module](#stock-requests-module)
7. [Reports Module](#reports-module)
8. [Notifications](#notifications)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The **Inventory Management System** is a comprehensive solution designed to help manage inventory across multiple warehouses. It provides real-time tracking of stock levels, order management, stock requests, and detailed reporting capabilities.

### Key Features
- **Multi-warehouse support** with per-warehouse stock tracking
- **Real-time dashboard** with key performance indicators
- **Inventory management** with add, edit, and delete functionality
- **Order management** with warehouse-specific deductions
- **Stock request tracking** for incoming shipments
- **Comprehensive reporting** with PDF export capability
- **Low-stock alerts** via notification system
- **Visual analytics** with charts and graphs

### Supported Warehouses
- **VL1** - Valenzuela Warehouse 1
- **VL2** - Valenzuela Warehouse 2
- **VL3** - Valenzuela Warehouse 3
- **VL4** - Valenzuela Warehouse 4
- **MB1** - Malabon Warehouse 1

---

## Getting Started

### Accessing the Application

1. Open your web browser and navigate to `http://localhost:5173`
2. The application will load to the **Dashboard** screen
3. Use the navigation menu at the top to access different modules

### Main Navigation

The top navigation bar provides access to:
- **Dashboard** - Overview of inventory metrics
- **Inventory** - View and manage inventory items
- **Orders** - Manage customer orders
- **Stock Requests** - Track incoming shipments
- **Reports** - View audit logs and generate reports
- **Notifications** (bell icon) - View low-stock alerts

---

## Dashboard

The Dashboard is your command center, displaying key metrics and visual analytics.

### Dashboard Metrics

The top section displays four key tiles:

1. **Total Items** - Total number of distinct SKUs in inventory
2. **Low Stock Items** - Items with stock levels ≤ 5 units
3. **Incoming Shipments** - Stock requests with status "Pending" or "In Transit"
4. **Pending Orders** - Orders with status "Pending" or "Processing"

### Charts

#### Stock Levels by Item (Bar Chart)
- Shows inventory status distribution
- Green bars indicate "Available" items
- Red bars indicate "Low Stock" or "Out of Stock" items
- Helps identify stock level patterns across inventory

#### Stock by Warehouse (Pie Chart)
- Displays total stock quantity per warehouse
- Each warehouse is color-coded for easy identification
- Shows distribution of inventory across all warehouses
- Useful for understanding warehouse capacity utilization

### Color Coding
- **#0A400C** (Dark Green) - VL1/Primary warehouse
- **#DC2626** (Red) - VL2
- **#2563EB** (Blue) - VL3
- **#F59E0B** (Amber) - VL4
- **#8B5CF6** (Purple) - MB1

---

## Inventory Module

The Inventory Module allows you to manage all inventory items across warehouses.

### Viewing Inventory

1. Click **Inventory** in the main navigation
2. The inventory table displays all items with the following columns:
   - **#** - Row number
   - **SKU** - Stock Keeping Unit (unique identifier)
   - **Item Name** - Name of the product
   - **Category** - Product category
   - **Warehouse** - Primary warehouse location
   - **Stock** - Quantity per warehouse (color-coded badges)
   - **Unit Price (₱)** - Price per unit in Philippine Pesos
   - **Status** - Availability status (Available/Low Stock/Out of Stock)
   - **Note** - Additional notes about the item
   - **Actions** - Edit/Delete buttons

### Filtering and Searching

**Search by:**
- SKU (product code)
- Item name
- Any searchable field in the table

**Filter by:**
- **Warehouse** - Filter items by warehouse location
- **Warehouse Code** - Filter by specific warehouse code (VL1, VL2, etc.)
- **Category** - Filter by product category

**Sort by:**
- **Newest** - Recently added items
- **Oldest** - Oldest items in system
- **By Stock** - Prioritizes low stock items (ascending order)

### Adding a New Item

1. Click the **Add Item** button in the inventory header
2. Fill in the required fields:
   - **SKU** - Unique product identifier (required)
   - **Item Name** - Product name (required)
   - **Category** - Select from available categories
   - **Warehouse** - Select one or multiple warehouses
   - **Stock** - Initial quantity
   - **Unit Price** - Price per unit (₱)
   - **Status** - Set to Available/Low Stock/Out of Stock
   - **Note** - Additional information (optional)
3. Click **Save** to add the item

### Editing an Item

1. Click the **Edit** button (pencil icon) on the item row
2. Modify the desired fields
3. For **per-warehouse stock**:
   - Stock is displayed as warehouse-specific quantities
   - Update stock for each warehouse separately
4. Click **Save Changes** to update
5. The system logs this as an "Updated" action in Reports

### Deleting an Item

1. Click the **Delete** button (trash icon) on the item row
2. Confirm the deletion when prompted
3. The item will be removed from inventory
4. This action is logged in Reports

### Stock Status Indicators

- **Red Badge (≤5 units)** - Low stock alert
- **Green Badge (>5 units)** - Adequate stock
- **Available** - Item is in stock
- **Low Stock** - Total stock ≤ 5 units
- **Out of Stock** - Total stock = 0 units

### Stock Display Format

Stock is shown per warehouse with the format:
```
VL1: 10  VL2: 5  VL3: 15
```

---

## Orders Module

The Orders Module manages customer orders with warehouse-specific inventory deduction.

### Viewing Orders

1. Click **Orders** in the main navigation
2. View all orders with columns:
   - **#** - Row number
   - **SKU** - Product code
   - **Item Name** - Product name
   - **Warehouse** - Warehouse from which order will be fulfilled
   - **Qty** - Quantity ordered
   - **Unit Price (₱)** - Price per unit
   - **Subtotal (₱)** - Qty × Unit Price
   - **Remove** - Delete order item button

### Creating a New Order

1. Click the **Add Order** button
2. In the modal:
   - **Select items** by clicking warehouse-specific items
   - Items display as "ItemName (WH: qty)" to show availability
   - Click items to add them to the order
3. For each item, confirm or adjust:
   - **Warehouse** - Select which warehouse to deduct from
   - **Quantity** - Enter quantity to order
4. Review the order summary showing:
   - Item count
   - Total items selected
5. Click **Create Order** to finalize
6. The system will:
   - Deduct quantities from specified warehouses
   - Create an audit log entry
   - Update inventory levels in real-time

### Inventory Deduction Logic

When an order is placed:
1. System checks if item is available in selected warehouse
2. Deducts exact quantity from specified warehouse
3. If warehouse not specified, deducts from any available warehouse
4. Logs transaction in audit trail with before/after stock levels

### Order Status

Orders display status:
- **Pending** - Order created, awaiting processing
- **Processing** - Order being fulfilled
- **Completed** - Order fulfilled
- **Cancelled** - Order cancelled

---

## Stock Requests Module

The Stock Requests Module tracks incoming shipments and replenishment requests.

### Viewing Stock Requests

1. Click **Stock Requests** in the main navigation
2. View pending and received shipments with columns:
   - **#** - Row number
   - **Request ID** - Unique identifier
   - **Warehouse** - Destination warehouse
   - **SKU** - Product code
   - **Item Name** - Product name
   - **Qty** - Quantity requested
   - **Status** - Current status (Pending/In Transit/Delivered/Cancelled)
   - **Actions** - Update status

### Creating a Stock Request

1. Click the **Request Stock** button
2. In the modal:
   - **Select items** for replenishment
   - Items show: "ItemName (WH: qty)" with current stock
   - Click to select items
3. For each item:
   - **Warehouse** - Select destination warehouse
   - **Quantity** - Enter requested quantity
4. Review selected items
5. Click **Create Request** to submit
6. System logs this as a "Stock Request" action

### Updating Stock Request Status

1. Click the **Update Status** button on a stock request
2. Select new status:
   - **Pending** - Request submitted
   - **In Transit** - Shipment on the way
   - **Delivered** - Items received and added to inventory
3. When status changes to **Delivered**:
   - Stock is automatically added to the selected warehouse
   - Inventory levels update in real-time
   - Audit log entry is created with before/after stock

### Stock Request Workflow

```
Create Request
      ↓
Pending (submitted)
      ↓
In Transit (en route)
      ↓
Delivered (received & applied)
      ↓
Stock quantity updated in warehouse
```

---

## Reports Module

The Reports Module provides audit logging, filtering, and PDF export capabilities.

### Audit Log

All inventory actions are logged with:
- **Date/Time** - Timestamp of action
- **Action** - Type of action (Created/Updated/Deleted/Order/Stock Request)
- **Ref ID** - Order or Stock Request ID (if applicable)
- **SKU** - Product code
- **Item** - Product name
- **Before** - Stock quantity before action
- **After** - Stock quantity after action
- **Change** - Numeric change (delta)
- **Note** - Additional notes

### Filtering Logs

**Search by:**
- SKU - Product code
- Item name
- Reference ID - Order or request ID

**Filter by Action:**
- **All** - All actions
- **Created** - New items added
- **Updated** - Item modifications
- **Deleted** - Items removed
- **Orders** - Order transactions
- **Stock Requests** - Stock request transactions

### Deleting Logs

1. Select logs using checkboxes (✓)
2. Click **Select All** to select all visible logs
3. Click **Delete Selected**
4. Confirm deletion when prompted
5. Deleted logs cannot be recovered

### Pagination

- View 20 logs per page
- Navigate using **Prev** and **Next** buttons
- Current page indicator shows "Page X of Y"

### Generating Reports

#### Report Date Range

1. Set report dates:
   - **From Date** - Start date for report
   - **To Date** - End date for report

2. Quick range buttons:
   - **Today** - Current date
   - **This Week** - Monday to Sunday
   - **This Month** - 1st to last day of month

3. Click **Generate Report** to create report

#### Report Contents

Generated reports include:

**Inventory Summary:**
- Total SKUs
- Total units
- Low stock items count
- Out of stock items count

**Orders Summary:**
- Total orders in period
- Total amount (₱)
- Orders by status breakdown

**Stock Requests Summary:**
- Total stock requests
- Requests by status breakdown

**Detailed Tables:**
- Orders in Period (date, ID, customer, status, amount)
- Stock Requests in Period (date, ID, requester, warehouse, status)
- Inventory Snapshot (current state of all items with per-warehouse stock)

### Exporting to PDF

1. Generate report (see above)
2. Click **Download PDF** button
3. PDF file downloads with format: `inventory-report_YYYY-MM-DD_to_YYYY-MM-DD.pdf`
4. PDF includes:
   - Report title and generation date
   - Period covered
   - All summary sections
   - Detailed transaction tables
   - Current inventory snapshot

#### PDF Format

- **Font Size:** Optimized for readability (13pt headings, 9-10pt body, 8pt tables)
- **Line Spacing:** Adequate spacing between lines
- **Page Breaks:** Automatic when content exceeds page height
- **Currency:** "P" prefix for Philippine Peso amounts
- **Date Format:** YYYY-MM-DD with "to" separator

---

## Notifications

Low-stock alerts keep you informed of inventory levels requiring attention.

### Accessing Notifications

1. Click the **Bell Icon** (🔔) in the top right navigation
2. View dropdown list of low-stock items
3. Red badge shows count of low-stock items

### Low-Stock Alert Criteria

Items are flagged as low-stock when:
- Total stock across all warehouses ≤ 5 units

### Notification Display

Each notification shows:
- **Item Name** - Product name
- **Total Stock** - Combined stock from all warehouses
- **Per-Warehouse Breakdown** - Stock quantity per warehouse:
  ```
  VL1: 2  VL2: 3  VL3: 0
  ```

### Auto-Refresh

- Notifications refresh every **30 seconds**
- Badge count updates automatically
- No manual refresh needed

### Taking Action

From the notifications panel:
1. Note the low-stock item
2. Navigate to **Inventory** module
3. Click **Edit** on the item
4. Increase stock quantity or create a **Stock Request**

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Dashboard shows "Loading data..."
- **Solution:** Wait for the page to fully load (typically 2-3 seconds)
- Check your internet connection
- Refresh the page if loading persists

#### Issue: Items not appearing in inventory
- **Solution:** 
  - Clear any active filters (set filter to "All")
  - Check search box is empty
  - Try refreshing the page (Ctrl+R or Cmd+R)

#### Issue: Cannot add new item - Save button disabled
- **Solution:**
  - Ensure SKU field is filled (required)
  - Ensure Item Name is filled (required)
  - Check that quantity is a valid number
  - At least one warehouse must be selected

#### Issue: Order deduction shows unexpected stock change
- **Solution:**
  - Verify the correct warehouse was selected for deduction
  - Check if item had per-warehouse stock
  - Review audit log in Reports to see exact changes

#### Issue: Stock Request status won't update to "Delivered"
- **Solution:**
  - Ensure warehouse is properly selected
  - Check that quantity is a valid number
  - Try refreshing and attempting again
  - Check browser console for error messages

#### Issue: PDF export shows broken characters
- **Solution:**
  - This should not occur with current version
  - If issue persists, try again with smaller date range
  - Report to system administrator

#### Issue: Notifications not updating
- **Solution:**
  - Notifications refresh every 30 seconds
  - Manually refresh page to force update
  - Check that items actually have stock ≤ 5 units
  - Try clearing browser cache

#### Issue: Cannot delete item from inventory
- **Solution:**
  - Ensure no active orders reference the item
  - Check user permissions
  - Try refreshing page and attempting again

### Getting Help

If you encounter issues not covered in this manual:
1. Check the browser console for error messages (F12)
2. Note the exact steps that caused the issue
3. Contact your system administrator with:
   - Error message (if any)
   - Steps to reproduce
   - Screenshot of the issue

---

## Best Practices

### Inventory Management
1. **Regular Updates** - Update stock levels regularly to maintain accuracy
2. **Batch Operations** - Group similar items when creating stock requests
3. **Naming Conventions** - Use consistent SKU format (e.g., PROD-001)
4. **Category Organization** - Use consistent categories for easy filtering

### Order Processing
1. **Verify Stock** - Check availability before creating orders
2. **Select Correct Warehouse** - Ensure you deduct from intended warehouse
3. **Review Before Submit** - Double-check items and quantities before creating order

### Stock Requests
1. **Plan Ahead** - Create stock requests before items become critical
2. **Monitor Status** - Track stock requests until delivery
3. **Verify Receipt** - Update status to "Delivered" upon receipt

### Reporting
1. **Regular Reports** - Generate weekly reports for business insights
2. **Archive PDFs** - Keep historical PDF reports for audit trail
3. **Review Trends** - Analyze reports to identify inventory patterns

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Refresh Page | Ctrl+R (Windows) or Cmd+R (Mac) |
| Open Browser Console | F12 |
| Search in Page | Ctrl+F (Windows) or Cmd+F (Mac) |

---

## System Requirements

- **Browser:** Modern browser (Chrome, Firefox, Safari, Edge)
- **JavaScript:** Must be enabled
- **Screen Resolution:** Minimum 1024x768 (1366x768 recommended)
- **Internet Connection:** Required for real-time data sync

---

## Support and Contact

For technical support or feature requests:
1. Contact your system administrator
2. Provide detailed information about the issue
3. Include screenshots when possible
4. Note the steps taken before the issue occurred

---

**Version:** 1.0  
**Last Updated:** November 28, 2025  
**System:** Inventory Management System v1.0
