import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string; // used as username in UI
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch role and details from user_profiles table
  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role, full_name")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        console.warn("Could not fetch user profile, defaulting to viewer", error);
        return {
          id: userId,
          email,
          name: email.split("@")[0],
          role: "viewer" as UserRole,
        };
      }

      return {
        id: userId,
        email,
        name: profile.full_name || email.split("@")[0],
        role: profile.role as UserRole,
      };
    } catch (err) {
      console.error("Exception fetching profile:", err);
      return {
        id: userId,
        email,
        name: email.split("@")[0],
        role: "viewer" as UserRole,
      };
    }
  };

  useEffect(() => {
    // Failsafe timer: force stop loading after 3 seconds no matter what
    const failsafeTimer = setTimeout(() => {
      console.warn("AuthContext session check timed out. Forcing unlock.");
      setLoading(false);
    }, 3000);

    // 1. Check active session on mount
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          const u = await fetchUserProfile(session.user.id, session.user.email || "");
          setUser(u);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        clearTimeout(failsafeTimer);
        setLoading(false);
      }
    };
    initSession();

    // 2. Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const u = await fetchUserProfile(session.user.id, session.user.email || "");
        setUser(u);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // 1. HARDCODED FALLBACK (Emergency Admin Access)
    // Check this FIRST so we don't wait 8 seconds for a timeout!
    if (email === "jhedzcartas@gmail.com" && password === "jdzelevatech2026!") {
      console.log("Using hardcoded emergency fallback for admin (Fast path).");
      const fallbackAdmin: User = {
        id: "fallback-admin-999",
        email: "jhedzcartas@gmail.com",
        name: "Jed Santos (Fallback)",
        role: "admin",
      };
      setUser(fallbackAdmin);
      return true;
    }

    try {
      // 2. Race against an 8-second timeout for Supabase Auth
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<{ error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error("Sign in request timed out. Check network or keys.")), 8000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (!error && data?.session?.user) {
        return true;
      }
      
      console.warn("Supabase login failed or timed out:", error?.message || error);
    } catch (err: any) {
      console.warn("Supabase login exception:", err.message || err);
    }

    // 3. If everything fails, report invalid login
    return false;
  }, []);

  const logout = useCallback(async () => {
    // If it's the fallback user, just clear local state
    if (user?.id === "fallback-admin-999") {
      setUser(null);
      window.location.href = "/login";
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [user]);

  const updateProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
