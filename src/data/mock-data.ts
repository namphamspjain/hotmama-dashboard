// ============ PARTNERS ============
export interface Supplier {
  id: string; name: string; contactPerson: string; phone: string; email: string;
  address: string; socialUrl: string; shippingFee: number;
}
export interface Agent {
  id: string; name: string; contactPerson: string; phone: string; email: string;
  address: string; socialUrl: string; feePercent: number;
}
export interface Warehouse {
  id: string; name: string; contactPerson: string; phone: string; email: string; address: string;
}
export interface Retailer {
  id: string; name: string; contactPerson: string; phone: string; email: string;
  address: string; socialUrl: string; paymentMethod: string;
}

export const suppliers: Supplier[] = [
  { id: "SUP-001", name: "Shenzhen Apple Hub", contactPerson: "Li Wei", phone: "+86 138 0000 1234", email: "liwei@szhub.cn", address: "Shenzhen, China", socialUrl: "https://wechat.com/szhub", shippingFee: 2500 },
  { id: "SUP-002", name: "HK Mobile Direct", contactPerson: "Chan Ming", phone: "+852 9123 4567", email: "ming@hkmd.hk", address: "Hong Kong", socialUrl: "https://wa.me/85291234567", shippingFee: 1800 },
];

export const agents: Agent[] = [
  { id: "AGT-001", name: "FastForward Logistics", contactPerson: "Mark Tan", phone: "+63 917 123 4567", email: "mark@fflogistics.ph", address: "Makati, PH", socialUrl: "https://wa.me/639171234567", feePercent: 5 },
  { id: "AGT-002", name: "QuickShip PH", contactPerson: "Ana Reyes", phone: "+63 918 765 4321", email: "ana@quickship.ph", address: "Quezon City, PH", socialUrl: "https://t.me/quickshipph", feePercent: 4 },
];

export const warehouses: Warehouse[] = [
  { id: "WH-001", name: "Main Warehouse Manila", contactPerson: "Jose Garcia", phone: "+63 912 345 6789", email: "jose@warehouse.ph", address: "Pasig, Metro Manila" },
];

export const retailers: Retailer[] = [
  { id: "RET-001", name: "TechZone PH", contactPerson: "Rico Lim", phone: "+63 915 111 2222", email: "rico@techzone.ph", address: "BGC, Taguig", socialUrl: "https://shopee.ph/techzone", paymentMethod: "Bank Transfer" },
  { id: "RET-002", name: "iGadget Store", contactPerson: "Jenny Co", phone: "+63 916 333 4444", email: "jenny@igadget.ph", address: "Cebu City", socialUrl: "https://lazada.ph/igadget", paymentMethod: "GCash" },
  { id: "RET-003", name: "Apple Corner MNL", contactPerson: "David Sy", phone: "+63 917 555 6666", email: "david@applecorner.ph", address: "Makati City", socialUrl: "https://fb.com/applecornermnl", paymentMethod: "Bank Transfer" },
];

// ============ ORDERS ============
export type ShippingStatus = "shipping" | "received" | "failed";
export type PayStatus = "paid" | "unpaid" | "overdue";

export interface Order {
  id: string; supplierId: string; agentId: string; productType: string; productName: string;
  quantity: number; importUnitPriceYuan: number; exchangeRate: number; importCostPhp: number;
  shippingStatus: ShippingStatus; payStatus: PayStatus; orderDate: string; receivalDate?: string; notes?: string;
}

export const orders: Order[] = [
  { id: "OD-20260110-001", supplierId: "SUP-001", agentId: "AGT-001", productType: "iPhone", productName: "iPhone 15 Pro Max 256GB", quantity: 10, importUnitPriceYuan: 7800, exchangeRate: 7.8, importCostPhp: 100000, shippingStatus: "received", payStatus: "paid", orderDate: "2026-01-10", receivalDate: "2026-01-18" },
  { id: "OD-20260115-002", supplierId: "SUP-002", agentId: "AGT-002", productType: "iPad", productName: "iPad Air M2 256GB", quantity: 5, importUnitPriceYuan: 4200, exchangeRate: 7.8, importCostPhp: 26923, shippingStatus: "received", payStatus: "paid", orderDate: "2026-01-15", receivalDate: "2026-01-22" },
  { id: "OD-20260201-003", supplierId: "SUP-001", agentId: "AGT-001", productType: "MacBook", productName: "MacBook Air M3 512GB", quantity: 3, importUnitPriceYuan: 8500, exchangeRate: 7.8, importCostPhp: 32692, shippingStatus: "received", payStatus: "unpaid", orderDate: "2026-02-01", receivalDate: "2026-02-09" },
  { id: "OD-20260210-004", supplierId: "SUP-002", agentId: "AGT-002", productType: "iPhone", productName: "iPhone 15 128GB", quantity: 15, importUnitPriceYuan: 5200, exchangeRate: 7.8, importCostPhp: 100000, shippingStatus: "shipping", payStatus: "unpaid", orderDate: "2026-02-10" },
  { id: "OD-20260215-005", supplierId: "SUP-001", agentId: "AGT-001", productType: "AirPods", productName: "AirPods Pro 2nd Gen", quantity: 20, importUnitPriceYuan: 1500, exchangeRate: 7.8, importCostPhp: 38462, shippingStatus: "shipping", payStatus: "unpaid", orderDate: "2026-02-15" },
  { id: "OD-20260105-006", supplierId: "SUP-001", agentId: "AGT-002", productType: "Apple Watch", productName: "Apple Watch Ultra 2", quantity: 4, importUnitPriceYuan: 5800, exchangeRate: 7.8, importCostPhp: 29744, shippingStatus: "received", payStatus: "overdue", orderDate: "2026-01-05", receivalDate: "2026-01-14" },
];

// ============ INVENTORY ============
export type InventoryStatus = "good" | "damaged" | "lost";

export interface InventoryItem {
  id: string; productName: string; productType: string; status: InventoryStatus;
  orderId: string; receivalDate: string; notes?: string;
}

export const inventory: InventoryItem[] = [
  { id: "PRD-001", productName: "iPhone 15 Pro Max 256GB", productType: "iPhone", status: "good", orderId: "OD-20260110-001", receivalDate: "2026-01-18" },
  { id: "PRD-002", productName: "iPhone 15 Pro Max 256GB", productType: "iPhone", status: "good", orderId: "OD-20260110-001", receivalDate: "2026-01-18" },
  { id: "PRD-003", productName: "iPhone 15 Pro Max 256GB", productType: "iPhone", status: "damaged", orderId: "OD-20260110-001", receivalDate: "2026-01-18", notes: "Screen scratch on arrival" },
  { id: "PRD-004", productName: "iPad Air M2 256GB", productType: "iPad", status: "good", orderId: "OD-20260115-002", receivalDate: "2026-01-22" },
  { id: "PRD-005", productName: "iPad Air M2 256GB", productType: "iPad", status: "good", orderId: "OD-20260115-002", receivalDate: "2026-01-22" },
  { id: "PRD-006", productName: "MacBook Air M3 512GB", productType: "MacBook", status: "good", orderId: "OD-20260201-003", receivalDate: "2026-02-09" },
  { id: "PRD-007", productName: "MacBook Air M3 512GB", productType: "MacBook", status: "lost", orderId: "OD-20260201-003", receivalDate: "2026-02-09", notes: "Missing from shipment" },
  { id: "PRD-008", productName: "Apple Watch Ultra 2", productType: "Apple Watch", status: "good", orderId: "OD-20260105-006", receivalDate: "2026-01-14" },
  { id: "PRD-009", productName: "Apple Watch Ultra 2", productType: "Apple Watch", status: "good", orderId: "OD-20260105-006", receivalDate: "2026-01-14" },
];

// ============ SALES ============
export type DeliveryStatus = "pending" | "delivered" | "refunded";

export interface Sale {
  id: string; retailerId: string; productName: string; productType: string; quantity: number;
  sellingPrice: number; wholesalePrice: number; deliveryFee: number; revenue: number;
  netProfit: number; deliveryStatus: DeliveryStatus; saleDate: string;
}

export const sales: Sale[] = [
  { id: "SL-20260125-001", retailerId: "RET-001", productName: "iPhone 15 Pro Max 256GB", productType: "iPhone", quantity: 3, sellingPrice: 72000, wholesalePrice: 60000, deliveryFee: 500, revenue: 216000, netProfit: 35500, deliveryStatus: "delivered", saleDate: "2026-01-25" },
  { id: "SL-20260128-002", retailerId: "RET-002", productName: "iPad Air M2 256GB", productType: "iPad", quantity: 2, sellingPrice: 38000, wholesalePrice: 30000, deliveryFee: 400, revenue: 76000, netProfit: 15600, deliveryStatus: "delivered", saleDate: "2026-01-28" },
  { id: "SL-20260212-003", retailerId: "RET-003", productName: "MacBook Air M3 512GB", productType: "MacBook", quantity: 1, sellingPrice: 85000, wholesalePrice: 70000, deliveryFee: 600, revenue: 85000, netProfit: 14400, deliveryStatus: "pending", saleDate: "2026-02-12" },
  { id: "SL-20260205-004", retailerId: "RET-001", productName: "Apple Watch Ultra 2", productType: "Apple Watch", quantity: 2, sellingPrice: 45000, wholesalePrice: 38000, deliveryFee: 300, revenue: 90000, netProfit: 13700, deliveryStatus: "delivered", saleDate: "2026-02-05" },
  { id: "SL-20260201-005", retailerId: "RET-002", productName: "iPhone 15 Pro Max 256GB", productType: "iPhone", quantity: 1, sellingPrice: 70000, wholesalePrice: 60000, deliveryFee: 500, revenue: 70000, netProfit: 9500, deliveryStatus: "refunded", saleDate: "2026-02-01" },
];

// ============ PAYMENTS ============
export type PaymentType = "agent" | "retailer";
export type RetailerPayStatus = "unsold" | "pending" | "sold" | "refunded";

export interface Payment {
  id: string; type: PaymentType; partnerName: string; linkedId: string; amount: number;
  status: PayStatus | RetailerPayStatus; dueDate: string; paidDate?: string;
}

export const payments: Payment[] = [
  { id: "PAY-001", type: "agent", partnerName: "FastForward Logistics", linkedId: "OD-20260110-001", amount: 5000, status: "paid", dueDate: "2026-01-25", paidDate: "2026-01-24" },
  { id: "PAY-002", type: "agent", partnerName: "QuickShip PH", linkedId: "OD-20260115-002", amount: 1077, status: "paid", dueDate: "2026-01-29", paidDate: "2026-01-28" },
  { id: "PAY-003", type: "agent", partnerName: "FastForward Logistics", linkedId: "OD-20260201-003", amount: 1635, status: "unpaid", dueDate: "2026-02-15" },
  { id: "PAY-004", type: "agent", partnerName: "QuickShip PH", linkedId: "OD-20260105-006", amount: 1190, status: "overdue", dueDate: "2026-01-19" },
  { id: "PAY-005", type: "retailer", partnerName: "TechZone PH", linkedId: "SL-20260201-005", amount: 216000, status: "sold", dueDate: "2026-02-01", paidDate: "2026-01-31" },
  { id: "PAY-006", type: "retailer", partnerName: "iGadget Store", linkedId: "SL-20260128-002", amount: 76000, status: "sold", dueDate: "2026-02-04", paidDate: "2026-02-03" },
  { id: "PAY-007", type: "retailer", partnerName: "Apple Corner MNL", linkedId: "SL-20260212-003", amount: 85000, status: "pending", dueDate: "2026-02-26" },
  { id: "PAY-008", type: "retailer", partnerName: "TechZone PH", linkedId: "SL-20260205-004", amount: 90000, status: "refunded", dueDate: "2026-02-12" },
];

// ============ USERS ============
export interface MockUser {
  id: string; name: string; email: string; role: "admin" | "editor" | "viewer"; active: boolean;
}

export const mockUsers: MockUser[] = [
  { id: "1", name: "Jed Santos", email: "admin@jedoms.com", role: "admin", active: true },
  { id: "2", name: "Maria Cruz", email: "editor@jedoms.com", role: "editor", active: true },
  { id: "3", name: "Carlos Reyes", email: "viewer@jedoms.com", role: "viewer", active: true },
];

// ============ HELPERS ============
export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getOverduePaymentsCount(): number {
  return payments.filter((p) => p.status === "overdue").length;
}

export function getSupplierName(id: string): string {
  return suppliers.find((s) => s.id === id)?.name ?? id;
}

export function getAgentName(id: string): string {
  return agents.find((a) => a.id === id)?.name ?? id;
}

export function getRetailerName(id: string): string {
  return retailers.find((r) => r.id === id)?.name ?? id;
}
