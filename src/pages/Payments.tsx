import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { payments as initialPayments, type Payment, type PayStatus, formatCurrency } from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpDown, Search, AlertTriangle, CheckCircle2, Clock, DollarSign, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

type SortKey = "id" | "amount" | "dueDate";
type SortDir = "asc" | "desc";

const statusBadge = (s: PayStatus) => {
  switch (s) {
    case "paid": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Paid</Badge>;
    case "unpaid": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Unpaid</Badge>;
    case "overdue": return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">Overdue</Badge>;
  }
};

const PaymentsPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [data, setData] = useState<Payment[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editStatus, setEditStatus] = useState<PayStatus>("unpaid");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterAndSort = (type: "agent" | "retailer") => {
    let filtered = data.filter(p => p.type === type);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.id.toLowerCase().includes(q) || p.partnerName.toLowerCase().includes(q) || p.linkedId.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") filtered = filtered.filter(p => p.status === statusFilter);
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = a.dueDate.localeCompare(b.dueDate);
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

  const handleSaveStatus = () => {
    if (!editPayment) return;
    setData(prev => prev.map(p => p.id === editPayment.id ? {
      ...p,
      status: editStatus,
      paidDate: editStatus === "paid" ? new Date().toISOString().split("T")[0] : undefined,
    } : p));
    setEditPayment(null);
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium" onClick={() => toggleSort(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const renderTable = (items: Payment[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><SortHeader label="ID" k="id" /></TableHead>
          <TableHead>Partner</TableHead>
          <TableHead>Linked Ref</TableHead>
          <TableHead><SortHeader label="Amount" k="amount" /></TableHead>
          <TableHead>Status</TableHead>
          <TableHead><SortHeader label="Due Date" k="dueDate" /></TableHead>
          <TableHead>Paid Date</TableHead>
          {canEdit && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">No payments found.</TableCell></TableRow>
        ) : items.map(p => (
          <TableRow key={p.id} className={p.status === "overdue" ? "bg-red-500/5" : ""}>
            <TableCell className="font-mono text-xs">{p.id}</TableCell>
            <TableCell className="font-medium">{p.partnerName}</TableCell>
            <TableCell className="font-mono text-xs">{p.linkedId}</TableCell>
            <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
            <TableCell>{statusBadge(p.status)}</TableCell>
            <TableCell>{p.dueDate}</TableCell>
            <TableCell>{p.paidDate ?? "—"}</TableCell>
            {canEdit && (
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => { setEditPayment(p); setEditStatus(p.status); }}>
                  Update
                </Button>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ID, partner, ref…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => {
          const all = [...agentPayments, ...retailerPayments];
          const headers = ["Payment ID", "Type", "Partner", "Linked Ref", "Amount", "Status", "Due Date", "Paid Date"];
          const rows = all.map((p) => [p.id, p.type, p.partnerName, p.linkedId, String(p.amount), p.status, p.dueDate, p.paidDate ?? ""]);
          downloadCSV("payments.csv", headers, rows);
        }}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents" className="gap-1"><Clock className="h-3.5 w-3.5" /> Send to Agents</TabsTrigger>
          <TabsTrigger value="retailers" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Receive from Retailers</TabsTrigger>
        </TabsList>
        <TabsContent value="agents">
          <Card><CardContent className="pt-4">{renderTable(agentPayments)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="retailers">
          <Card><CardContent className="pt-4">{renderTable(retailerPayments)}</CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editPayment} onOpenChange={o => !o && setEditPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Payment Status</DialogTitle></DialogHeader>
          {editPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Payment ID</span><span className="font-mono">{editPayment.id}</span>
                <span className="text-muted-foreground">Partner</span><span>{editPayment.partnerName}</span>
                <span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatCurrency(editPayment.amount)}</span>
              </div>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as PayStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
            <Button onClick={handleSaveStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;
