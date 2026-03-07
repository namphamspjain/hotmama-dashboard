import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Order } from "@/data/mock-data";

// Helper to convert DB snake_case to frontend camelCase
const mapOrderFromDB = (dbOrder: any): Order => ({
  id: dbOrder.order_id, // we map the human readable ID
  uuid: dbOrder.id,     // keep track of the real postgres UUID
  supplierId: dbOrder.supplier_id,
  agentId: dbOrder.agent_id,
  productType: dbOrder.product_type,
  productName: dbOrder.product_name,
  quantity: dbOrder.quantity,
  importUnitPriceYuan: dbOrder.import_unit_price_rmb,
  exchangeRate: dbOrder.exchange_rate,
  importCostPhp: dbOrder.import_cost_php,
  shippingFee: dbOrder.shipping_fee_php,
  shippingStatus: dbOrder.shipping_status,
  payStatus: dbOrder.pay_status,
  orderDate: dbOrder.order_date,
  receivalDate: dbOrder.receival_date,
  notes: dbOrder.notes,
});

// Helper to convert frontend camelCase back to DB snake_case
const mapOrderToDB = (order: Partial<Order> & { uuid?: string }) => ({
  ...(order.uuid ? { id: order.uuid } : {}),
  order_id: order.id,
  supplier_id: order.supplierId,
  agent_id: order.agentId,
  product_type: order.productType,
  product_name: order.productName,
  quantity: order.quantity,
  import_unit_price_rmb: order.importUnitPriceYuan,
  exchange_rate: order.exchangeRate,
  import_unit_price_php: (order.importUnitPriceYuan || 0) * (order.exchangeRate || 1),
  import_cost_php: order.importCostPhp,
  shipping_fee_php: order.shippingFee,
  shipping_status: order.shippingStatus,
  pay_status: order.payStatus,
  order_date: order.orderDate,
  receival_date: order.receivalDate,
  notes: order.notes,
});

export const useOrders = () => {
  const queryClient = useQueryClient();

  const fetchOrders = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapOrderFromDB);
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createOrder = useMutation({
    mutationFn: async (newOrder: Order) => {
      const { data, error } = await supabase
        .from("orders")
        .insert([mapOrderToDB(newOrder)])
        .select()
        .single();
      if (error) throw error;
      return mapOrderFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ uuid, updates }: { uuid: string; updates: Partial<Order> }) => {
      const { data, error } = await supabase
        .from("orders")
        .update(mapOrderToDB(updates))
        .eq("id", uuid)
        .select()
        .single();
      if (error) throw error;
      return mapOrderFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (uuid: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", uuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    orders: fetchOrders.data || [],
    isLoading: fetchOrders.isLoading,
    isError: fetchOrders.isError,
    error: fetchOrders.error,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};
