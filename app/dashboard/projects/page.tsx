"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  X,
  Loader2,
  Trash,
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
  ExternalLink,
  Github,
  Monitor,
  Smartphone,
  Code,
} from "lucide-react";
import { gsap } from "gsap";
import axios from "axios";
import { notify } from "@/lib/notify";
import { Skeleton, SkeletonRow, SkeletonCard } from "@/Components/ui/Skeleton";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";

interface ProjectMedia {
  url: string;
  name?: string;
  size?: number;
  type: string;
  storageKey?: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink: string;
  githubLink: string;
  media: ProjectMedia;//media is an object not array
  createdAt: string;
}

export default function DashboardProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    technologies: [] as string[],
    liveLink: "",
    githubLink: "",
    media: null as ProjectMedia | null,
  });

  const [techInput, setTechInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchProjects = async () => {
    try {
      const resp = await axios.get("/api/projects");
      if (resp.data.success) {
        setProjects(resp.data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!loading && projects.length > 0) {
      let ctx = gsap.context(() => {
        gsap.fromTo(
          ".dash-item",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, containerRef);
      return () => ctx.revert();
    }
  }, [loading, projects]);

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && techInput.trim()) {
      e.preventDefault();
      if (!formData.technologies.includes(techInput.trim())) {
        setFormData({
          ...formData,
          technologies: [...formData.technologies, techInput.trim()],
        });
      }
      setTechInput("");
    }
  };

  const removeTech = (t: string) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter((tech) => tech !== t),
    });
  };

  const handleMediaUpload = (file: File) => {
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      let mediaData = formData.media;

      if (imageFile) {
        // check image size with env variable
        const maxSizeMB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_IN_MB) || 5;
        if (imageFile.size > 1024 * 1024 * maxSizeMB) {
          throw new Error(`Image size must be less than ${maxSizeMB}MB`);
        }
        // Upload to Supabase via server API proxy
        const formDataUpload = new FormData();
        formDataUpload.append("file", imageFile);
        formDataUpload.append("folder", "projects");

        const uploadResResponse = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });
        const uploadRes = await uploadResResponse.json();

        if (uploadRes.success) {
          mediaData = {
            url: uploadRes.publicUrl || "",
            name: imageFile.name,
            size: imageFile.size,
            type: (uploadRes.fileType || "").startsWith("video") ? "video" : "image",
            storageKey: uploadRes.filePath || "",
          };
        } else {
          throw new Error("Image upload failed: " + (uploadRes.error || "Unknown error"));
        }
      }

      if (!mediaData && !editingProject) {
        throw new Error("Please upload a representative image.");
      }

      const finalData = {
        ...formData,
        media: mediaData,
      };

      if (editingProject) {
        await axios.put(`/api/projects/${editingProject._id}`, finalData);
      } else {
        await axios.post("/api/projects", finalData);
      }
      setIsModalOpen(false);
      fetchProjects();
      resetForm();
      notify.success(editingProject ? "Project updated" : "Project created");
    } catch (err: any) {
      notify.error("Save failed", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      technologies: [],
      liveLink: "",
      githubLink: "",
      media: null,
    });
    setImageFile(null);
    setPreviewUrl("");
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setFormData({
      title: p.title,
      description: p.description,
      technologies: [...p.technologies],
      liveLink: p.liveLink,
      githubLink: p.githubLink,
      media: p.media,
    });
    setIsModalOpen(true);
    setPreviewUrl(p.media?.url || "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try {
      await axios.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-14 w-44 rounded-xl" />
          </div>
          <div className="hidden lg:block rounded-3xl border border-white/10 bg-card overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={4} />
            ))}
          </div>
          <div className="lg:hidden grid grid-cols-1 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div ref={containerRef} className="min-h-screen p-4 sm:p-6 md:p-10 selection:bg-[#6366F1]/30">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 dash-item">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-[#6366F1] border border-white/10 shadow-sm">
                  <FolderOpen size={24} />
              </div>
              Portfolio Assets
            </h1>
            <p className="text-gray-400 font-medium text-sm">Manage your high-impact engineering solutions and visual results.</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-[#6366F1] hover:bg-indigo-600 text-white font-bold text-sm py-4 px-8 rounded-xl transition-all shadow-lg shadow-[#6366F1]/20 active:scale-95 flex items-center gap-2"
          >
            <Plus size={18} /> Deploy Asset
          </button>
        </header>

        {/* Dynamic Table/Cards */}
        <div className="hidden lg:block overflow-hidden rounded-3xl border border-white/10 bg-card shadow-xl dash-item">
          <table className="w-full text-left">
            <thead className="bg-[#0A0A0A] border-b border-white/5">
              <tr>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Strategic Asset</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Tech Stack</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Connectivity</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.map((p) => (
                <tr
                  key={p._id}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="size-16 rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-sm relative group-hover:border-[#6366F1]/50 transition-colors shrink-0">
                        {p.media?.type?.startsWith("video") ? (
                          <div className="w-full h-full flex items-center justify-center text-[#6366F1]">
                            <VideoIcon size={24} />
                          </div>
                        ) : (
                          <img
                            src={p.media?.url}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-[#6366F1] transition-colors">{p.title}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                          STAGED: {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2 max-w-[250px]">
                      {p.technologies.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-[#0A0A0A] text-gray-300 border border-white/5 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                      {p.technologies.length > 3 && (
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">
                          +{p.technologies.length - 3} MORE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-4 text-gray-400">
                      {p.liveLink && (
                        <ExternalLink
                          size={18}
                          className="hover:text-[#6366F1] transition-colors cursor-pointer"
                        />
                      )}
                      {p.githubLink && (
                        <Github
                          size={18}
                          className="hover:text-white transition-colors cursor-pointer"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(p)}
                        className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#6366F1] hover:text-white transition-all shadow-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-sm font-medium text-gray-500">
                    No portfolio assets found. Deploy your first asset above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden grid grid-cols-1 gap-6">
          {projects.map((p) => (
            <div
              key={p._id}
              className="rounded-3xl border border-white/10 bg-card p-6 shadow-xl dash-item"
            >
              <div className="aspect-video mb-6 rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A] relative">
                {p.media?.type?.startsWith("video") ? (
                  <div className="w-full h-full text-[#6366F1] flex items-center justify-center">
                    <VideoIcon size={32} />
                  </div>
                ) : (
                  <img
                    src={p.media?.url}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                    {p.liveLink && <div className="size-8 rounded-lg bg-card/80 backdrop-blur-md shadow-md flex items-center justify-center text-white border border-white/10"><ExternalLink size={14} /></div>}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">{p.title}</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                  {p.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] bg-[#0A0A0A] text-gray-400 px-2.5 py-1 rounded-md font-bold border border-white/5 uppercase tracking-wider">{t}</span>
                  ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => openEditModal(p)}
                  className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 text-white py-3.5 font-bold text-xs shadow-sm transition-colors"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="size-12 shrink-0 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#0A0A0A]/80 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />
          <div
            className="relative w-full max-w-4xl bg-card rounded-3xl border border-white/10 p-4 sm:p-6 md:p-10 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-[#6366F1] border border-white/5">
                  {editingProject ? <Edit size={20} /> : <Sparkles size={20} />}
                </div>
                {editingProject ? "Sync Asset" : "Deploy Asset"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} data-lenis-prevent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <FloatingInput
                    label="Project Title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                  <div className="space-y-2">
                    <FloatingInput
                      label="Tech Stack (press Enter to add)"
                      type="text"
                      icon={<Code size={18} />}
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={addTech}
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.technologies.map((t) => (
                        <span
                          key={t}
                          className="bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                          {t}
                          <button type="button" onClick={() => removeTech(t)} className="text-[#6366F1] hover:text-red-400 transition-colors">
                              <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FloatingInput
                      label="Live URL"
                      type="url"
                      icon={<Monitor size={16} />}
                      value={formData.liveLink}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          liveLink: e.target.value,
                        })
                      }
                    />
                    <FloatingInput
                      label="GitHub / Source URL"
                      type="url"
                      icon={<Github size={16} />}
                      value={formData.githubLink}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          githubLink: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <FloatingTextarea
                    label="Project Description"
                    required
                    rows={8}
                    containerClassName="h-full"
                    className="h-full min-h-[190px]"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Media Section */}
              <div className="pt-8 border-t border-white/5">
                  <div className="flex justify-between items-center mb-6">
                  <div className="space-y-1">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Visual Pipeline
                      </h3>
                  </div>
                  <label className="rounded-xl bg-white/5 text-white border border-white/10 px-6 py-2.5 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer">
                    <ImageIcon size={14} />
                    Inject Asset
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0])} />
                  </label>
                </div>
                
                {previewUrl ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0A]">
                          {imageFile?.type.startsWith("video") || formData.media?.type?.startsWith("video") ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 group-hover:text-[#6366F1] transition-colors">
                              <VideoIcon size={32} />
                          </div>
                          ) : (
                          <img
                              src={previewUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          )}
                          <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, media: null });
                            setImageFile(null);
                            setPreviewUrl("");
                          }}
                          className="absolute top-2 right-2 size-8 bg-black/60 backdrop-blur-md text-red-400 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                          >
                          <Trash size={14} />
                          </button>
                      </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#0A0A0A]/50 p-10 text-center">
                      <ImageIcon size={40} className="mx-auto mb-3 text-gray-600" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Media standby.</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                   <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-[#6366F1] disabled:bg-indigo-300 py-4 rounded-xl font-bold text-sm text-white hover:bg-indigo-600 transition-all shadow-lg shadow-[#6366F1]/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                  {isUploading && <Loader2 className="animate-spin" size={18} />}
                  {editingProject
                      ? "Sync Operational Data"
                      : "Dispatch Deployment"}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
