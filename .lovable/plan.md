

# JedOMS — Frontend Dashboard Build Plan

## Overview
Build the complete React Vite SPA frontend for JedOMS — an operations management dashboard for an Apple product reselling business. The UI uses a **black (#111111) sidebar**, professional data-dense design, light/dark mode, and mock data throughout (API connection happens later in Cursor).

---

## Phase 1: Foundation & Layout

### App Shell & Navigation
- **Black sidebar** (#111111) with logo/app name, navigation links with icons for: Dashboard, Orders, Inventory, Sales, Payments, Settings
- Sidebar collapses to icon-only on smaller screens (≤1279px)
- **Top header bar** with page title, date range filter, dark/light mode toggle, and user avatar/role badge
- Active nav item highlighted white, inactive in gray (#9CA3AF)
- Overdue payment **badge counter** on the Payments nav item

### Authentication Pages
- **Login page** — clean centered form with email + password, error messaging, loading state
- Auth context with mock user (role: admin/editor/viewer) stored in React Context
- Protected route wrapper that redirects unauthenticated users to /login
- Role-based UI rendering (viewers see no edit buttons, editors see no delete buttons)

### Design System
- Primary color: black (#111111), with the full color palette from the PRD (red for alerts, green for success, amber for warnings)
- Light mode: #F9FAFB content background, white cards
- Dark mode: dark backgrounds with appropriate contrast
- Consistent status badges using color AND text (shipping, received, failed, paid, unpaid, overdue, etc.)

---

## Phase 2: Dashboard Home

### Metric Cards Row
- Total Orders (shipping/received), Total Inventory (good/damaged/lost), Total Revenue, Net Profit, Profit Margin %, Overdue Payments count
- All cards show ₱ currency formatting for monetary values
- Each card is clickable — navigates to the relevant module
- Skeleton loading states

### Dashboard Charts (Recharts)
- Orders trend line chart
- Revenue trend line chart  
- Inventory status pie chart
- Cost breakdown pie chart
- All charts filterable by date range (default: last 30 days)

---

## Phase 3: Orders Module

### Orders Table
- Columns: Order ID (OD-YYYYMMDD-XXX format), Supplier, Product, Qty, Import Cost (₱), Shipping Status badge, Pay Status badge, Order Date
- Sortable, filterable by status/supplier/date range
- Clickable Order IDs link to detail view
- Empty state with illustration when no orders exist

### Order Form (Dialog)
- Fields: Supplier dropdown, Agent dropdown, Product Type, Product Name, Quantity, Import Unit Price (¥), Exchange Rate, Order Date, Notes
- Auto-calculated Import Cost (₱) shown in real-time as user types
- Validation with React Hook Form + Zod

### Order Actions
- "Receive Order" button that prompts for Receival Date and triggers mock inventory creation
- Contact panel showing Agent/Supplier info with mailto: and social links
- Module metric cards: Total Purchased, Shipping, Received, Import Cost, Shipping Fees, Agent Fees

---

## Phase 4: Inventory Module

### Inventory Table & Cards
- Columns: Product ID (PRD-XXX), Product Name, Product Type, Status badge (Good/Damaged/Lost), Linked Order ID, Receival Date
- Metric cards: Total In-Store, Total Good, Total Damaged, Total Lost
- Status pie chart, product type pie chart, inventory trend over time
- Filter by status, product type, date range

### Inventory Management
- Edit inventory status (Good → Damaged/Lost)
- Notes field for damage descriptions
- Link back to source order

---

## Phase 5: Sales Module

### Sales Table & Analytics
- Columns: Sale ID (SL-XXX), Retailer, Product, Qty, Selling Price, Revenue, Net Profit, Delivery Status, Sale Date
- Auto-calculated fields: Revenue = Price × Qty, Net Profit = Revenue − (Wholesale × Qty) − Delivery Fee
- Metric cards: Total Revenue, Total Cost, Net Profit, Margin %, Pending Sales, Refunded Sales
- Charts: Revenue trend, sales trend, cost breakdown pie, revenue by retailer bar chart

### Sale Form
- Retailer dropdown, product selection, quantity, selling price, wholesale price, delivery fee
- Real-time margin calculation preview

---

## Phase 6: Payments Module

### Two-Tab Ledger
- **Tab 1: "Send to Agents"** — amounts owed to agents linked to orders
- **Tab 2: "Receive from Retailers"** — amounts owed by retailers linked to sales
- Overdue rows (7+ days past due) highlighted in red
- Clickable Order/Sale IDs navigate to linked records
- Metric cards: Total Owed to Agents, Total Owed by Retailers

### Payment Status Management
- Mark payments as Paid with date
- Overdue badge count synced with sidebar navigation badge

---

## Phase 7: Settings

### Partners Directory (4 tabs)
- **Suppliers tab**: Name, Contact Person, Phone, Email, Address, Social Channel URL, Shipping Fee
- **Agents tab**: Same fields + Agent Fee %
- **Warehouses tab**: Base contact fields
- **Retailers tab**: Same fields + Preferred Payment Method
- CRUD dialogs for Admin role, read-only for others
- Delete blocked with error if partner is referenced in existing records (mock validation)

### User Management (Admin only)
- List of 3 user accounts with role badges
- Edit role, toggle active status
- Hidden from Editor and Viewer roles

---

## Mock Data
All modules will ship with realistic seed data (suppliers, orders in various statuses, inventory mix, sales, overdue payments) so the dashboard feels complete and testable before the real API is connected.

