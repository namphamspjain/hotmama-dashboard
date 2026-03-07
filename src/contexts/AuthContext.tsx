import React, { createContext, useContext, useState, useCallback } from "react";

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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const mockUsers: Record<string, User & { password: string }> = {
  jedzcartas06: { id: "1", name: "Jed Santos", email: "jedzcartas06", role: "editor", password: "jdzelevatech2026!" },
  megbae29: { id: "2", name: "Meg Bae", email: "megbae29", role: "editor", password: "jdzelevatech2026!" },
  maemae30: { id: "3", name: "Mae Mae", email: "maemae30", role: "editor", password: "jdzelevatech2026!" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("jedoms_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 800));
    const found = mockUsers[email];
    if (found && found.password === password) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem("jedoms_user", JSON.stringify(userData));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("jedoms_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
