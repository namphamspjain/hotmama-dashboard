import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, ShoppingCart, Package, RotateCcw, Clock,
  Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Download,
  Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  sales as mockSales,
  retailers,
  Sale,
  DeliveryStatus,
  formatCurrency,
  getRetailerName,
  orders,
  suppliers,
  agents,
  inventory,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

type SortField = "id" | "saleDate" | "revenue" | "netProfit" | "grossProfit";
type SortDir = "asc" | "desc";

// Unit import cost (PHP per unit) by product name from orders, for Gross Profit = Revenue - Import Cost
const unitImportCostByProduct = (() => {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.quantity > 0) {
      const unit = Math.round(o.importCostPhp / o.quantity);
      map[o.productName] = unit;
    }
  });
  return map;
})();

const getImportCostForSale = (sl: Sale): number => {
  const unit = unitImportCostByProduct[sl.productName];
  if (unit == null) return 0;
  return unit * sl.quantity;
};

const getGrossProfit = (sl: Sale): number => sl.revenue - getImportCostForSale(sl);

const deliveryBadge: Record<DeliveryStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  refunded: { label: "Refunded", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const CHART_COLORS = [
  "hsl(220, 70%, 55%)", // Cost of Loss
  "hsl(160, 60%, 45%)", // Shipping fee
  "hsl(340, 65%, 55%)", // Agent fee
  "hsl(30, 80%, 55%)",  // Delivery fee
  "hsl(45, 90%, 55%)",  // Housing rental
  "hsl(280, 60%, 55%)", // Misc
];

const HOUSING_RENTAL_COST = 0;
const MISCELLANEOUS_COST = 0;

const emptyForm = {
  retailerId: "", productName: "", productType: "", quantity: "1",
  sellingPrice: "", wholesalePrice: "", deliveryFee: "0",
  saleDate: new Date().toISOString().slice(0, 10),
  deliveryStatus: "pending" as DeliveryStatus,
};

export default function SalesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [retailerFilter, setRetailerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [sortField, setSortField] = useState<SortField>("saleDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // date-filtered sales (applied to metrics, charts, and table)
  const visibleSales = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return sales;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return sales.filter((sl) => {
      const d = new Date(sl.saleDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [sales, dateRange.from, dateRange.to]);

  const metrics = useMemo(() => {
    const totalRevenue = visibleSales.reduce((s, sl) => s + sl.revenue, 0);
    const totalCost = visibleSales.reduce(
      (s, sl) => s + sl.wholesalePrice * sl.quantity + sl.deliveryFee,
      0,
    );
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";
    const pending = visibleSales.filter((sl) => sl.deliveryStatus === "pending").length;
    const refunded = visibleSales.filter((sl) => sl.deliveryStatus === "refunded").length;
    return { totalRevenue, totalCost, totalProfit, margin, pending, refunded };
  }, [visibleSales]);

  const costBreakdown = useMemo(() => {
    // Unit import cost per order (PHP per item)
    const unitImportCostByOrder: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        unitImportCostByOrder[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });

    // 1) Cost of Loss: damaged + lost inventory at import unit cost
    const costOfLoss = inventory.reduce((sum, item) => {
      if (item.status !== "damaged" && item.status !== "lost") return sum;
      const unit = unitImportCostByOrder[item.orderId];
      if (!unit) return sum;
      return sum + unit;
    }, 0);

    // 2) Shipping fee: sum supplier shippingFee for all orders
    const shippingFee = orders.reduce((sum, o) => {
      const sup = suppliers.find((s) => s.id === o.supplierId);
      return sum + (sup?.shippingFee ?? 0);
    }, 0);

    // 3) Agent fee: import cost * agent percent
    const agentFee = orders.reduce((sum, o) => {
      const agt = agents.find((a) => a.id === o.agentId);
      if (!agt) return sum;
      return sum + o.importCostPhp * (agt.feePercent / 100);
    }, 0);

    // 4) Delivery fee: from sales
    const deliveryFee = visibleSales.reduce((sum, sl) => sum + sl.deliveryFee, 0);

    // 5) Housing rental and 6) Misc costs
    const housingRental = HOUSING_RENTAL_COST;
    const misc = MISCELLANEOUS_COST;

    // Always return all 6 slices (even if some are 0) so legend shows everything
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
    const map: Record<string, number> = {};
    visibleSales.forEach((sl) => {
      const name = getRetailerName(sl.retailerId);
      map[name] = (map[name] || 0) + sl.revenue;
    });
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }));
  }, [visibleSales]);

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

  const productTypes = useMemo(
    () => Array.from(new Set(sales.map((sl) => sl.productType))).sort(),
    [sales],
  );

  const filtered = useMemo(() => {
    let list = [...visibleSales];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (sl) =>
          sl.id.toLowerCase().includes(q) ||
          sl.productName.toLowerCase().includes(q) ||
          sl.productType.toLowerCase().includes(q),
      );
    }
    if (deliveryFilter !== "all") list = list.filter((sl) => sl.deliveryStatus === deliveryFilter);
    if (retailerFilter !== "all") list = list.filter((sl) => sl.retailerId === retailerFilter);
    if (typeFilter !== "all") list = list.filter((sl) => sl.productType === typeFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "saleDate") cmp = a.saleDate.localeCompare(b.saleDate);
      else if (sortField === "revenue") cmp = a.revenue - b.revenue;
      else if (sortField === "netProfit") cmp = a.netProfit - b.netProfit;
      else if (sortField === "grossProfit") cmp = getGrossProfit(a) - getGrossProfit(b);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [visibleSales, search, deliveryFilter, retailerFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const formCalc = useMemo(() => {
    const qty = parseInt(form.quantity) || 0;
    const sell = parseFloat(form.sellingPrice) || 0;
    const revenue = sell * qty;
    const unitImport = unitImportCostByProduct[form.productName] ?? 0;
    const importCost = unitImport * qty;
    const grossProfit = revenue - importCost;
    const margin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0";
    return { revenue, importCost, grossProfit, margin };
  }, [form]);

  const handleSubmit = () => {
    if (!form.retailerId || !form.productName || !form.quantity || !form.sellingPrice) return;
    const dateStr = form.saleDate.replace(/-/g, "");
    const id = editingSale?.id ?? `SL-${dateStr}-${String(sales.length + 1).padStart(3, "0")}`;
    const sale: Sale = {
      id,
      retailerId: form.retailerId,
      productName: form.productName,
      productType: form.productType,
      quantity: parseInt(form.quantity),
      sellingPrice: parseFloat(form.sellingPrice),
      wholesalePrice: parseFloat(form.wholesalePrice) || 0,
      deliveryFee: parseFloat(form.deliveryFee) || 0,
      revenue: formCalc.revenue,
      netProfit: formCalc.grossProfit,
      deliveryStatus: form.deliveryStatus,
      saleDate: form.saleDate,
    };
    if (editingSale) {
      setSales((prev) => prev.map((s) => (s.id === editingSale.id ? sale : s)));
    } else {
      setSales((prev) => [sale, ...prev]);
    }
    setForm(emptyForm);
    setEditingSale(null);
    setDialogOpen(false);
  };

  const handleDeleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const metricCards = [
    { label: "Total Revenue", value: formatCurrency(metrics.totalRevenue), icon: DollarSign },
    { label: "Total Cost", value: formatCurrency(metrics.totalCost), icon: ShoppingCart },
    { label: "Net Profit", value: formatCurrency(metrics.totalProfit), icon: TrendingUp },
    { label: "Margin", value: `${metrics.margin}%`, icon: TrendingUp },
    { label: "Pending", value: metrics.pending.toString(), icon: Clock, sub: "sales" },
    { label: "Refunded", value: metrics.refunded.toString(), icon: RotateCcw, sub: "sales" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p
                className={cn(
                  "text-xl font-bold",
                  m.label === "Net Profit" && metrics.totalProfit > 0 && "text-emerald-500",
                  m.label === "Net Profit" && metrics.totalProfit < 0 && "text-red-500",
                  m.label === "Pending" && "text-amber-500",
                  m.label === "Refunded" && "text-red-500",
                )}
              >
                {m.value}
              </p>
              {m.sub && (
                <p
                  className={cn(
                    "text-xs",
                    m.label === "Pending"
                      ? "text-amber-500"
                      : m.label === "Refunded"
                      ? "text-red-500"
                      : "text-muted-foreground",
                  )}
                >
                  {m.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global date range filter (applies to metrics, charts, and table) */}
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

      {/* Sales Trend & Revenue vs Cost vs Profit Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? [formatCurrency(value), "Revenue"] : [value, "Sales"]
                  }
                  labelFormatter={(label: string) => `Date: ${label}`}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { date: string; sales: number; revenue: number };
                    return (
                      <div className="rounded-md border bg-background p-3 shadow-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue vs Cost vs Profit Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
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
                <Bar dataKey="revenue" name="Revenue" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="hsl(30, 80%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {costBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Retailer</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByRetailer}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Sales</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const headers = ["Sale ID", "Retailer", "Product Type", "Product Name", "Qty", "Selling Price", "Wholesale Price", "Revenue", "Gross Profit", "Delivery", "Delivery Fee", "Sale Date"];
                const rows = filtered.map((sl) => [
                  sl.id,
                  getRetailerName(sl.retailerId),
                  sl.productType,
                  sl.productName,
                  String(sl.quantity),
                  String(sl.sellingPrice),
                  String(sl.wholesalePrice),
                  String(sl.revenue),
                  String(getGrossProfit(sl)),
                  sl.deliveryStatus,
                  String(sl.deliveryFee),
                  sl.saleDate,
                ]);
                downloadCSV("sales.csv", headers, rows);
              }}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingSale(null);
                    setForm(emptyForm);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Sale
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search sales..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Delivery" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={retailerFilter} onValueChange={setRetailerFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Retailer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Retailers</SelectItem>
                {retailers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {productTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px] cursor-pointer select-none" onClick={() => toggleSort("id")}>
                    <span className="flex items-center">Sale ID <SortIcon field="id" /></span>
                  </TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("revenue")}>
                    <span className="flex items-center justify-end">Revenue <SortIcon field="revenue" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("grossProfit")}>
                    <span className="flex items-center justify-end">Gross Profit <SortIcon field="grossProfit" /></span>
                  </TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-right">Delivery Fee</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("saleDate")}>
                    <span className="flex items-center">Sale Date <SortIcon field="saleDate" /></span>
                  </TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 12 : 11} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No sales found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sl) => {
                    const db = deliveryBadge[sl.deliveryStatus];
                    const grossProfit = getGrossProfit(sl);
                    return (
                      <TableRow key={sl.id} className={canEdit ? "group" : undefined}>
                        <TableCell className="font-mono text-xs font-medium w-[170px]">{sl.id}</TableCell>
                        <TableCell className="text-sm">{getRetailerName(sl.retailerId)}</TableCell>
                        <TableCell className="text-sm font-medium">{sl.productType}</TableCell>
                        <TableCell className="text-sm font-medium">{sl.productName}</TableCell>
                        <TableCell className="text-sm">{sl.quantity}</TableCell>
                        <TableCell className="text-sm text-right">{formatCurrency(sl.sellingPrice)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(sl.revenue)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(grossProfit)}</TableCell>
                        <TableCell><Badge variant="outline" className={db.cls}>{db.label}</Badge></TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground">{formatCurrency(sl.deliveryFee)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sl.saleDate}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                    onClick={() => {
                                      setEditingSale(sl);
                                      setForm({
                                        retailerId: sl.retailerId,
                                        productName: sl.productName,
                                        productType: sl.productType,
                                        quantity: String(sl.quantity),
                                        sellingPrice: String(sl.sellingPrice),
                                        wholesalePrice: String(sl.wholesalePrice),
                                        deliveryFee: String(sl.deliveryFee),
                                        saleDate: sl.saleDate,
                                        deliveryStatus: sl.deliveryStatus,
                                      });
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs">Edit</p>
                                </TooltipContent>
                              </UiTooltip>
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteSale(sl.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs">Delete</p>
                                </TooltipContent>
                              </UiTooltip>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} of {sales.length} sales</p>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSale(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSale ? "Edit Sale" : "New Sale"}</DialogTitle>
            <DialogDescription>
              {editingSale ? editingSale.productName : "Fill in sale details. Margin is calculated in real-time."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Retailer</Label>
              <Select value={form.retailerId} onValueChange={(v) => setForm((f) => ({ ...f, retailerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select retailer" /></SelectTrigger>
                <SelectContent>
                  {retailers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Product Type</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) => setForm((f) => ({ ...f, productType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="e.g. iPhone 15 Pro Max" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (₱)</Label>
                <Input type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Wholesale Price (₱)</Label>
                <Input type="number" min="0" value={form.wholesalePrice} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Fee (₱)</Label>
                <Input type="number" min="0" value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Revenue</p>
                <p className="text-sm font-bold">{formatCurrency(formCalc.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Gross Profit</p>
                <p className="text-sm font-bold">{formatCurrency(formCalc.grossProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Margin</p>
                <p className="text-sm font-bold">{formCalc.margin}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sale Date</Label>
                <Input type="date" value={form.saleDate} onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Status</Label>
                <Select
                  value={form.deliveryStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, deliveryStatus: v as DeliveryStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSale(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.retailerId || !form.productName || !form.sellingPrice}>
              {editingSale ? "Save Changes" : "Create Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
