"use client";

import { useState } from "react";
import Link from "next/link";
import { type Project } from "@/types/content";
import { WorkInsightModal } from "@/components/work-insight-modal";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isInsightOpen, setIsInsightOpen] = useState(false);

  return (
    <>
      <div className="group relative flex flex-col border-premium bg-white/[0.01] p-6 md:p-10 transition-all hover:bg-white/[0.03] hover:translate-y-[-4px]">
        <div className="flex-1 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              /{project.category || "project"}
            </span>
            <div className="flex gap-2">
              <div className="h-1 w-4 bg-white/10" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-heading font-black text-white leading-[1.1] tracking-tighter uppercase">
            {project.title}
          </h3>
          <p className="text-base text-text/40 leading-relaxed font-medium tracking-tight">
            {project.shortDescription}
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {project.stack.slice(0, 3).map((tech: string) => (
              <span key={tech} className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {tech}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setIsInsightOpen(true)}
              className="text-xs font-bold text-white hover:text-primary transition-colors flex items-center gap-2"
            >
              Insights <span className="text-[10px] transition-transform group-hover:translate-x-1">→</span>
            </button>
            <Link
              href={project.liveUrl || `/projects/${project.slug}`}
              className="text-xs font-bold text-text/60 hover:text-white transition-colors"
            >
              View Project
            </Link>
            {project.githubUrl ? (
              <Link
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-text/40 hover:text-white transition-colors"
              >
                Source
              </Link>
            ) : null}
          </div>
        </div>

        {/* Modern Gradient Overlay on Hover */}
        <div className="absolute inset-0 border border-white/0 transition-all group-hover:border-white/10 pointer-events-none" />
      </div>
      <WorkInsightModal project={project} isOpen={isInsightOpen} onClose={() => setIsInsightOpen(false)} />
    </>
  );
}
