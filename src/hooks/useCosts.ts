import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type CostItem, type CostType } from "@/data/mock-data";

// Helper to convert DB snake_case to frontend camelCase
const mapCostFromDB = (dbCost: any): CostItem => ({
  id: dbCost.id,
  type: dbCost.type as CostType,
  note: dbCost.note || "",
  amount: Number(dbCost.amount),
  costDate: dbCost.cost_date,
  receipt: dbCost.receipt || undefined,
});

// Helper to convert frontend camelCase back to DB snake_case
const mapCostToDB = (cost: Partial<CostItem>) => ({
  ...(cost.id ? { id: cost.id } : {}),
  type: cost.type,
  note: cost.note,
  amount: cost.amount,
  cost_date: cost.costDate,
  receipt: cost.receipt,
});

export const useCosts = () => {
  const queryClient = useQueryClient();

  const fetchCosts = useQuery({
    queryKey: ["costs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("costs")
          .select("*")
          .order("cost_date", { ascending: false });

        if (error) throw error;
        return (data || []).map(mapCostFromDB);
      } catch (err) {
        // Fallback to empty array or mock data
        console.warn("Failed to fetch costs from Supabase, returning empty list:", err);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createCost = useMutation({
    mutationFn: async (newCost: CostItem) => {
      try {
        const { data, error } = await supabase
          .from("costs")
          .insert([mapCostToDB(newCost)])
          .select()
          .single();
        if (error) throw error;
        return mapCostFromDB(data);
      } catch (err) {
        console.warn("Failed to create cost:", err);
        return newCost;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CostItem> }) => {
      try {
        const { data, error } = await supabase
          .from("costs")
          .update(mapCostToDB(updates))
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return mapCostFromDB(data);
      } catch (err) {
        console.warn("Failed to update cost:", err);
        return updates as CostItem;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("costs")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.warn("Failed to delete cost:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  return {
    costs: fetchCosts.data || [],
    isLoading: fetchCosts.isLoading,
    isError: fetchCosts.isError,
    error: fetchCosts.error,
    createCost,
    updateCost,
    deleteCost,
  };
};
