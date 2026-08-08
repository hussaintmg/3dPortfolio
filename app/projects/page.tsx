"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Github,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import EditableText from "@/Components/editable/EditableText";
import PageSections from "@/Components/sections/PageSections";
import { SkeletonCard } from "@/Components/ui/Skeleton";

interface Project {
  _id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink?: string;
  githubLink?: string;
  media?: { url: string; type?: string };
  createdAt?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/projects")
      .then((res) => {
        if (alive && res.data.success) setProjects(res.data.projects || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 pt-36 pb-24 px-4 md:px-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 size-[500px] bg-indigo-500/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 size-[500px] bg-purple-500/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">
            <FolderOpen size={12} />
            <EditableText k="projects.badge">Project Archive</EditableText>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.05]">
            <EditableText k="projects.heading.pre">Work that</EditableText>{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400 italic">
              <EditableText k="projects.heading.highlight">shipped.</EditableText>
            </span>
          </h1>
          <EditableText
            k="projects.subheading"
            as="p"
            className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed block"
          >
            Every project here went from blank file to production. Real
            problems, real users, real engineering.
          </EditableText>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 rounded-4xl border border-dashed border-white/10 bg-white/2 space-y-6"
          >
            <div className="size-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">
                Projects loading soon
              </h3>
              <p className="text-slate-400 font-medium max-w-md mx-auto">
                New work is being prepared for the archive. Check back shortly —
                or start a project of your own.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-500 text-white font-black text-[11px] uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
            >
              Start a Project <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {projects.map((project, i) => (
              <motion.article
                key={project._id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                className="group relative flex flex-col rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_25px_50px_-15px_rgba(99,102,241,0.25)]"
              >
                {/* Media */}
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  {project.media?.url ? (
                    project.media.type?.startsWith("video") ? (
                      <video
                        src={project.media.url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                    ) : (
                      <img
                        src={project.media.url}
                        alt={project.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <FolderOpen size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-[#0b0f19] via-transparent to-transparent opacity-80" />

                  {/* Hover action buttons */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    {project.liveLink && (
                      <a
                        href={project.liveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Live demo"
                        className="size-10 rounded-xl bg-white text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {project.githubLink && (
                      <a
                        href={project.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Source code"
                        className="size-10 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Github size={16} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-7 space-y-4">
                  <h2 className="text-xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    {project.title}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium line-clamp-3 flex-1">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {project.technologies?.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-300 uppercase tracking-widest"
                      >
                        {t}
                      </span>
                    ))}
                    {project.technologies?.length > 5 && (
                      <span className="px-2 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        +{project.technologies.length - 5}
                      </span>
                    )}
                  </div>

                  {(project.liveLink || project.githubLink) && (
                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                      {project.liveLink && (
                        <a
                          href={project.liveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-500 hover:text-white active:scale-95"
                        >
                          <ExternalLink size={13} /> Live Demo
                        </a>
                      )}
                      {project.githubLink && (
                        <a
                          href={project.githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 active:scale-95 ${project.liveLink ? "" : "flex-1"}`}
                        >
                          <Github size={13} /> Source
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Owner-added sections */}
        <PageSections page="projects" />

        {/* CTA */}
        {!loading && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center pt-8 space-y-6"
          >
            <EditableText
              k="projects.cta.heading"
              as="h3"
              className="text-3xl md:text-4xl font-black text-white tracking-tighter block"
            >
              Have a project in mind?
            </EditableText>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
            >
              Let's Build It <ArrowRight size={15} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
