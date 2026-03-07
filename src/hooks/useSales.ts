import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Sale } from "@/data/mock-data";

const mapSaleFromDB = (dbSale: any): Sale => ({
  id: dbSale.sale_id, // map custom business id to 'id'
  uuid: dbSale.id,    // map postgres uuid to 'uuid'
  retailerId: dbSale.retailer_id,
  inventoryId: dbSale.inventory?.product_id || null, // from joined payload
  productType: dbSale.product_type,
  productName: dbSale.product_name,
  quantity: dbSale.quantity,
  sellingPrice: dbSale.selling_unit_price_php,
  wholesalePrice: dbSale.wholesale_price_php,
  deliveryFee: dbSale.delivery_fee_php,
  revenue: dbSale.selling_unit_price_php * dbSale.quantity, // Computed locally
  netProfit: (dbSale.selling_unit_price_php - dbSale.wholesale_price_php) * dbSale.quantity, // Computed locally
  saleDate: dbSale.sale_date,
  warrantyDays: 30, // Mock default since it isn't in DB yet
  deliveryStatus: dbSale.delivery_status,
});

const mapSaleToDB = (sale: Partial<Sale> & { uuid?: string }) => {
  const result: any = {
    sale_id: sale.id,
    retailer_id: sale.retailerId,
    product_type: sale.productType,
    product_name: sale.productName,
    quantity: sale.quantity,
    selling_unit_price_php: sale.sellingPrice,
    wholesale_price_php: sale.wholesalePrice,
    delivery_fee_php: sale.deliveryFee,
    sale_date: sale.saleDate,
    delivery_status: sale.deliveryStatus,
  };
  
  if (sale.uuid) {
    result.id = sale.uuid;
  }
  
  return result;
};

export const useSales = () => {
  const queryClient = useQueryClient();

  const fetchSales = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      // Need to join inventory to get product_id
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          inventory (
            product_id
          )
        `)
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapSaleFromDB);
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createSale = useMutation({
    mutationFn: async (newSale: Sale) => {
      // Lookup the real inventory UUID from the string product_id (inventoryId in mock)
      let invUuid = null;
      if (newSale.inventoryId) {
        const { data: invData } = await supabase
          .from("inventory")
          .select("id")
          .eq("product_id", newSale.inventoryId)
          .single();
        if (invData) {
          invUuid = invData.id;
        }
      }

      const { data, error } = await supabase
        .from("sales")
        .insert([{ ...mapSaleToDB(newSale), inventory_id: invUuid }])
        .select()
        .single();
      if (error) throw error;
      return mapSaleFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ uuid, updates }: { uuid: string; updates: Partial<Sale> }) => {
       // Lookup the real inventory UUID if it was updated
       let invUuid: string | null | undefined = undefined;
       if (updates.inventoryId !== undefined) {
         if (updates.inventoryId === null) {
           invUuid = null;
         } else {
           const { data: invData } = await supabase
             .from("inventory")
             .select("id")
             .eq("product_id", updates.inventoryId)
             .single();
           if (invData) {
             invUuid = invData.id;
           }
         }
       }

      const dbUpdates = mapSaleToDB(updates);
      if (invUuid !== undefined) {
        dbUpdates.inventory_id = invUuid;
      }

      const { data, error } = await supabase
        .from("sales")
        .update(dbUpdates)
        .eq("id", uuid)
        .select()
        .single();
      if (error) throw error;
      return mapSaleFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (uuid: string) => {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", uuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  return {
    sales: fetchSales.data || [],
    isLoading: fetchSales.isLoading,
    isError: fetchSales.isError,
    error: fetchSales.error,
    createSale,
    updateSale,
    deleteSale,
  };
};
