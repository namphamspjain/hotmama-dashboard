import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  suppliers as initSuppliers, agents as initAgents, warehouses as initWarehouses, retailers as initRetailers,
  orders, sales, mockUsers as initUsers,
  type Supplier, type Agent, type Warehouse, type Retailer, type MockUser,
  formatCurrency,
} from "@/data/mock-data";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Truck, Users, Building2, Store, UserCog, Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";

// ============ Partner helpers ============

function isSupplierReferenced(id: string) { return orders.some(o => o.supplierId === id); }
function isAgentReferenced(id: string) { return orders.some(o => o.agentId === id); }
function isRetailerReferenced(id: string) { return sales.some(s => s.retailerId === id); }

// ============ Component ============

const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "editor";

  // Partner state
  const [supplierList, setSupplierList] = useState<Supplier[]>(initSuppliers);
  const [agentList, setAgentList] = useState<Agent[]>(initAgents);
  const [warehouseList, setWarehouseList] = useState<Warehouse[]>(initWarehouses);
  const [retailerList, setRetailerList] = useState<Retailer[]>(initRetailers);

  // User state
  const [userList, setUserList] = useState<MockUser[]>(initUsers);

  // Search
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialog, setDialog] = useState<{ type: "supplier" | "agent" | "warehouse" | "retailer" | "user"; mode: "add" | "edit"; data?: any } | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const updateForm = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  // ============ Supplier CRUD ============
  const openSupplierDialog = (mode: "add" | "edit", item?: Supplier) => {
    setDialog({ type: "supplier", mode });
    setForm(mode === "edit" && item ? { ...item } : { id: `SUP-${String(supplierList.length + 1).padStart(3, "0")}`, name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", shippingFee: 0 });
  };
  const saveSupplier = () => {
    if (!dialog) return;
    if (dialog.mode === "add") setSupplierList(prev => [...prev, form as Supplier]);
    else setSupplierList(prev => prev.map(s => s.id === form.id ? form as Supplier : s));
    setDialog(null);
  };
  const deleteSupplier = (id: string) => {
    if (isSupplierReferenced(id)) return;
    setSupplierList(prev => prev.filter(s => s.id !== id));
  };

  // ============ Agent CRUD ============
  const openAgentDialog = (mode: "add" | "edit", item?: Agent) => {
    setDialog({ type: "agent", mode });
    setForm(mode === "edit" && item ? { ...item } : { id: `AGT-${String(agentList.length + 1).padStart(3, "0")}`, name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", feePercent: 0 });
  };
  const saveAgent = () => {
    if (!dialog) return;
    if (dialog.mode === "add") setAgentList(prev => [...prev, form as Agent]);
    else setAgentList(prev => prev.map(a => a.id === form.id ? form as Agent : a));
    setDialog(null);
  };
  const deleteAgent = (id: string) => {
    if (isAgentReferenced(id)) return;
    setAgentList(prev => prev.filter(a => a.id !== id));
  };

  // ============ Warehouse CRUD ============
  const openWarehouseDialog = (mode: "add" | "edit", item?: Warehouse) => {
    setDialog({ type: "warehouse", mode });
    setForm(mode === "edit" && item ? { ...item } : { id: `WH-${String(warehouseList.length + 1).padStart(3, "0")}`, name: "", contactPerson: "", phone: "", email: "", address: "" });
  };
  const saveWarehouse = () => {
    if (!dialog) return;
    if (dialog.mode === "add") setWarehouseList(prev => [...prev, form as Warehouse]);
    else setWarehouseList(prev => prev.map(w => w.id === form.id ? form as Warehouse : w));
    setDialog(null);
  };
  const deleteWarehouse = (id: string) => {
    setWarehouseList(prev => prev.filter(w => w.id !== id));
  };

  // ============ Retailer CRUD ============
  const openRetailerDialog = (mode: "add" | "edit", item?: Retailer) => {
    setDialog({ type: "retailer", mode });
    setForm(mode === "edit" && item ? { ...item } : { id: `RET-${String(retailerList.length + 1).padStart(3, "0")}`, name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", paymentMethod: "Bank Transfer" });
  };
  const saveRetailer = () => {
    if (!dialog) return;
    if (dialog.mode === "add") setRetailerList(prev => [...prev, form as Retailer]);
    else setRetailerList(prev => prev.map(r => r.id === form.id ? form as Retailer : r));
    setDialog(null);
  };
  const deleteRetailer = (id: string) => {
    if (isRetailerReferenced(id)) return;
    setRetailerList(prev => prev.filter(r => r.id !== id));
  };

  // ============ User CRUD (admin only) ============
  const openUserDialog = (mode: "add" | "edit", item?: MockUser) => {
    setDialog({ type: "user", mode });
    setForm(mode === "edit" && item ? { ...item } : { id: String(userList.length + 1), name: "", email: "", role: "viewer" as UserRole, active: true });
  };
  const saveUser = () => {
    if (!dialog) return;
    if (dialog.mode === "add") setUserList(prev => [...prev, form as MockUser]);
    else setUserList(prev => prev.map(u => u.id === form.id ? form as MockUser : u));
    setDialog(null);
  };
  const deleteUser = (id: string) => {
    if (id === user?.id) return;
    setUserList(prev => prev.filter(u => u.id !== id));
  };

  // ============ Filtering ============
  const q = search.toLowerCase();
  const filteredSuppliers = supplierList.filter(s => !q || s.name.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q));
  const filteredAgents = agentList.filter(a => !q || a.name.toLowerCase().includes(q) || a.contactPerson.toLowerCase().includes(q));
  const filteredWarehouses = warehouseList.filter(w => !q || w.name.toLowerCase().includes(q) || w.contactPerson.toLowerCase().includes(q));
  const filteredRetailers = retailerList.filter(r => !q || r.name.toLowerCase().includes(q) || r.contactPerson.toLowerCase().includes(q));
  const filteredUsers = userList.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  // ============ Render Helpers ============
  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-primary/15 text-primary border-primary/30",
      editor: "bg-accent/50 text-accent-foreground border-accent/30",
      viewer: "bg-muted text-muted-foreground border-border",
    };
    return <Badge className={map[role] ?? ""}>{role}</Badge>;
  };

  // ============ Dialog Form Renderers ============
  const renderPartnerFields = () => (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={form.name ?? ""} onChange={e => updateForm("name", e.target.value)} /></div>
        <div><Label>Contact Person</Label><Input value={form.contactPerson ?? ""} onChange={e => updateForm("contactPerson", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => updateForm("phone", e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => updateForm("email", e.target.value)} /></div>
      </div>
      <div><Label>Address</Label><Input value={form.address ?? ""} onChange={e => updateForm("address", e.target.value)} /></div>
      {dialog?.type !== "warehouse" && (
        <div><Label>Social / URL</Label><Input value={form.socialUrl ?? ""} onChange={e => updateForm("socialUrl", e.target.value)} /></div>
      )}
      {dialog?.type === "supplier" && (
        <div><Label>Shipping Fee (₱)</Label><Input type="number" value={form.shippingFee ?? 0} onChange={e => updateForm("shippingFee", Number(e.target.value))} /></div>
      )}
      {dialog?.type === "agent" && (
        <div><Label>Fee %</Label><Input type="number" value={form.feePercent ?? 0} onChange={e => updateForm("feePercent", Number(e.target.value))} /></div>
      )}
      {dialog?.type === "retailer" && (
        <div>
          <Label>Payment Method</Label>
          <Select value={form.paymentMethod ?? "Bank Transfer"} onValueChange={v => updateForm("paymentMethod", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="GCash">GCash</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderUserFields = () => (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={form.name ?? ""} onChange={e => updateForm("name", e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => updateForm("email", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Role</Label>
          <Select value={form.role ?? "viewer"} onValueChange={v => updateForm("role", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Label>Active</Label>
          <Switch checked={form.active ?? true} onCheckedChange={v => updateForm("active", v)} />
        </div>
      </div>
    </div>
  );

  const dialogTitle = dialog ? `${dialog.mode === "add" ? "Add" : "Edit"} ${dialog.type.charAt(0).toUpperCase() + dialog.type.slice(1)}` : "";
  const dialogSave = () => {
    if (!dialog) return;
    switch (dialog.type) {
      case "supplier": saveSupplier(); break;
      case "agent": saveAgent(); break;
      case "warehouse": saveWarehouse(); break;
      case "retailer": saveRetailer(); break;
      case "user": saveUser(); break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search partners or users…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="suppliers" className="gap-1"><Truck className="h-3.5 w-3.5" />Suppliers</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1"><Users className="h-3.5 w-3.5" />Agents</TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-1"><Building2 className="h-3.5 w-3.5" />Warehouses</TabsTrigger>
          <TabsTrigger value="retailers" className="gap-1"><Store className="h-3.5 w-3.5" />Retailers</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><UserCog className="h-3.5 w-3.5" />Users</TabsTrigger>
        </TabsList>

        {/* ===== Suppliers ===== */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Suppliers</CardTitle>
              {canEdit && <Button size="sm" onClick={() => openSupplierDialog("add")}><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Shipping Fee</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredSuppliers.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contactPerson}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{formatCurrency(s.shippingFee)}</TableCell>
                      {canEdit && (
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openSupplierDialog("edit", s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" disabled={isSupplierReferenced(s.id)} onClick={() => deleteSupplier(s.id)} title={isSupplierReferenced(s.id) ? "Referenced in orders" : "Delete"}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Agents ===== */}
        <TabsContent value="agents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Agents</CardTitle>
              {canEdit && <Button size="sm" onClick={() => openAgentDialog("add")}><Plus className="h-4 w-4 mr-1" />Add Agent</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Fee %</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredAgents.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.contactPerson}</TableCell>
                      <TableCell>{a.phone}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>{a.feePercent}%</TableCell>
                      {canEdit && (
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openAgentDialog("edit", a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" disabled={isAgentReferenced(a.id)} onClick={() => deleteAgent(a.id)} title={isAgentReferenced(a.id) ? "Referenced in orders" : "Delete"}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Warehouses ===== */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Warehouses</CardTitle>
              {canEdit && <Button size="sm" onClick={() => openWarehouseDialog("add")}><Plus className="h-4 w-4 mr-1" />Add Warehouse</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredWarehouses.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.id}</TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.contactPerson}</TableCell>
                      <TableCell>{w.phone}</TableCell>
                      <TableCell>{w.email}</TableCell>
                      <TableCell>{w.address}</TableCell>
                      {canEdit && (
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openWarehouseDialog("edit", w)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <Button variant="ghost" size="icon" onClick={() => deleteWarehouse(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Retailers ===== */}
        <TabsContent value="retailers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Retailers</CardTitle>
              {canEdit && <Button size="sm" onClick={() => openRetailerDialog("add")}><Plus className="h-4 w-4 mr-1" />Add Retailer</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Payment</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredRetailers.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.contactPerson}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell><Badge variant="outline">{r.paymentMethod}</Badge></TableCell>
                      {canEdit && (
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openRetailerDialog("edit", r)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" disabled={isRetailerReferenced(r.id)} onClick={() => deleteRetailer(r.id)} title={isRetailerReferenced(r.id) ? "Referenced in sales" : "Delete"}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Users ===== */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">User Management</CardTitle>
              {isAdmin && <Button size="sm" onClick={() => openUserDialog("add")}><Plus className="h-4 w-4 mr-1" />Add User</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell><Badge variant={u.active ? "default" : "secondary"}>{u.active ? "Active" : "Inactive"}</Badge></TableCell>
                      {isAdmin && (
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openUserDialog("edit", u)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" disabled={u.id === user?.id} onClick={() => deleteUser(u.id)} title={u.id === user?.id ? "Cannot delete self" : "Delete"}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Shared Dialog ===== */}
      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          {dialog?.type === "user" ? renderUserFields() : renderPartnerFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={dialogSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
