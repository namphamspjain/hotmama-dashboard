import { useMemo, useState } from "react";
import {
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  costs as mockCosts,
  type CostItem,
  type CostType,
  formatCurrency,
} from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "id" | "costDate" | "amount";
type SortDir = "asc" | "desc";

const COST_COLORS: Record<CostType, string> = {
  "Cost of Loss": "hsl(220, 70%, 55%)",
  "Shipping Fees": "hsl(160, 60%, 45%)",
  "Agent Fees": "hsl(340, 65%, 55%)",
  Salary: "hsl(30, 80%, 55%)",
  "Housing Rental": "hsl(45, 90%, 55%)",
  Miscellaneous: "hsl(280, 60%, 55%)",
};

const COST_TYPES: CostType[] = [
  "Cost of Loss",
  "Shipping Fees",
  "Agent Fees",
  "Salary",
  "Housing Rental",
  "Miscellaneous",
];

const emptyForm = {
  id: "",
  type: "Cost of Loss" as CostType,
  note: "",
  amount: "",
  costDate: new Date().toISOString().slice(0, 10),
  receipt: "",
};

function getNextCostId(costs: CostItem[], costDate: string): string {
  const dateKey = costDate.replace(/-/g, "");
  let max = 0;
  costs.forEach((c) => {
    const match = c.id.match(/^C-(\d{8})-(\d{4})$/);
    if (match && match[1] === dateKey) {
      const n = parseInt(match[2], 10);
      if (n > max) max = n;
    }
  });
  const next = max + 1;
  return `C-${dateKey}-${String(next).padStart(4, "0")}`;
}

export default function CostPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [costs, setCosts] = useState<CostItem[]>(mockCosts);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CostType | "all">("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [sortField, setSortField] = useState<SortField>("costDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);

  const visibleCosts = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return costs;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return costs.filter((c) => {
      const d = new Date(c.costDate);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [costs, dateRange.from, dateRange.to]);

  const metrics = useMemo(() => {
    const totals: Record<CostType, number> = {
      "Cost of Loss": 0,
      "Shipping Fees": 0,
      "Agent Fees": 0,
      Salary: 0,
      "Housing Rental": 0,
      Miscellaneous: 0,
    };
    visibleCosts.forEach((c) => {
      totals[c.type] += c.amount;
    });
    return totals;
  }, [visibleCosts]);

  const costBreakdownData = useMemo(
    () =>
      COST_TYPES.map((t) => ({ name: t, value: metrics[t] })).filter((d) => d.value > 0),
    [metrics],
  );

  const costTrendData = useMemo(() => {
    const byDate: Record<string, Record<CostType, number>> = {};
    visibleCosts.forEach((c) => {
      if (!byDate[c.costDate]) {
        byDate[c.costDate] = {
          "Cost of Loss": 0,
          "Shipping Fees": 0,
          "Agent Fees": 0,
          Salary: 0,
          "Housing Rental": 0,
          Miscellaneous: 0,
        };
      }
      byDate[c.costDate][c.type] += c.amount;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
  }, [visibleCosts]);

  const filtered = useMemo(() => {
    let list = [...visibleCosts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q) ||
          c.note.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((c) => c.type === typeFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "costDate") cmp = a.costDate.localeCompare(b.costDate);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [visibleCosts, search, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleSubmit = () => {
    if (!form.type || !form.amount || !form.costDate) return;
    const id = editingCost?.id ?? getNextCostId(costs, form.costDate);
    const amount = parseFloat(form.amount) || 0;
    const next: CostItem = {
      id,
      type: form.type,
      note: form.note.trim(),
      amount,
      costDate: form.costDate,
      receipt: form.receipt || undefined,
    };
    if (editingCost) {
      setCosts((prev) => prev.map((c) => (c.id === editingCost.id ? next : c)));
    } else {
      setCosts((prev) => [next, ...prev]);
    }
    setForm(emptyForm);
    setEditingCost(null);
    setDialogOpen(false);
  };

  const handleDeleteCost = (id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const metricCards = [
    { label: "Cost of Loss", value: formatCurrency(metrics["Cost of Loss"]), icon: DollarSign },
    { label: "Shipping Fees", value: formatCurrency(metrics["Shipping Fees"]), icon: DollarSign },
    { label: "Agent Fees", value: formatCurrency(metrics["Agent Fees"]), icon: DollarSign },
    { label: "Salary", value: formatCurrency(metrics.Salary), icon: DollarSign },
    {
      label: "Housing Rental",
      value: formatCurrency(metrics["Housing Rental"]),
      icon: DollarSign,
    },
    {
      label: "Miscellaneous",
      value: formatCurrency(metrics.Miscellaneous),
      icon: DollarSign,
    },
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {costBreakdownData.map((d) => (
                    <Cell key={d.name} fill={COST_COLORS[d.name as CostType]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costTrendData} barCategoryGap="20%">
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
                {COST_TYPES.map((t) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={t}
                    fill={COST_COLORS[t]}
                    stackId="totalCost"
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Costs</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = ["Cost ID", "Type", "Note", "Amount", "Cost Date", "Receipt"];
                  const rows = filtered.map((c) => [
                    c.id,
                    c.type,
                    c.note,
                    String(c.amount),
                    c.costDate,
                    c.receipt ?? "",
                  ]);
                  downloadCSV("costs.csv", headers, rows);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCost(null);
                    setForm({
                      ...emptyForm,
                      id: "",
                    });
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Cost
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search costs..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v === "all" ? "all" : (v as CostType))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {COST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table className="min-w-[1000px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none w-[180px] whitespace-nowrap"
                    onClick={() => toggleSort("id")}
                  >
                    <span className="flex items-center">
                      Cost ID <SortIcon field="id" />
                    </span>
                  </TableHead>
                  <TableHead className="w-[150px] whitespace-nowrap">Type</TableHead>
                  <TableHead className="w-[220px]">Note</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right w-[130px] whitespace-nowrap"
                    onClick={() => toggleSort("amount")}
                  >
                    <span className="flex items-center justify-end">
                      Amount <SortIcon field="amount" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none w-[140px] whitespace-nowrap"
                    onClick={() => toggleSort("costDate")}
                  >
                    <span className="flex items-center">
                      Cost Date <SortIcon field="costDate" />
                    </span>
                  </TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap">Receipt</TableHead>
                  {canEdit && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 7 : 6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No costs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className={canEdit ? "group" : undefined}>
                      <TableCell className="font-mono text-xs font-medium w-[180px] whitespace-nowrap">
                        {c.id}
                      </TableCell>
                      <TableCell className="text-sm w-[150px] whitespace-nowrap">{c.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground w-[220px] truncate">
                        {c.note || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium whitespace-nowrap">
                        {formatCurrency(c.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.costDate}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.receipt ? c.receipt : "—"}
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
                                  onClick={() => {
                                    setEditingCost(c);
                                    setForm({
                                      id: c.id,
                                      type: c.type,
                                      note: c.note,
                                      amount: String(c.amount),
                                      costDate: c.costDate,
                                      receipt: c.receipt ?? "",
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
                                  onClick={() => handleDeleteCost(c.id)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {costs.length} costs
          </p>
        </CardContent>
      </Card>

      {/* New / Edit Cost Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCost(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCost ? "Edit Cost" : "New Cost"}</DialogTitle>
            <DialogDescription>
              {editingCost
                ? editingCost.note || editingCost.type
                : "Add a new cost entry. ID is generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost ID</Label>
                <Input value={editingCost?.id ?? "Auto"} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as CostType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Warehouse staff salaries for February"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₱)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Date</Label>
                <Input
                  type="date"
                  value={form.costDate}
                  onChange={(e) => setForm((f) => ({ ...f, costDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Receipt (optional)</Label>
              <Input
                type="text"
                value={form.receipt}
                onChange={(e) => setForm((f) => ({ ...f, receipt: e.target.value }))}
                placeholder="File name or link"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingCost(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!form.amount || !form.costDate}>
              {editingCost ? "Save Changes" : "Create Cost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

