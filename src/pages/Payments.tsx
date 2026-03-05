import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  payments as initialPayments,
  orders,
  sales,
  agents,
  retailers,
  type Payment,
  type PayStatus,
  type RetailerPayStatus,
  type PaymentType,
  formatCurrency,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpDown, Search, AlertTriangle, CheckCircle2, Clock, DollarSign, Download, Pencil, Trash2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

type SortKey = "id" | "amount" | "dueDate";
type SortDir = "asc" | "desc";

const AGENT_PIE_COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 50%)"];
const RETAILER_PIE_COLORS = ["hsl(220, 70%, 55%)", "hsl(340, 65%, 55%)"];

const agentPayBadge: Record<PayStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  unpaid: { label: "Unpaid", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  overdue: { label: "Overdue", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const retailerPayBadge: Record<RetailerPayStatus, { label: string; cls: string }> = {
  unsold: { label: "Unsold", cls: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  sold: { label: "Sold", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  refunded: { label: "Refunded", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const statusBadgeAgent = (s: PayStatus) => {
  const cfg = agentPayBadge[s];
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
};

const statusBadgeRetailer = (s: RetailerPayStatus) => {
  const cfg = retailerPayBadge[s];
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
};

const getDisplayPayId = (p: Payment): string => {
  const num = p.id.replace(/^PAY-(\d+)$/, "$1");
  return p.type === "agent" ? `PAY-AG-${num}` : `PAY-RT-${num}`;
};

const getOrderDate = (p: Payment): string => {
  if (p.type === "agent") {
    return orders.find((o) => o.id === p.linkedId)?.orderDate ?? p.dueDate;
  }
  return sales.find((s) => s.id === p.linkedId)?.saleDate ?? p.dueDate;
};

const getNextPayId = (list: Payment[]): string => {
  let max = 0;
  list.forEach((p) => {
    const m = p.id.match(/^PAY-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `PAY-${String(max + 1).padStart(3, "0")}`;
};

const emptyForm = {
  type: "agent" as PaymentType,
  partnerName: "",
  linkedId: "",
  amount: "",
  status: "unpaid" as PayStatus | RetailerPayStatus,
  dueDate: new Date().toISOString().slice(0, 10),
  paidDate: "",
};

const PaymentsPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [data, setData] = useState<Payment[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const visiblePayments = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return data;
    const fromTs = dateRange.from ? dateRange.from.setHours(0, 0, 0, 0) : null;
    const toTs = dateRange.to ? dateRange.to.setHours(23, 59, 59, 999) : null;
    return data.filter((p) => {
      const dateStr = getOrderDate(p);
      const d = new Date(dateStr);
      const ts = d.getTime();
      if (Number.isNaN(ts)) return true;
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [data, dateRange.from, dateRange.to]);

  const filterAndSort = (type: "agent" | "retailer") => {
    let filtered = visiblePayments.filter((p) => p.type === type);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          getDisplayPayId(p).toLowerCase().includes(q) ||
          p.partnerName.toLowerCase().includes(q) ||
          p.linkedId.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      const agentStatuses: PayStatus[] = ["paid", "unpaid", "overdue"];
      const retailerStatuses: RetailerPayStatus[] = ["unsold", "pending", "sold", "refunded"];
      if (type === "agent" && agentStatuses.includes(statusFilter as PayStatus)) {
        filtered = filtered.filter((p) => p.status === statusFilter);
      } else if (type === "retailer" && retailerStatuses.includes(statusFilter as RetailerPayStatus)) {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = getOrderDate(a).localeCompare(getOrderDate(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  };

  const agentPayments = filterAndSort("agent");
  const retailerPayments = filterAndSort("retailer");

  const metrics = useMemo(() => {
    const agents = visiblePayments.filter(p => p.type === "agent");
    const retailers = visiblePayments.filter(p => p.type === "retailer");

    const agentFeesTotal = agents
      .filter(p => p.status === "unpaid" || p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);

    const agentFeesPaid = agents
      .filter(p => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);

    const retailerReceivables = retailers
      .filter(p => p.status === "pending" || p.status === "sold")
      .reduce((s, p) => s + p.amount, 0);

    const retailerCollected = retailers
      .filter(p => p.status === "sold")
      .reduce((s, p) => s + p.amount, 0);

    return {
      agentTotal: agentFeesTotal,
      agentPaid: agentFeesPaid,
      retailerTotal: retailerReceivables,
      retailerPaid: retailerCollected,
    };
  }, [visiblePayments]);

  const openNewPayment = () => {
    setEditingPayment(null);
    setForm({ ...emptyForm, dueDate: new Date().toISOString().slice(0, 10) });
    setPaymentDialogOpen(true);
  };

  const openEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setForm({
      type: p.type,
      partnerName: p.partnerName,
      linkedId: p.linkedId,
      amount: String(p.amount),
      status: p.status,
      dueDate: p.dueDate,
      paidDate: p.paidDate ?? "",
    });
    setPaymentDialogOpen(true);
  };

  const handlePaymentFormSubmit = () => {
    const amountNum = parseInt(form.amount, 10);
    if (!form.partnerName.trim() || !form.linkedId.trim() || isNaN(amountNum) || amountNum < 0 || !form.dueDate) return;
    const paidDate = form.paidDate.trim() || undefined;
    if (editingPayment) {
      setData((prev) =>
        prev.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                type: form.type,
                partnerName: form.partnerName.trim(),
                linkedId: form.linkedId.trim(),
                amount: amountNum,
                status: form.status,
                dueDate: form.dueDate,
                paidDate,
              }
            : p,
        ),
      );
    } else {
      const id = getNextPayId(data);
      setData((prev) =>
        prev.concat({
          id,
          type: form.type,
          partnerName: form.partnerName.trim(),
          linkedId: form.linkedId.trim(),
          amount: amountNum,
          status: form.status,
          dueDate: form.dueDate,
          paidDate,
        }),
      );
    }
    setPaymentDialogOpen(false);
    setEditingPayment(null);
    setForm(emptyForm);
  };

  const handleDeletePayment = (id: string) => {
    setData((prev) => prev.filter((p) => p.id !== id));
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium" onClick={() => toggleSort(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const renderTable = (items: Payment[], type: "agent" | "retailer") => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]"><SortHeader label="Pay ID" k="id" /></TableHead>
          <TableHead className="w-[220px]">{type === "agent" ? "Agent" : "Retailer"}</TableHead>
          <TableHead className="w-[150px]">{type === "agent" ? "Order ID" : "Sale ID"}</TableHead>
          <TableHead className="w-[120px] text-right"><SortHeader label="Amount" k="amount" /></TableHead>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead className="w-[130px]">
            <SortHeader label={type === "retailer" ? "Sale Date" : "Order Date"} k="dueDate" />
          </TableHead>
          <TableHead className="w-[130px]">Paid Date</TableHead>
          {canEdit && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={canEdit ? 8 : 7}
              className="text-center text-muted-foreground py-8"
            >
              No payments found.
            </TableCell>
          </TableRow>
        ) : items.map((p) => (
          <TableRow
            key={p.id}
            className={cn(
              canEdit && "group",
              p.type === "agent" && p.status === "overdue" && "bg-red-500/5",
              p.type === "retailer" && p.status === "refunded" && "bg-red-500/5",
            )}
          >
            <TableCell className="font-mono text-xs">{getDisplayPayId(p)}</TableCell>
            <TableCell className="font-medium max-w-[220px] truncate">{p.partnerName}</TableCell>
            <TableCell className="font-mono text-xs">{p.linkedId}</TableCell>
            <TableCell className="font-semibold text-right">{formatCurrency(p.amount)}</TableCell>
            <TableCell>
              {p.type === "agent" ? statusBadgeAgent(p.status as PayStatus) : statusBadgeRetailer(p.status as RetailerPayStatus)}
            </TableCell>
            <TableCell>{getOrderDate(p)}</TableCell>
            <TableCell>{p.paidDate ?? "—"}</TableCell>
            {canEdit && (
              <TableCell className="text-right align-middle">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        onClick={() => openEditPayment(p)}
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
                        onClick={() => handleDeletePayment(p.id)}
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
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const metricCards = [
    { title: "Agent Fees Total", value: formatCurrency(metrics.agentTotal), icon: DollarSign },
    { title: "Agent Fees Paid", value: formatCurrency(metrics.agentPaid), icon: CheckCircle2 },
    { title: "Retailer Receivables", value: formatCurrency(metrics.retailerTotal), icon: DollarSign },
    { title: "Retailer Collected", value: formatCurrency(metrics.retailerPaid), icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(m => (
          <Card key={m.title}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-xl font-bold",
                  m.title === "Agent Fees Paid" &&
                    (metrics.agentPaid === metrics.agentTotal ? "text-emerald-500" : "text-amber-500"),
                  m.title === "Retailer Collected" &&
                    (metrics.retailerPaid === metrics.retailerTotal ? "text-emerald-500" : "text-amber-500"),
                )}
              >
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Agent Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Paid", value: metrics.agentPaid },
                    { name: "Unpaid", value: Math.max(metrics.agentTotal - metrics.agentPaid, 0) },
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
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Retailer Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Collected", value: metrics.retailerPaid },
                    { name: "Pending", value: Math.max(metrics.retailerTotal - metrics.retailerPaid, 0) },
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
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Payments</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const all = [...agentPayments, ...retailerPayments];
                  const headers = ["Pay ID", "Type", "Partner", "Order ID", "Amount", "Status", "Order Date", "Paid Date"];
                  const rows = all.map((p) => [
                    getDisplayPayId(p),
                    p.type,
                    p.partnerName,
                    p.linkedId,
                    String(p.amount),
                    p.status,
                    getOrderDate(p),
                    p.paidDate ?? "",
                  ]);
                  downloadCSV("payments.csv", headers, rows);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              {canEdit && (
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openNewPayment}>
                  <Plus className="h-4 w-4 mr-1" /> New Payment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payments…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="unsold">Unsold</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="agents">
            <TabsList>
              <TabsTrigger value="agents" className="gap-1"><Clock className="h-3.5 w-3.5" /> Send to Agents</TabsTrigger>
              <TabsTrigger value="retailers" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Receive from Retailers</TabsTrigger>
            </TabsList>
            <TabsContent value="agents">
              <div className="pt-4">{renderTable(agentPayments, "agent")}</div>
            </TabsContent>
            <TabsContent value="retailers">
              <div className="pt-4">{renderTable(retailerPayments, "retailer")}</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={(o) => { if (!o) { setPaymentDialogOpen(false); setEditingPayment(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Edit Payment" : "New Payment"}</DialogTitle>
            <DialogDescription>
              {editingPayment ? "Update payment details below." : "Add a new payment. Fields match the payments table."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Pay ID</Label>
              <Input
                readOnly
                className="font-mono bg-muted"
                value={editingPayment ? getDisplayPayId(editingPayment) : `PAY-${form.type === "agent" ? "AG" : "RT"}-${getNextPayId(data).replace(/^PAY-/, "")}`}
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v: PaymentType) => {
                  setForm((f) => ({
                    ...f,
                    type: v,
                    partnerName: "",
                    status: v === "agent" ? "unpaid" : "pending",
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{form.type === "agent" ? "Agent" : "Retailer"}</Label>
              <Select
                value={form.partnerName}
                onValueChange={(v) => setForm((f) => ({ ...f, partnerName: v }))}
              >
                <SelectTrigger><SelectValue placeholder={`Select ${form.type}`} /></SelectTrigger>
                <SelectContent>
                  {form.type === "agent"
                    ? agents.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)
                    : retailers.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{form.type === "agent" ? "Order ID" : "Sale ID"}</Label>
              <Input
                value={form.linkedId}
                onChange={(e) => setForm((f) => ({ ...f, linkedId: e.target.value }))}
                placeholder={form.type === "agent" ? "e.g. OD-20260110-001" : "e.g. SL-20260125-001"}
              />
            </div>
            <div className="grid gap-2">
              <Label>Amount (centavos)</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as PayStatus | RetailerPayStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {form.type === "agent" ? (
                    <>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="unsold">Unsold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{form.type === "agent" ? "Order Date" : "Sale Date"}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Paid Date (optional)</Label>
              <Input
                type="date"
                value={form.paidDate}
                onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setEditingPayment(null); }}>Cancel</Button>
            <Button onClick={handlePaymentFormSubmit}>{editingPayment ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;
