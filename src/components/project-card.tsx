"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
        {project.screenshots?.[0] && (
          <div className="relative mb-6 md:mb-8 w-full overflow-hidden border border-white/10 aspect-[16/9] bg-[#050505]">
            <Image
              src={project.screenshots[0]}
              alt={`${project.title} preview`}
              fill
              className="object-cover transition-all duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-100 mix-blend-luminosity hover:mix-blend-normal"
            />
            {/* Subtle overlay to blend image into background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
          </div>
        )}
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
              className="text-xs font-bold text-white hover:text-primary transition-colors flex items-center gap-2 group/btn"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Quick Look <span className="text-[10px] transition-transform group-hover/btn:translate-x-1">→</span>
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
