import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, ShoppingCart, Package, RotateCcw, Clock,
  Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Download,
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
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  sales as mockSales, retailers, Sale, DeliveryStatus,
  formatCurrency, getRetailerName,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCSV } from "@/lib/csv";

type SortField = "id" | "saleDate" | "revenue" | "netProfit";
type SortDir = "asc" | "desc";

const deliveryBadge: Record<DeliveryStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  refunded: { label: "Refunded", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const CHART_COLORS = ["hsl(220, 70%, 55%)", "hsl(160, 60%, 45%)", "hsl(340, 65%, 55%)", "hsl(30, 80%, 55%)"];

const emptyForm = {
  retailerId: "", productName: "", productType: "", quantity: "1",
  sellingPrice: "", wholesalePrice: "", deliveryFee: "0",
  saleDate: new Date().toISOString().slice(0, 10),
};

export default function SalesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [retailerFilter, setRetailerFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("saleDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((s, sl) => s + sl.revenue, 0);
    const totalCost = sales.reduce((s, sl) => s + sl.wholesalePrice * sl.quantity + sl.deliveryFee, 0);
    const totalProfit = sales.reduce((s, sl) => s + sl.netProfit, 0);
    const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";
    const pending = sales.filter((sl) => sl.deliveryStatus === "pending").length;
    const refunded = sales.filter((sl) => sl.deliveryStatus === "refunded").length;
    return { totalRevenue, totalCost, totalProfit, margin, pending, refunded };
  }, [sales]);

  const costBreakdown = useMemo(() => {
    const wholesale = sales.reduce((s, sl) => s + sl.wholesalePrice * sl.quantity, 0);
    const delivery = sales.reduce((s, sl) => s + sl.deliveryFee, 0);
    const profit = sales.reduce((s, sl) => s + sl.netProfit, 0);
    return [
      { name: "Wholesale", value: wholesale },
      { name: "Delivery", value: delivery },
      { name: "Profit", value: profit },
    ].filter((d) => d.value > 0);
  }, [sales]);

  const revenueByRetailer = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((sl) => {
      const name = getRetailerName(sl.retailerId);
      map[name] = (map[name] || 0) + sl.revenue;
    });
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }));
  }, [sales]);

  const filtered = useMemo(() => {
    let list = [...sales];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((sl) => sl.id.toLowerCase().includes(q) || sl.productName.toLowerCase().includes(q));
    }
    if (deliveryFilter !== "all") list = list.filter((sl) => sl.deliveryStatus === deliveryFilter);
    if (retailerFilter !== "all") list = list.filter((sl) => sl.retailerId === retailerFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "saleDate") cmp = a.saleDate.localeCompare(b.saleDate);
      else if (sortField === "revenue") cmp = a.revenue - b.revenue;
      else if (sortField === "netProfit") cmp = a.netProfit - b.netProfit;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [sales, search, deliveryFilter, retailerFilter, sortField, sortDir]);

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
    const ws = parseFloat(form.wholesalePrice) || 0;
    const df = parseFloat(form.deliveryFee) || 0;
    const revenue = sell * qty;
    const cost = ws * qty + df;
    const profit = revenue - cost;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";
    return { revenue, cost, profit, margin };
  }, [form]);

  const handleSubmit = () => {
    if (!form.retailerId || !form.productName || !form.quantity || !form.sellingPrice) return;
    const idx = String(sales.length + 1).padStart(3, "0");
    const newSale: Sale = {
      id: `SL-${idx}`,
      retailerId: form.retailerId,
      productName: form.productName,
      productType: form.productType,
      quantity: parseInt(form.quantity),
      sellingPrice: parseFloat(form.sellingPrice),
      wholesalePrice: parseFloat(form.wholesalePrice) || 0,
      deliveryFee: parseFloat(form.deliveryFee) || 0,
      revenue: formCalc.revenue,
      netProfit: formCalc.profit,
      deliveryStatus: "pending",
      saleDate: form.saleDate,
    };
    setSales((prev) => [newSale, ...prev]);
    setForm(emptyForm);
    setDialogOpen(false);
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
              <p className="text-xl font-bold">{m.value}</p>
              {m.sub && <p className="text-xs text-muted-foreground">{m.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue by Retailer</CardTitle></CardHeader>
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
                const headers = ["Sale ID", "Retailer", "Product", "Type", "Qty", "Selling Price", "Wholesale Price", "Delivery Fee", "Revenue", "Net Profit", "Delivery", "Sale Date"];
                const rows = filtered.map((sl) => [sl.id, getRetailerName(sl.retailerId), sl.productName, sl.productType, String(sl.quantity), String(sl.sellingPrice), String(sl.wholesalePrice), String(sl.deliveryFee), String(sl.revenue), String(sl.netProfit), sl.deliveryStatus, sl.saleDate]);
                downloadCSV("sales.csv", headers, rows);
              }}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
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
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("id")}>
                    <span className="flex items-center">Sale ID <SortIcon field="id" /></span>
                  </TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("revenue")}>
                    <span className="flex items-center justify-end">Revenue <SortIcon field="revenue" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("netProfit")}>
                    <span className="flex items-center justify-end">Net Profit <SortIcon field="netProfit" /></span>
                  </TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("saleDate")}>
                    <span className="flex items-center">Sale Date <SortIcon field="saleDate" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No sales found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sl) => {
                    const db = deliveryBadge[sl.deliveryStatus];
                    return (
                      <TableRow key={sl.id}>
                        <TableCell className="font-mono text-xs font-medium">{sl.id}</TableCell>
                        <TableCell className="text-sm">{getRetailerName(sl.retailerId)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{sl.productName}</p>
                            <p className="text-xs text-muted-foreground">{sl.productType}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sl.quantity}</TableCell>
                        <TableCell className="text-sm text-right">{formatCurrency(sl.sellingPrice)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(sl.revenue)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(sl.netProfit)}</TableCell>
                        <TableCell><Badge variant="outline" className={db.cls}>{db.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sl.saleDate}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
            <DialogDescription>Fill in sale details. Margin is calculated in real-time.</DialogDescription>
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
                <Input value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))} placeholder="e.g. iPhone" />
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
                <p className="text-xs text-muted-foreground mb-0.5">Net Profit</p>
                <p className="text-sm font-bold">{formatCurrency(formCalc.profit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Margin</p>
                <p className="text-sm font-bold">{formCalc.margin}%</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sale Date</Label>
              <Input type="date" value={form.saleDate} onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.retailerId || !form.productName || !form.sellingPrice}>Create Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
