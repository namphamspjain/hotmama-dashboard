import { useState, useMemo } from "react";
import {
  Package, CheckCircle2, AlertTriangle, XCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil,
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
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import {
  inventory as mockInventory, InventoryItem, InventoryStatus,
} from "@/data/mock-data";
import { useAuth } from "@/contexts/AuthContext";

type SortField = "id" | "productName" | "receivalDate";
type SortDir = "asc" | "desc";

const statusConfig: Record<InventoryStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Good", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  damaged: { label: "Damaged", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertTriangle },
  lost: { label: "Lost", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
};

const STATUS_COLORS = ["hsl(160, 60%, 45%)", "hsl(40, 90%, 50%)", "hsl(0, 70%, 55%)"];
const TYPE_COLORS = ["hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(340, 65%, 55%)", "hsl(30, 80%, 55%)", "hsl(170, 60%, 45%)"];

export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // edit dialog
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editStatus, setEditStatus] = useState<InventoryStatus>("good");
  const [editNotes, setEditNotes] = useState("");

  // metrics
  const metrics = useMemo(() => ({
    total: items.length,
    good: items.filter((i) => i.status === "good").length,
    damaged: items.filter((i) => i.status === "damaged").length,
    lost: items.filter((i) => i.status === "lost").length,
  }), [items]);

  // chart data
  const statusChartData = useMemo(() => [
    { name: "Good", value: metrics.good },
    { name: "Damaged", value: metrics.damaged },
    { name: "Lost", value: metrics.lost },
  ].filter((d) => d.value > 0), [metrics]);

  const typeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { map[i.productType] = (map[i.productType] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const productTypes = useMemo(() => [...new Set(items.map((i) => i.productType))], [items]);

  // filter + sort
  const filtered = useMemo(() => {
    let list = [...items];
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
  }, [items, search, statusFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditStatus(item.status);
    setEditNotes(item.notes || "");
  };

  const saveEdit = () => {
    if (!editItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === editItem.id ? { ...i, status: editStatus, notes: editNotes || undefined } : i))
    );
    setEditItem(null);
  };

  const metricCards = [
    { label: "Total In-Store", value: metrics.total, icon: Package },
    { label: "Good", value: metrics.good, icon: CheckCircle2 },
    { label: "Damaged", value: metrics.damaged, icon: AlertTriangle },
    { label: "Lost", value: metrics.lost, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status Distribution</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">By Product Type</CardTitle></CardHeader>
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

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Inventory Items</CardTitle>
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("productName")}>
                    <span className="flex items-center">Product <SortIcon field="productName" /></span>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("receivalDate")}>
                    <span className="flex items-center">Receival Date <SortIcon field="receivalDate" /></span>
                  </TableHead>
                  <TableHead>Notes</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const sc = statusConfig[item.status];
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs font-medium">{item.id}</TableCell>
                        <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.productType}</TableCell>
                        <TableCell><Badge variant="outline" className={sc.cls}>{sc.label}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.orderId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.receivalDate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{item.notes || "—"}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {editItem?.id}</DialogTitle>
            <DialogDescription>{editItem?.productName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as InventoryStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Damage description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
