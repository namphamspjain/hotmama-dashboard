import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InventoryItem, inventory as mockInventory, orders } from "@/data/mock-data";

const mapInventoryFromDB = (dbItem: any): InventoryItem => ({
  id: dbItem.product_id, // map custom business id to 'id'
  uuid: dbItem.id,       // map postgres uuid to 'uuid'
  orderId: dbItem.orders?.order_id || null, // foreign key relation
  receivalDate: dbItem.receival_date,
  productType: dbItem.product_type,
  productName: dbItem.product_name,
  status: dbItem.inventory_status,
  notes: dbItem.notes,
});

const mapInventoryToDB = (item: Partial<InventoryItem> & { uuid?: string }) => {
  const result: any = {
    product_id: item.id,
    receival_date: item.receivalDate,
    product_type: item.productType,
    product_name: item.productName,
    inventory_status: item.status,
    notes: item.notes,
  };
  
  if (item.uuid) {
    result.id = item.uuid;
  }
  
  return result;
};

export const useInventory = () => {
  const queryClient = useQueryClient();

  const fetchInventory = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        // Need to join the orders table to get the order_id string
        const { data, error } = await supabase
          .from("inventory")
          .select(`
            *,
            orders (
              order_id
            )
          `)
          .order("receival_date", { ascending: false });

        if (error) throw error;
        return (data || []).map(mapInventoryFromDB);
      } catch (err) {
        // Fallback to mock data
        console.warn("Failed to fetch from Supabase, using mock inventory data:", err);
        return mockInventory;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createInventoryItem = useMutation({
    mutationFn: async (newItem: InventoryItem) => {
      try {
        // First, lookup the real order UUID from the string order_id
        let orderUuid = null;
        if (newItem.orderId) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("id")
            .eq("order_id", newItem.orderId)
            .single();
          if (orderData) {
            orderUuid = orderData.id;
          }
        }

        const { data, error } = await supabase
          .from("inventory")
          .insert([{ ...mapInventoryToDB(newItem), order_id: orderUuid }])
          .select()
          .single();
        if (error) throw error;
        return mapInventoryFromDB(data);
      } catch (err) {
        console.warn("Failed to create inventory item:", err);
        // Return the item as-is for mock data compatibility
        return newItem;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const updateInventoryItem = useMutation({
    mutationFn: async ({ uuid, updates }: { uuid: string; updates: Partial<InventoryItem> }) => {
      try {
        // First, lookup the real order UUID if orderId was updated
        let orderUuid = undefined;
        if (updates.orderId !== undefined) {
          if (updates.orderId === null) {
            orderUuid = null;
          } else {
            const { data: orderData } = await supabase
              .from("orders")
              .select("id")
              .eq("order_id", updates.orderId)
              .single();
            if (orderData) {
              orderUuid = orderData.id;
            }
          }
        }

        const dbUpdates = mapInventoryToDB(updates);
        if (orderUuid !== undefined) {
          dbUpdates.order_id = orderUuid;
        }

        const { data, error } = await supabase
          .from("inventory")
          .update(dbUpdates)
          .eq("id", uuid)
          .select()
          .single();
        if (error) throw error;
        return mapInventoryFromDB(data);
      } catch (err) {
        console.warn("Failed to update inventory item:", err);
        return updates as InventoryItem;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const deleteInventoryItem = useMutation({
    mutationFn: async (uuid: string) => {
      try {
        const { error } = await supabase
          .from("inventory")
          .delete()
          .eq("id", uuid);
        if (error) throw error;
      } catch (err) {
        console.warn("Failed to delete inventory item:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  return {
    inventory: fetchInventory.data || [],
    isLoading: fetchInventory.isLoading,
    isError: fetchInventory.isError,
    error: fetchInventory.error,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
};
