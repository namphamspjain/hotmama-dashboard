# JedOMS — Product Requirements Document

---

## Document Control

| Field | Value |
|---|---|
| Document Version | 3.0 |
| Status | Draft |
| Created Date | 2026-02-25 |
| Author | AI-generated based on Jed's input |
| Reviewers | TBD |
| Last Updated | 2026-02-25 |
| App Name | JedOMS (Operations Management System) |
| Stack | React Vite + Supabase + Vercel |
| Frontend Scaffolding | Lovable.dev |
| Local Development | Cursor IDE |

---

## Stack Decision Rationale

This version supersedes v1.0 and v2.0. The final stack — **Lovable.dev (scaffolding) + React Vite (fullstack framework) + Supabase (auth + database + storage) + Vercel (hosting)** — was chosen for three reasons:

1. **Simplicity:** React Vite is a fullstack framework — frontend and API routes live in a single repo, deployed in a single `git push`. No separate server process to host or manage.
2. **Lovable compatibility:** Lovable.dev natively generates React Vite projects with Supabase integration. Zero friction between scaffolding and production stack.
3. **Scale-readiness:** Supabase is a production-grade PostgreSQL platform with Row Level Security (RLS), real-time subscriptions, built-in auth, and a path to enterprise scale — all available on its free tier at MVP.

---

## Table of Contents

1. Executive Summary
2. Product Vision & Goals
3. User Personas & Journey Maps
4. Scope & Boundaries
5. Functional Requirements
6. Non-Functional Requirements
7. System Interaction & Integration Requirements
8. Data Requirements
9. Security & Compliance Requirements
10. UX & Design Requirements
11. Technical Architecture Overview
12. API Surface Overview
13. Database Entity Overview
14. Test Requirements Overview
15. Security Controls Overview
16. Infrastructure & Deployment Overview
17. Development Standards Overview
18. Milestones & Delivery Phases
19. Risks & Mitigations
20. Open Questions & Decisions Log
21. Glossary

---

## Section 1 — Executive Summary

JedOMS is a private, web-based operations management dashboard built for a small Apple product reselling business operating between China (sourcing) and the Philippines (retail distribution). It serves a maximum of three internal users at launch and consolidates four fragmented business functions — order management, inventory tracking, sales monitoring, and payment reconciliation — into a single, secure, real-time interface.

The business currently runs across an informal patchwork of tools: Facebook and WeChat for supplier discovery, manual Excel spreadsheets for costing and currency conversion, screenshot-based payment confirmations across multiple GCash and bank accounts, and no centralized inventory system. This produces compounding blind spots: lost or damaged stock goes untracked, retailer credit terms are managed from memory, RMB-to-PHP exchange rates fluctuate with no reliable lookup system, and in-transit shipments from China have no formal tracking layer. These inefficiencies directly erode profitability and create unnecessary financial risk.

JedOMS solves this by providing a structured, role-authenticated dashboard that tracks the full business lifecycle — from purchase order placement with a Chinese supplier, through agent payment, shipment to a Philippine warehouse, inventory receipt, sale to a retailer, and final payment collection. Every module is interconnected: an order links to inventory, inventory links to a sale, and a sale links to a payment record.

The product is built on **React Vite** (fullstack framework), **Supabase** (PostgreSQL database, authentication, Row Level Security, and future real-time capabilities), and **Vercel** (hosting and CI/CD). Lovable.dev scaffolds the initial frontend; Cursor handles all backend logic, database schema, and production wiring. The total infrastructure cost is $0/month at MVP scale, with a clear paid upgrade path if the product grows beyond a personal tool.

While designed for three users today, JedOMS is architected for scale from day one: the database schema supports multi-tenancy via `organization_id`, Supabase RLS enforces data isolation at the database layer, and the React Vite API routes are organized as discrete service modules that can be extracted into microservices if needed. This means the foundation Jed builds for his personal business can evolve into a B2B SaaS product for other resellers without a rewrite.

This document is the single source of truth for all product and technical decisions and serves as the foundational input for the System Architecture Document, Database Schema, API Specification, Test Strategy, Security Requirements, Development Standards, and Infrastructure & DevOps plan.

---

## Section 2 — Product Vision & Goals

**Product Vision Statement**
To give Apple product resellers complete operational clarity — from Chinese supplier to Philippine retailer — through a single, secure, scalable dashboard that starts free and grows with the business.

**Mission Statement**
JedOMS eliminates the manual, error-prone, memory-dependent workflows that run informal reselling businesses. It replaces spreadsheets, screenshots, and guesswork with structured data, real-time visibility, and automated reconciliation — so business decisions are made from facts, not approximations.

**Business Objectives**

1. Eliminate inventory blind spots: Achieve 100% traceability of every unit from warehouse receipt through sale or loss classification within 30 days of launch.
2. Automate payment reconciliation: Reduce time spent manually tracking retailer credit and payment status by at least 80%, with zero missed overdue accounts.
3. Centralize cost intelligence: Maintain a live, supplier-level cost database with RMB-to-PHP conversion history so that margin calculations require zero manual Excel entry.
4. Provide real-time order visibility: Complete status tracking for every active shipment from China, from order placement through warehouse receipt.
5. Enable accurate profitability reporting: Generate net profit and margin data per transaction, per period, and per retailer.
6. Build a scale-ready foundation: Design the schema and architecture so the product can support multiple organizations (tenants) without a structural rewrite if JedOMS evolves into a SaaS offering.

**Success Criteria**

| KPI | Target | Timeframe |
|---|---|---|
| Inventory discrepancy rate | < 2% vs. physical count | 60 days post-launch |
| Overdue retailer payments missed | 0 | Ongoing |
| Manual Excel cost entries/week | 0 | 30 days post-launch |
| Daily active usage by primary user | ≥ 5 sessions/week | 30 days post-launch |
| System uptime | ≥ 99.9% (Vercel + Supabase SLA) | Ongoing |
| API response time (P95) | < 300ms | At launch |
| Page load (P95, warm) | < 1.5 seconds | At launch |
| Total infrastructure cost | $0/month | Indefinitely at current scale |

---

## Section 3 — User Personas & Journey Maps

### Persona 1 — Jed (Admin / Business Owner)

| Field | Detail |
|---|---|
| Name | Jed |
| Role | Owner-operator, sole decision-maker |
| Demographics | Filipino, late 20s–30s, runs business solo |
| Goals | Know exact inventory, know who owes money, understand true profit margin, never lose track of a shipment |
| Pain Points | Memory-dependent operations, Excel fragility, multi-account payment tracking, manual currency conversion |
| Technical Proficiency | Moderate — comfortable with web apps, uses Facebook, WeChat, GCash daily |
| Access Level | Admin — full read/write/delete across all modules and Settings |

**Day in the Life — Before JedOMS:**
Jed opens a spreadsheet to check which orders are arriving. He manually checks three bank apps and one GCash account to confirm retailer payments. He Googles today's exchange rate and manually recalculates costs. By noon he's forgotten whether one batch counted as received. He has no idea if last month was profitable.

**Day in the Life — After JedOMS:**
Jed opens JedOMS on his laptop. The dashboard shows one order arriving in 3 days. Two retailer payments are flagged overdue. Inventory shows 14 units on hand, good condition. Last month's net profit: ₱18,400 at 22% margin. Supplier B raised unit prices by ¥3 last week — already reflected in pesos. He logs a new sale in under 60 seconds and closes the laptop.

**Primary Journey Map — Receiving a Shipment**

| Step | Action | System Response |
|---|---|---|
| 1 | Jed logs in | Supabase Auth validates session, routes to Dashboard |
| 2 | Checks Orders module | Sees "Shipping" badge on Order OD-041 |
| 3 | Goods arrive at warehouse | Changes status to "Received," enters Receival Date |
| 4 | Saves the change | `POST /api/orders/[id]/receive` auto-creates Inventory records |
| 5 | Reviews inventory | Tags damaged units as "Damaged," confirms quantities |
| 6 | Opens Payments | Marks agent payment for this order as "Paid" |
| 7 | Order fully closed | Orders → Inventory → Payments all updated and linked |

### Persona 2 — Staff / Assistant (Editor)

| Field | Detail |
|---|---|
| Role | Operations assistant, limited data entry rights |
| Access Level | Editor — create/update records, no delete, no User Settings |
| Technical Proficiency | Moderate |

### Persona 3 — Accountant / Partner (Viewer)

| Field | Detail |
|---|---|
| Role | Read-only financial oversight and cross-checking |
| Access Level | Viewer — read-only across all modules |
| Technical Proficiency | Low to moderate |

---

## Section 4 — Scope & Boundaries

### In Scope (MVP)

- React Vite web application with Supabase Auth and three user roles (Admin, Editor, Viewer)
- Row Level Security enforced at the Supabase database layer for all tables
- Orders module: full CRUD, shipping status tracking, agent and supplier contact management, cost history with exchange rate
- Inventory module: receipt tracking, product condition tagging (Good / Damaged / Lost), auto-creation from received orders
- Sales module: transaction recording, retailer assignment, delivery status, margin calculation
- Payments module: two-sided ledger for agent payables and retailer receivables, overdue alerts
- Costing: per-supplier unit price history with RMB-to-PHP exchange rate frozen at order creation
- Partners Directory (Settings): contact management for Suppliers, Agents, Warehouses, Retailers
- Dashboard: metric cards and trend charts aggregated from all modules via a single server-side query
- Audit logging: all write operations logged with user ID, timestamp, and change diff

### Out of Scope

- Real-time bank/GCash payment API integration — payment status manually confirmed
- Live currency exchange rate API — rate entered manually at order creation (Post-MVP)
- Native iOS or Android apps — web app only, mobile-responsive
- In-app messaging or chat
- WeChat/Facebook API integration
- Barcode or QR scanning
- Automated shipping carrier API tracking
- Multi-tenant UI — schema supports it, but tenant-switching UI is Post-MVP

### Future Scope (Post-MVP)

- Live RMB-to-PHP rate via free API (ExchangeRate-API free tier)
- Overdue payment email/SMS alerts via Resend or Twilio
- PDF quotation generation from the Sales module
- CSV/Excel bulk import for historical data migration from Excel
- Multi-tenant onboarding UI (SaaS path)
- Supabase Realtime — live dashboard updates when another user edits data
- Supabase Storage — file attachments on orders (e.g., shipping documents, photos)

### Assumptions & Dependencies

- [ASSUMPTION] All data entry is manual at MVP — no automated ingestion from external systems
- [ASSUMPTION] Exchange rate is manually entered at order creation and frozen immutably for that order
- [ASSUMPTION] App accessed via modern desktop browsers — Chrome, Edge, Firefox, Safari (latest 2 versions)
- [ASSUMPTION] Supabase free tier (500MB DB, 2GB bandwidth, 50MB file storage) is sufficient for MVP indefinitely
- [ASSUMPTION] Vercel Hobby free tier is sufficient for 3 users
- Dependency: Lovable.dev for React Vite + Supabase frontend scaffolding
- Dependency: Cursor IDE for API routes, Supabase schema, RLS policies, and service logic
- Dependency: Supabase CLI for local development and migrations

---

## Section 5 — Functional Requirements

---

### FR-001 — Authentication & Session Management

**Feature Name:** User Login and Role-Based Access via Supabase Auth

**Description:** Authentication is handled entirely by Supabase Auth using email and password. Three user accounts are pre-created by the Admin. No public self-registration. Sessions use Supabase's built-in JWT tokens managed via the `@supabase/ssr` package for React Vite. Roles are stored in a custom `user_profiles` table and enforced at both the API layer and the Supabase RLS layer.

**User Story:** As Jed (Admin), I want to log in securely with my email and password so that only I and my two trusted users can access business data.

**Acceptance Criteria:**
1. Given an unauthenticated user visits any protected route, when React Vite middleware checks for a valid Supabase session, then the user is redirected to `/login`.
2. Given valid email and password, when submitted to Supabase Auth, then a session is established and the user is redirected to `/dashboard`.
3. Given invalid credentials, when Supabase Auth rejects them, then a generic "Invalid email or password" error is shown — no field-level specificity.
4. Given a session expired after 1 hour of inactivity (Supabase default), when the user attempts an action, then they are redirected to `/login` with a session-expired message.
5. Given 5 failed login attempts from the same IP within 10 minutes, when another attempt is made, then Supabase Auth rate limiting returns a 429 and the UI shows a lockout message.
6. Given an Admin, when they access Settings > Users, then they see all three accounts. No other role can access this view.

**Business Rules:**
- Maximum 3 user accounts — enforced via a Supabase DB trigger that blocks `INSERT` on `auth.users` when count exceeds 3
- Roles: `admin` (full access), `editor` (read/write, no delete, no user settings), `viewer` (read-only)
- Passwords: minimum 12 characters — enforced via Supabase Auth password strength settings
- User roles stored in a `user_profiles` table linked to `auth.users.id`
- Supabase Auth handles: password hashing (bcrypt), session tokens, token refresh, and rate limiting natively

**Priority:** P0 | **Complexity:** Low

---

### FR-002 — Dashboard Home

**Feature Name:** Executive Overview Dashboard

**Description:** Landing page displaying high-level metric cards and trend charts from all modules. A single server-side Supabase query returns all aggregates. Filterable by date range.

**User Story:** As Jed, I want to see a real-time business summary when I log in so that I immediately identify issues without navigating to each module.

**Acceptance Criteria:**
1. Given an authenticated user lands on `/`, when the React Server Component fetches via Supabase, then metric cards render with initial data within 1.5 seconds on first load.
2. Given a date range filter change, when the user selects a new period, then all cards and charts update without full page reload via client-side SWR revalidation.
3. Given zero data, when cards render, then they display `₱0` or `0` — never broken, empty, or throwing an error.
4. Given clicking any metric card, when clicked, then navigate to the corresponding module with the matching filter pre-applied via URL search params.

**Business Rules:**
- Default period: last 30 days
- All monetary values displayed in PHP (₱)
- A single Supabase RPC function (`get_dashboard_stats`) returns all aggregate values in one round-trip
- Overdue payment count always reflects real-time server state (SWR `revalidateOnFocus: true`)

**Priority:** P0 | **Complexity:** Medium

---

### FR-003 — Orders Module

**Feature Name:** Purchase Order Management

**Description:** Full lifecycle management of purchase orders from Chinese suppliers. Tracks order details, import costs with exchange rate, shipping and payment status, and links to supplier and agent contacts.

**User Story:** As Jed, I want to create and track every purchase order so I always know what's been ordered, what's arriving, and what I've paid.

**Acceptance Criteria:**
1. Given Admin or Editor, when "New Order" is clicked, then a dialog opens with required fields: Supplier, Product Type, Product Name, Quantity, Import Unit Price (¥), Exchange Rate, Agent, Order Date.
2. Given form submission, when valid, then Order ID is auto-generated as `OD-YYYYMMDD-XXX` and the record saved to Supabase.
3. Given Import Unit Price (¥) × Exchange Rate × Quantity, when saved, then Import Cost (₱) is computed and stored immutably on the record.
4. Given Shipping Status changed to "Received," when saved, then the system prompts for Receival Date and calls `POST /api/orders/[id]/receive` which auto-creates Inventory records in Supabase.
5. Given a Viewer, when accessing Orders, then all Create/Edit/Delete controls are hidden and the page is read-only.

**Business Rules:**
- Shipping Status: `shipping` / `received` / `failed`
- Pay Status: `unpaid` / `paid` / `canceled`
- Import Cost PHP = Import Unit Price (¥) × Exchange Rate × Quantity (stored, never recalculated)
- Deletion of an order with linked inventory records is blocked by Supabase foreign key constraint

**Metric Cards:** Total Purchased Orders, Total Shipping Orders, Total Received Orders, Total Import Cost (₱), Total Shipping Fees (₱), Total Agent Fees (₱)

**Charts:** Orders Trend (line), Import Cost Trend (line), Shipping Status Timeline (Gantt-style by Order ID — clicking Order ID navigates to that row)

**Contact Panel — Agent:** Dropdown from Partners Directory. Shows: Agent Name, Contact Person, Phone, Email, Address, Agent Fee. Action: "Send Order Request via Email" (mailto: pre-filled with order summary).

**Contact Panel — Supplier:** Dropdown from Partners Directory. Shows: Supplier Name, Contact Person, Phone, Email, Address, Shipping Fee. Actions: "Send Email" (mailto:), "Contact via Social Channel" (hyperlink, new tab).

**Priority:** P0 | **Complexity:** High

---

### FR-004 — Inventory Module

**Feature Name:** Stock Inventory Management

**Description:** Tracks every product unit from warehouse receipt through sale. Each record is linked to its source order. Units classified by condition.

**User Story:** As Jed, I want to know exactly how many units are in good condition, damaged, or lost so I can make accurate sale decisions and supplier claims.

**Acceptance Criteria:**
1. Given an order receives status "Received," when confirmed, then Supabase auto-creates inventory records with Order ID, Product Type, Product Name, and Receival Date pre-filled.
2. Given a unit tagged "Damaged," when saved, then it is excluded from the Good count in metric cards.
3. Given a search query, when typed, then the table filters by Product Name or Product ID in real time using client-side filter on SWR-cached data.
4. Given a Viewer, when accessing Inventory, then all edit controls are hidden.

**Business Rules:**
- Inventory Status: `good` / `damaged` / `lost`
- Good = Total In-Store − Damaged − Lost
- Product ID auto-generated: `PRD-YYYYMMDD-XXX`
- Lost units contribute negatively to net inventory in financial calculations
- Records soft-deleted (never physically removed via UI)

**Metric Cards:** Total In-Store, Total Good, Total Damaged, Total Lost

**Charts:** Product Type Pie, Product Name Pie, Inventory Status Pie, Inventory Trend (Good/Damaged/Lost over time)

**Contact Panels:** Retailer, Supplier, Warehouse dropdowns with contact info and action buttons

**Priority:** P0 | **Complexity:** High

---

### FR-005 — Sales Module

**Feature Name:** Sales Transaction Management

**Description:** Records sale transactions to retailers. Tracks selling price, wholesale cost, delivery status, and auto-calculates revenue, COGS, and net margin.

**User Story:** As Jed, I want to log every sale with its price, retailer, and product so I can see accurate revenue, profit margin, and per-retailer performance.

**Acceptance Criteria:**
1. Given Admin or Editor creating a new sale, when saved, then Sale ID auto-generated as `SL-YYYYMMDD-XXX`.
2. Given Selling Unit Price × Quantity, Wholesale Price × Quantity, and Delivery Fee, when saved, then Revenue, COGS, and Net Profit are computed and stored.
3. Given Delivery Status set to "Returned," when saved, then the sale is flagged Refunded and deducted from period revenue totals.
4. Given "Revenue by Retailer" chart, when rendered, then it shows a bar chart of total revenue per retailer for the selected period.

**Business Rules:**
- Delivery Status: `delivering` / `delivered` / `returned`
- Revenue = Selling Unit Price × Quantity
- Net Profit = Revenue − (Wholesale Price × Quantity) − Delivery Fee
- Refunded sales subtract from totals but remain in records for audit trail

**Metric Cards:** Total Revenue (₱), Total Cost (₱), Net Profit (₱), Profit Margin %, Pending Sales (₱), Refunded Sales (₱)

**Cost Breakdown:** Losses (₱), Services Cost (₱), Renting Cost (₱ — manual), Miscellaneous Cost (₱ — manual)

**Charts:** Revenue Trend, Sales Trend, Cost Trend, Cost Types Pie, Revenue by Retailer Bar

**Priority:** P0 | **Complexity:** High

---

### FR-006 — Payments Module

**Feature Name:** Two-Sided Payment Ledger

**Description:** Unified payments view in two tabs: amounts Jed owes agents (linked to orders) and amounts retailers owe Jed (linked to sales). Tracks credit terms and surfaces overdue alerts.

**User Story:** As Jed, I want to see all outstanding money I owe agents and all outstanding money retailers owe me so I never miss a payment in either direction.

**Acceptance Criteria:**
1. Given the Payments page loads, when rendered, then two tabs appear: "Send to Agents" and "Receive from Retailers."
2. Given a retailer payment is pending and more than 7 days have passed since the sale date, when the page renders, then that row is highlighted red and a badge appears on the Payments nav item in the sidebar.
3. Given payment marked "Paid," when saved, then it leaves the outstanding section and totals update immediately via optimistic UI.
4. Given clicking an Order ID in the Agents tab, when clicked, then navigate to that order record in the Orders module.

**Business Rules:**
- Agent Pay Status: `unpaid` / `paid` / `canceled`
- Retailer Sell Status: `unsold` / `pending` / `sold` / `refunded`
- Credit term default: 7 days from Sale Date
- Overdue: Sell Status = `pending` AND (current date − sale date) > 7 days
- Payment method recorded as free text (e.g., "BDO Transfer," "GCash – 09xx")

**Metric Cards:** Total Jed Owes Agents (₱), Total Retailers Owe Jed (₱)

**Priority:** P0 | **Complexity:** Medium

---

### FR-007 — Costing & Exchange Rate Management

**Feature Name:** Supplier Cost History and Currency Tracking

**Description:** At order creation, the user records Import Unit Price (¥) and the current exchange rate. This is stored immutably and historically per supplier for cost trend monitoring.

**User Story:** As Jed, I want to look up what I paid per unit to each supplier over time so I can make accurate pricing decisions without manual calculation.

**Acceptance Criteria:**
1. Given a new order, when Import Unit Price (¥) and Exchange Rate are saved, then the PHP equivalent is computed and stored, never recalculated retroactively.
2. Given the Orders module filtered by a specific supplier, when viewed, then per-order cost history for that supplier is visible in the cost columns.
3. Given cost changes across orders, when the Import Cost Trend chart renders, then it reflects historical values accurately per order date.

**Business Rules:**
- Exchange rate frozen at order creation — immutable
- Both ¥ and ₱ unit prices stored for auditability
- [ASSUMPTION] Post-MVP: live RMB/PHP rate via API replaces manual entry

**Priority:** P0 | **Complexity:** Low

---

### FR-008 — Partners Directory (Settings)

**Feature Name:** Supplier, Agent, Warehouse, and Retailer Contact Management

**Description:** Centralized contact directory in Settings. All partner records are referenced by dropdown selectors throughout Orders, Inventory, and Sales modules.

**User Story:** As Jed, I want a single source of truth for all my business contacts so their information is always accurate and available throughout the app.

**Acceptance Criteria:**
1. Given Admin accessing Settings > Partners Directory, when a new Supplier is saved, then it immediately appears in the Supplier dropdown in the Orders module.
2. Given a Supplier deletion attempt where the supplier is linked to existing orders, when attempted, then Supabase foreign key constraint blocks it and returns an explanatory error to the UI.
3. Given a Social Channel URL on any partner record, when rendered, then it displays as a clickable hyperlink that opens in a new tab.
4. Given Editor or Viewer, when accessing the directory, then records are visible but Add/Edit/Delete controls are hidden.

**Business Rules:**
- Four contact types: Supplier, Agent, Warehouse, Retailer — each in a separate tab
- All types share: Name, Contact Person, Phone, Email, Address, Social Channel URL
- Type-specific additional fields: Supplier → Shipping Fee (₱); Agent → Agent Fee (%); Retailer → Preferred Payment Method (text)
- Only Admin can create/edit/delete partner records

**Priority:** P0 | **Complexity:** Low

---

## Section 6 — Non-Functional Requirements

### Performance Targets

| Interaction | Target | Implementation |
|---|---|---|
| UI-only state (modal, tab switch, panel open) | < 50ms | Pure React state — zero server calls |
| Client-side filter on loaded data | < 50ms | In-memory filter on SWR-cached table data |
| React Vite page navigation (warm) | < 200ms | App Router prefetching + RSC streaming |
| API read — small dataset (partner directory) | < 200ms | Supabase indexed query |
| API read — filtered table | < 300ms | Supabase indexed query + SWR `keepPreviousData` |
| Dashboard metrics (all cards) | < 400ms | Single Supabase RPC aggregation function |
| Dashboard charts | < 600ms | Skeleton shown immediately; Recharts renders after |
| API write — simple status update | < 300ms | Optimistic UI; Supabase confirms async |
| API write — complex (Order receive → Inventory) | < 700ms | Supabase transaction + inline spinner |
| Heavy query (All Time range) | < 1500ms | Skeleton loader; results paginated to 100 rows |

### Scalability

The schema includes `organization_id` on all primary tables from day one. Supabase RLS policies enforce organization-level data isolation at the database layer — not the application layer. This means adding a second tenant requires: (1) creating a new organization row, (2) assigning users to it, and (3) all existing RLS policies automatically apply. No application code changes needed for multi-tenancy.

Supabase scales PostgreSQL vertically (free → Pro → Team → Enterprise) and Vercel scales React Vite horizontally via serverless functions — both with zero infrastructure changes required from the application developer.

### Reliability / Availability

| Requirement | Target |
|---|---|
| Supabase uptime SLA | 99.9% (Pro plan), best-effort on Free |
| Vercel uptime SLA | 99.99% |
| Combined target | ≥ 99.9% |
| Database backup | Supabase daily automated backups (7-day retention on Free, 30-day on Pro) |
| Recovery Time Objective (RTO) | < 4 hours |
| Recovery Point Objective (RPO) | < 24 hours |

### Browser / Device Support

| Browser | Support |
|---|---|
| Chrome | Latest 2 versions |
| Edge | Latest 2 versions |
| Firefox | Latest 2 versions |
| Safari (macOS) | Latest 2 versions |
| Mobile browsers | Responsive layout, not primary use case |

### Offline Support

None at MVP. Active internet connection required.

### Localization

- UI language: English
- Primary currency: Philippine Peso (₱ / PHP)
- Secondary currency stored: Chinese Yuan (¥ / CNY)
- Date format: DD/MM/YYYY (Philippine standard)

### Accessibility

WCAG 2.1 AA — sufficient contrast on black sidebar, keyboard navigation on all interactive elements, ARIA labels on icon-only buttons.

---

## Section 7 — System Interaction & Integration Requirements

| Integration | Purpose | Type | Auth | Failure Handling |
|---|---|---|---|---|
| Supabase Auth | User authentication, session management, JWT tokens | Supabase SDK (`@supabase/ssr`) | Supabase anon key + service role key (env vars) | Redirect to /login on auth failure |
| Supabase PostgreSQL | Primary data store — all business data | Supabase SDK + raw SQL via RPC | Row Level Security + service role | Retry ×3, surface error toast to UI |
| Supabase RLS | Row-level data isolation per organization | Native PostgreSQL policy | Derived from JWT claims (user ID + org ID) | Query returns empty set if RLS blocks — no error thrown |
| Vercel | Static asset CDN + React Vite serverless functions | Platform | GitHub CI/CD + Vercel project token | Auto-rollback to previous deployment |
| Supabase Realtime (Post-MVP) | Live dashboard updates when another user edits data | WebSocket subscription | Supabase anon key | Graceful degradation to manual refresh |
| Supabase Storage (Post-MVP) | File attachments on orders (e.g., shipping docs) | Supabase SDK | RLS-protected storage buckets | Surface upload error toast |
| Resend (Post-MVP) | Overdue payment email alerts | REST API | API key (env var) | Log failure, retry once, notify admin |
| ExchangeRate-API (Post-MVP) | Live RMB/PHP rate | REST API | API key (env var) | Fallback to last stored rate + warning banner |

### Environment Variables Required

```bash
# .env.local (git-ignored — never committed)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Safe to expose to browser
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # Server-only — NEVER expose to browser
```

---

## Section 8 — Data Requirements

### Key Entities and Fields

**organizations** — tenant container for multi-tenancy. Fields: id (UUID), name, created_at. All other primary tables reference this via `organization_id`. At MVP, one organization exists (Jed's business).

**user_profiles** — extends Supabase `auth.users`. Fields: id (UUID, FK → auth.users.id), organization_id (FK → organizations.id), role (`admin`/`editor`/`viewer`), full_name, created_at, updated_at.

**suppliers** — Chinese supplier contacts. Fields: id (UUID), organization_id (FK), name, contact_person, phone, email, address, social_channel_url, shipping_fee_rmb (NUMERIC), created_at, updated_at, deleted_at (soft delete).

**agents** — payment intermediaries. Fields: same base structure as suppliers + agent_fee_percent (NUMERIC).

**warehouses** — Philippine warehouse locations. Fields: id, organization_id, name, contact_person, phone, email, address, created_at, updated_at, deleted_at.

**retailers** — Philippine retail buyers. Fields: id, organization_id, name, contact_person, phone, email, address, social_channel_url, preferred_payment_method, created_at, updated_at, deleted_at.

**orders** — purchase orders. Fields: id (UUID), organization_id (FK), order_id (TEXT, formatted), supplier_id (FK), agent_id (FK), product_type, product_name, quantity (INT), import_unit_price_rmb (NUMERIC), exchange_rate (NUMERIC), import_unit_price_php (NUMERIC, computed+stored), import_cost_php (NUMERIC, computed+stored), shipping_fee_php (NUMERIC), agent_fee_php (NUMERIC), order_date (DATE), receival_date (DATE), shipping_status (ENUM), pay_status (ENUM), notes (TEXT), created_by (FK → auth.users), created_at, updated_at, deleted_at.

**inventory** — stock records. Fields: id (UUID), organization_id (FK), product_id (TEXT, formatted), order_id (FK → orders), receival_date (DATE), product_type, product_name, inventory_status (ENUM: good/damaged/lost), notes, created_by (FK), created_at, updated_at, deleted_at.

**sales** — retailer transactions. Fields: id (UUID), organization_id (FK), sale_id (TEXT, formatted), retailer_id (FK), inventory_id (FK, nullable), product_type, product_name, quantity (INT), selling_unit_price_php (NUMERIC), wholesale_price_php (NUMERIC), delivery_fee_php (NUMERIC), sale_date (DATE), credit_due_date (DATE), delivery_status (ENUM: delivering/delivered/returned), created_by (FK), created_at, updated_at, deleted_at.

**payments** — two-sided ledger. Fields: id (UUID), organization_id (FK), payment_type (ENUM: agent/retailer), order_id (FK, nullable), sale_id (FK, nullable), agent_id (FK, nullable), retailer_id (FK, nullable), payment_method (TEXT), amount_php (NUMERIC), pay_status (ENUM), due_date (DATE), paid_at (TIMESTAMPTZ), notes, created_at, updated_at.

**cost_history** — immutable cost log per order. Fields: id (UUID), organization_id (FK), order_id (FK), supplier_id (FK), product_name, unit_price_rmb (NUMERIC), exchange_rate (NUMERIC), unit_price_php (NUMERIC), recorded_at (TIMESTAMPTZ).

**audit_log** — append-only write operation log. Fields: id (UUID), organization_id (FK), user_id (FK → auth.users), action (ENUM: create/update/delete), entity_type (TEXT), entity_id (UUID), changes_jsonb (JSONB), created_at (TIMESTAMPTZ).

### Entity Relationships

- All primary entities belong to an `organization` (multi-tenancy root)
- `user_profiles` → `organizations` (many-to-one)
- `orders` → `suppliers` (many-to-one), `orders` → `agents` (many-to-one)
- `inventory` → `orders` (many-to-one)
- `sales` → `retailers` (many-to-one), `sales` → `inventory` (many-to-one, optional)
- `payments` → `orders` or `sales` (polymorphic via `payment_type` + nullable FKs)
- `cost_history` → `orders` (one-to-one), `cost_history` → `suppliers` (many-to-one)
- `audit_log` → `auth.users` (many-to-one)

### Data Lifecycle

- All primary tables use soft delete (`deleted_at IS NULL` default filter on all queries)
- `audit_log` and `cost_history` are append-only — no updates or deletes permitted
- Soft-deleted records visible in audit log; excluded from UI filters and RLS-aware queries

### Data Retention

Indefinite at MVP. Supabase free tier (500MB) is sufficient for years of this business's data volume (~50 records/month estimated).

### PII Fields

- `auth.users`: email, phone (Supabase managed)
- `user_profiles`: full_name
- All partner directories: contact_person, phone, email, address

### Backup and Recovery

- Supabase automated daily backups — 7-day retention on Free tier, 30-day on Pro
- Manual backup: Supabase dashboard → Settings → Database → Download backup
- Restore: Supabase dashboard or `pg_restore` against a new Supabase project
- Frontend and API are stateless — only the Supabase database requires backup

---

## Section 9 — Security & Compliance Requirements

### Authentication Flow (Supabase Auth)

1. User visits any protected route → React Vite middleware (`middleware.ts`) calls `supabase.auth.getSession()`
2. No valid session → redirect to `/login`
3. User submits email + password → `supabase.auth.signInWithPassword({ email, password })`
4. Supabase validates credentials (bcrypt internally), returns JWT access token + refresh token
5. `@supabase/ssr` stores tokens in HttpOnly cookies via React Vite middleware — inaccessible to JavaScript
6. All subsequent Supabase queries automatically include the JWT — RLS policies evaluate it server-side
7. Access token expires every 1 hour; refresh token rotates automatically — user never re-logs-in unless they explicitly log out
8. Supabase built-in rate limiting handles brute force protection (configurable in Supabase dashboard)

### Row Level Security (RLS) — The Primary Security Layer

Supabase RLS enforces data access at the PostgreSQL layer — **no matter what the application code does, users can only see and modify data their policy permits.** This is the most important security property of this stack: even if there is a bug in the React Vite API route, the database will not return data the user is not authorized to see.

**RLS Policies Applied to Every Table:**

```sql
-- Example: orders table RLS policies

-- Policy 1: Users can only see orders belonging to their organization
CREATE POLICY "org_isolation" ON orders
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy 2: Only admin and editor roles can insert orders
CREATE POLICY "editor_insert" ON orders
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid())
    IN ('admin', 'editor')
  );

-- Policy 3: Only admin can delete (soft delete sets deleted_at)
CREATE POLICY "admin_delete" ON orders
  FOR UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR (deleted_at IS NULL) -- non-admin can update non-deleted records
  );
```

These three policy patterns are replicated across every table. The application never trusts its own role checks alone — RLS is the source of truth.

### Authorization Matrix (Application Layer + RLS)

| Resource | Admin | Editor | Viewer |
|---|---|---|---|
| Dashboard (read) | ✅ | ✅ | ✅ |
| Orders (read) | ✅ | ✅ | ✅ |
| Orders (create/edit) | ✅ | ✅ | ❌ |
| Orders (delete / soft) | ✅ | ❌ | ❌ |
| Inventory (read) | ✅ | ✅ | ✅ |
| Inventory (create/edit) | ✅ | ✅ | ❌ |
| Inventory (delete / soft) | ✅ | ❌ | ❌ |
| Sales (read) | ✅ | ✅ | ✅ |
| Sales (create/edit) | ✅ | ✅ | ❌ |
| Sales (delete / soft) | ✅ | ❌ | ❌ |
| Payments (read) | ✅ | ✅ | ✅ |
| Payments (create/edit) | ✅ | ✅ | ❌ |
| Settings — Partners (read) | ✅ | ✅ | ❌ |
| Settings — Partners (create/edit/delete) | ✅ | ❌ | ❌ |
| Settings — Users | ✅ | ❌ | ❌ |

### Encryption

- Data in transit: TLS 1.3 enforced by Supabase and Vercel (automatic, no configuration)
- Data at rest: Supabase encrypts all PostgreSQL data at rest (AES-256)
- Passwords: bcrypt managed by Supabase Auth internally (Jed's code never touches raw passwords)
- Session tokens: HttpOnly Secure SameSite=Strict cookies via `@supabase/ssr`
- Service role key: stored only in Vercel environment variables — never exposed to the browser or committed to git

### Audit Logging

All write operations (create, update, delete) are logged to the `audit_log` table via a Supabase PostgreSQL trigger — this means audit logging happens at the database level regardless of which code path triggered the write. Fields logged: timestamp, user_id (from `auth.uid()`), action, entity type, entity ID, JSONB diff of changed fields. The trigger fires on `AFTER INSERT OR UPDATE OR DELETE` on all primary tables.

```sql
-- Audit trigger example
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, organization_id, action, entity_type, entity_id, changes_jsonb)
  VALUES (
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Compliance

- PCI-DSS: Not applicable — no payment processing occurs in the app
- GDPR: Not formally required — Philippine-based internal tool; PII limited to business contacts
- Philippine Data Privacy Act: Internal-only user base at MVP; no formal filing required at this scale
- [ASSUMPTION] If app evolves to serve external users, DPA compliance review required before onboarding external customers

---

## Section 10 — UX & Design Requirements

### Design Reference

The UI follows the structure and layout of the EtiGo OMS screenshot provided by the user — identical sidebar navigation, tab-based reporting structure, and metric card layout. **Primary color is black (#111111), replacing the blue used in the reference screenshot.**

### Color Palette

| Element | Color |
|---|---|
| Sidebar background | #111111 |
| Sidebar text — active | #FFFFFF |
| Sidebar text — inactive | #9CA3AF |
| Content background | #F9FAFB |
| Card background | #FFFFFF |
| Card border | #E5E7EB |
| Alert / overdue | #EF4444 |
| Success / received / good | #22C55E |
| Warning / pending | #F59E0B |
| Neutral / shipping | #6B7280 |
| Primary button | #111111 |

### Component Library

- **shadcn/ui** — Table, Card, Badge, Tabs, Dialog, Select, Input, DropdownMenu, Toast, Skeleton
- **Recharts** — LineChart, BarChart, PieChart, ResponsiveContainer
- **Tailwind CSS** — utility-first styling, no custom CSS files
- **React Hook Form + Zod** — form management and validation

### Lovable.dev Scaffolding Instructions

When using Lovable to generate the initial frontend, provide this prompt to ensure correct stack and design output:

```
Build a React Vite 14 App Router project with Supabase for authentication 
and database. Use shadcn/ui components, Tailwind CSS, and Recharts for charts.

Design: Black sidebar (#111111) on the left, white content area on the right. 
Enterprise dashboard aesthetic. No blue colors anywhere.

Create these pages with placeholder/mock data:
- /login — email + password form, centered card layout
- /dashboard — 6 metric cards + 2 line charts (Revenue Trend, Orders Trend)
- /orders — data table with filters bar, 6 metric cards above, right-side 
  contact panel drawer, Gantt-style status chart
- /inventory — data table with status badge filters, 4 metric cards, 
  2 pie charts
- /sales — data table, 6 metric cards, revenue + cost line charts, 
  Revenue by Retailer bar chart
- /payments — two-tab layout: "Send to Agents" tab + "Receive from 
  Retailers" tab, 2 metric cards at top
- /settings — tabbed layout: Suppliers, Agents, Warehouses, Retailers 
  tabs each with a data table and Add/Edit/Delete actions

Sidebar navigation items with icons: Dashboard, Orders, Inventory, Sales, 
Payments, Settings. Payments nav item should support a red badge for 
overdue count.

Use shadcn/ui Table for all data tables with sortable column headers.
Use shadcn/ui Badge for all status indicators — always use BOTH color 
AND text label (never color alone).
Use Skeleton components for all loading states — no blank white boxes.
Do NOT implement any real backend logic — use mock/placeholder data only.
Do NOT add any authentication logic — I will wire Supabase Auth separately.
```

### Key UX Principles

1. Data first — every page leads with its most actionable metric
2. Instant contact access — partner info pre-loaded in context, panel opens instantly
3. Linked records — every ID in a table is clickable and navigates to the related record
4. Status clarity — badges always use color AND text, never color alone
5. Optimistic updates — status changes reflect in UI before server confirmation
6. No layout shift — skeleton loaders match exact dimensions of loaded content

### Responsiveness

- Primary: Desktop (1280px+)
- Secondary: Laptop (1024px–1279px) — sidebar collapses to icon-only
- Tertiary: Tablet (768px+) — stacked card layout
- Mobile (< 768px): functional but not primary use case

### Loading States

- `<MetricCardSkeleton />` — gray pulsing rectangle matching card dimensions
- `<TableSkeleton rows={10} />` — gray pulsing rows matching column structure
- `<ChartSkeleton />` — gray pulsing rectangle at chart height
- `<ContactPanelSkeleton />` — gray pulsing lines matching contact info layout
- Submit buttons show inline spinner — never full-page loading overlay

### Error States

- Form validation: inline red helper text below each field on blur (React Hook Form)
- API errors: shadcn/ui Toast notification bottom-right, auto-dismiss 5 seconds
- 401 responses: immediate redirect to /login
- 403 responses: inline "You don't have permission to view this" message
- Supabase RLS block: treat as empty dataset — show empty state, not error

---

## Section 11 — Technical Architecture Overview

### Architecture Pattern: React Vite Fullstack Monolith + Supabase Backend-as-a-Service

**Pattern:** React Vite App Router (Frontend + API Routes) ↔ Supabase (Auth + PostgreSQL + RLS)

**Why this is the correct choice for JedOMS:**

A React Vite fullstack monolith with Supabase as the backend service is the simplest possible architecture that achieves production-grade security, zero hosting cost, scale-readiness, and Lovable.dev compatibility simultaneously. Frontend and API routes live in one repo, deploy in one `git push`, and require no separate server management. Supabase provides auth, database, RLS, and future realtime — replacing what would otherwise require building and hosting four separate services.

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   User Browser                         │
│           React Vite App (Client Components)              │
│    React Hook Form | SWR | Recharts | shadcn/ui        │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTPS (TLS 1.3)
┌──────────────────────▼─────────────────────────────────┐
│                  Vercel Edge Network                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Vite Application                    │  │
│  │  ┌─────────────────┐  ┌──────────────────────┐  │  │
│  │  │  App Router     │  │   API Routes         │  │  │
│  │  │  (RSC + CSC)    │  │  /app/api/...        │  │  │
│  │  │  - Pages        │  │  - RBAC middleware   │  │  │
│  │  │  - Layouts      │  │  - Zod validation    │  │  │
│  │  │  - middleware.ts│  │  - Service layer     │  │  │
│  │  └─────────────────┘  └──────────┬───────────┘  │  │
│  └─────────────────────────────────┬┘              │  │
└────────────────────────────────────┼───────────────┘  │
                                     │ Supabase SDK      │
                                     │ (HTTPS + JWT)     │
┌────────────────────────────────────▼───────────────────┐
│                     Supabase                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │  Supabase Auth  │  │   PostgreSQL Database        │ │
│  │  - JWT tokens   │  │   - Row Level Security       │ │
│  │  - Session mgmt │  │   - Audit triggers           │ │
│  │  - Rate limiting│  │   - Indexes                  │ │
│  └─────────────────┘  │   - RPC functions            │ │
│                        └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Project Repository Structure

```
jedoms/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + auth guard
│   │   ├── page.tsx                # Dashboard home (RSC)
│   │   ├── orders/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── payments/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── orders/route.ts
│       ├── orders/[id]/route.ts
│       ├── orders/[id]/receive/route.ts
│       ├── inventory/route.ts
│       ├── sales/route.ts
│       ├── payments/route.ts
│       ├── dashboard/stats/route.ts
│       └── [suppliers|agents|warehouses|retailers]/route.ts
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/                     # Sidebar, Header, Layout
│   ├── orders/                     # OrdersTable, OrderForm, ContactPanel
│   ├── inventory/                  # InventoryTable, StatusBadge
│   ├── sales/                      # SalesTable, RevenueChart
│   ├── payments/                   # PaymentsTabs, OverdueBadge
│   ├── dashboard/                  # MetricCard, TrendChart
│   └── skeletons/                  # MetricCardSkeleton, TableSkeleton, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (uses service role)
│   │   └── middleware.ts           # Session refresh middleware
│   ├── services/                   # Business logic (OrderService, etc.)
│   └── validations/                # Zod schemas (shared frontend + API)
├── hooks/
│   ├── usePartners.ts              # Pre-loads all partner contacts
│   ├── useOverdueCount.ts          # Polls overdue payments badge
│   └── useDebouncedValue.ts
├── context/
│   └── PartnersContext.tsx
├── types/
│   └── index.ts                    # Shared TypeScript types
├── supabase/
│   ├── migrations/                 # SQL migration files
│   ├── seed.sql                    # Development seed data
│   └── config.toml                 # Supabase local config
├── middleware.ts                   # React Vite auth middleware (session check)
└── .env.local                      # Git-ignored secrets
```

### Frontend Architecture

- **Framework:** React Vite 14 App Router
- **Rendering:** React Server Components (RSC) for initial data fetch on all module pages; Client Components (`'use client'`) for interactive tables, forms, and charts
- **Auth guard:** `middleware.ts` at the route segment level — checks Supabase session on every protected request
- **State:** React Context for Auth and Partners Directory; SWR for all client-side server state
- **Forms:** React Hook Form + Zod (schemas shared with API routes)
- **Charts:** Recharts with ResponsiveContainer
- **Styling:** Tailwind CSS + shadcn/ui

### Backend Architecture

- **Runtime:** Vercel Serverless Functions (Node.js) via React Vite API Routes
- **Auth check:** Every API route creates a `supabase` server client and calls `auth.getUser()` — request rejected if no valid session
- **RBAC:** Role fetched from `user_profiles` and checked against resource action permissions
- **Data access:** Supabase SDK with Row Level Security enforcing organization isolation at database level
- **Validation:** Zod schemas on all request bodies
- **Business logic:** Encapsulated in `/lib/services/` — separate from route handlers

### Two Supabase Clients Pattern

```typescript
// lib/supabase/server.ts — for API routes and RSC (full access, uses service role)
import { createServerClient } from '@supabase/ssr'
// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS where needed for admin ops
// ONLY used server-side, NEVER exposed to browser

// lib/supabase/client.ts — for Client Components (browser)
import { createBrowserClient } from '@supabase/ssr'
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY — safe to expose
// All queries subject to RLS automatically
```

### Caching Strategy

- RSC initial page load: Supabase data fetched server-side, delivered with HTML — no client cold start
- SWR client-side: 30-second deduplication, `keepPreviousData: true` on all tables
- Partners Directory: React Context loaded once per session, never re-fetched
- Overdue count: SWR with `revalidateOnFocus: true` + 30-second polling interval
- Dashboard stats: SWR with 60-second interval — data freshness acceptable for aggregate metrics

---

## Section 12 — API Surface Overview

### Base URL

- Development: `http://localhost:3000/api`
- Production: `https://jedoms.vercel.app/api` (or custom domain)

### Design Conventions

- RESTful routes under `/app/api/`
- JSON request and response bodies
- HTTP status codes: 200, 201, 400, 401, 403, 404, 422, 500
- All timestamps: ISO 8601 (UTC) — Supabase returns UTC natively
- Monetary amounts: stored as NUMERIC in Postgres; returned as number in JSON; formatted client-side
- All soft-deleted records excluded from list responses by default
- Pagination: cursor-based with `?cursor=&limit=50`
- Filtering: `?supplier_id=&status=&date_from=&date_to=`

### Authentication on Every Route

```typescript
// Standard auth check at the top of every API route handler
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = createServerClient(cookies())
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // RBAC check
  if (!['admin', 'editor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... proceed with handler
}
```

### Resource Endpoints

| Resource | GET list | GET single | POST create | PATCH update | DELETE soft |
|---|---|---|---|---|---|
| `/api/dashboard/stats` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/orders` | ✅ | ✅ | ✅ | ✅ | ✅ Admin |
| `/api/orders/[id]/receive` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/api/inventory` | ✅ | ✅ | ✅ | ✅ | ✅ Admin |
| `/api/sales` | ✅ | ✅ | ✅ | ✅ | ✅ Admin |
| `/api/payments` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/payments/overdue/count` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/suppliers` | ✅ | ✅ | ✅ Admin | ✅ Admin | ✅ Admin |
| `/api/agents` | ✅ | ✅ | ✅ Admin | ✅ Admin | ✅ Admin |
| `/api/warehouses` | ✅ | ✅ | ✅ Admin | ✅ Admin | ✅ Admin |
| `/api/retailers` | ✅ | ✅ | ✅ Admin | ✅ Admin | ✅ Admin |
| `/api/users` | ✅ Admin | ✅ Admin | ✅ Admin | ✅ Admin | ❌ |

### Dashboard Stats Endpoint (Supabase RPC)

`GET /api/dashboard/stats?period=30d`

Calls a single Supabase PostgreSQL function `get_dashboard_stats(org_id, from_date)` that returns all metric card values in one query:

```typescript
{
  period: string,
  orders: {
    total: number, shipping: number, received: number, failed: number,
    import_cost_php: number, shipping_fee_php: number, agent_fee_php: number
  },
  inventory: {
    total_in_store: number, total_good: number, total_damaged: number, total_lost: number
  },
  sales: {
    total_revenue: number, total_cost: number, net_profit: number,
    profit_margin_percent: number, pending_sales: number, refunded_sales: number
  },
  payments: {
    total_owed_to_agents: number, total_owed_by_retailers: number, overdue_count: number
  }
}
```

### Versioning

No URL versioning at MVP. Version prefix (`/api/v2/`) added only when a breaking change requires a parallel API surface.

---

## Section 13 — Database Entity Overview

### Schema (PostgreSQL via Supabase)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (multi-tenancy root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  social_channel_url TEXT,
  shipping_fee_rmb NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Agents (same base + agent_fee_percent)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT, phone TEXT, email TEXT, address TEXT,
  social_channel_url TEXT,
  agent_fee_percent NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT, phone TEXT, email TEXT, address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Retailers
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT, phone TEXT, email TEXT, address TEXT,
  social_channel_url TEXT,
  preferred_payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_id TEXT NOT NULL UNIQUE,               -- OD-YYYYMMDD-XXX
  supplier_id UUID REFERENCES suppliers(id),
  agent_id UUID REFERENCES agents(id),
  product_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  import_unit_price_rmb NUMERIC(10, 2) NOT NULL CHECK (import_unit_price_rmb > 0),
  exchange_rate NUMERIC(10, 4) NOT NULL CHECK (exchange_rate > 0),
  import_unit_price_php NUMERIC(12, 2) NOT NULL,   -- stored, immutable
  import_cost_php NUMERIC(14, 2) NOT NULL,          -- stored, immutable
  shipping_fee_php NUMERIC(12, 2) DEFAULT 0,
  agent_fee_php NUMERIC(12, 2) DEFAULT 0,
  order_date DATE NOT NULL,
  receival_date DATE,
  shipping_status TEXT NOT NULL DEFAULT 'shipping'
    CHECK (shipping_status IN ('shipping', 'received', 'failed')),
  pay_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (pay_status IN ('unpaid', 'paid', 'canceled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_supplier ON orders(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(shipping_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_pay_status ON orders(pay_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_date ON orders(order_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_org ON orders(organization_id) WHERE deleted_at IS NULL;

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id TEXT NOT NULL UNIQUE,              -- PRD-YYYYMMDD-XXX
  order_id UUID REFERENCES orders(id),
  receival_date DATE,
  product_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  inventory_status TEXT NOT NULL DEFAULT 'good'
    CHECK (inventory_status IN ('good', 'damaged', 'lost')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_inventory_order ON inventory(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_status ON inventory(inventory_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_type ON inventory(product_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_org ON inventory(organization_id) WHERE deleted_at IS NULL;

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sale_id TEXT NOT NULL UNIQUE,                -- SL-YYYYMMDD-XXX
  retailer_id UUID REFERENCES retailers(id),
  inventory_id UUID REFERENCES inventory(id),
  product_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selling_unit_price_php NUMERIC(12, 2) NOT NULL,
  wholesale_price_php NUMERIC(12, 2) NOT NULL,
  delivery_fee_php NUMERIC(12, 2) DEFAULT 0,
  sale_date DATE NOT NULL,
  credit_due_date DATE,
  delivery_status TEXT NOT NULL DEFAULT 'delivering'
    CHECK (delivery_status IN ('delivering', 'delivered', 'returned')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sales_retailer ON sales(retailer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON sales(delivery_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_date ON sales(sale_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_org ON sales(organization_id) WHERE deleted_at IS NULL;

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('agent', 'retailer')),
  order_id UUID REFERENCES orders(id),
  sale_id UUID REFERENCES sales(id),
  agent_id UUID REFERENCES agents(id),
  retailer_id UUID REFERENCES retailers(id),
  payment_method TEXT,
  amount_php NUMERIC(14, 2) NOT NULL,
  pay_status TEXT NOT NULL
    CHECK (pay_status IN ('unpaid', 'paid', 'canceled', 'pending', 'refunded')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_status ON payments(pay_status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_org ON payments(organization_id);

-- Cost history (immutable)
CREATE TABLE cost_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_name TEXT,
  unit_price_rmb NUMERIC(10, 2),
  exchange_rate NUMERIC(10, 4),
  unit_price_php NUMERIC(12, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (append-only via trigger)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes_jsonb JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_org ON audit_log(organization_id);
```

### RLS Policy Pattern (applied to every table)

```sql
-- Enable RLS on every table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Org isolation: users see only their org's data
CREATE POLICY "org_isolation" ON orders FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Write restriction: only admin and editor can insert/update
CREATE POLICY "write_access" ON orders FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'editor')
  );

-- Delete restriction: only admin can soft-delete (sets deleted_at)
-- Hard deletes are blocked entirely — no DELETE policy defined
```

---

## Section 14 — Test Requirements Overview

### Testing Philosophy

Given the 3-user, single-tenant deployment, testing prioritizes: (1) correctness of financial calculations, (2) correctness of Supabase RLS policies, and (3) end-to-end critical user flows. All RLS policies must have explicit test coverage — a misconfigured policy is a data leak.

### Testing Types

| Type | Tooling | Coverage Target |
|---|---|---|
| Unit — Service layer | Vitest | ≥ 80% on `/lib/services/` |
| Unit — Utilities (currency calc, ID gen, date logic) | Vitest | ≥ 95% |
| Integration — API routes | Vitest + Supabase local emulator | All CRUD endpoints |
| RLS policy tests | `supabase test db` (pgTAP) | 100% on all RLS policies |
| E2E — Critical flows | Playwright | 100% on login, order receive, sale creation, overdue alert |
| Security | OWASP ZAP + manual | Pre-launch |
| Accessibility | axe-core | WCAG 2.1 AA |
| UAT | Manual by Jed | Pre-launch sign-off |

### Critical RLS Tests (Must Cover)

1. User A from Org 1 cannot read Org 2's orders — even with a direct Supabase query
2. Viewer role cannot insert an order — Supabase returns RLS violation
3. Editor role cannot delete (soft-delete) an inventory record
4. Admin can soft-delete any record in their organization
5. No user can hard-delete any record (no DELETE policy defined)
6. Audit log is insert-only — no user can UPDATE or DELETE audit records

### Critical E2E Paths (100% Coverage Required)

1. Login → session established → access /orders
2. Login failure × 5 → rate limit triggered
3. Create Order → Change to Received → Inventory auto-created
4. Create Sale → 7-day window simulated → Overdue badge appears on Payments nav
5. Viewer cannot see Add/Edit/Delete buttons anywhere
6. Admin can access /settings/users; Editor and Viewer are redirected

### Testing Environments

| Environment | Purpose | Supabase Instance |
|---|---|---|
| Local (Cursor) | Development | Supabase local emulator (`supabase start`) |
| CI (GitHub Actions) | Automated test suite | Supabase local emulator in Docker |
| Preview (Vercel) | PR preview | Supabase staging project |
| Production | Live app | Supabase production project |

### Seed Data

`supabase/seed.sql` creates: 1 organization, 3 users (one per role), 5 suppliers, 2 agents, 3 retailers, 10 orders (mix of statuses), 20 inventory items (mix of good/damaged/lost), 8 sales, 15 payment records including 3 overdue.

---

## Section 15 — Security Controls Overview

### OWASP Top 10 Mitigation

| OWASP Risk | Control |
|---|---|
| A01 Broken Access Control | Supabase RLS at DB layer (primary control) + RBAC in API routes (secondary control). Two independent layers. |
| A02 Cryptographic Failures | TLS 1.3 via Supabase + Vercel; bcrypt passwords via Supabase Auth; HttpOnly Secure cookies via `@supabase/ssr`; service role key in Vercel encrypted env vars only |
| A03 Injection | Supabase SDK uses parameterized queries exclusively; Zod validates all inputs before they reach Supabase; no raw SQL string interpolation |
| A04 Insecure Design | Multi-tenancy via `organization_id` from day one; no public registration; 3-user DB trigger; RLS as default-deny (no policy = no access) |
| A05 Security Misconfiguration | `SUPABASE_SERVICE_ROLE_KEY` in Vercel encrypted env vars only; `NEXT_PUBLIC_` prefix only for safe-to-expose keys; `.env.local` git-ignored |
| A06 Vulnerable Components | Dependabot enabled; `npm audit` in CI; Supabase SDK updates monitored |
| A07 Auth & Session Failures | Supabase Auth handles rate limiting, bcrypt hashing, JWT rotation; session refresh via `@supabase/ssr` middleware |
| A08 Software & Data Integrity | GitHub Actions build validation before Vercel deploy; Supabase migration versioning |
| A09 Logging & Monitoring | `audit_log` table via PostgreSQL trigger (fires regardless of app code path); Vercel function logs; Supabase logs |
| A10 SSRF | No user-controlled URLs processed server-side at MVP; all external links are client-side `<a target="_blank">` only |

### The Service Role Key Rule

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It must never appear in any file that could be sent to the browser.

```typescript
// ✅ CORRECT — server.ts (React Vite API routes + RSC only)
import { createServerClient } from '@supabase/ssr'
// Uses process.env.SUPABASE_SERVICE_ROLE_KEY — server only

// ✅ CORRECT — client.ts (browser Client Components)
import { createBrowserClient } from '@supabase/ssr'
// Uses process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY — safe to expose

// ❌ NEVER — in any 'use client' component
process.env.SUPABASE_SERVICE_ROLE_KEY // This would leak the key to the browser
```

### Input Validation (Zod)

```typescript
// lib/validations/orders.ts — shared between frontend forms and API routes
export const CreateOrderSchema = z.object({
  supplier_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  product_type: z.string().min(1).max(100),
  product_name: z.string().min(1).max(255),
  quantity: z.number().int().min(1).max(99999),
  import_unit_price_rmb: z.number().min(0.01).max(999999),
  exchange_rate: z.number().min(0.01).max(9999),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
})
```

---

## Section 16 — Infrastructure & Deployment Overview

### Stack and Cost

| Layer | Service | Tier | Monthly Cost |
|---|---|---|---|
| Frontend + API hosting | Vercel Hobby | Free (unlimited bandwidth, 100GB) | $0 |
| Database + Auth | Supabase Free | Free (500MB DB, 2GB bandwidth, 50k MAU) | $0 |
| Version control + CI/CD | GitHub Free | Free | $0 |
| Domain (optional) | Vercel subdomain | Free (`jedoms.vercel.app`) | $0 |
| **Total** | | | **$0/month** |

**Scale upgrade path (when needed):**

| Trigger | Upgrade | New Cost |
|---|---|---|
| > 500MB DB storage | Supabase Pro | $25/month |
| > 100GB bandwidth | Vercel Pro | $20/month |
| > 3 users / multi-tenant | Supabase Pro (more connections) | $25/month |

### Environment Strategy

| Environment | Frontend | API | Supabase |
|---|---|---|---|
| Local (Cursor) | React Vite dev server (`localhost:3000`) | Same process | Supabase local emulator |
| Preview (PR) | Vercel preview URL | Same deployment | Supabase staging project |
| Production | Vercel production | Same deployment | Supabase production project |

### Local Development Setup in Cursor (One Time)

```bash
# 1. Clone repo from GitHub (exported from Lovable)
git clone https://github.com/YOUR_USERNAME/jedoms && cd jedoms
npm install

# 2. Install Supabase CLI
brew install supabase/tap/supabase   # macOS
# or: npm install -g supabase         # cross-platform

# 3. Start local Supabase (Docker required)
supabase start
# Output: local API URL, anon key, service role key — paste into .env.local

# 4. Copy environment template and fill in values
cp .env.local.example .env.local

# 5. Apply schema migrations
supabase db push

# 6. Seed development data
supabase db reset   # applies migrations + seed.sql

# 7. Start React Vite dev server
npm run dev   # → localhost:3000
```

### CI/CD Pipeline (GitHub Actions + Vercel)

```
Push to feature branch
  → GitHub Actions: lint + typecheck + unit tests (Vitest)
  → Vercel: preview deployment auto-generated with unique URL

PR opened
  → GitHub Actions: full test suite
    (unit + integration + RLS policy tests + E2E via Playwright)
  → Vercel: preview URL posted to PR as comment

Merge to main
  → GitHub Actions: full test suite
  → Vercel: automatic production deployment (if tests pass)
  → Supabase: run pending migrations against production DB
    via: supabase db push --db-url $SUPABASE_PROD_DB_URL
```

### Supabase Migration Workflow

```bash
# Create a new migration
supabase migration new add_cost_history_indexes

# Edit the generated SQL file in supabase/migrations/
# Apply to local
supabase db push

# Apply to production (in CI/CD)
supabase db push --db-url $SUPABASE_PROD_DB_URL
```

### Monitoring

- Vercel dashboard: function execution time, error rate, build status
- Supabase dashboard: query performance, database size, auth events, API usage
- [Post-MVP] Sentry free tier for frontend JS error tracking
- [Post-MVP] Uptime Robot (free) for external endpoint monitoring with email alerts

### Disaster Recovery

- Supabase automated daily backups — 7-day retention on Free tier
- Manual backup: Supabase dashboard → Settings → Database → Create backup
- Full restore: `pg_restore` or Supabase point-in-time recovery (Pro feature)
- Frontend is stateless — redeploy from GitHub history in < 3 minutes
- **Full system recovery from Supabase backup: < 30 minutes**

---

## Section 17 — Development Standards Overview

### Version Control

- Platform: GitHub (private repository)
- Origin: Exported from Lovable.dev → pushed to GitHub → cloned into Cursor
- Branching: GitHub Flow — `main` is production-protected; all work on feature branches
- Branch naming: `feature/orders-module`, `fix/overdue-badge`, `chore/supabase-migration-v3`

### Commit Convention

Format: `type(scope): description`

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | No behavior change |
| `test` | Tests only |
| `chore` | Migrations, deps, config |
| `docs` | Documentation |

Examples:
- `feat(orders): add shipping status timeline gantt chart`
- `fix(payments): correct 7-day overdue calculation`
- `chore(db): supabase migration add inventory indexes`

### Code Style

- TypeScript strict mode (`"strict": true`)
- ESLint with `next/core-web-vitals` + `typescript-eslint/recommended`
- Prettier auto-format on save (Cursor setting)
- Zero `any` types — use Zod inference or proper type guards
- Supabase types auto-generated: `supabase gen types typescript --local > types/supabase.ts`

### Supabase-Specific Standards

- Always use the server client (`lib/supabase/server.ts`) in API routes and RSC
- Always use the browser client (`lib/supabase/client.ts`) in Client Components
- Never use `SUPABASE_SERVICE_ROLE_KEY` in any `'use client'` component
- Every new table must have an RLS policy before going to production — no exceptions
- Every schema change must be a versioned migration file (`supabase migration new`)
- Regenerate types after every migration: `supabase gen types typescript`

### Definition of Done

1. TypeScript type check passes (`tsc --noEmit`)
2. ESLint passes with zero warnings
3. Unit tests written and passing (≥ 80% on new service logic)
4. RLS policy written and tested for any new table
5. Supabase types regenerated after any schema change
6. Vercel preview deployment tested manually by developer
7. No `console.log` committed to main
8. PR description references the FR section in this PRD

### Technical Debt Policy

- Tech debt logged as GitHub Issues, label: `tech-debt`
- Maximum 5 open tech-debt issues before a cleanup sprint
- No `// TODO` comments committed to main

---

## Section 18 — Milestones & Delivery Phases

### Phase 0 — Foundation (Weeks 1–2)

| Deliverable | Tool | Target |
|---|---|---|
| Lovable.dev: scaffold full React Vite + Supabase project with all 7 pages, black sidebar, mock data | Lovable.dev | Week 1 |
| Export from Lovable → push to GitHub | Lovable + GitHub | Week 1 |
| Clone in Cursor, set up local Supabase emulator | Cursor | Week 1 |
| Write full Supabase schema + RLS policies + migrations | Cursor | Week 1 |
| Supabase Auth wired end-to-end (login/logout/session/redirect) | Cursor | Week 2 |
| RBAC middleware on all API routes | Cursor | Week 2 |
| Partners Directory CRUD — first fully connected module | Cursor | Week 2 |

### Phase 1 — MVP (Weeks 3–6)

| Deliverable | Target |
|---|---|
| Orders module: API routes + Supabase queries + frontend connected | Week 3 |
| Inventory module: auto-creation on order receive + full CRUD | Week 4 |
| Sales module: margin calculations + charts | Week 5 |
| Payments module: two-tab ledger + overdue badge + alerts | Week 5 |
| Dashboard: Supabase RPC aggregation + metric cards + charts | Week 6 |
| Audit log trigger on all primary tables | Week 6 |
| RLS policy tests (pgTAP) for all tables | Week 6 |
| E2E tests (Playwright) for all critical flows | Week 6 |
| Production deployment to Vercel + Supabase production | Week 6 |

**MVP Success Criteria:**
- All 5 modules functional with real data
- 3 users authenticate with correct roles, RLS verified
- Zero Excel entries for new orders/sales post-go-live
- P95 API response < 400ms in production

### Phase 2 — Enhancements (Weeks 7–10)

| Deliverable | Notes |
|---|---|
| Live RMB/PHP exchange rate | ExchangeRate-API free tier |
| Overdue payment email alerts | Resend free tier |
| Supabase Realtime on dashboard | Live updates when another user edits |
| PDF quotation export | `@react-pdf/renderer` |
| CSV bulk import | Historical Excel data migration |

### Phase 3 — Scale (Month 4+)

| Focus | Detail |
|---|---|
| Multi-tenant onboarding UI | Organization signup + user invite flow |
| Supabase Storage | File attachments on orders (shipping docs, photos) |
| Mobile PWA | Service worker for offline read access |
| Reporting module | Printable P&L, monthly summaries |
| Upgrade to Supabase Pro | When storage or connection limits approached |

---

## Section 19 — Risks & Mitigations

| ID | Category | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-001 | Security | `SUPABASE_SERVICE_ROLE_KEY` accidentally used in a Client Component | M | H | ESLint rule to flag any use of service role key; code review checklist; Lovable output reviewed before merging to main |
| R-002 | Security | RLS policy misconfigured — user sees another org's data | L | H | pgTAP RLS tests with 100% coverage; test with two separate org accounts before production; Supabase logs alert on unusual cross-org patterns |
| R-003 | Technical | Vercel cold start (200–400ms) on first API call after idle | M | L | RSC initial page load bypasses cold start (data served with HTML); SWR `keepPreviousData` prevents blank tables; acceptable for 3-user internal tool |
| R-004 | Technical | Lovable generates outdated Supabase client patterns | M | M | Review all generated auth code; replace with `@supabase/ssr` patterns per official docs; Cursor rewrites auth module first before any other backend work |
| R-005 | Business | Manual exchange rate entry error corrupts cost calculations | M | H | Rate frozen at order creation (immutable); large rate input field with tooltip "Verify current RMB/PHP rate before saving"; Post-MVP: live API eliminates this risk |
| R-006 | Business | Manual data entry errors create inaccurate financial records | H | H | Zod validation on all forms and API routes; required field enforcement; audit log shows every change with user and timestamp |
| R-007 | Data | Accidental record deletion | L | H | Soft delete only — no hard deletes via UI; Admin-only delete permission; audit log captures all deletions |
| R-008 | Technical | Supabase free tier 500MB DB limit approached | L | L | At ~50 records/month, this limit is years away; Supabase Pro at $25/month is the straightforward upgrade path |
| R-009 | Resource | Single developer bottleneck | H | M | Detailed PRD reduces ambiguity; Cursor AI assists heavily; modular architecture allows incremental delivery per module |
| R-010 | Technical | Supabase local emulator Docker dependency adds friction in Cursor | M | L | Document exact setup steps in README; Supabase Studio UI makes local DB browsing easy; `supabase db reset` resets to clean seed state in one command |

---

## Section 20 — Open Questions & Decisions Log

| ID | Question | Why It Matters | Status |
|---|---|---|---|
| OQ-001 | Should inventory records be one-per-unit (individual tracking) or one-per-order-line (batch)? | Affects damaged/lost tracking granularity and schema design | Open |
| OQ-002 | Is Miscellaneous Cost a per-transaction field in the sales table or a monthly fixed input in Settings? | Determines schema placement and UI location | Open |
| OQ-003 | Are retailer credit terms always 7 days, or configurable per retailer in the Retailers directory? | If per-retailer, `credit_days` column needed on retailers table | Open |
| OQ-004 | Should historical Excel data be migrated at launch or deferred to Phase 2? | Determines if bulk CSV import is in MVP scope | Open |
| OQ-005 | What are the full names and email addresses of the 3 users? | Required to run `seed.sql` to pre-create accounts in Supabase Auth | Open |
| OQ-006 | Is a custom domain required at launch, or is `jedoms.vercel.app` acceptable? | Custom domain costs ~$10–15/year; Vercel subdomain is free and functional | Open |
| OQ-007 | Should Renting Cost be a fixed monthly entry in Settings or a per-sale allocation? | Affects where it's stored and how it contributes to profit calculations | Open |
| OQ-008 | Should the Gantt-style timeline in Orders show estimated arrival dates or only actual received dates? | If estimated dates needed, `estimated_arrival_date` column required on orders table | Open |

---

## Section 21 — Glossary

| Term | Definition |
|---|---|
| Agent | Chinese-based financial intermediary who receives Jed's peso payment and pays the supplier in yuan on his behalf |
| `@supabase/ssr` | Official Supabase package for React Vite that manages session cookies via HttpOnly secure cookies — replaces the deprecated `@supabase/auth-helpers-nextjs` |
| Audit Trigger | A PostgreSQL trigger that automatically inserts a row into `audit_log` after every INSERT, UPDATE, or DELETE on a primary table — fires at the DB layer regardless of application code |
| Cursor | AI-powered IDE used for all backend development: Supabase schema, RLS policies, API routes, and service logic |
| Credit Terms | The agreed payment window (default 7 days) given to retailers before their sale payment is considered overdue |
| Import Cost | Total cost of an order in PHP: Import Unit Price (¥) × Exchange Rate × Quantity — computed and stored immutably at order creation |
| Inventory Status | Condition classification of a received product unit: Good, Damaged, or Lost |
| Lovable.dev | AI-powered frontend scaffolding tool that natively generates React Vite + Supabase projects — used to build the initial UI shell before Cursor handles backend wiring |
| React Vite App Router | React Vite routing system using the `/app` directory with React Server Components — enables fullstack development in a single repository |
| organization_id | UUID foreign key present on every primary table — the root of multi-tenancy. RLS policies use this to ensure users only access their own organization's data |
| Pay Status | Payment state of an order (Unpaid/Paid/Canceled) or retailer sale (Unsold/Pending/Sold/Refunded) |
| RLS | Row Level Security — a PostgreSQL feature that enforces data access rules at the database layer. In Supabase, policies are written in SQL and evaluated using the authenticated user's JWT claims |
| RSC | React Server Component — a React Vite component that runs on the server during request handling, fetches data directly from Supabase, and delivers pre-rendered HTML to the browser |
| Receival Date | The date on which ordered goods arrive at the Philippine warehouse |
| RMB / CNY | Renminbi / Chinese Yuan (¥) — the currency used for supplier payments in China |
| Service Role Key | The `SUPABASE_SERVICE_ROLE_KEY` — a Supabase credential that bypasses all RLS policies. Must only be used server-side in API routes. Never exposed to the browser. |
| Soft Delete | Marking a record as deleted via `deleted_at` timestamp without physically removing it from the database. All queries filter `WHERE deleted_at IS NULL` by default |
| Supabase | An open-source Firebase alternative built on PostgreSQL. Provides: database, auth, RLS, realtime, storage, and edge functions — all accessible via a JavaScript SDK |
| Supabase Auth | Supabase's built-in authentication system handling: email/password login, bcrypt hashing, JWT token issuance, session management, and rate limiting |
| Supabase Local Emulator | A Docker-based local instance of Supabase for development — runs identical PostgreSQL + Auth + Storage locally, enabling fully offline development |
| SWR | `stale-while-revalidate` — a React data-fetching library that serves cached data immediately while revalidating in the background. Used for all client-side server state in JedOMS |
| Vercel | Cloud platform for deploying React Vite applications. Frontend (static assets) served from Vercel CDN; API routes run as Vercel Serverless Functions |
| Wholesale Price | The cost at which Jed sells to retailers — used for COGS calculation. Distinct from Import Unit Price (what Jed paid the supplier) |
| Zod | TypeScript schema validation library — used for input validation on both React Hook Form (frontend) and React Vite API routes (backend). Schemas defined once in `/lib/validations/` and shared between both |

---

*End of JedOMS Product Requirements Document v3.0*
*Stack: React Vite + Supabase (Auth + PostgreSQL + RLS) + Vercel*
*Scaffolding: Lovable.dev → GitHub → Cursor*
*Total infrastructure cost: $0/month*
*Designed for: 3 users at launch, scale-ready for multi-tenancy*
