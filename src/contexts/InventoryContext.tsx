import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type InventoryItem, type CostItem } from "@/data/mock-data";
import { useInventory as useInventoryHook } from "@/hooks/useInventory";
import { useOrders } from "@/hooks/useOrders";

interface InventoryContextValue {
  items: InventoryItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createInventoryItem: any;
  updateInventoryItem: any;
  deleteInventoryItem: any;
  /** Auto-generated Cost of Loss CostItem entries from damaged/lost inventory */
  costOfLossEntries: CostItem[];
  /** Sum of all Cost of Loss amounts */
  costOfLossTotal: number;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { 
    inventory: items, 
    isLoading, 
    isError,
    error,
    createInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem 
  } = useInventoryHook();
  
  const { orders } = useOrders();

  // Pre-compute order unit-cost map: orderId → (unitPricePhp + importCostPhp) per item
  const orderCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      const unitPricePhp = o.importUnitPriceYuan * o.exchangeRate;
      map[o.id] = Math.round(unitPricePhp + o.importCostPhp);
    });
    return map;
  }, [orders]);

  // Derive Cost of Loss entries from damaged/lost inventory items
  const costOfLossEntries = useMemo<CostItem[]>(() => {
    return items
      .filter((i) => i.status === "damaged" || i.status === "lost")
      .map((i) => {
        const unitCost = orderCostMap[i.orderId] ?? 0;
        return {
          id: `COL-${i.id}`,
          type: "Cost of Loss" as const,
          note: `${i.status === "damaged" ? "Damaged" : "Lost"}: ${i.productName} (${i.id})`,
          amount: unitCost,
          costDate: i.receivalDate,
        };
      })
      .filter((entry) => entry.amount > 0);
  }, [items, orderCostMap]);

  const costOfLossTotal = useMemo(
    () => costOfLossEntries.reduce((s, e) => s + e.amount, 0),
    [costOfLossEntries],
  );

  const value = useMemo<InventoryContextValue>(
    () => ({ 
      items, 
      isLoading,
      isError,
      error,
      createInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      costOfLossEntries, 
      costOfLossTotal 
    }),
    [items, isLoading, isError, error, createInventoryItem, updateInventoryItem, deleteInventoryItem, costOfLossEntries, costOfLossTotal],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
