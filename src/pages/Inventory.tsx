import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Download,
  Plus,
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  inventory as mockInventory,
  InventoryItem,
  InventoryStatus,
  orders,
  formatCurrency,
} from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { downloadCSV } from "@/lib/csv";

type SortField = "id" | "productName" | "receivalDate";
type SortDir = "asc" | "desc";

const statusConfig: Record<InventoryStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Good", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  damaged: { label: "Damaged", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertTriangle },
  lost: { label: "Lost", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
};

const STATUS_COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 50%)", "hsl(0, 70%, 55%)"];
const TYPE_COLORS = ["hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(340, 65%, 55%)", "hsl(30, 80%, 55%)", "hsl(170, 60%, 45%)"];

const emptyForm = {
  productId: "",
  orderId: "",
  receivalDate: new Date().toISOString().slice(0, 10),
  productType: "",
  productName: "",
  status: "good" as InventoryStatus,
  notes: "",
};

const getNextProductId = (items: InventoryItem[]): string => {
  let max = 0;
  items.forEach((i) => {
    const match = i.id.match(/^PRD-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  });
  const next = max + 1;
  return `PRD-${String(next).padStart(3, "0")}`;
};

export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  // new / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const visibleItems = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return items;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return items.filter((i) => {
      const d = new Date(i.receivalDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [items, dateRange.from, dateRange.to]);

  // metrics
  const metrics = useMemo(() => {
    const total = visibleItems.length;
    const good = visibleItems.filter((i) => i.status === "good").length;
    const damagedItems = visibleItems.filter((i) => i.status === "damaged");
    const lostItems = visibleItems.filter((i) => i.status === "lost");
    const damaged = damagedItems.length;
    const lost = lostItems.length;

    // Cost of Loss: sum unit cost of all damaged/lost units within visible range
    const unitMap: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        unitMap[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });
    const costOfLoss = [...damagedItems, ...lostItems].reduce((sum, item) => {
      const unit = unitMap[item.orderId];
      if (!unit) return sum;
      return sum + unit;
    }, 0);

    return { total, good, damaged, lost, costOfLoss };
  }, [visibleItems]);

  // chart data
  const statusChartData = useMemo(() => [
    { name: "Good", value: metrics.good },
    { name: "Damaged", value: metrics.damaged },
    { name: "Lost", value: metrics.lost },
  ].filter((d) => d.value > 0), [metrics]);

  const typeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleItems.forEach((i) => {
      map[i.productType] = (map[i.productType] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleItems]);

  const damagedLostTrendData = useMemo(() => {
    const byDate: Record<string, { damaged: number; lost: number }> = {};
    visibleItems.forEach((i) => {
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
  }, [visibleItems]);

  const orderCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.quantity > 0) {
        map[o.id] = Math.round(o.importCostPhp / o.quantity);
      }
    });
    return map;
  }, []);

  const lossCostData = useMemo(() => {
    const byDate: Record<string, number> = {};
    visibleItems.forEach((i) => {
      if (i.status !== "damaged" && i.status !== "lost") return;
      const unitCost = orderCostMap[i.orderId];
      if (!unitCost) return;
      const key = i.receivalDate;
      byDate[key] = (byDate[key] || 0) + unitCost;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totalLoss]) => ({ date, totalLoss }));
  }, [visibleItems, orderCostMap]);

  const productTypes = useMemo(
    () => [...new Set(items.map((i) => i.productType))],
    [items],
  );

  // filter + sort
  const filtered = useMemo(() => {
    let list = [...visibleItems];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.id.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((i) => i.productType === typeFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "productName") cmp = a.productName.localeCompare(b.productName);
      else if (sortField === "receivalDate") cmp = a.receivalDate.localeCompare(b.receivalDate);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [visibleItems, search, statusFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      productId: item.id,
      orderId: item.orderId,
      receivalDate: item.receivalDate,
      productType: item.productType,
      productName: item.productName,
      status: item.status,
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.orderId || !form.productName || !form.productType || !form.receivalDate) return;
    const id = editingItem ? editingItem.id : form.productId || getNextProductId(items);
    const nextItem: InventoryItem = {
      id,
      orderId: form.orderId,
      receivalDate: form.receivalDate,
      productType: form.productType,
      productName: form.productName,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingItem) {
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? nextItem : i)));
    } else {
      setItems((prev) => [nextItem, ...prev]);
    }
    setDialogOpen(false);
    setEditingItem(null);
    setForm({
      ...emptyForm,
      productId: getNextProductId(items),
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const metricCards = [
    { label: "Total In-Store", value: metrics.total, icon: Package },
    { label: "Good", value: metrics.good, icon: CheckCircle2 },
    { label: "Damaged", value: metrics.damaged, icon: AlertTriangle },
    { label: "Lost", value: metrics.lost, icon: XCircle },
    { label: "Cost of Loss", value: formatCurrency(metrics.costOfLoss), icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  m.label === "Damaged" && "text-amber-500",
                  m.label === "Lost" && "text-red-500",
                  m.label === "Cost of Loss" && "text-red-500",
                )}
              >
                {m.value}
              </p>
              <p
                className={cn(
                  "text-xs",
                  m.label === "Damaged"
                    ? "text-amber-500"
                    : m.label === "Lost" || m.label === "Cost of Loss"
                    ? "text-red-500"
                    : "text-muted-foreground",
                )}
              >
                {m.label === "Cost of Loss" ? "PHP" : "products"}
              </p>
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusChartData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By Product Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {typeChartData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Damaged & Lost trend and loss cost charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Damaged &amp; Lost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
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
                  stroke="hsl(40, 90%, 50%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="lost"
                  name="Lost"
                  stroke="hsl(0, 70%, 55%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost of Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
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
                  fill="hsl(0, 70%, 55%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Inventory Items</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = [
                    "Product ID",
                    "Product Type",
                    "Product Name",
                    "Status",
                    "Order ID",
                    "Receival Date",
                    "Notes",
                  ];
                  const rows = filtered.map((item) => [
                    item.id,
                    item.productType,
                    item.productName,
                    item.status,
                    item.orderId,
                    item.receivalDate,
                    item.notes ?? "",
                  ]);
                  downloadCSV("inventory.csv", headers, rows);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    const nextId = getNextProductId(items);
                    setEditingItem(null);
                    setForm({
                      ...emptyForm,
                      productId: nextId,
                    });
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Item
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {productTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("id")}>
                    <span className="flex items-center">Product ID <SortIcon field="id" /></span>
                  </TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("productName")}>
                    <span className="flex items-center">Product Name <SortIcon field="productName" /></span>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("receivalDate")}>
                    <span className="flex items-center">Receival Date <SortIcon field="receivalDate" /></span>
                  </TableHead>
                  <TableHead>Notes</TableHead>
                  {canEdit && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const sc = statusConfig[item.status];
                    return (
                      <TableRow key={item.id} className={canEdit ? "group" : undefined}>
                        <TableCell className="font-mono text-xs font-medium">{item.id}</TableCell>
                        <TableCell className="text-sm font-medium">{item.productType}</TableCell>
                        <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.cls}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() => navigate("/orders", { state: { highlightOrderId: item.orderId } })}
                          >
                            {item.orderId}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.receivalDate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {item.notes || "—"}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                    onClick={() => openEdit(item)}
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
                                    onClick={() => handleDeleteItem(item.id)}
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
          <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} items</p>
        </CardContent>
      </Card>

      {/* New / Edit Item Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setForm({
              ...emptyForm,
              productId: getNextProductId(items),
            });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? editingItem.productName
                : "Add a new inventory item. Product ID is generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Product ID</Label>
                <Input value={form.productId} disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Order ID</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-6 px-2 text-xs"
                    disabled={!form.orderId}
                    onClick={() => {
                      if (!form.orderId) return;
                      navigate("/orders", { state: { highlightOrderId: form.orderId } });
                    }}
                  >
                    View in Orders
                  </Button>
                </Label>
                <Input
                  value={form.orderId}
                  onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  placeholder="e.g. OD-20260110-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Receival Date</Label>
                <Input
                  type="date"
                  value={form.receivalDate}
                  onChange={(e) => setForm((f) => ({ ...f, receivalDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as InventoryStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
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
                <Input
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                  placeholder="e.g. iPhone 15 Pro Max 256GB"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Damage description, location, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.orderId || !form.productName || !form.productType || !form.receivalDate
              }
            >
              {editingItem ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
