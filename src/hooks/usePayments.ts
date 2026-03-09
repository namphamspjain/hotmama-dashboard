import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Payment, payments as mockPayments } from "@/data/mock-data";

const mapPaymentFromDB = (dbPay: any): Payment => {
  const isAgent = dbPay.payment_type === "agent";
  return {
    id: dbPay.id.substring(0, 8),
    uuid: dbPay.id,
    type: dbPay.payment_type,
    partnerName: isAgent ? dbPay.agents?.name : dbPay.retailers?.name || "Unknown",
    linkedId: isAgent ? dbPay.orders?.order_id : dbPay.sales?.sale_id || "Unknown",
    amount: Number(dbPay.amount_php),
    payDate: dbPay.due_date,
    status: dbPay.pay_status,
    notes: dbPay.notes,
  };
};

export const usePayments = () => {
  const queryClient = useQueryClient();

  const fetchPayments = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select(`
            *,
            orders ( order_id ),
            sales ( sale_id ),
            agents ( name ),
            retailers ( name )
          `)
          .order("due_date", { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPaymentFromDB);
      } catch (err) {
        // Fallback to mock data
        console.warn("Failed to fetch from Supabase, using mock payments data:", err);
        return mockPayments;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createPayment = useMutation({
    mutationFn: async (newPay: Payment) => {
      const isAgent = newPay.type === "agent";
      let orderUuid = null, saleUuid = null, agentUuid = null, retailerUuid = null;

      if (isAgent) {
        if (newPay.linkedId) {
          const { data } = await supabase.from("orders").select("id").eq("order_id", newPay.linkedId).single();
          if (data) orderUuid = data.id;
        }
        if (newPay.partnerName) {
          const { data } = await supabase.from("agents").select("id").eq("name", newPay.partnerName).single();
          if (data) agentUuid = data.id;
        }
      } else {
        if (newPay.linkedId) {
          const { data } = await supabase.from("sales").select("id").eq("sale_id", newPay.linkedId).single();
          if (data) saleUuid = data.id;
        }
        if (newPay.partnerName) {
          const { data } = await supabase.from("retailers").select("id").eq("name", newPay.partnerName).single();
          if (data) retailerUuid = data.id;
        }
      }

      const input: any = {
        payment_type: newPay.type,
        amount_php: newPay.amount,
        pay_status: newPay.status,
        due_date: newPay.payDate,
        notes: newPay.notes,
        order_id: orderUuid,
        sale_id: saleUuid,
        agent_id: agentUuid,
        retailer_id: retailerUuid,
      };

      const { data, error } = await supabase
        .from("payments")
        .insert([input])
        .select(`*, orders(order_id), sales(sale_id), agents(name), retailers(name)`)
        .single();
      if (error) throw error;
      return mapPaymentFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ uuid, updates }: { uuid: string; updates: Partial<Payment> }) => {
      const isAgent = updates.type === "agent";
      let input: any = {};
      
      if (updates.type) input.payment_type = updates.type;
      if (updates.amount !== undefined) input.amount_php = updates.amount;
      if (updates.status) input.pay_status = updates.status;
      if (updates.payDate) input.due_date = updates.payDate;
      if (updates.notes !== undefined) input.notes = updates.notes;

      // Skip lookup of relations on generic update for brevity unless needed.
      // Usually, users just update status or amount for existing payments.

      const { data, error } = await supabase
        .from("payments")
        .update(input)
        .eq("id", uuid)
        .select(`*, orders(order_id), sales(sale_id), agents(name), retailers(name)`)
        .single();
      if (error) throw error;
      return mapPaymentFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (uuid: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", uuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  return {
    payments: fetchPayments.data || [],
    isLoading: fetchPayments.isLoading,
    isError: fetchPayments.isError,
    error: fetchPayments.error,
    createPayment,
    updatePayment,
    deletePayment,
  };
};
