"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";

interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "owner";
  status: "pending" | "approved" | "rejected";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const res = await axios.get("/api/auth/me");
      if (res.data.success) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const login = async (formData: any) => {
    try {
      const resp = await axios.post("/api/auth/login", formData);
      if (resp.data.success) {
        await fetchUser();
        return { success: true };
      }
      return { success: false, message: resp.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "Login failed" };
    }
  };

  const register = async (formData: any) => {
    try {
      const resp = await axios.post("/api/auth/register", formData);
      if (resp.data.success) return { success: true };
      return { success: false, message: resp.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "Registration failed" };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const resp = await axios.post("/api/auth/forgot-password", { email });
      if (resp.data.success) return { success: true };
      return { success: false, message: resp.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "Failed to send code" };
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      const resp = await axios.post("/api/auth/verify-token", { email, code });
      if (resp.data.success) return { success: true };
      return { success: false, message: resp.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "Invalid code" };
    }
  };

  const resetPassword = async (data: any) => {
    try {
      const resp = await axios.post("/api/auth/reset-password", data);
      if (resp.data.success) return { success: true };
      return { success: false, message: resp.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "Reset failed" };
    }
  };

  const logout = async () => {
    await axios.post("/api/auth/logout");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, register, forgotPassword, verifyCode, resetPassword, logout, 
      refreshUser: fetchUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
