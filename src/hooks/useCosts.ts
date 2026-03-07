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
      const { data, error } = await supabase
        .from("costs")
        .select("*")
        .order("cost_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapCostFromDB);
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createCost = useMutation({
    mutationFn: async (newCost: CostItem) => {
      const { data, error } = await supabase
        .from("costs")
        .insert([mapCostToDB(newCost)])
        .select()
        .single();
      if (error) throw error;
      return mapCostFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CostItem> }) => {
      const { data, error } = await supabase
        .from("costs")
        .update(mapCostToDB(updates))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapCostFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("costs")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
