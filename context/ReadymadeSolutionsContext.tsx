"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import axios from "axios";
import { useNotify } from "@/hooks/useNotify";

export interface ReadymadeSolution {
  _id: string;
  title: string;
  technologies: string[];
  colorConfig: {
    type: "solid" | "linear" | "radial" | "conical";
    colors: string[];
    gradientParams?: any;
  };
  media: {
    url: string;
    name?: string;
    size?: number;
    type?: string;
  };
  createdAt: string;
}

interface ReadymadeSolutionsContextType {
  solutions: ReadymadeSolution[];
  loading: boolean;
  fetchSolutions: () => Promise<void>;
  createSolution: (data: any) => Promise<{ success: boolean; message: string }>;
  updateSolution: (
    id: string,
    data: any,
  ) => Promise<{ success: boolean; message: string }>;
  deleteSolution: (
    id: string,
  ) => Promise<{ success: boolean; message: string }>;
}

const ReadymadeSolutionsContext = createContext<
  ReadymadeSolutionsContextType | undefined
>(undefined);

export function ReadymadeSolutionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [solutions, setSolutions] = useState<ReadymadeSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotify();

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/dashboard/readymade-solutions");
      if (res.data.success) {
        setSolutions(res.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch solutions:", error);
      notify.error("Could not load solutions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const createSolution = async (data: any) => {
    try {
      const res = await axios.post("/api/dashboard/readymade-solutions", data, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.data.success) {
        setSolutions(prev => [res.data.data, ...prev]);
        notify.success("Solution created successfully");
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      const msg = error.response?.data?.message || "Creation failed";
      notify.error(msg);
      return { success: false, message: msg };
    }
  };

  const updateSolution = async (id: string, data: any) => {
    try {
      const res = await axios.patch(
        `/api/dashboard/readymade-solutions/${id}`,
        data,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      if (res.data.success) {
        setSolutions((prev) =>
          prev.map((s) => (s._id === id ? res.data.data : s)),
        );
        notify.success("Solution updated successfully");
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      const msg = error.response?.data?.message || "Update failed";
      notify.error(msg);
      return { success: false, message: msg };
    }
  };

  const deleteSolution = async (id: string) => {
    try {
      const res = await axios.delete(
        `/api/dashboard/readymade-solutions/${id}`,
      );
      if (res.data.success) {
        setSolutions((prev) => prev.filter((s) => s._id !== id));
        notify.success("Solution deleted");
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      const msg = error.response?.data?.message || "Delete failed";
      notify.error(msg);
      return { success: false, message: msg };
    }
  };

  return (
    <ReadymadeSolutionsContext.Provider
      value={{
        solutions,
        loading,
        fetchSolutions,
        createSolution,
        updateSolution,
        deleteSolution,
      }}
    >
      {children}
    </ReadymadeSolutionsContext.Provider>
  );
}

export const useReadymadeSolutions = () => {
  const context = useContext(ReadymadeSolutionsContext);
  if (context === undefined) {
    throw new Error(
      "useReadymadeSolutions must be used within a ReadymadeSolutionsProvider",
    );
  }
  return context;
};
