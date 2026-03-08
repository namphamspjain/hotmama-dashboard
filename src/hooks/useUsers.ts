import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth, UserRole } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
  avatar?: string;
  organization_id?: string;
}

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchUsers = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        // Note: we let RLS auto-filter by organization
        .order("full_name", { ascending: true });

      if (error) throw error;
      
      // We don't have direct access to auth.users emails through standard SELECT
      // For this MVP, we might display user_profiles without emails visible to everyone
      // or rely on a join if we had created a secure view in postgres.
      // But standard `create-user` edges can push email into user_metadata or we can just show names.
      const mapped: UserProfile[] = (data || []).map((u: any) => ({
        id: u.id,
        email: "hidden@system.local", // Masked until proper RPC getter is mapped if needed
        name: u.full_name || "Unknown User",
        role: u.role as UserRole,
        active: true,
      }));
      
      
      return mapped;
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload: { email: string; password?: string; name: string; role: UserRole; avatar?: string }) => {
      // Use the newly created Postgres RPC function to securely bypass the missing edge function
      const { data, error } = await supabase.rpc("create_new_user", {
        email: payload.email,
        password: payload.password || "hotmama2026!", // Default fallback password if none set
        full_name: payload.name,
        role: payload.role,
      });

      if (error) {
        throw new Error(error.message || "Failed to create user via RPC");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserProfile> }) => {
      // Note: Only updating profile fields (name, role). Changing emails/passwords
      // requires another Edge Function or Admin API call.
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          full_name: updates.name,
          role: updates.role,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      // In a real system, you'd soft delete or use an edge function to delete auth.users
      // For now we assume deleting the profile soft-disables them or you build a delete edge function.
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    users: fetchUsers.data || [],
    isLoading: fetchUsers.isLoading,
    createUser,
    updateUser,
    deleteUser,
  };
}
