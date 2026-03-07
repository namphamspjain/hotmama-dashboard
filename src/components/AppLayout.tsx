import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getPendingPaymentsCount } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  CreditCard,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Orders", path: "/orders", icon: ShoppingCart },
  { title: "Inventory", path: "/inventory", icon: Package },
  { title: "Sales", path: "/sales", icon: TrendingUp },
  { title: "Cost", path: "/costs", icon: DollarSign },
  { title: "Payments", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingCount = getPendingPaymentsCount();

  const currentTitle = navItems.find((n) => n.path === location.pathname)?.title ?? "Hotmama OMS";
  const initials = user?.name
    ? user.name
        .split(" ")
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("")
    : "";

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
          {!collapsed && <span className="text-lg font-bold text-sidebar-primary">Hotmama OMS</span>}
        </div>

        {/* Nav + user profile */}
        <div className="flex flex-1 flex-col">
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                  {item.title === "Payments" && pendingCount > 0 && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "ml-auto text-xs",
                        collapsed &&
                          "absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]",
                      )}
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User profile in sidebar footer */}
          {user && (
            <div className="border-t border-sidebar-border px-3 py-3">
              <div
                className={cn(
                  "flex items-center gap-3",
                  collapsed && "flex-col gap-1 justify-center",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full bg-sky-500 font-semibold text-black overflow-hidden shrink-0",
                    collapsed ? "h-9 w-9 text-xs" : "h-11 w-11 text-base",
                  )}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    initials || "AU"
                  )}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-sidebar-primary">
                      {user.name}
                    </p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Sign out"
                  className="ml-auto text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 text-sm md:text-base">
              <span
                className={cn(
                  "font-medium",
                  location.pathname === "/" ? "text-sidebar-primary" : "text-sidebar-muted",
                )}
              >
                Dashboard
              </span>
              {location.pathname !== "/" && (
                <>
                  <ChevronRight className="h-3 w-3 text-sidebar-muted" />
                  <span className="font-semibold text-sidebar-primary">{currentTitle}</span>
                </>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center pr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-sidebar-muted hover:text-sidebar-primary hover:bg-sidebar-accent/50"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 pt-[4.5rem] md:p-6 md:pt-[4.5rem]">{children}</main>
      </div>
    </div>
  );
}
