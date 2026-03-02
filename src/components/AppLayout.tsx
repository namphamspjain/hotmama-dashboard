import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getOverduePaymentsCount } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp, CreditCard, Settings, LogOut, Sun, Moon, Menu, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Orders", path: "/orders", icon: ShoppingCart },
  { title: "Inventory", path: "/inventory", icon: Package },
  { title: "Sales", path: "/sales", icon: TrendingUp },
  { title: "Payments", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const overdueCount = getOverduePaymentsCount();

  const currentTitle = navItems.find((n) => n.path === location.pathname)?.title ?? "JedOMS";

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Package className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && <span className="text-lg font-bold text-sidebar-primary">JedOMS</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
                {item.title === "Payments" && overdueCount > 0 && (
                  <Badge variant="destructive" className={cn("ml-auto text-xs", collapsed && "absolute left-8 top-0 h-4 w-4 p-0 flex items-center justify-center text-[10px]")}>
                    {overdueCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden border-t border-sidebar-border p-2 lg:block">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="w-full text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("flex flex-1 flex-col transition-all duration-200", collapsed ? "lg:ml-16" : "lg:ml-60")}>
        {/* Header */}
        <header className={cn(
          "fixed top-0 right-0 z-30 flex h-14 items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 transition-all duration-200",
          collapsed ? "lg:left-16" : "lg:left-60",
          "left-0"
        )}>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-sidebar-primary">{currentTitle}</h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden text-right text-sm md:block">
                  <p className="font-medium leading-tight text-sidebar-primary">{user.name}</p>
                  <Badge variant="secondary" className="text-xs capitalize">{user.role}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 pt-[4.5rem] md:p-6 md:pt-[4.5rem]">{children}</main>
      </div>
    </div>
  );
}
