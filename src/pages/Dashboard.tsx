import { useMemo } from "react";
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

/* ─── Metric helpers (memoised at module level for mock data) ─── */
const totalOrders = orders.length;
const shippingOrders = orders.filter((o) => o.shippingStatus === "shipping").length;
const receivedOrders = orders.filter((o) => o.shippingStatus === "received").length;

const totalInventory = inventory.length;
const goodCount = inventory.filter((i) => i.status === "good").length;
const damagedCount = inventory.filter((i) => i.status === "damaged").length;
const lostCount = inventory.filter((i) => i.status === "lost").length;

const totalRevenue = sales.reduce((s, sl) => s + sl.revenue, 0);
const totalCost = sales.reduce((s, sl) => s + (sl.wholesalePrice * sl.quantity + sl.deliveryFee), 0);
const totalNetProfit = sales.reduce((s, sl) => s + sl.netProfit, 0);
const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0";
const overdueCount = getOverduePaymentsCount();

/* ─── Chart data ─── */
const ordersTrend = (() => {
  const byMonth = orders.reduce<Record<string, number>>((acc, o) => {
    const m = o.orderDate.slice(0, 7);
    acc[m] = (acc[m] ?? 0) + o.quantity;
    return acc;
  }, {});
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, qty]) => ({ month, qty }));
})();

const revenueProfitTrend = (() => {
  const byMonth: Record<string, { revenue: number; profit: number }> = {};
  sales.forEach((s) => {
    const m = s.saleDate.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { revenue: 0, profit: 0 };
    byMonth[m].revenue += s.revenue;
    byMonth[m].profit += s.netProfit;
  });
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, ...d }));
})();

const inventoryStatusData = [
  { name: "Good", value: goodCount },
  { name: "Damaged", value: damagedCount },
  { name: "Lost", value: lostCount },
];

const revenueByRetailer = (() => {
  const byRetailer: Record<string, number> = {};
  sales.forEach((s) => {
    const name = getRetailerName(s.retailerId);
    byRetailer[name] = (byRetailer[name] ?? 0) + s.revenue;
  });
  return Object.entries(byRetailer).map(([name, revenue]) => ({ name, revenue }));
})();

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
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
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

/* ─── Quick-status widget helpers ─── */
const recentOrders = [...orders].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 5);
const overduePayments = payments.filter((p) => p.status === "overdue");
const pendingSales = sales.filter((s) => s.deliveryStatus === "pending");

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

/* ─── Page ─── */
const DashboardPage = () => {
  const navigate = useNavigate();

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

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue & Profit trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue & Profit Trend</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Orders Trend</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Revenue by Retailer</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Inventory Status</CardTitle></CardHeader>
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
            <CardTitle className="text-base">Recent Orders</CardTitle>
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
            <CardTitle className="text-base">Overdue Payments</CardTitle>
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
            <CardTitle className="text-base">Pending Deliveries</CardTitle>
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
