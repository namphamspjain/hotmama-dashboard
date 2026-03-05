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
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

type SortKey = "id" | "amount" | "dueDate";
type SortDir = "asc" | "desc";

const statusBadgeAgent = (s: PayStatus) => {
  switch (s) {
    case "paid": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Paid</Badge>;
    case "unpaid": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Unpaid</Badge>;
    case "overdue": return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">Overdue</Badge>;
    default: return null;
  }
};

const statusBadgeRetailer = (s: RetailerPayStatus) => {
  switch (s) {
    case "unsold": return <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/20">Unsold</Badge>;
    case "pending": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Pending</Badge>;
    case "sold": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Sold</Badge>;
    case "refunded": return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">Refunded</Badge>;
    default: return null;
  }
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterAndSort = (type: "agent" | "retailer") => {
    let filtered = data.filter((p) => p.type === type);
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
    const agents = data.filter(p => p.type === "agent");
    const retailers = data.filter(p => p.type === "retailer");
    return {
      agentTotal: agents.reduce((s, p) => s + p.amount, 0),
      agentPaid: agents.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      agentOverdue: agents.filter(p => p.status === "overdue").length,
      retailerTotal: retailers.reduce((s, p) => s + p.amount, 0),
      retailerPaid: retailers.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      retailerOverdue: retailers.filter(p => p.status === "overdue").length,
    };
  }, [data]);

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
    { title: "Agent Overdue", value: metrics.agentOverdue, icon: AlertTriangle },
    { title: "Retailer Receivables", value: formatCurrency(metrics.retailerTotal), icon: DollarSign },
    { title: "Retailer Collected", value: formatCurrency(metrics.retailerPaid), icon: CheckCircle2 },
    { title: "Retailer Overdue", value: metrics.retailerOverdue, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map(m => (
          <Card key={m.title}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-xl font-bold">{m.value}</div></CardContent>
          </Card>
        ))}
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
