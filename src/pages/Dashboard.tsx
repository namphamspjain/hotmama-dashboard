import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  orders,
  inventory,
  sales,
  payments,
  suppliers,
  agents,
  formatCurrency,
  getOverduePaymentsCount,
  getRetailerName,
  getSupplierName,
} from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Percent,
  ArrowRight,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* ─── Shared helpers & config types ─── */
const paymentsOverdueCount = getOverduePaymentsCount();

type MetricKey =
  // Orders
  | "ordersTotalPurchased"
  | "ordersShipping"
  | "ordersReceived"
  | "ordersImportCost"
  | "ordersShippingFees"
  | "ordersAgentFees"
  // Inventory
  | "inventoryTotalInStore"
  | "inventoryGood"
  | "inventoryDamaged"
  | "inventoryLost"
  | "inventoryCostOfLoss"
  // Sales
  | "salesTotalRevenue"
  | "salesTotalCost"
  | "salesNetProfit"
  | "salesMargin"
  | "salesPending"
  | "salesRefunded"
  // Payments
  | "overdue"
  | "agentFeesTotal"
  | "agentFeesPaid"
  | "retailerReceivables"
  | "retailerCollected";

type ChartKey =
  // Orders
  | "ordersTrend"
  | "ordersImportCostTrend"
  // Inventory
  | "inventoryStatusDistribution"
  | "inventoryByProductType"
  | "inventoryDamagedLostTrend"
  | "inventoryLossCost"
  // Sales
  | "salesTrend"
  | "salesRevenueCostProfitTrend"
  | "salesCostBreakdown"
  | "salesRevenueByRetailer"
  // Payments
  | "agentPaymentStatus"
  | "retailerPaymentStatus";

const ALL_METRIC_KEYS: MetricKey[] = [
  "ordersTotalPurchased",
  "ordersShipping",
  "ordersReceived",
  "ordersImportCost",
  "ordersShippingFees",
  "ordersAgentFees",
  "inventoryTotalInStore",
  "inventoryGood",
  "inventoryDamaged",
  "inventoryLost",
  "inventoryCostOfLoss",
  "salesTotalRevenue",
  "salesTotalCost",
  "salesNetProfit",
  "salesMargin",
  "salesPending",
  "salesRefunded",
  "overdue",
  "agentFeesTotal",
  "agentFeesPaid",
  "retailerReceivables",
  "retailerCollected",
];

const ALL_CHART_KEYS: ChartKey[] = [
  "ordersTrend",
  "ordersImportCostTrend",
  "inventoryStatusDistribution",
  "inventoryByProductType",
  "inventoryDamagedLostTrend",
  "inventoryLossCost",
  "salesTrend",
  "salesRevenueCostProfitTrend",
  "salesCostBreakdown",
  "salesRevenueByRetailer",
  "agentPaymentStatus",
  "retailerPaymentStatus",
];

const METRIC_STORAGE_KEY = "dashboard.selectedMetrics.v1";
const CHART_STORAGE_KEY = "dashboard.selectedCharts.v1";

// Start with no widgets selected; user configures everything.
const DEFAULT_METRICS: MetricKey[] = [];

const DEFAULT_CHARTS: ChartKey[] = [];

const PIE_COLORS = [
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

const AGENT_PIE_COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 50%)"];
const RETAILER_PIE_COLORS = ["hsl(220, 70%, 55%)", "hsl(340, 65%, 55%)"];

/* ─── Metric card ─── */
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  onClick?: () => void;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" };
  valueClassName?: string;
  subtitleClassName?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
  badge,
  valueClassName,
  subtitleClassName,
}: MetricCardProps) {
  return (
    <Card className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", valueClassName)}>{value}</span>
          {badge && <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>}
        </div>
        {subtitle && (
          <p className={cn("mt-1 text-xs text-muted-foreground", subtitleClassName)}>{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Custom tooltip ─── */
function TipContent({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: {currency ? formatCurrency(p.value) : p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/* ─── Page ─── */
const DashboardPage = () => {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_METRICS;
    try {
      const raw = window.localStorage.getItem(METRIC_STORAGE_KEY);
      if (!raw) return DEFAULT_METRICS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_METRICS;
      return parsed.filter((k: unknown): k is MetricKey =>
        typeof k === "string" && ALL_METRIC_KEYS.includes(k as MetricKey),
      );
    } catch {
      return DEFAULT_METRICS;
    }
  });

  const [selectedCharts, setSelectedCharts] = useState<ChartKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CHARTS;
    try {
      const raw = window.localStorage.getItem(CHART_STORAGE_KEY);
      if (!raw) return DEFAULT_CHARTS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_CHARTS;
      return parsed.filter((k: unknown): k is ChartKey =>
        typeof k === "string" && ALL_CHART_KEYS.includes(k as ChartKey),
      );
    } catch {
      return DEFAULT_CHARTS;
    }
  });
  const [configureOpen, setConfigureOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(METRIC_STORAGE_KEY, JSON.stringify(selectedMetrics));
  }, [selectedMetrics]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(selectedCharts));
  }, [selectedCharts]);

  // Filter datasets by date range
  const visibleOrders = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return orders;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return orders.filter((o) => {
      const d = new Date(o.orderDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [dateRange.from, dateRange.to]);

  const visibleSales = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return sales;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return sales.filter((s) => {
      const d = new Date(s.saleDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [dateRange.from, dateRange.to]);

  const visibleInventory = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return inventory;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return inventory.filter((i) => {
      const d = new Date(i.receivalDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [dateRange.from, dateRange.to]);

  const visiblePayments = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return payments;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return payments.filter((p) => {
      const d = new Date(p.dueDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [dateRange.from, dateRange.to]);

  /* ─── Metric helpers (from visible data) ─── */
  const {
    totalPurchased,
    ordersShipping,
    ordersReceived,
    totalImportCost,
    totalShippingFees,
    totalAgentFees,
    inventoryTotal,
    inventoryGood,
    inventoryDamaged,
    inventoryLost,
    inventoryCostOfLoss,
    salesTotalRevenue,
    salesTotalCost,
    salesNetProfit,
    salesMargin,
    salesPending,
    salesRefunded,
    overdueCount,
    agentFeesTotal,
    agentFeesPaid,
    retailerReceivables,
    retailerCollected,
  } = useMemo(() => {
    // Orders metrics (match Orders page)
    const totalPurchased = visibleOrders.reduce((s, o) => s + o.quantity, 0);
    const ordersShipping = visibleOrders.filter((o) => o.shippingStatus === "shipping").length;
    const ordersReceived = visibleOrders.filter((o) => o.shippingStatus === "received").length;
    const totalImportCost = visibleOrders.reduce((s, o) => s + o.importCostPhp, 0);
    const totalShippingFees = visibleOrders.reduce((s, o) => s + (o.shippingFee ?? 0), 0);
    const totalAgentFees = visibleOrders.reduce((s, o) => {
      const agt = agents.find((a) => a.id === o.agentId);
      return s + (agt ? o.importCostPhp * (agt.feePercent / 100) : 0);
    }, 0);

    // Inventory metrics (match Inventory page)
    const inventoryTotal = visibleInventory.length;
    const inventoryGood = visibleInventory.filter((i) => i.status === "good").length;
    const damagedItems = visibleInventory.filter((i) => i.status === "damaged");
    const lostItems = visibleInventory.filter((i) => i.status === "lost");
    const inventoryDamaged = damagedItems.length;
    const inventoryLost = lostItems.length;

    const unitMap: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        unitMap[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });
    const inventoryCostOfLoss = [...damagedItems, ...lostItems].reduce((sum, item) => {
      const unit = unitMap[item.orderId];
      if (!unit) return sum;
      return sum + unit;
    }, 0);

    // Sales metrics (match Sales page)
    const salesTotalRevenue = visibleSales.reduce((s, sl) => s + sl.revenue, 0);
    const salesTotalCost = visibleSales.reduce(
      (s, sl) => s + sl.wholesalePrice * sl.quantity + sl.deliveryFee,
      0,
    );
    const salesNetProfit = salesTotalRevenue - salesTotalCost;
    const salesMargin =
      salesTotalRevenue > 0 ? ((salesNetProfit / salesTotalRevenue) * 100).toFixed(1) : "0";
    const salesPending = visibleSales.filter((sl) => sl.deliveryStatus === "pending").length;
    const salesRefunded = visibleSales.filter((sl) => sl.deliveryStatus === "refunded").length;

    const overdueCount = visiblePayments.filter((p) => p.status === "overdue").length || paymentsOverdueCount;

    const agentPayments = visiblePayments.filter((p) => p.type === "agent");
    const retailerPayments = visiblePayments.filter((p) => p.type === "retailer");

    const agentFeesTotal = agentPayments
      .filter((p) => p.status === "unpaid" || p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);

    const agentFeesPaid = agentPayments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);

    const retailerReceivables = retailerPayments
      .filter((p) => p.status === "pending" || p.status === "sold")
      .reduce((s, p) => s + p.amount, 0);

    const retailerCollected = retailerPayments
      .filter((p) => p.status === "sold")
      .reduce((s, p) => s + p.amount, 0);

    return {
      totalPurchased,
      ordersShipping,
      ordersReceived,
      totalImportCost,
      totalShippingFees,
      totalAgentFees,
      inventoryTotal,
      inventoryGood,
      inventoryDamaged,
      inventoryLost,
      inventoryCostOfLoss,
      salesTotalRevenue,
      salesTotalCost,
      salesNetProfit,
      salesMargin,
      salesPending,
      salesRefunded,
      overdueCount,
      agentFeesTotal,
      agentFeesPaid,
      retailerReceivables,
      retailerCollected,
    };
  }, [visibleOrders, visibleInventory, visibleSales, visiblePayments]);

  /* ─── Chart data (from visible data) ─── */
  // Orders charts
  const ordersTrendData = useMemo(() => {
    const byDate = visibleOrders.reduce<Record<string, { orders: number; units: number }>>(
      (acc, o) => {
        const key = o.orderDate;
        if (!acc[key]) acc[key] = { orders: 0, units: 0 };
        acc[key].orders += 1;
        acc[key].units += o.quantity;
        return acc;
      },
      {},
    );
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, orders: v.orders, units: v.units }));
  }, [visibleOrders]);

  const importCostTrendData = useMemo(() => {
    const byDate = visibleOrders.reduce<Record<string, number>>((acc, o) => {
      const key = o.orderDate;
      acc[key] = (acc[key] ?? 0) + o.importCostPhp;
      return acc;
    }, {});
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totalImportCost]) => ({ date, totalImportCost }));
  }, [visibleOrders]);

  // Inventory charts
  const inventoryStatusData = useMemo(
    () =>
      [
        { name: "Good", value: inventoryGood },
        { name: "Damaged", value: inventoryDamaged },
        { name: "Lost", value: inventoryLost },
      ].filter((d) => d.value > 0),
    [inventoryGood, inventoryDamaged, inventoryLost],
  );

  const inventoryTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleInventory.forEach((i) => {
      map[i.productType] = (map[i.productType] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleInventory]);

  const damagedLostTrendData = useMemo(() => {
    const byDate: Record<string, { damaged: number; lost: number }> = {};
    visibleInventory.forEach((i) => {
      if (i.status !== "damaged" && i.status !== "lost") return;
      const key = i.receivalDate;
      if (!byDate[key]) {
        byDate[key] = { damaged: 0, lost: 0 };
      }
      if (i.status === "damaged") {
        byDate[key].damaged += 1;
      } else if (i.status === "lost") {
        byDate[key].lost += 1;
      }
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, ...value }));
  }, [visibleInventory]);

  const lossCostData = useMemo(() => {
    const orderCostMap: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        orderCostMap[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });

    const byDate: Record<string, number> = {};
    visibleInventory.forEach((i) => {
      if (i.status !== "damaged" && i.status !== "lost") return;
      const unitCost = orderCostMap[i.orderId];
      if (!unitCost) return;
      const key = i.receivalDate;
      byDate[key] = (byDate[key] || 0) + unitCost;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totalLoss]) => ({ date, totalLoss }));
  }, [visibleInventory]);

  // Sales charts
  const salesTrendData = useMemo(() => {
    const byDate: Record<string, { sales: number; revenue: number }> = {};
    visibleSales.forEach((sl) => {
      const key = sl.saleDate;
      if (!byDate[key]) byDate[key] = { sales: 0, revenue: 0 };
      byDate[key].sales += 1;
      byDate[key].revenue += sl.revenue;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, sales: v.sales, revenue: v.revenue }));
  }, [visibleSales]);

  const revenueCostProfitTrendData = useMemo(() => {
    const byDate: Record<string, { revenue: number; cost: number; profit: number }> = {};
    visibleSales.forEach((sl) => {
      const key = sl.saleDate;
      if (!byDate[key]) byDate[key] = { revenue: 0, cost: 0, profit: 0 };
      const cost = sl.wholesalePrice * sl.quantity + sl.deliveryFee;
      byDate[key].revenue += sl.revenue;
      byDate[key].cost += cost;
      byDate[key].profit += sl.netProfit;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [visibleSales]);

  const costBreakdown = useMemo(() => {
    const unitImportCostByOrder: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        unitImportCostByOrder[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });

    const costOfLoss = inventory.reduce((sum, item) => {
      if (item.status !== "damaged" && item.status !== "lost") return sum;
      const unit = unitImportCostByOrder[item.orderId];
      if (!unit) return sum;
      return sum + unit;
    }, 0);

    const shippingFee = orders.reduce((sum, o) => sum + (o.shippingFee ?? 0), 0);

    const agentFee = orders.reduce((sum, o) => {
      const agt = agents.find((a) => a.id === o.agentId);
      if (!agt) return sum;
      return sum + o.importCostPhp * (agt.feePercent / 100);
    }, 0);

    const deliveryFee = visibleSales.reduce((sum, sl) => sum + sl.deliveryFee, 0);

    const housingRental = 0;
    const misc = 0;

    return [
      { name: "Cost of Loss", value: costOfLoss },
      { name: "Shipping Fee", value: shippingFee },
      { name: "Agent Fee", value: agentFee },
      { name: "Delivery Fee", value: deliveryFee },
      { name: "Housing Rental Cost", value: housingRental },
      { name: "Miscellaneous Cost", value: misc },
    ];
  }, [visibleSales]);

  const revenueByRetailer = useMemo(() => {
    const byRetailer: Record<string, number> = {};
    visibleSales.forEach((s) => {
      const name = getRetailerName(s.retailerId);
      byRetailer[name] = (byRetailer[name] ?? 0) + s.revenue;
    });
    return Object.entries(byRetailer).map(([name, revenue]) => ({ name, revenue }));
  }, [visibleSales]);

const statusIcon: Record<string, React.ElementType> = {
  shipping: Truck,
  received: CheckCircle2,
  failed: XCircle,
};
const statusColor: Record<string, string> = {
  shipping: "text-[hsl(var(--info))]",
  received: "text-[hsl(var(--success))]",
  failed: "text-[hsl(var(--destructive))]",
};

  /* ─── Quick-status widget data ─── */
  const recentOrders = useMemo(
    () => [...visibleOrders].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 5),
    [visibleOrders],
  );
  const recentPayments = useMemo(
    () =>
      [...visiblePayments]
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
        .slice(0, 5),
    [visiblePayments],
  );
  const recentSales = useMemo(
    () =>
      [...visibleSales]
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
        .slice(0, 5),
    [visibleSales],
  );

  const retailerPaymentBySaleId = useMemo(() => {
    const map: Record<string, string> = {};
    visiblePayments
      .filter((p) => p.type === "retailer")
      .forEach((p) => {
        map[p.linkedId] = String(p.status);
      });
    return map;
  }, [visiblePayments]);

  const shippingBadgeStyles: Record<
    string,
    { label: string; cls: string }
  > = {
    shipping: {
      label: "Shipping",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    received: {
      label: "Received",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    failed: {
      label: "Failed",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const payBadgeStyles: Record<
    string,
    { label: string; cls: string }
  > = {
    paid: {
      label: "Paid",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    unpaid: {
      label: "Unpaid",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    overdue: {
      label: "Overdue",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const agentPayStatusStyles: Record<
    "paid" | "unpaid" | "overdue",
    { label: string; cls: string }
  > = {
    paid: {
      label: "Paid",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    unpaid: {
      label: "Unpaid",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    overdue: {
      label: "Overdue",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const retailerPayStatusStyles: Record<
    "unsold" | "pending" | "sold" | "refunded",
    { label: string; cls: string }
  > = {
    unsold: {
      label: "Unsold",
      cls: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    sold: {
      label: "Sold",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    refunded: {
      label: "Refunded",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const configureGroups: {
    id: "orders" | "inventory" | "sales" | "payments";
    title: string;
    metrics: { key: MetricKey; label: string }[];
    charts: { key: ChartKey; label: string }[];
  }[] = [
    {
      id: "orders",
      title: "Orders",
      metrics: [
        { key: "ordersTotalPurchased", label: "Total Purchased" },
        { key: "ordersShipping", label: "Shipping" },
        { key: "ordersReceived", label: "Received" },
        { key: "ordersImportCost", label: "Import Cost" },
        { key: "ordersShippingFees", label: "Shipping Fees" },
        { key: "ordersAgentFees", label: "Agent Fees" },
      ],
      charts: [
        { key: "ordersTrend", label: "Orders Trend" },
        { key: "ordersImportCostTrend", label: "Import Cost Trend" },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      metrics: [
        { key: "inventoryTotalInStore", label: "Total In-Store" },
        { key: "inventoryGood", label: "Good" },
        { key: "inventoryDamaged", label: "Damaged" },
        { key: "inventoryLost", label: "Lost" },
        { key: "inventoryCostOfLoss", label: "Cost of Loss" },
      ],
      charts: [
        { key: "inventoryStatusDistribution", label: "Status Distribution" },
        { key: "inventoryByProductType", label: "By Product Type" },
        { key: "inventoryDamagedLostTrend", label: "Damaged & Lost Trend" },
        { key: "inventoryLossCost", label: "Cost of Loss" },
      ],
    },
    {
      id: "sales",
      title: "Sales",
      metrics: [
        { key: "salesTotalRevenue", label: "Total Revenue" },
        { key: "salesTotalCost", label: "Total Cost" },
        { key: "salesNetProfit", label: "Net Profit" },
        { key: "salesMargin", label: "Margin" },
        { key: "salesPending", label: "Pending" },
        { key: "salesRefunded", label: "Refunded" },
      ],
      charts: [
        { key: "salesTrend", label: "Sales Trend" },
        { key: "salesRevenueCostProfitTrend", label: "Revenue vs Cost vs Profit Trend" },
        { key: "salesCostBreakdown", label: "Cost Breakdown" },
        { key: "salesRevenueByRetailer", label: "Revenue by Retailer" },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      metrics: [
        { key: "overdue", label: "Overdue Payments" },
        { key: "agentFeesTotal", label: "Agent Fees Total" },
        { key: "agentFeesPaid", label: "Agent Fees Paid" },
        { key: "retailerReceivables", label: "Retailer Receivables" },
        { key: "retailerCollected", label: "Retailer Collected" },
      ],
      charts: [
        { key: "agentPaymentStatus", label: "Agent Payment Status" },
        { key: "retailerPaymentStatus", label: "Retailer Payment Status" },
      ],
    },
  ];

  const handleToggleGroup = (groupId: "orders" | "inventory" | "sales" | "payments") => {
    const group = configureGroups.find((g) => g.id === groupId);
    if (!group) return;

    const metricKeys = group.metrics.map((m) => m.key);
    const chartKeys = group.charts.map((c) => c.key);

    const allMetricsSelected = metricKeys.every((k) => selectedMetrics.includes(k));
    const allChartsSelected = chartKeys.every((k) => selectedCharts.includes(k));
    const allSelected = allMetricsSelected && allChartsSelected;

    if (allSelected) {
      setSelectedMetrics((prev) => prev.filter((k) => !metricKeys.includes(k)));
      setSelectedCharts((prev) => prev.filter((k) => !chartKeys.includes(k)));
      return;
    }

    setSelectedCharts((prev) => {
      const next = [...prev];
      chartKeys.forEach((k) => {
        if (!next.includes(k)) next.push(k);
      });
      return next;
    });

    setSelectedMetrics((prev) => {
      const base = prev.filter((k) => !metricKeys.includes(k));
      const toAdd: MetricKey[] = [];
      metricKeys.forEach((k) => {
        if (!base.includes(k)) {
          toAdd.push(k);
        }
      });
      return [...base, ...toAdd];
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {selectedMetrics.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-6 border-dashed">
            <CardContent className="py-10 flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-medium">No metric cards selected.</p>
              <p className="text-xs text-muted-foreground">
                Click <span className="font-semibold">Configure</span> to add metrics from Orders, Inventory, Sales, or Payments.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Orders metrics */}
        {selectedMetrics.includes("ordersTotalPurchased") && (
          <MetricCard
            title="Total Purchased"
            value={String(totalPurchased)}
            subtitle="units"
            icon={Package}
            onClick={() => navigate("/orders")}
          />
        )}
        {selectedMetrics.includes("ordersShipping") && (
          <MetricCard
            title="Shipping"
            value={String(ordersShipping)}
            subtitle="orders"
            icon={Truck}
            valueClassName="text-amber-500"
            subtitleClassName="text-amber-500"
            onClick={() => navigate("/orders")}
          />
        )}
        {selectedMetrics.includes("ordersReceived") && (
          <MetricCard
            title="Received"
            value={String(ordersReceived)}
            subtitle="orders"
            icon={CheckCircle2}
            valueClassName="text-emerald-500"
            subtitleClassName="text-emerald-500"
            onClick={() => navigate("/orders")}
          />
        )}
        {selectedMetrics.includes("ordersImportCost") && (
          <MetricCard
            title="Import Cost"
            value={formatCurrency(totalImportCost)}
            icon={DollarSign}
            onClick={() => navigate("/orders")}
          />
        )}
        {selectedMetrics.includes("ordersShippingFees") && (
          <MetricCard
            title="Shipping Fees"
            value={formatCurrency(totalShippingFees)}
            icon={Truck}
            onClick={() => navigate("/orders")}
          />
        )}
        {selectedMetrics.includes("ordersAgentFees") && (
          <MetricCard
            title="Agent Fees"
            value={formatCurrency(totalAgentFees)}
            icon={DollarSign}
            onClick={() => navigate("/orders")}
          />
        )}

        {/* Inventory metrics */}
        {selectedMetrics.includes("inventoryTotalInStore") && (
          <MetricCard
            title="Total In-Store"
            value={String(inventoryTotal)}
            subtitle="products"
            icon={Package}
            onClick={() => navigate("/inventory")}
          />
        )}
        {selectedMetrics.includes("inventoryGood") && (
          <MetricCard
            title="Good"
            value={String(inventoryGood)}
            subtitle="products"
            icon={CheckCircle2}
            valueClassName="text-emerald-500"
            subtitleClassName="text-emerald-500"
            onClick={() => navigate("/inventory")}
          />
        )}
        {selectedMetrics.includes("inventoryDamaged") && (
          <MetricCard
            title="Damaged"
            value={String(inventoryDamaged)}
            subtitle="products"
            icon={AlertTriangle}
            valueClassName="text-amber-500"
            subtitleClassName="text-amber-500"
            onClick={() => navigate("/inventory")}
          />
        )}
        {selectedMetrics.includes("inventoryLost") && (
          <MetricCard
            title="Lost"
            value={String(inventoryLost)}
            subtitle="products"
            icon={XCircle}
            valueClassName="text-red-500"
            subtitleClassName="text-red-500"
            onClick={() => navigate("/inventory")}
          />
        )}
        {selectedMetrics.includes("inventoryCostOfLoss") && (
          <MetricCard
            title="Cost of Loss"
            value={formatCurrency(inventoryCostOfLoss)}
            icon={XCircle}
            valueClassName="text-red-500"
            onClick={() => navigate("/inventory")}
          />
        )}

        {/* Sales metrics */}
        {selectedMetrics.includes("salesTotalRevenue") && (
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(salesTotalRevenue)}
            icon={DollarSign}
            onClick={() => navigate("/sales")}
          />
        )}
        {selectedMetrics.includes("salesTotalCost") && (
          <MetricCard
            title="Total Cost"
            value={formatCurrency(salesTotalCost)}
            icon={ShoppingCart}
            onClick={() => navigate("/sales")}
          />
        )}
        {selectedMetrics.includes("salesNetProfit") && (
          <MetricCard
            title="Net Profit"
            value={formatCurrency(salesNetProfit)}
            icon={TrendingUp}
            valueClassName={
              salesNetProfit > 0 ? "text-emerald-500" : salesNetProfit < 0 ? "text-red-500" : undefined
            }
            onClick={() => navigate("/sales")}
          />
        )}
        {selectedMetrics.includes("salesMargin") && (
          <MetricCard
            title="Margin"
            value={`${salesMargin}%`}
            icon={Percent}
          />
        )}
        {selectedMetrics.includes("salesPending") && (
          <MetricCard
            title="Pending"
            value={String(salesPending)}
            subtitle="sales"
            icon={Clock}
            valueClassName="text-amber-500"
            subtitleClassName="text-amber-500"
            onClick={() => navigate("/sales")}
          />
        )}
        {selectedMetrics.includes("salesRefunded") && (
          <MetricCard
            title="Refunded"
            value={String(salesRefunded)}
            subtitle="sales"
            icon={Clock}
            valueClassName="text-red-500"
            subtitleClassName="text-red-500"
            onClick={() => navigate("/sales")}
          />
        )}

        {/* Payments metrics */}
        {selectedMetrics.includes("overdue") && (
          <MetricCard
            title="Overdue"
            value={String(overdueCount)}
            icon={overdueCount > 0 ? AlertTriangle : CreditCard}
            onClick={() => navigate("/payments")}
            badge={
              overdueCount > 0
                ? { label: "Action needed", variant: "destructive" }
                : undefined
            }
          />
        )}
        {selectedMetrics.includes("agentFeesTotal") && (
          <MetricCard
            title="Agent Fees Total"
            value={formatCurrency(agentFeesTotal)}
            icon={DollarSign}
            onClick={() => navigate("/payments")}
          />
        )}
        {selectedMetrics.includes("agentFeesPaid") && (
          <MetricCard
            title="Agent Fees Paid"
            value={formatCurrency(agentFeesPaid)}
            icon={CheckCircle2}
            valueClassName={
              agentFeesPaid === agentFeesTotal ? "text-emerald-500" : "text-amber-500"
            }
            onClick={() => navigate("/payments")}
          />
        )}
        {selectedMetrics.includes("retailerReceivables") && (
          <MetricCard
            title="Retailer Receivables"
            value={formatCurrency(retailerReceivables)}
            icon={CreditCard}
            onClick={() => navigate("/payments")}
          />
        )}
        {selectedMetrics.includes("retailerCollected") && (
          <MetricCard
            title="Retailer Collected"
            value={formatCurrency(retailerCollected)}
            icon={CheckCircle2}
            valueClassName={
              retailerCollected === retailerReceivables ? "text-emerald-500" : "text-amber-500"
            }
            onClick={() => navigate("/payments")}
          />
        )}
      </div>

      {/* Date range filter + Configure */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex justify-start">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal w-full sm:w-[220px]"
              >
                <span className="mr-2 text-xs font-medium text-muted-foreground">
                  Date
                </span>
                {dateRange.from && dateRange.to ? (
                  <span className="text-xs">
                    {dateRange.from.toLocaleDateString()} –{" "}
                    {dateRange.to.toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">All time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                <div className="flex flex-col border-r bg-muted/40 p-3 gap-1 min-w-[140px]">
                  {[
                    { label: "Today", days: 0 },
                    { label: "Last 7 days", days: 7 },
                    { label: "Last 30 days", days: 30 },
                    { label: "Last 3 months", days: 90 },
                    { label: "Last 6 months", days: 180 },
                    { label: "All year", days: 365 },
                    { label: "All time", days: null },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (preset.days === null) {
                          setDateRange({ from: null, to: null });
                        } else if (preset.days === 0) {
                          setDateRange({ from: today, to: today });
                        } else {
                          const from = new Date(today);
                          from.setDate(from.getDate() - (preset.days - 1));
                          setDateRange({ from, to: today });
                        }
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="p-3">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      if (!range) {
                        setDateRange({ from: null, to: null });
                        return;
                      }
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const rawFrom = range.from ?? today;
                      const rawTo = range.to ?? rawFrom;
                      const from = new Date(
                        Math.min(rawFrom.getTime(), today.getTime()),
                      );
                      const to = new Date(
                        Math.min(rawTo.getTime(), today.getTime()),
                      );
                      setDateRange({ from, to });
                    }}
                    disabled={(date) => date > new Date()}
                    numberOfMonths={2}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 self-end bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          onClick={() => setConfigureOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Configure
        </Button>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {selectedCharts.length === 0 && (
          <Card className="lg:col-span-2 border-dashed">
            <CardContent className="py-10 flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-medium">No charts selected.</p>
              <p className="text-xs text-muted-foreground">
                Use <span className="font-semibold">Configure</span> to add trend or distribution charts to this overview.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Orders charts */}
        {selectedCharts.includes("ordersTrend") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Orders Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { date: string; orders: number; units: number };
                      return (
                        <div className="rounded-md border bg-background p-3 shadow-md">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-sm font-medium">Orders: {p.orders}</p>
                          <p className="text-sm font-medium">Units: {p.units}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="units" name="Units" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {selectedCharts.includes("ordersImportCostTrend") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Import Cost Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importCostTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar
                    dataKey="totalImportCost"
                    name="Import Cost"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Inventory charts */}
        {selectedCharts.includes("inventoryStatusDistribution") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {inventoryStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("inventoryByProductType") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">By Product Type</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {inventoryTypeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("inventoryDamagedLostTrend") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Damaged &amp; Lost Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={damagedLostTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="damaged"
                    name="Damaged"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lost"
                    name="Lost"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("inventoryLossCost") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Cost of Loss</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lossCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => formatCurrency(v as number)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="totalLoss"
                    name="Cost of Loss"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales charts */}
        {selectedCharts.includes("salesTrend") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Sales Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { date: string; sales: number; revenue: number };
                      return (
                        <div className="rounded-md border bg-background p-3 shadow-md">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-sm font-medium">Sales: {p.sales}</p>
                          <p className="text-sm font-medium">Revenue: {formatCurrency(p.revenue)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="sales" name="Sales" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("salesRevenueCostProfitTrend") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Revenue vs Cost vs Profit Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueCostProfitTrendData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="hsl(220, 70%, 55%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="cost"
                    name="Cost"
                    fill="hsl(30, 80%, 55%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="Profit"
                    fill="hsl(160, 60%, 45%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("salesCostBreakdown") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {costBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("salesRevenueByRetailer") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue by Retailer</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByRetailer} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs fill-muted-foreground"
                    width={120}
                  />
                  <Tooltip content={<TipContent currency />} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="hsl(var(--info))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Payments charts */}
        {selectedCharts.includes("agentPaymentStatus") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Agent Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Paid", value: agentFeesPaid },
                      { name: "Unpaid", value: Math.max(agentFeesTotal - agentFeesPaid, 0) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    <Cell fill={AGENT_PIE_COLORS[0]} />
                    <Cell fill={AGENT_PIE_COLORS[1]} />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedCharts.includes("retailerPaymentStatus") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Retailer Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Collected", value: retailerCollected },
                      { name: "Pending", value: Math.max(retailerReceivables - retailerCollected, 0) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    <Cell fill={RETAILER_PIE_COLORS[0]} />
                    <Cell fill={RETAILER_PIE_COLORS[1]} />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick-status widgets */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <button onClick={() => navigate("/orders")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {recentOrders.map((o) => {
                const SIcon = statusIcon[o.shippingStatus] ?? Clock;
                const shipCfg = shippingBadgeStyles[o.shippingStatus] ?? {
                  label: o.shippingStatus,
                  cls: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
                };
                const payCfg = payBadgeStyles[o.payStatus] ?? {
                  label: o.payStatus,
                  cls: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
                };
                return (
                  <div key={o.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SIcon className={`h-4 w-4 shrink-0 ${statusColor[o.shippingStatus] ?? "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.productName}</p>
                        <p className="text-xs text-muted-foreground">{o.orderDate} · {o.quantity} pcs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${shipCfg.cls}`}>
                        {shipCfg.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${payCfg.cls}`}>
                        {payCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
            <button onClick={() => navigate("/payments")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments found.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {recentPayments.map((p) => {
                  const isAgent = p.type === "agent";
                  const Icon = isAgent ? ArrowUpRight : ArrowDownLeft;
                  const sideLabel = isAgent ? "To Agent" : "From Retailer";
                  const amountCls =
                    p.status === "overdue"
                      ? "text-destructive"
                      : "text-foreground";
                  const rowBg = isAgent
                    ? "bg-red-50 dark:bg-red-900/10"
                    : "bg-emerald-50 dark:bg-emerald-900/10";

                  let statusCfg:
                    | { label: string; cls: string }
                    | undefined;
                  if (isAgent && (p.status === "paid" || p.status === "unpaid" || p.status === "overdue")) {
                    statusCfg = agentPayStatusStyles[p.status];
                  } else if (!isAgent && (p.status === "unsold" || p.status === "pending" || p.status === "sold" || p.status === "refunded")) {
                    statusCfg = retailerPayStatusStyles[p.status];
                  }
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${rowBg}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.partnerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {p.dueDate} · {sideLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-sm font-semibold ${amountCls}`}>
                          {formatCurrency(p.amount)}
                        </span>
                        {statusCfg && (
                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.cls}`}
                          >
                            {statusCfg.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
            <button onClick={() => navigate("/sales")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sales yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {recentSales.map((s) => {
                  const deliveryCfg =
                    s.deliveryStatus === "pending"
                      ? {
                          label: "Pending",
                          cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
                        }
                      : s.deliveryStatus === "delivered"
                      ? {
                          label: "Delivered",
                          cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
                        }
                      : {
                          label: "Refunded",
                          cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
                        };

                  const paymentStatusKey = retailerPaymentBySaleId[s.id] as
                    | "unsold"
                    | "pending"
                    | "sold"
                    | "refunded"
                    | undefined;
                  const paymentCfg = paymentStatusKey
                    ? retailerPayStatusStyles[paymentStatusKey]
                    : undefined;

                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.productType}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.productName} · {s.quantity} pcs
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${deliveryCfg.cls}`}
                        >
                          {deliveryCfg.label}
                        </span>
                        {paymentCfg && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${paymentCfg.cls}`}
                          >
                            {paymentCfg.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configure Overview dialog */}
      <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Configure Overview</DialogTitle>
            <DialogDescription>
              Select metric cards and charts to display on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Metrics (6 per row) and charts grouped by page.
            </p>
            {configureGroups.map((group) => {
              const groupMetricKeys = group.metrics.map((m) => m.key);
              const groupChartKeys = group.charts.map((c) => c.key);
              const allMetricsSelected = groupMetricKeys.every((k) => selectedMetrics.includes(k));
              const allChartsSelected = groupChartKeys.every((k) => selectedCharts.includes(k));
              const allSelected = allMetricsSelected && allChartsSelected;

              return (
                <div key={group.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{group.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Select metric cards and charts from the {group.title.toLowerCase()} page.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleToggleGroup(group.id)}
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </Button>
                  </div>

                  {group.metrics.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                        METRIC
                      </p>
                      <div className="space-y-2">
                        {group.metrics.map((opt) => {
                          const checked = selectedMetrics.includes(opt.key);
                          return (
                            <Label
                              key={opt.key}
                              className="flex items-center gap-2 text-sm font-normal"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = Boolean(v);
                                  setSelectedMetrics((prev) =>
                                    next
                                      ? prev.includes(opt.key)
                                        ? prev
                                        : [...prev, opt.key]
                                      : prev.filter((k) => k !== opt.key),
                                  );
                                }}
                              />
                              <span>{opt.label}</span>
                            </Label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {group.charts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                        CHART
                      </p>
                      <div className="space-y-2">
                        {group.charts.map((opt) => {
                          const checked = selectedCharts.includes(opt.key);
                          return (
                            <Label
                              key={opt.key}
                              className="flex items-center gap-2 text-sm font-normal"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = Boolean(v);
                                  setSelectedCharts((prev) => {
                                    if (next) {
                                      if (prev.includes(opt.key)) return prev;
                                      return [...prev, opt.key];
                                    }
                                    return prev.filter((k) => k !== opt.key);
                                  });
                                }}
                              />
                              <span>{opt.label}</span>
                            </Label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
