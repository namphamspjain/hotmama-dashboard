import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { payments, inventory, formatCurrency } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, CreditCard, Package } from "lucide-react";

const overduePayments = payments.filter((p) => p.status === "overdue");
const damagedItems = inventory.filter((i) => i.status === "damaged");
const lostItems = inventory.filter((i) => i.status === "lost");
const totalAlerts = overduePayments.length + damagedItems.length + lostItems.length;

export function NotificationBell() {
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {totalAlerts > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {totalAlerts}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">{totalAlerts} alert{totalAlerts !== 1 ? "s" : ""} requiring attention</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {/* Overdue payments */}
          {overduePayments.length > 0 && (
            <div className="border-b">
              <button
                onClick={() => navigate("/payments")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Overdue Payments ({overduePayments.length})</p>
                  {overduePayments.map((p) => (
                    <p key={p.id} className="text-xs text-muted-foreground truncate">
                      {p.partnerName} — {formatCurrency(p.amount)} (due {p.dueDate})
                    </p>
                  ))}
                </div>
              </button>
            </div>
          )}

          {/* Damaged inventory */}
          {damagedItems.length > 0 && (
            <div className="border-b">
              <button
                onClick={() => navigate("/inventory")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Damaged Items ({damagedItems.length})</p>
                  {damagedItems.map((i) => (
                    <p key={i.id} className="text-xs text-muted-foreground truncate">
                      {i.productName} ({i.id})
                    </p>
                  ))}
                </div>
              </button>
            </div>
          )}

          {/* Lost inventory */}
          {lostItems.length > 0 && (
            <div>
              <button
                onClick={() => navigate("/inventory")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Lost Items ({lostItems.length})</p>
                  {lostItems.map((i) => (
                    <p key={i.id} className="text-xs text-muted-foreground truncate">
                      {i.productName} ({i.id})
                    </p>
                  ))}
                </div>
              </button>
            </div>
          )}

          {totalAlerts === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">All clear — no alerts 🎉</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
