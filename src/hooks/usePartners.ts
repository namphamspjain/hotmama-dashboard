import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Supplier, Agent, Warehouse, Retailer } from "@/data/mock-data";

export function usePartners() {
  const queryClient = useQueryClient();

  // --- Suppliers
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        socialUrl: s.social_channel_url || "",
        shippingFee: Number(s.shipping_fee_rmb || 0),
      }));
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (supplier: Omit<Supplier, "id">) => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: supplier.name,
          contact_person: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          social_channel_url: supplier.socialUrl,
          shipping_fee_rmb: supplier.shippingFee,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Supplier> }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          name: updates.name,
          contact_person: updates.contactPerson,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
          social_channel_url: updates.socialUrl,
          shipping_fee_rmb: updates.shippingFee,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  // --- Agents
  const { data: agents = [], isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        socialUrl: s.social_channel_url || "",
        feePercent: Number(s.agent_fee_percent || 0),
      }));
    },
  });

  const createAgent = useMutation({
    mutationFn: async (agent: Omit<Agent, "id">) => {
      const { data, error } = await supabase
        .from("agents")
        .insert({
          name: agent.name,
          contact_person: agent.contactPerson,
          phone: agent.phone,
          email: agent.email,
          address: agent.address,
          social_channel_url: agent.socialUrl,
          agent_fee_percent: agent.feePercent,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Agent> }) => {
      const { data, error } = await supabase
        .from("agents")
        .update({
          name: updates.name,
          contact_person: updates.contactPerson,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
          social_channel_url: updates.socialUrl,
          agent_fee_percent: updates.feePercent,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  // --- Warehouses
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        socialUrl: "",
      })) as Warehouse[]; // Forcing cast since SocialURL isn't in Warehouse schema
    },
  });

  const createWarehouse = useMutation({
    mutationFn: async (wh: Omit<Warehouse, "id">) => {
      const { data, error } = await supabase
        .from("warehouses")
        .insert({
          name: wh.name,
          contact_person: wh.contactPerson,
          phone: wh.phone,
          email: wh.email,
          address: wh.address,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const updateWarehouse = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Warehouse> }) => {
      const { data, error } = await supabase
        .from("warehouses")
        .update({
          name: updates.name,
          contact_person: updates.contactPerson,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warehouses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  // --- Retailers
  const { data: retailers = [], isLoading: loadingRetailers } = useQuery<Retailer[]>({
    queryKey: ["retailers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailers")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        socialUrl: s.social_channel_url || "",
        paymentMethod: s.preferred_payment_method || "Bank Transfer",
      }));
    },
  });

  const createRetailer = useMutation({
    mutationFn: async (retailer: Omit<Retailer, "id">) => {
      const { data, error } = await supabase
        .from("retailers")
        .insert({
          name: retailer.name,
          contact_person: retailer.contactPerson,
          phone: retailer.phone,
          email: retailer.email,
          address: retailer.address,
          social_channel_url: retailer.socialUrl,
          preferred_payment_method: retailer.paymentMethod,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retailers"] }),
  });

  const updateRetailer = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Retailer> }) => {
      const { data, error } = await supabase
        .from("retailers")
        .update({
          name: updates.name,
          contact_person: updates.contactPerson,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
          social_channel_url: updates.socialUrl,
          preferred_payment_method: updates.paymentMethod,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retailers"] }),
  });

  const deleteRetailer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("retailers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retailers"] }),
  });

  return {
    suppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    loadingSuppliers,

    agents,
    createAgent,
    updateAgent,
    deleteAgent,
    loadingAgents,

    warehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    loadingWarehouses,

    retailers,
    createRetailer,
    updateRetailer,
    deleteRetailer,
    loadingRetailers,

    isLoading: loadingSuppliers || loadingAgents || loadingWarehouses || loadingRetailers,
  };
}
