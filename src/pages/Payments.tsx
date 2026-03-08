import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowUpDown, Search, AlertTriangle, CheckCircle2, Clock, DollarSign, Download, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

import { usePayments } from "@/hooks/usePayments";

type SortKey = "id" | "amount" | "payDate";
type SortDir = "asc" | "desc";

const AGENT_PIE_COLORS = [
  "hsl(160, 60%, 45%)",
  "hsl(40, 90%, 50%)",
  "hsl(340, 65%, 55%)",
];
const RETAILER_PIE_COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(40, 90%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 55%)",
];

const agentPayBadge: Record<PayStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  unpaid: { label: "Unpaid", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  overdue: { label: "Canceled", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
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

const getOrderDate = (p: Payment): string => {
  if (p.type === "agent") {
    return orders.find((o) => o.id === p.linkedId)?.orderDate ?? p.payDate;
  }
  return sales.find((s) => s.id === p.linkedId)?.saleDate ?? p.payDate;
};

const getNextPayId = (list: Payment[], type: PaymentType, payDate: string): string => {
  const dateKey = payDate.replace(/-/g, "");
  const prefix = type === "agent" ? "PAY-AG" : "PAY-RT";
  let max = 0;
  list.forEach((p) => {
    const match = p.id.match(new RegExp(`^${prefix}-(\\d{8})-(\\d{3})$`));
    if (match && match[1] === dateKey) {
      const n = parseInt(match[2], 10);
      if (n > max) max = n;
    }
  });
  const next = max + 1;
  return `${prefix}-${dateKey}-${String(next).padStart(3, "0")}`;
};

const emptyForm = {
  payId: "",
  type: "agent" as PaymentType,
  partnerName: "",
  linkedId: "",
  amount: "",
  status: "unpaid" as PayStatus | RetailerPayStatus,
  payDate: new Date().toISOString().slice(0, 10),
  paidDate: "",
};

const PaymentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const {
    payments: data,
    isLoading,
    isError,
    error,
    createPayment,
    updatePayment,
    deletePayment,
  } = usePayments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("payDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Pagination & Tabs state
  const [activeTab, setActiveTab] = useState("agents");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateRange.from, dateRange.to, activeTab, rowsPerPage]);

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
      filtered = filtered.filter((p) => {
        const statusLabel =
          p.type === "agent"
            ? agentPayBadge[p.status as PayStatus]?.label
            : retailerPayBadge[p.status as RetailerPayStatus]?.label;

        const fields = [
          p.id,
          p.partnerName,
          p.linkedId,
          String(p.amount),
          statusLabel || "",
          getOrderDate(p),
          p.payDate || "—",
        ];
        return fields.some((f) => f.toLowerCase().includes(q));
      });
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

  // Auto-switch tabs if searching yields results in the other tab only
  useEffect(() => {
    if (search) {
      if (activeTab === "agents" && agentPayments.length === 0 && retailerPayments.length > 0) {
        setActiveTab("retailers");
      } else if (activeTab === "retailers" && retailerPayments.length === 0 && agentPayments.length > 0) {
        setActiveTab("agents");
      }
    }
  }, [search, activeTab, agentPayments.length, retailerPayments.length]);

  const metrics = useMemo(() => {
    const agents = visiblePayments.filter((p) => p.type === "agent");
    const retailers = visiblePayments.filter((p) => p.type === "retailer");

    const agentTotal = agents.reduce((s, p) => s + p.amount, 0);
    const agentPaid = agents.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const agentUnpaid = agents.filter((p) => p.status === "unpaid").reduce((s, p) => s + p.amount, 0);
    const agentCanceled = agents.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

    const retailerUnsold = retailers.filter((p) => p.status === "unsold").reduce((s, p) => s + p.amount, 0);
    const retailerPending = retailers.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const retailerSold = retailers.filter((p) => p.status === "sold").reduce((s, p) => s + p.amount, 0);
    const retailerRefunded = retailers.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

    const retailerReceivables = retailerPending + retailerSold;
    const retailerCollected = retailerSold;

    return {
      agentTotal,
      agentPaid,
      agentUnpaid,
      agentCanceled,
      retailerUnsold,
      retailerPending,
      retailerSold,
      retailerRefunded,
      retailerReceivables,
      retailerCollected,
    };
  }, [visiblePayments]);

  // Sync Pay ID with due date / type
  useEffect(() => {
    if (!paymentDialogOpen) return;
    if (editingPayment) return;
    if (!form.payDate) return;
    const nextId = getNextPayId(data, form.type, form.payDate);
    if (form.payId === nextId) return;
    setForm((prev) => ({ ...prev, payId: nextId }));
  }, [paymentDialogOpen, editingPayment, form.payDate, form.type, data]);

  const openNewPayment = () => {
    setEditingPayment(null);
    setForm({ ...emptyForm, payId: getNextPayId(data, emptyForm.type, emptyForm.payDate), payDate: new Date().toISOString().slice(0, 10) });
    setPaymentDialogOpen(true);
  };

  const openEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setForm({
      payId: p.id,
      type: p.type,
      partnerName: p.partnerName,
      linkedId: p.linkedId,
      amount: String(p.amount),
      status: p.status,
      payDate: p.payDate,
      paidDate: p.notes ?? "",
    });
    setPaymentDialogOpen(true);
  };

  const handlePaymentFormSubmit = async () => {
    const amountNum = parseInt(form.amount, 10);
    if (!form.partnerName.trim() || !form.linkedId.trim() || isNaN(amountNum) || amountNum < 0 || !form.payDate) return;
    const payment = {
      id: editingPayment?.id ?? form.payId,
      uuid: editingPayment?.uuid,
      type: form.type,
      partnerName: form.partnerName.trim(),
      linkedId: form.linkedId.trim(),
      amount: amountNum,
      status: form.status,
      payDate: form.payDate,
      notes: form.paidDate.trim() || undefined, // Store 'paidDate' as notes for now until dedicated columns are standardized
    } as Payment;

    try {
      if (editingPayment && editingPayment.uuid) {
        await updatePayment.mutateAsync({ uuid: editingPayment.uuid, updates: payment });
      } else {
        await createPayment.mutateAsync(payment);
      }
      setPaymentDialogOpen(false);
      setEditingPayment(null);
      setForm(emptyForm);
    } catch (e) {
      console.error("Failed to save payment", e);
    }
  };

  const handleDeletePayment = async (uuid?: string) => {
    if (!uuid) return;
    try {
      await deletePayment.mutateAsync(uuid);
    } catch (e) {
      console.error("Failed to delete payment", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-120px)] w-full flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-lg font-semibold">Error Loading Payments</h2>
        </div>
        <p className="text-muted-foreground">Failed to fetch payments data. Please check your connection or RLS policies.</p>
        <p className="text-sm font-mono mt-2 p-2 bg-muted rounded-md text-red-500 overflow-auto">
          {error?.message || String(error)}
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium" onClick={() => toggleSort(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const renderTable = (items: Payment[], type: "agent" | "retailer") => {
    const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRows = items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap"><SortHeader label="Pay ID" k="id" /></TableHead>
          <TableHead className="whitespace-nowrap">{type === "agent" ? "Agent" : "Retailer"}</TableHead>
          <TableHead className="whitespace-nowrap">{type === "agent" ? "Order ID" : "Sale ID"}</TableHead>
          <TableHead className="text-right whitespace-nowrap"><SortHeader label="Amount" k="amount" /></TableHead>
          <TableHead className="whitespace-nowrap">Payment</TableHead>
          <TableHead className="whitespace-nowrap">
            <SortHeader label={type === "retailer" ? "Sale Date" : "Order Date"} k="payDate" />
          </TableHead>
          <TableHead className="whitespace-nowrap">Paid Date</TableHead>
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
        ) : paginatedRows.map((p) => (
          <TableRow
            key={p.id}
            className={cn(
              canEdit && "group",
              p.type === "agent" && p.status === "overdue" && "bg-red-500/5",
              p.type === "retailer" && p.status === "refunded" && "bg-red-500/5",
            )}
          >
            <TableCell className="font-mono text-xs whitespace-nowrap">{p.id}</TableCell>
            <TableCell className="font-medium max-w-[220px] truncate">{p.partnerName}</TableCell>
            <TableCell className="font-mono text-xs whitespace-nowrap">{p.linkedId}</TableCell>
            <TableCell className="font-semibold text-right whitespace-nowrap">{formatCurrency(p.amount)}</TableCell>
            <TableCell className="whitespace-nowrap">
              {p.type === "agent" ? statusBadgeAgent(p.status as PayStatus) : statusBadgeRetailer(p.status as RetailerPayStatus)}
            </TableCell>
            <TableCell className="whitespace-nowrap">{getOrderDate(p)}</TableCell>
            <TableCell className="whitespace-nowrap">{p.notes ?? "—"}</TableCell>
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
                        onClick={() => handleDeletePayment(p.uuid)}
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
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Left: rows info */}
          <p className="text-xs text-muted-foreground">
            Showing {items.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, items.length)} of {items.length} payments
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
      </div>
    );
  };

  const metricCards = [
    { title: "Agent Fees Total", value: formatCurrency(metrics.agentTotal), icon: DollarSign },
    { title: "Agent Fees Paid", value: formatCurrency(metrics.agentPaid), icon: CheckCircle2 },
    { title: "Retailer Receivables", value: formatCurrency(metrics.retailerReceivables), icon: DollarSign },
    { title: "Retailer Collected", value: formatCurrency(metrics.retailerCollected), icon: CheckCircle2 },
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
                    (metrics.retailerCollected === metrics.retailerReceivables ? "text-emerald-500" : "text-amber-500"),
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
                    { name: "Unpaid", value: metrics.agentUnpaid },
                    { name: "Canceled", value: metrics.agentCanceled },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {[metrics.agentPaid, metrics.agentUnpaid, metrics.agentCanceled].map((_, idx) => (
                    <Cell key={idx} fill={AGENT_PIE_COLORS[idx % AGENT_PIE_COLORS.length]} />
                  ))}
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
                    { name: "Unsold", value: metrics.retailerUnsold },
                    { name: "Pending", value: metrics.retailerPending },
                    { name: "Sold", value: metrics.retailerSold },
                    { name: "Refunded", value: metrics.retailerRefunded },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {[
                    metrics.retailerUnsold,
                    metrics.retailerPending,
                    metrics.retailerSold,
                    metrics.retailerRefunded,
                  ].map((_, idx) => (
                    <Cell key={idx} fill={RETAILER_PIE_COLORS[idx % RETAILER_PIE_COLORS.length]} />
                  ))}
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
                    p.id,
                    p.type,
                    p.partnerName,
                    p.linkedId,
                    String(p.amount),
                    p.status,
                    getOrderDate(p),
                    p.notes ?? "",
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
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="overdue">Canceled</SelectItem>
                  <SelectItem value="unsold">Unsold</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <div className="gap-2 space-y-1.5">
              <Label>Pay ID</Label>
              <Input
                disabled
                value={form.payId}
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
              <Label className="flex items-center justify-between">
                <span>{form.type === "agent" ? "Order ID" : "Sale ID"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={!form.linkedId}
                  onClick={() => {
                    if (!form.linkedId) return;
                    setPaymentDialogOpen(false);
                    if (form.type === "agent") {
                      navigate("/orders", { state: { highlightOrderId: form.linkedId } });
                    } else {
                      navigate("/sales", { state: { highlightSaleId: form.linkedId } });
                    }
                  }}
                >
                  {form.type === "agent" ? "View in Orders" : "View in Sales"}
                </Button>
              </Label>
              <div className="relative">
                <Input
                  value={form.linkedId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedId: e.target.value }))}
                  placeholder={form.type === "agent" ? "Search order ID..." : "Search sale ID..."}
                  autoComplete="off"
                />
                {form.linkedId && (() => {
                  const q = form.linkedId.toLowerCase();
                  if (form.type === "agent") {
                    const matches = orders
                      .filter((o) => o.id.toLowerCase().includes(q))
                      .slice(0, 8);
                    const exactMatch = orders.some((o) => o.id === form.linkedId);
                    if (matches.length === 0 || exactMatch) return null;
                    return (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-[180px] overflow-y-auto">
                        {matches.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                            onClick={() => setForm((f) => ({ ...f, linkedId: o.id }))}
                          >
                            <span className="font-mono text-xs">{o.id}</span>
                            <span className="text-xs text-muted-foreground truncate ml-2">{o.productName}</span>
                          </button>
                        ))}
                      </div>
                    );
                  } else {
                    const matches = sales
                      .filter((s) => s.id.toLowerCase().includes(q))
                      .slice(0, 8);
                    const exactMatch = sales.some((s) => s.id === form.linkedId);
                    if (matches.length === 0 || exactMatch) return null;
                    return (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-[180px] overflow-y-auto">
                        {matches.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                            onClick={() => setForm((f) => ({ ...f, linkedId: s.id }))}
                          >
                            <span className="font-mono text-xs">{s.id}</span>
                            <span className="text-xs text-muted-foreground truncate ml-2">{s.productName}</span>
                          </button>
                        ))}
                      </div>
                    );
                  }
                })()}
              </div>
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
              <Label>Payment</Label>
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
                      <SelectItem value="overdue">Canceled</SelectItem>
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
                value={form.payDate}
                onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
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
