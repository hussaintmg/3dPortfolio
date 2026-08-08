"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useReadymadeSolutions, ReadymadeSolution } from "@/context/ReadymadeSolutionsContext";
import SolutionForm from "@/Components/dashboard/readymade-solutions/SolutionForm";
import SolutionList from "@/Components/dashboard/readymade-solutions/SolutionList";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { SkeletonCard } from "@/Components/ui/Skeleton";

function ReadymadeSolutionsDashboard() {
  const { solutions, loading, createSolution, updateSolution, deleteSolution } = useReadymadeSolutions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<ReadymadeSolution | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingSolution(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (solution: ReadymadeSolution) => {
    setEditingSolution(solution);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (editingSolution) {
        await updateSolution(editingSolution._id, data);
      } else {
        await createSolution(data);
      }
      setIsFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingId) {
      setIsSubmitting(true);
      await deleteSolution(deletingId);
      setDeletingId(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-8 space-y-10 overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[150px] -z-10 rounded-full animate-pulse" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 blur-[200px] -z-10 rounded-full" />

      {/* Hero Header */}
      <section className="relative flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-2 animate-in fade-in slide-in-from-left-5 duration-700">
             <Sparkles size={12} /> Solution Repositories
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-5 duration-1000">
            Readymade <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-400">Solutions</span>
          </h1>
          <p className="text-gray-500 text-sm lg:text-base font-medium max-w-xl leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
            Manage your high-fidelity digital solution artifacts and architectural metadata.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="group relative flex items-center gap-3 pl-6 pr-5 py-3.5 bg-white text-black rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all active:scale-95 shadow-xl shadow-white/5 cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-linear-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity" />
          New Solution
          <div className="p-2 bg-black text-white rounded-lg transition-transform group-hover:translate-x-1">
            <Plus size={16} />
          </div>
        </button>
      </section>

      {/* Main Content Area */}
      <section className="relative min-h-[600px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <SolutionList 
             solutions={solutions} 
             onEdit={handleOpenEdit} 
             onDelete={setDeletingId} 
             isLoading={isSubmitting} 
          />
        )}
      </section>

      {/* Forms & Modals */}
      {isFormOpen && (
        <SolutionForm 
          initialData={editingSolution}
          onSubmit={handleFormSubmit}
          onClose={() => setIsFormOpen(false)}
          isLoading={isSubmitting}
        />
      )}

      <ConfirmationModal 
        isOpen={!!deletingId}
        title="DANGER: DESTRUCTIVE ACTION"
        message="You are about to irreversibly decommission this solution artifact from the master repository. All associated visual assets and metadata will be purged. This action cannot be undone."
        confirmText="DECOMMISSION ARTIFACT"
        cancelText="ABORT MISSION"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingId(null)}
        type="danger"
      />
    </div>
  );
}

export default function ReadymadeSolutionsPage() {
  return (
      <ReadymadeSolutionsDashboard />
  );
}
