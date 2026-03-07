import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Payment } from "@/data/mock-data";

const mapPaymentFromDB = (dbPay: any): Payment => ({
  id: dbPay.pay_id, // map custom business id to 'id'
  uuid: dbPay.id,   // map postgres uuid to 'uuid'
  type: dbPay.payment_type,
  partnerName: dbPay.partner_name,
  // the backend table stores polymorphic relation to string ID... mapping that through
  linkedId: dbPay.linked_id, 
  amount: dbPay.amount,
  payDate: dbPay.pay_date,
  status: dbPay.status,
  notes: dbPay.notes,
});

const mapPaymentToDB = (pay: Partial<Payment> & { uuid?: string }) => {
  const result: any = {
    pay_id: pay.id,
    payment_type: pay.type,
    partner_name: pay.partnerName,
    linked_id: pay.linkedId,
    amount: pay.amount,
    pay_date: pay.payDate,
    status: pay.status,
    notes: pay.notes,
  };
  
  if (pay.uuid) {
    result.id = pay.uuid;
  }
  
  return result;
};

export const usePayments = () => {
  const queryClient = useQueryClient();

  const fetchPayments = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("pay_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapPaymentFromDB);
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createPayment = useMutation({
    mutationFn: async (newPay: Payment) => {
      // For payments, "linked_id" is a polymorphic string column holding order_id or sale_id
      // It does NOT map to a real UUID foreign key in Postgres at the moment.
      const { data, error } = await supabase
        .from("payments")
        .insert([mapPaymentToDB(newPay)])
        .select()
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
      const dbUpdates = mapPaymentToDB(updates);

      const { data, error } = await supabase
        .from("payments")
        .update(dbUpdates)
        .eq("id", uuid)
        .select()
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
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", uuid);
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
