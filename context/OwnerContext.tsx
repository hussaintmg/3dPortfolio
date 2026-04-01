"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

interface Admin {
  id: string;
  username: string;
  email: string;
  displayName: string;
  status: "pending" | "approved" | "suspended";
  createdAt: string;
}

interface OwnerContextType {
  admins: Admin[];
  loading: boolean;
  refreshAdmins: () => Promise<void>;
  approveAdmin: (id: string) => Promise<{ success: boolean; message: string }>;
  rejectAdmin: (id: string) => Promise<{ success: boolean; message: string }>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    if (user?.role !== "owner") return;
    try {
      setLoading(true);
      const res = await axios.get("/api/owner/admin-data");
      if (res.data.success) {
        setAdmins(res.data.admins);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [user]);

  const approveAdmin = async (id: string) => {
    try {
      const res = await axios.post("/api/owner/admin-data/approve", { adminId: id });
      if (res.data.success) {
        // Update local state to show 'approved' instantly
        setAdmins(prev => 
          prev.map(admin => admin.id === id ? { ...admin, status: "approved" as const } : admin)
        );
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Approve failed" };
    }
  };

  const rejectAdmin = async (id: string) => {
    try {
      const res = await axios.post("/api/owner/admin-data/reject", { adminId: id });
      if (res.data.success) {
        setAdmins(prev => 
          prev.map(admin => admin.id === id ? { ...admin, status: "suspended" as const } : admin)
        );
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Reject failed" };
    }
  };

  return (
    <OwnerContext.Provider value={{ admins, loading, refreshAdmins: fetchAdmins, approveAdmin, rejectAdmin }}>
      {children}
    </OwnerContext.Provider>
  );
}

export const useOwner = () => {
  const context = useContext(OwnerContext);
  if (context === undefined) {
    throw new Error("useOwner must be used within an OwnerProvider");
  }
  return context;
};
