import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Ship,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Download,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import {
  orders as mockOrders, suppliers, agents, Order, ShippingStatus, PayStatus,
  formatCurrency, getSupplierName, getAgentName, payments,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { CurrencyWidget } from "@/components/CurrencyWidget";

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
  overdue: { label: "Canceled", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const formatShortDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB"); // dd/mm/yy
};

const formatYuan = (amount: number): string => {
  return `¥${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const getNextOrderId = (ordersList: Order[], orderDate: string): string => {
  const dateKey = orderDate.replace(/-/g, "");
  let max = 0;
  ordersList.forEach((o) => {
    const match = o.id.match(/^OD-(\d{8})-(\d{3})$/);
    if (match && match[1] === dateKey) {
      const n = parseInt(match[2], 10);
      if (n > max) max = n;
    }
  });
  const next = max + 1;
  return `OD-${dateKey}-${String(next).padStart(3, "0")}`;
};

const emptyForm = {
  orderId: "",
  supplierId: "",
  agentId: "",
  productType: "",
  productName: "",
  quantity: "",
  importUnitPriceYuan: "",
  importCostYuan: "",
  exchangeRate: "7.8",
  shippingFee: "",
  shippingStatus: "shipping" as ShippingStatus,
  payStatus: "unpaid" as PayStatus,
  orderDate: new Date().toISOString().slice(0, 10),
  receivalDate: "",
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
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [sortField, setSortField] = useState<SortField>("orderDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // date-filtered orders (applied to metrics, charts, and table)
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
  }, [orders, dateRange.from, dateRange.to]);

  // metrics
  const metrics = useMemo(() => {
    const totalPurchased = visibleOrders.reduce((s, o) => s + o.quantity, 0);
    const shipping = visibleOrders.reduce((s, o) => s + (o.shippingStatus === "shipping" ? o.quantity : 0), 0);
    const received = visibleOrders.reduce((s, o) => s + (o.shippingStatus === "received" ? o.quantity : 0), 0);
    const totalUnitPrice = visibleOrders.reduce((s, o) => s + (o.importUnitPriceYuan * o.exchangeRate * o.quantity), 0);
    const totalImportCost = visibleOrders.reduce((s, o) => s + (o.importCostPhp * o.quantity), 0);
    const costOfGoods = visibleOrders.reduce((s, o) => s + ((o.importUnitPriceYuan * o.exchangeRate + o.importCostPhp) * o.quantity), 0);
    return { totalPurchased, shipping, received, totalUnitPrice, totalImportCost, costOfGoods };
  }, [visibleOrders]);

  const productTypes = useMemo(
    () => Array.from(new Set(orders.map((o) => o.productType))).sort(),
    [orders],
  );

  // filter + sort
  const filtered = useMemo(() => {
    let list = [...visibleOrders];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => {
        const fields = [
          o.id,
          getSupplierName(o.supplierId),
          getAgentName(o.agentId),
          o.productType,
          o.productName,
          String(o.quantity),
          String(o.importUnitPriceYuan),
          formatYuan(o.importUnitPriceYuan),
          formatCurrency(o.importUnitPriceYuan * o.exchangeRate),
          String(o.importCostPhp),
          formatCurrency(o.importCostPhp),
          String(o.shippingFee ?? 0),
          formatCurrency(o.shippingFee ?? 0),
          shippingBadge[o.shippingStatus].label,
          payBadge[o.payStatus].label,
          o.orderDate,
          o.receivalDate ?? "",
        ];
        return fields.some((f) => f.toLowerCase().includes(q));
      });
    }
    if (shippingFilter !== "all") list = list.filter((o) => o.shippingStatus === shippingFilter);
    if (payFilter !== "all") list = list.filter((o) => o.payStatus === payFilter);
    if (supplierFilter !== "all") list = list.filter((o) => o.supplierId === supplierFilter);
    if (productTypeFilter !== "all") list = list.filter((o) => o.productType === productTypeFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "orderDate") cmp = a.orderDate.localeCompare(b.orderDate);
      else if (sortField === "quantity") cmp = a.quantity - b.quantity;
      else if (sortField === "importCostPhp") cmp = a.importCostPhp - b.importCostPhp;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [visibleOrders, search, shippingFilter, payFilter, supplierFilter, productTypeFilter, sortField, sortDir]);

  // Reset page when filters or rowsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, shippingFilter, payFilter, supplierFilter, productTypeFilter, rowsPerPage, dateRange.from, dateRange.to]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Keep Order ID in sync with order date for new orders
  useEffect(() => {
    if (!dialogOpen) return;
    if (editingOrder) return;
    if (!form.orderDate) return;
    const nextId = getNextOrderId(orders, form.orderDate);
    if (form.orderId === nextId) return;
    setForm((prev) => ({ ...prev, orderId: nextId }));
  }, [dialogOpen, editingOrder, form.orderDate, orders]);

  const handleSubmit = () => {
    if (!form.supplierId || !form.agentId || !form.productName || !form.quantity) return;
    const baseOrder: Order = {
      id: editingOrder?.id ?? form.orderId,
      supplierId: form.supplierId,
      agentId: form.agentId,
      productType: form.productType,
      productName: form.productName,
      quantity: parseInt(form.quantity),
      importUnitPriceYuan: parseFloat(form.importUnitPriceYuan),
      exchangeRate: parseFloat(form.exchangeRate),
      importCostPhp: Math.round((parseFloat(form.importCostYuan) || 0) * (parseFloat(form.exchangeRate) || 0)),
      shippingFee: Math.round(parseFloat(form.shippingFee) || 0),
      shippingStatus: form.shippingStatus,
      payStatus: form.payStatus,
      orderDate: form.orderDate,
      receivalDate: form.receivalDate || undefined,
    };

    if (editingOrder) {
      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? baseOrder : o)));
    } else {
      setOrders((prev) => [baseOrder, ...prev]);
    }

    setForm(emptyForm);
    setEditingOrder(null);
    setDialogOpen(false);
  };

  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    if (rowRefs.current[id]) {
      delete rowRefs.current[id];
    }
  };

  const metricCards = [
    { label: "Total Purchased", value: metrics.totalPurchased.toString(), icon: Package, sub: "items" },
    { label: "Shipping", value: metrics.shipping.toString(), icon: Ship, sub: "items" },
    { label: "Received", value: metrics.received.toString(), icon: CheckCircle2, sub: "items" },
    { label: "Unit Price", value: formatCurrency(metrics.totalUnitPrice), icon: DollarSign },
    { label: "Import Cost", value: formatCurrency(metrics.totalImportCost), icon: DollarSign },
    { label: "Cost of Goods", value: formatCurrency(metrics.costOfGoods), icon: DollarSign },
  ];

  const ordersTrendData = useMemo(() => {
    const byDate = visibleOrders.reduce<Record<string, { orders: number; items: number }>>((acc, o) => {
      const key = o.orderDate;
      if (!acc[key]) acc[key] = { orders: 0, items: 0 };
      acc[key].orders += 1;
      acc[key].items += o.quantity;
      return acc;
    }, {});
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, orders: v.orders, items: v.items }));
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

  // Default Shipping Fee from selected supplier (only for new orders)
  useEffect(() => {
    if (!dialogOpen) return;
    if (editingOrder) return;
    if (!form.supplierId) return;
    const sup = suppliers.find((s) => s.id === form.supplierId);
    if (!sup) return;
    setForm((prev) => {
      const current = parseFloat(prev.shippingFee);
      const hasNonZero =
        prev.shippingFee !== "" && !Number.isNaN(current) && current !== 0;
      if (hasNonZero) return prev;
      return { ...prev, shippingFee: String(sup.shippingFee ?? 0) };
    });
  }, [dialogOpen, editingOrder, form.supplierId]);

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
              <p
                className={cn(
                  "text-xl font-bold",
                  m.label === "Shipping" && "text-amber-500",
                  m.label === "Received" && "text-emerald-500",
                )}
              >
                {m.value}
              </p>
              {m.sub && (
                <p
                  className={cn(
                    "text-xs",
                    m.label === "Shipping"
                      ? "text-amber-500"
                      : m.label === "Received"
                        ? "text-emerald-500"
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
              {/* Presets sidebar */}
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
              {/* Calendar */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <RechartsTooltip
                  formatter={(value: number, name: string) =>
                    name === "Items" ? value.toLocaleString() : value
                  }
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="items"
                  name="Items"
                  fill="hsl(var(--info))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Import Cost Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Import Cost Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importCostTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
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
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Orders</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = [
                    "Order ID",
                    "Supplier",
                    "Agent",
                    "Product Type",
                    "Product Name",
                    "Qty",
                    "Unit Price/ item (PHP)",
                    "Import Cost/ item (PHP)",
                    "Shipping Fee (PHP)",
                    "Shipping",
                    "Payment",
                    "Order Date",
                    "Receival Date",
                    "Notes",
                  ];
                  const rows = filtered.map((o) => {
                    const unitPricePhp = Math.round(o.importUnitPriceYuan * o.exchangeRate);
                    const importCost = o.importCostPhp;
                    return [
                      o.id,
                      getSupplierName(o.supplierId),
                      getAgentName(o.agentId),
                      o.productType,
                      o.productName,
                      String(o.quantity),
                      String(unitPricePhp),
                      String(importCost),
                      String(o.shippingFee ?? 0),
                      o.shippingStatus,
                      o.payStatus,
                      o.orderDate,
                      o.receivalDate ?? "",
                      o.notes ?? "",
                    ];
                  });
                  downloadCSV("orders.csv", headers, rows);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingOrder(null);
                    setForm({
                      ...emptyForm,
                      orderId: getNextOrderId(orders, emptyForm.orderDate),
                    });
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Order
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
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
                <SelectItem value="overdue">Canceled</SelectItem>
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
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
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

          {/* Table */}
          <div className="rounded-md border">
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("id")}>
                      <span className="flex items-center">Order ID <SortIcon field="id" /></span>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Supplier</TableHead>
                    <TableHead className="whitespace-nowrap">Product Type</TableHead>
                    <TableHead className="whitespace-nowrap">Product Name</TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("quantity")}
                    >
                      <span className="flex items-center">Qty <SortIcon field="quantity" /></span>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">Unit Price/ item</TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right whitespace-nowrap"
                      onClick={() => toggleSort("importCostPhp")}
                    >
                      <span className="flex items-center justify-end">
                        Import Cost/ item <SortIcon field="importCostPhp" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">Shipping Fee</TableHead>
                    <TableHead className="whitespace-nowrap">Shipping</TableHead>
                    <TableHead className="whitespace-nowrap">Payment</TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("orderDate")}
                    >
                      <span className="flex items-center">Order Date <SortIcon field="orderDate" /></span>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Receival Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((o) => {
                      const sb = shippingBadge[o.shippingStatus];
                      const pb = payBadge[o.payStatus];
                      const unitPriceYuan = o.importUnitPriceYuan;
                      const importCost = o.importCostPhp;
                      const receivalDisplay = o.receivalDate || "—";
                      return (
                        <TableRow
                          key={o.id}
                          ref={(el) => {
                            if (el) rowRefs.current[o.id] = el;
                          }}
                          className="group"
                        >
                          <TableCell className="font-mono text-xs font-medium whitespace-nowrap">{o.id}</TableCell>
                          <TableCell className="text-sm">{getSupplierName(o.supplierId)}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{o.productType}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{o.productName}</p>
                          </TableCell>
                          <TableCell className="text-sm">{o.quantity}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(unitPriceYuan * o.exchangeRate)}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatCurrency(importCost)}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatCurrency(o.shippingFee ?? 0)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const payment = payments.find(p => p.type === "agent" && p.linkedId === o.id);
                              const status = payment ? (payment.status as PayStatus) : o.payStatus;
                              const cfg = payBadge[status];
                              return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.orderDate}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{receivalDisplay}</TableCell>
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                    onClick={() => {
                                      setEditingOrder(o);
                                      setForm({
                                        orderId: o.id,
                                        supplierId: o.supplierId,
                                        agentId: o.agentId,
                                        productType: o.productType,
                                        productName: o.productName,
                                        quantity: String(o.quantity),
                                        importUnitPriceYuan: String(o.importUnitPriceYuan),
                                        importCostYuan: o.exchangeRate ? String((o.importCostPhp / o.exchangeRate).toFixed(2)) : "0",
                                        exchangeRate: String(o.exchangeRate),
                                        shippingFee: String(o.shippingFee ?? 0),
                                        shippingStatus: o.shippingStatus,
                                        payStatus: o.payStatus,
                                        orderDate: o.orderDate,
                                        receivalDate: o.receivalDate ?? "",
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
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteOrder(o.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs">Delete</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {/* Left: rows info */}
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length} orders
            </p>

            {/* Center: page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
                Page
                <Input
                  className="h-8 w-12 text-center text-sm px-1"
                  value={safePage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val) && val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  min={1}
                  max={totalPages}
                  type="number"
                />
                <span className="text-muted-foreground">of {totalPages}</span>
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">View:</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => setRowsPerPage(Number(v))}
              >
                <SelectTrigger className="h-8 w-[70px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New / Edit Order Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingOrder(null);
            setForm({
              ...emptyForm,
              orderId: getNextOrderId(orders, emptyForm.orderDate),
            });
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Edit Order" : "New Order"}</DialogTitle>
            <DialogDescription>
              {editingOrder
                ? editingOrder.productName
                : "Fill in the order details. Order ID is generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label>Order ID</Label>
              <Input value={form.orderId} disabled />
            </div>
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
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price (¥) per item</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.importUnitPriceYuan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, importUnitPriceYuan: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Import Cost (¥) per item</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.importCostYuan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, importCostYuan: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-3 p-4 bg-muted/40 rounded-lg border border-border/50">
              <Label className="font-semibold text-primary">Currency Converter</Label>
              <CurrencyWidget 
                onRateFetched={(rate) => {
                  if (!editingOrder) {
                    setForm((f) => ({ ...f, exchangeRate: rate.toFixed(4) }));
                  }
                }} 
              />
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <Label className="text-xs text-muted-foreground mb-1 block">Exchange Rate (₱ / ¥) applied to order</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.exchangeRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, exchangeRate: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price (₱) per item</Label>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={form.importUnitPriceYuan && form.exchangeRate ? formatCurrency((parseFloat(form.importUnitPriceYuan) || 0) * (parseFloat(form.exchangeRate) || 0)) : ""}
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Import Cost (₱) per item</Label>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={form.importCostYuan && form.exchangeRate ? formatCurrency((parseFloat(form.importCostYuan) || 0) * (parseFloat(form.exchangeRate) || 0)) : ""}
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Fee (₱) (optional)</Label>
              <Input
                type="number"
                min="0"
                value={form.shippingFee}
                onChange={(e) => setForm((f) => ({ ...f, shippingFee: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shipping Status</Label>
                <Select
                  value={form.shippingStatus}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      shippingStatus: v as ShippingStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Status</Label>
                <Select
                  value={form.payStatus}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, payStatus: v as PayStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Receival Date (optional)</Label>
                <Input
                  type="date"
                  value={form.receivalDate}
                  onChange={(e) => setForm((f) => ({ ...f, receivalDate: e.target.value }))}
                />
              </div>
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
