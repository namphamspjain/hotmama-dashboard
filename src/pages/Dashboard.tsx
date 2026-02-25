import { useNavigate } from "react-router-dom";
import {
  orders, inventory, sales, payments,
  formatCurrency, getOverduePaymentsCount,
} from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Package, TrendingUp, CreditCard, AlertTriangle, Percent,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

// ─── Computed metrics ───
const totalOrders = orders.length;
const shippingOrders = orders.filter((o) => o.shippingStatus === "shipping").length;
const receivedOrders = orders.filter((o) => o.shippingStatus === "received").length;

const totalInventory = inventory.length;
const goodCount = inventory.filter((i) => i.status === "good").length;
const damagedCount = inventory.filter((i) => i.status === "damaged").length;
const lostCount = inventory.filter((i) => i.status === "lost").length;

const totalRevenue = sales.reduce((s, sl) => s + sl.revenue, 0);
const totalNetProfit = sales.reduce((s, sl) => s + sl.netProfit, 0);
const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0";
const overdueCount = getOverduePaymentsCount();

// ─── Chart data ───
const ordersByMonth = orders.reduce<Record<string, number>>((acc, o) => {
  const m = o.orderDate.slice(0, 7);
  acc[m] = (acc[m] ?? 0) + o.quantity;
  return acc;
}, {});
const ordersTrend = Object.entries(ordersByMonth)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, qty]) => ({ month, qty }));

const revenueByMonth = sales.reduce<Record<string, number>>((acc, s) => {
  const m = s.saleDate.slice(0, 7);
  acc[m] = (acc[m] ?? 0) + s.revenue;
  return acc;
}, {});
const revenueTrend = Object.entries(revenueByMonth)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, revenue]) => ({ month, revenue }));

const inventoryStatusData = [
  { name: "Good", value: goodCount },
  { name: "Damaged", value: damagedCount },
  { name: "Lost", value: lostCount },
];

const costBreakdown = (() => {
  const importCost = orders.reduce((s, o) => s + o.importCostPhp, 0);
  const shippingFees = orders.reduce((s, o) => s + (o.quantity * 200), 0); // estimate
  const agentFees = payments.filter((p) => p.type === "agent").reduce((s, p) => s + p.amount, 0);
  return [
    { name: "Import Cost", value: importCost },
    { name: "Shipping Fees", value: shippingFees },
    { name: "Agent Fees", value: agentFees },
  ];
})();

const PIE_COLORS = [
  "hsl(142, 71%, 45%)", // success green
  "hsl(38, 92%, 50%)",  // warning amber
  "hsl(0, 84%, 60%)",   // destructive red
];

const COST_COLORS = [
  "hsl(217, 91%, 60%)", // info blue
  "hsl(38, 92%, 50%)",  // amber
  "hsl(0, 84%, 60%)",   // red
];

// ─── Metric card helper ───
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
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Custom tooltip ───
function ChartTooltipContent({ active, payload, label, currency }: any) {
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

// ─── Page ───
const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total Orders"
          value={String(totalOrders)}
          subtitle={`${shippingOrders} shipping · ${receivedOrders} received`}
          icon={ShoppingCart}
          onClick={() => navigate("/orders")}
        />
        <MetricCard
          title="Inventory"
          value={String(totalInventory)}
          subtitle={`${goodCount} good · ${damagedCount} damaged · ${lostCount} lost`}
          icon={Package}
          onClick={() => navigate("/inventory")}
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          onClick={() => navigate("/sales")}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(totalNetProfit)}
          icon={TrendingUp}
          onClick={() => navigate("/sales")}
        />
        <MetricCard
          title="Profit Margin"
          value={`${profitMargin}%`}
          icon={Percent}
        />
        <MetricCard
          title="Overdue Payments"
          value={String(overdueCount)}
          icon={overdueCount > 0 ? AlertTriangle : CreditCard}
          onClick={() => navigate("/payments")}
          badge={overdueCount > 0 ? { label: "Action needed", variant: "destructive" } : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ordersTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="qty"
                  name="Units"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltipContent currency />} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Status</CardTitle>
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
                  label={({ name, value }) => `${name}: ${value}`}
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

        {/* Cost breakdown pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
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
                  label={({ name, value }) => `${name}: ₱${(value / 1000).toFixed(0)}k`}
                >
                  {costBreakdown.map((_, i) => (
                    <Cell key={i} fill={COST_COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
