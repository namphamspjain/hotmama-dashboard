import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  orders, inventory, sales, payments,
  formatCurrency, getOverduePaymentsCount,
  getRetailerName, getSupplierName,
} from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Package, TrendingUp, CreditCard, AlertTriangle, Percent,
  ArrowRight, Truck, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Area, AreaChart,
} from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/* ─── Shared helpers ─── */
const paymentsOverdueCount = getOverduePaymentsCount();

const PIE_COLORS = [
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

/* ─── Metric card ─── */
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  onClick?: () => void;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" };
}

function MetricCard({ title, value, subtitle, icon: Icon, onClick, badge }: MetricCardProps) {
  return (
    <Card className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {badge && <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
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
    totalOrders,
    shippingOrders,
    receivedOrders,
    totalInventory,
    goodCount,
    damagedCount,
    lostCount,
    totalRevenue,
    totalNetProfit,
    profitMargin,
    overdueCount,
  } = useMemo(() => {
    const totalOrders = visibleOrders.length;
    const shippingOrders = visibleOrders.filter((o) => o.shippingStatus === "shipping").length;
    const receivedOrders = visibleOrders.filter((o) => o.shippingStatus === "received").length;

    const totalInventory = visibleInventory.length;
    const goodCount = visibleInventory.filter((i) => i.status === "good").length;
    const damagedCount = visibleInventory.filter((i) => i.status === "damaged").length;
    const lostCount = visibleInventory.filter((i) => i.status === "lost").length;

    const totalRevenue = visibleSales.reduce((s, sl) => s + sl.revenue, 0);
    const totalNetProfit = visibleSales.reduce((s, sl) => s + sl.netProfit, 0);
    const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0";

    const overdueCount = visiblePayments.filter((p) => p.status === "overdue").length || paymentsOverdueCount;

    return {
      totalOrders,
      shippingOrders,
      receivedOrders,
      totalInventory,
      goodCount,
      damagedCount,
      lostCount,
      totalRevenue,
      totalNetProfit,
      profitMargin,
      overdueCount,
    };
  }, [visibleOrders, visibleInventory, visibleSales, visiblePayments]);

  /* ─── Chart data (from visible data) ─── */
  const ordersTrend = useMemo(() => {
    const byMonth = visibleOrders.reduce<Record<string, number>>((acc, o) => {
      const m = o.orderDate.slice(0, 7);
      acc[m] = (acc[m] ?? 0) + o.quantity;
      return acc;
    }, {});
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, qty]) => ({ month, qty }));
  }, [visibleOrders]);

  const revenueProfitTrend = useMemo(() => {
    const byMonth: Record<string, { revenue: number; profit: number }> = {};
    visibleSales.forEach((s) => {
      const m = s.saleDate.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { revenue: 0, profit: 0 };
      byMonth[m].revenue += s.revenue;
      byMonth[m].profit += s.netProfit;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, ...d }));
  }, [visibleSales]);

  const inventoryStatusData = useMemo(
    () => [
      { name: "Good", value: goodCount },
      { name: "Damaged", value: damagedCount },
      { name: "Lost", value: lostCount },
    ],
    [goodCount, damagedCount, lostCount],
  );

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
  const overduePayments = useMemo(
    () => visiblePayments.filter((p) => p.status === "overdue"),
    [visiblePayments],
  );
  const pendingSales = useMemo(
    () => visibleSales.filter((s) => s.deliveryStatus === "pending"),
    [visibleSales],
  );

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Total Orders" value={String(totalOrders)} subtitle={`${shippingOrders} shipping · ${receivedOrders} received`} icon={ShoppingCart} onClick={() => navigate("/orders")} />
        <MetricCard title="Inventory" value={String(totalInventory)} subtitle={`${goodCount} good · ${damagedCount} dmg · ${lostCount} lost`} icon={Package} onClick={() => navigate("/inventory")} />
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} onClick={() => navigate("/sales")} />
        <MetricCard title="Net Profit" value={formatCurrency(totalNetProfit)} icon={TrendingUp} onClick={() => navigate("/sales")} />
        <MetricCard title="Profit Margin" value={`${profitMargin}%`} icon={Percent} />
        <MetricCard title="Overdue" value={String(overdueCount)} icon={overdueCount > 0 ? AlertTriangle : CreditCard} onClick={() => navigate("/payments")} badge={overdueCount > 0 ? { label: "Action needed", variant: "destructive" } : undefined} />
      </div>

      {/* Global date range filter (applies to dashboard metrics & charts) */}
      <div className="flex justify-start">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal w-full sm:w-[220px]"
            >
              <span className="mr-2 text-xs font-medium text-muted-foreground">Date</span>
              {dateRange.from && dateRange.to ? (
                <span className="text-xs">
                  {dateRange.from.toLocaleDateString()} – {dateRange.to.toLocaleDateString()}
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
                    const from = new Date(Math.min(rawFrom.getTime(), today.getTime()));
                    const to = new Date(Math.min(rawTo.getTime(), today.getTime()));
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

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue & Profit trend */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Revenue & Profit Trend</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueProfitTrend}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TipContent currency />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--info))" fill="url(#gRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--success))" fill="url(#gProfit)" strokeWidth={2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders trend */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Orders Trend</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ordersTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip content={<TipContent />} />
                <Line type="monotone" dataKey="qty" name="Units" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Retailer */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Revenue by Retailer</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByRetailer} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs fill-muted-foreground" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" className="text-xs fill-muted-foreground" width={120} />
                <Tooltip content={<TipContent currency />} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory status pie */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Inventory Status</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={inventoryStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {inventoryStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
            {recentOrders.map((o) => {
              const SIcon = statusIcon[o.shippingStatus] ?? Clock;
              return (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SIcon className={`h-4 w-4 shrink-0 ${statusColor[o.shippingStatus] ?? "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.productName}</p>
                      <p className="text-xs text-muted-foreground">{o.orderDate} · {o.quantity} pcs</p>
                    </div>
                  </div>
                  <Badge variant={o.payStatus === "overdue" ? "destructive" : o.payStatus === "paid" ? "default" : "secondary"} className="text-xs shrink-0">
                    {o.payStatus}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Overdue payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Overdue Payments</CardTitle>
            <button onClick={() => navigate("/payments")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {overduePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No overdue payments 🎉</p>
            ) : (
              <div className="space-y-3">
                {overduePayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-destructive/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.partnerName}</p>
                      <p className="text-xs text-muted-foreground">Due {p.dueDate} · {p.type === "agent" ? "Agent" : "Retailer"}</p>
                    </div>
                    <span className="text-sm font-semibold text-destructive shrink-0">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Pending Deliveries</CardTitle>
            <button onClick={() => navigate("/sales")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {pendingSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All deliveries complete ✅</p>
            ) : (
              <div className="space-y-3">
                {pendingSales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.productName}</p>
                      <p className="text-xs text-muted-foreground">{getRetailerName(s.retailerId)} · {s.quantity} pcs</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatCurrency(s.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
