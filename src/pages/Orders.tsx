import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Ship, CheckCircle2, AlertTriangle, DollarSign, Truck, Users,
  Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink,
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
import { Textarea } from "@/components/ui/textarea";
import {
  orders as mockOrders, suppliers, agents, Order, ShippingStatus, PayStatus,
  formatCurrency, getSupplierName, getAgentName,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";

type SortField = "id" | "orderDate" | "quantity" | "importCostPhp";
type SortDir = "asc" | "desc";

const shippingBadge: Record<ShippingStatus, { label: string; cls: string }> = {
  shipping: { label: "Shipping", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  received: { label: "Received", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const payBadge: Record<PayStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  unpaid: { label: "Unpaid", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  overdue: { label: "Overdue", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const emptyForm = {
  supplierId: "", agentId: "", productType: "", productName: "",
  quantity: "", importUnitPriceYuan: "", exchangeRate: "7.8",
  orderDate: new Date().toISOString().slice(0, 10), notes: "",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState<string>("all");
  const [payFilter, setPayFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("orderDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // metrics
  const metrics = useMemo(() => {
    const totalPurchased = orders.reduce((s, o) => s + o.quantity, 0);
    const shipping = orders.filter((o) => o.shippingStatus === "shipping").length;
    const received = orders.filter((o) => o.shippingStatus === "received").length;
    const totalImportCost = orders.reduce((s, o) => s + o.importCostPhp, 0);
    const totalShippingFees = orders.reduce((s, o) => {
      const sup = suppliers.find((sp) => sp.id === o.supplierId);
      return s + (sup?.shippingFee ?? 0);
    }, 0);
    const totalAgentFees = orders.reduce((s, o) => {
      const agt = agents.find((a) => a.id === o.agentId);
      return s + (agt ? o.importCostPhp * (agt.feePercent / 100) : 0);
    }, 0);
    return { totalPurchased, shipping, received, totalImportCost, totalShippingFees, totalAgentFees };
  }, [orders]);

  // filter + sort
  const filtered = useMemo(() => {
    let list = [...orders];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          o.productType.toLowerCase().includes(q)
      );
    }
    if (shippingFilter !== "all") list = list.filter((o) => o.shippingStatus === shippingFilter);
    if (payFilter !== "all") list = list.filter((o) => o.payStatus === payFilter);
    if (supplierFilter !== "all") list = list.filter((o) => o.supplierId === supplierFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "orderDate") cmp = a.orderDate.localeCompare(b.orderDate);
      else if (sortField === "quantity") cmp = a.quantity - b.quantity;
      else if (sortField === "importCostPhp") cmp = a.importCostPhp - b.importCostPhp;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [orders, search, shippingFilter, payFilter, supplierFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // calculated cost in form
  const calcCost = useMemo(() => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.importUnitPriceYuan) || 0;
    const rate = parseFloat(form.exchangeRate) || 0;
    return rate > 0 ? Math.round((qty * price) / rate) : 0;
  }, [form.quantity, form.importUnitPriceYuan, form.exchangeRate]);

  const handleSubmit = () => {
    if (!form.supplierId || !form.agentId || !form.productName || !form.quantity) return;
    const dateStr = form.orderDate.replace(/-/g, "");
    const idx = String(orders.length + 1).padStart(3, "0");
    const newOrder: Order = {
      id: `OD-${dateStr}-${idx}`,
      supplierId: form.supplierId,
      agentId: form.agentId,
      productType: form.productType,
      productName: form.productName,
      quantity: parseInt(form.quantity),
      importUnitPriceYuan: parseFloat(form.importUnitPriceYuan),
      exchangeRate: parseFloat(form.exchangeRate),
      importCostPhp: calcCost,
      shippingStatus: "shipping",
      payStatus: "unpaid",
      orderDate: form.orderDate,
      notes: form.notes || undefined,
    };
    setOrders((prev) => [newOrder, ...prev]);
    setForm(emptyForm);
    setDialogOpen(false);
  };

  const metricCards = [
    { label: "Total Purchased", value: metrics.totalPurchased.toString(), icon: Package, sub: "units" },
    { label: "Shipping", value: metrics.shipping.toString(), icon: Ship, sub: "orders" },
    { label: "Received", value: metrics.received.toString(), icon: CheckCircle2, sub: "orders" },
    { label: "Import Cost", value: formatCurrency(metrics.totalImportCost), icon: DollarSign },
    { label: "Shipping Fees", value: formatCurrency(metrics.totalShippingFees), icon: Truck },
    { label: "Agent Fees", value: formatCurrency(Math.round(metrics.totalAgentFees)), icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
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

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Orders</CardTitle>
            {canEdit && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={shippingFilter} onValueChange={setShippingFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Shipping" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shipping</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={payFilter} onValueChange={setPayFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("id")}>
                    <span className="flex items-center">Order ID <SortIcon field="id" /></span>
                  </TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("quantity")}>
                    <span className="flex items-center">Qty <SortIcon field="quantity" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("importCostPhp")}>
                    <span className="flex items-center justify-end">Import Cost <SortIcon field="importCostPhp" /></span>
                  </TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("orderDate")}>
                    <span className="flex items-center">Order Date <SortIcon field="orderDate" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const sb = shippingBadge[o.shippingStatus];
                    const pb = payBadge[o.payStatus];
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                        <TableCell className="text-sm">{getSupplierName(o.supplierId)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{o.productName}</p>
                            <p className="text-xs text-muted-foreground">{o.productType}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{o.quantity}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(o.importCostPhp)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={pb.cls}>{pb.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.orderDate}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} of {orders.length} orders</p>
        </CardContent>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Order</DialogTitle>
            <DialogDescription>Fill in the order details. Import cost is calculated automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agent</Label>
                <Select value={form.agentId} onValueChange={(v) => setForm((f) => ({ ...f, agentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (¥)</Label>
                <Input type="number" min="0" value={form.importUnitPriceYuan} onChange={(e) => setForm((f) => ({ ...f, importUnitPriceYuan: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Exchange Rate</Label>
                <Input type="number" step="0.01" value={form.exchangeRate} onChange={(e) => setForm((f) => ({ ...f, exchangeRate: e.target.value }))} />
              </div>
            </div>
            {/* Live cost preview */}
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Estimated Import Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(calcCost)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.supplierId || !form.agentId || !form.productName || !form.quantity}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
