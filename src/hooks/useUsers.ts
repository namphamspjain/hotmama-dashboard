import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { appUsers } from "@/data/users";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
  avatar?: string;
  password?: string;
  organization_id?: string;
}

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchUsers = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      // Always use hardcoded users
      return appUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        password: u.password,
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
