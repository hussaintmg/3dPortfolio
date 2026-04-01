"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(window.innerWidth >= 1280);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex text-[#E5E7EB] min-h-screen selection:bg-[#6366F1]/30 relative">
      {/* Mobile Floating Menu Button */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-6 z-60 p-2.5 bg-card border border-white/10 rounded-xl shadow-lg text-gray-400 hover:text-[#6366F1] active:scale-95 flex items-center justify-center transition-all"
          aria-label="Open Sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Component */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} />

      {/* Main Content Area */}
      <main 
        className={`flex-1 flex flex-col min-h-screen max-w-full transition-all duration-400 ease-[power3.inOut]
          ${!isMobile ? (isOpen ? "ml-[280px]" : "ml-[80px]") : "ml-0"}
        `}
      >
        <div className={`flex-1`}>
          {children}
        </div>
      </main>
    </div>
  );
}
