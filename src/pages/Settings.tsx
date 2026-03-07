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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  suppliers as initSuppliers, agents as initAgents, warehouses as initWarehouses, retailers as initRetailers,
  orders, sales, mockUsers as initUsers,
  type Supplier, type Agent, type Warehouse, type Retailer, type MockUser,
  formatCurrency,
} from "@/data/mock-data";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { Truck, Users, Building2, Store, UserCog, Plus, Pencil, Trash2, Search, ExternalLink, Ship, Eye, EyeOff } from "lucide-react";

import { usePartners } from "@/hooks/usePartners";
import { useUsers, UserProfile } from "@/hooks/useUsers";

// ============ Partner helpers ============

function isSupplierReferenced(id: string) { return orders.some(o => o.supplierId === id); }
function isAgentReferenced(id: string) { return orders.some(o => o.agentId === id); }
function isRetailerReferenced(id: string) { return sales.some(s => s.retailerId === id); }

// ============ Component ============

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "editor";
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(location.state?.activeTab || "suppliers");

  const {
    suppliers: supplierList, createSupplier, updateSupplier, deleteSupplier,
    agents: agentList, createAgent, updateAgent, deleteAgent,
    warehouses: warehouseList, createWarehouse, updateWarehouse, deleteWarehouse,
    retailers: retailerList, createRetailer, updateRetailer, deleteRetailer,
    isLoading: loadingPartners
  } = usePartners();

  const {
    users: userList, createUser, updateUser, deleteUser: removeUser, isLoading: loadingUsers
  } = useUsers();

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Search
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialog, setDialog] = useState<{ type: "supplier" | "agent" | "warehouse" | "retailer" | "user"; mode: "add" | "edit"; data?: any } | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const updateForm = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateForm("avatar", reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ============ Supplier CRUD ============
  const openSupplierDialog = (mode: "add" | "edit", item?: Supplier) => {
    setDialog({ type: "supplier", mode });
    setForm(mode === "edit" && item ? { ...item } : { name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", shippingFee: 0 });
  };
  const saveSupplier = async () => {
    if (!dialog) return;
    const { id, ...data } = form as Supplier;
    if (dialog.mode === "add") await createSupplier.mutateAsync(data);
    else await updateSupplier.mutateAsync({ id, updates: data });
    setDialog(null);
  };
  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplier.mutateAsync(id);
  };

  // ============ Agent CRUD ============
  const openAgentDialog = (mode: "add" | "edit", item?: Agent) => {
    setDialog({ type: "agent", mode });
    setForm(mode === "edit" && item ? { ...item } : { name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", feePercent: 0 });
  };
  const saveAgent = async () => {
    if (!dialog) return;
    const { id, ...data } = form as Agent;
    if (dialog.mode === "add") await createAgent.mutateAsync(data);
    else await updateAgent.mutateAsync({ id, updates: data });
    setDialog(null);
  };
  const handleDeleteAgent = async (id: string) => {
    await deleteAgent.mutateAsync(id);
  };

  // ============ Warehouse CRUD ============
  const openWarehouseDialog = (mode: "add" | "edit", item?: Warehouse) => {
    setDialog({ type: "warehouse", mode });
    setForm(mode === "edit" && item ? { ...item } : { name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "" });
  };
  const saveWarehouse = async () => {
    if (!dialog) return;
    const { id, ...data } = form as Warehouse;
    if (dialog.mode === "add") await createWarehouse.mutateAsync(data);
    else await updateWarehouse.mutateAsync({ id, updates: data });
    setDialog(null);
  };
  const handleDeleteWarehouse = async (id: string) => {
    await deleteWarehouse.mutateAsync(id);
  };

  // ============ Retailer CRUD ============
  const openRetailerDialog = (mode: "add" | "edit", item?: Retailer) => {
    setDialog({ type: "retailer", mode });
    setForm(mode === "edit" && item ? { ...item } : { name: "", contactPerson: "", phone: "", email: "", address: "", socialUrl: "", paymentMethod: "Bank Transfer" });
  };
  const saveRetailer = async () => {
    if (!dialog) return;
    const { id, ...data } = form as Retailer;
    if (dialog.mode === "add") await createRetailer.mutateAsync(data);
    else await updateRetailer.mutateAsync({ id, updates: data });
    setDialog(null);
  };
  const handleDeleteRetailer = async (id: string) => {
    await deleteRetailer.mutateAsync(id);
  };

  // ============ User CRUD (admin only) ============
  const openUserDialog = (mode: "add" | "edit", item?: UserProfile) => {
    setDialog({ type: "user", mode });
    setForm(
      mode === "edit" && item
        ? { ...item }
        : { email: "", password: "", name: "", role: "viewer" as UserRole, active: true },
    );
  };
  const saveUser = async () => {
    if (!dialog) return;
    try {
      if (dialog.mode === "add") {
        await createUser.mutateAsync({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
        })
      } else {
        await updateUser.mutateAsync({
          id: form.id,
          updates: { name: form.name, role: form.role },
        })
      }
      
      if (user && form.id === String(user.id)) {
        updateProfile({ name: form.name, avatar: form.avatar });
      }
      setDialog(null);
    } catch (err: any) {
      alert(err.message || 'Error saving user');
    }
  };
  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to remove this user?")) {
      await removeUser.mutateAsync(id);
    }
  };

  // ============ Filtering ============
  const q = search.toLowerCase();
  const filteredSuppliers = supplierList.filter(s => !q || s.name.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q));
  const filteredAgents = agentList.filter(a => !q || a.name.toLowerCase().includes(q) || a.contactPerson.toLowerCase().includes(q));
  const filteredWarehouses = warehouseList.filter(w => !q || w.name.toLowerCase().includes(q) || w.contactPerson.toLowerCase().includes(q));
  const filteredRetailers = retailerList.filter(r => !q || r.name.toLowerCase().includes(q) || r.contactPerson.toLowerCase().includes(q));
  const filteredUsers = userList.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

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
      <div><Label>Social / URL</Label><Input value={form.socialUrl ?? ""} onChange={e => updateForm("socialUrl", e.target.value)} /></div>
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
      <div className="flex flex-col items-center gap-2 mb-2">
        <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 bg-muted overflow-hidden hover:bg-muted/80 transition-colors">
          {form.avatar ? (
            <>
              <img src={form.avatar} alt="Avatar preview" className="h-full w-full object-cover" />
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  updateForm("avatar", null);
                }}
              >
                <Trash2 className="h-5 w-5 text-white" />
              </div>
            </>
          ) : (
            <Plus className="h-6 w-6 text-muted-foreground" />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>
        <span className="text-xs text-muted-foreground">Upload Photo</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={form.name ?? ""} onChange={e => updateForm("name", e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => updateForm("email", e.target.value)} /></div>
      </div>
      <div>
        <Label>Password</Label>
        <Input
          type="password"
          value={form.password ?? ""}
          onChange={e => updateForm("password", e.target.value)}
          placeholder="Set or update password"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Role</Label>
          <Select value={form.role ?? "viewer"} onValueChange={v => updateForm("role", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
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

  const dialogTypeLabel: Record<"supplier" | "agent" | "warehouse" | "retailer" | "user", string> = {
    supplier: "Supplier",
    agent: "Agent",
    warehouse: "Shipper",
    retailer: "Retailer",
    user: "User",
  };
  const dialogTitle = dialog
    ? `${dialog.mode === "add" ? "Add" : "Edit"} ${dialogTypeLabel[dialog.type]}`
    : "";
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="suppliers" className="gap-1"><Truck className="h-3.5 w-3.5" />Suppliers</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1"><Users className="h-3.5 w-3.5" />Agents</TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-1"><Ship className="h-3.5 w-3.5" />Shippers</TabsTrigger>
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
                  <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead><TableHead>Social</TableHead><TableHead>Shipping Fee</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredSuppliers.map(s => (
                    <TableRow key={s.id} className={canEdit ? "group" : undefined}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contactPerson}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{s.address}</TableCell>
                      <TableCell>
                        {s.socialUrl ? (
                          <a
                            href={s.socialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                            aria-label="Open supplier social link"
                            title="Open social link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">Social</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(s.shippingFee)}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right align-middle">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                  onClick={() => openSupplierDialog("edit", s)}
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
                                  onClick={() => handleDeleteSupplier(s.id)}
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
                  <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead><TableHead>Social</TableHead><TableHead>Fee %</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredAgents.map(a => (
                    <TableRow key={a.id} className={canEdit ? "group" : undefined}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.contactPerson}</TableCell>
                      <TableCell>{a.phone}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{a.address}</TableCell>
                      <TableCell>
                        {a.socialUrl ? (
                          <a
                            href={a.socialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                            aria-label="Open agent social link"
                            title="Open social link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">Social</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{a.feePercent}%</TableCell>
                      {canEdit && (
                        <TableCell className="text-right align-middle">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                  onClick={() => openAgentDialog("edit", a)}
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
                                  onClick={() => handleDeleteAgent(a.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Shippers (Warehouses) ===== */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Shippers</CardTitle>
              {canEdit && <Button size="sm" onClick={() => openWarehouseDialog("add")}><Plus className="h-4 w-4 mr-1" />Add Shipper</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead><TableHead>Social</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredWarehouses.map(w => (
                    <TableRow key={w.id} className={canEdit ? "group" : undefined}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.contactPerson}</TableCell>
                      <TableCell>{w.phone}</TableCell>
                      <TableCell>{w.email}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{w.address}</TableCell>
                      <TableCell>
                        {w.socialUrl ? (
                          <a
                            href={w.socialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                            aria-label="Open warehouse social link"
                            title="Open social link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">Social</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right align-middle">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                  onClick={() => openWarehouseDialog("edit", w)}
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
                                  onClick={() => handleDeleteWarehouse(w.id)}
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
                  <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead><TableHead>Social</TableHead><TableHead>Payment</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredRetailers.map(r => (
                    <TableRow key={r.id} className={canEdit ? "group" : undefined}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.contactPerson}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{r.address}</TableCell>
                      <TableCell>
                        {r.socialUrl ? (
                          <a
                            href={r.socialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                            aria-label="Open retailer social link"
                            title="Open social link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">Social</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.paymentMethod}</Badge></TableCell>
                      {canEdit && (
                        <TableCell className="text-right align-middle">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                  onClick={() => openRetailerDialog("edit", r)}
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
                                  onClick={() => handleDeleteRetailer(r.id)}
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
                  <TableHead className="w-16">Photo</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.map(u => {
                    const isVisible = visiblePasswords[u.id];
                    return (
                      <TableRow key={u.id} className={isAdmin ? "group" : undefined}>
                        <TableCell>
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">{u.name.charAt(0)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant={u.active ? "default" : "secondary"}>{u.active ? "Active" : "Inactive"}</Badge></TableCell>
                        {isAdmin && (
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                    onClick={() => openUserDialog("edit", u)}
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
                                    onClick={() => handleDeleteUser(u.id)}
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
                    );
                  })}
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
