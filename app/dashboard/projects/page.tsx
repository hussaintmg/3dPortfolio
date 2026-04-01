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

interface ProjectMedia {
  url: string;
  type: "image" | "video";
}

interface Project {
  _id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink: string;
  githubLink: string;
  media: ProjectMedia[];
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
    media: [] as ProjectMedia[],
  });

  const [techInput, setTechInput] = useState("");

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

  const handleMediaUpload = () => {
    const url = prompt("Enter Image/Video URL for Cloudinary Simulation:");
    if (url) {
      const type = url.includes("mp4") ? "video" : "image";
      setFormData({
        ...formData,
        media: [...formData.media, { url, type } as ProjectMedia],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await axios.put(`/api/projects/${editingProject._id}`, formData);
      } else {
        await axios.post("/api/projects", formData);
      }
      setIsModalOpen(false);
      fetchProjects();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      technologies: [],
      liveLink: "",
      githubLink: "",
      media: [],
    });
    setEditingProject(null);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setFormData({
      title: p.title,
      description: p.description,
      technologies: [...p.technologies],
      liveLink: p.liveLink,
      githubLink: p.githubLink,
      media: [...p.media],
    });
    setIsModalOpen(true);
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
      <div className="flex h-[80vh] items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#6366F1]" size={48} />
      </div>
    );

  return (
    <div ref={containerRef} className="min-h-screen p-6 sm:p-10 selection:bg-[#6366F1]/30">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 dash-item">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#111827] flex items-center justify-center text-[#6366F1] border border-white/10 shadow-sm">
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
        <div className="hidden lg:block overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-xl dash-item">
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
                        {p.media[0]?.type === "image" ? (
                          <img
                            src={p.media[0].url}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6366F1]">
                            <VideoIcon size={24} />
                          </div>
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
              className="rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-xl dash-item"
            >
              <div className="aspect-video mb-6 rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A] relative">
                {p.media[0]?.type === "image" ? (
                  <img
                    src={p.media[0].url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full text-[#6366F1] flex items-center justify-center">
                    <VideoIcon size={32} />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                    {p.liveLink && <div className="size-8 rounded-lg bg-[#111827]/80 backdrop-blur-md shadow-md flex items-center justify-center text-white border border-white/10"><ExternalLink size={14} /></div>}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#0A0A0A]/80 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />
          <div
            className="relative w-full max-w-4xl bg-[#111827] rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl my-auto"
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

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3.5 outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all font-medium text-sm text-white placeholder:text-gray-600"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g. Next-Gen Financial Engine"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Tech Stack (Enter)
                    </label>
                    <div className="relative">
                        <input
                          type="text"
                          className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl pr-10 pl-4 py-3.5 outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all font-medium text-sm text-white placeholder:text-gray-600"
                          value={techInput}
                          onChange={(e) => setTechInput(e.target.value)}
                          onKeyDown={addTech}
                          placeholder="React, Graphql..."
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <Code size={18} />
                        </div>
                    </div>
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                        Live URL
                      </label>
                      <div className="relative">
                          <input
                          type="url"
                          className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl pr-10 pl-4 py-3.5 text-sm font-medium focus:border-[#6366F1] outline-none transition-all text-white placeholder:text-gray-600"
                          value={formData.liveLink}
                          onChange={(e) =>
                              setFormData({
                              ...formData,
                              liveLink: e.target.value,
                              })
                          }
                          placeholder="https://live.deploy"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                              <Monitor size={16} />
                          </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                        Source
                      </label>
                      <div className="relative">
                          <input
                          type="url"
                          className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl pr-10 pl-4 py-3.5 text-sm font-medium focus:border-[#6366F1] outline-none transition-all text-white placeholder:text-gray-600"
                          value={formData.githubLink}
                          onChange={(e) =>
                              setFormData({
                              ...formData,
                              githubLink: e.target.value,
                              })
                          }
                          placeholder="https://github.com/src"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                              <Github size={16} />
                          </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 h-full flex flex-col">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Documentation
                    </label>
                    <textarea
                      required
                      className="w-full flex-1 min-h-[150px] bg-[#0A0A0A] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-[#6366F1] transition-all resize-none font-medium text-sm text-white placeholder:text-gray-600"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Comprehensive project details..."
                    />
                  </div>
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
                  <button
                    type="button"
                    onClick={handleMediaUpload}
                    className="rounded-xl bg-white/5 text-white border border-white/10 px-6 py-2.5 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <ImageIcon size={14} />
                    Inject Asset
                  </button>
                </div>
                
                {formData.media.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {formData.media.map((m, idx) => (
                      <div
                          key={idx}
                          className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0A]"
                      >
                          {m.type === "video" ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 group-hover:text-[#6366F1] transition-colors">
                              <VideoIcon size={32} />
                          </div>
                          ) : (
                          <img
                              src={m.url}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          )}
                          <button
                          type="button"
                          onClick={() =>
                              setFormData({
                              ...formData,
                              media: formData.media.filter((_, i) => i !== idx),
                              })
                          }
                          className="absolute top-2 right-2 size-8 bg-black/60 backdrop-blur-md text-red-400 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                          >
                          <Trash size={14} />
                          </button>
                      </div>
                      ))}
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
                  className="w-full bg-[#6366F1] py-4 rounded-xl font-bold text-sm text-white hover:bg-indigo-600 transition-all shadow-lg shadow-[#6366F1]/20 active:scale-[0.98]"
                  >
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
