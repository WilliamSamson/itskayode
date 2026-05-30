import Link from "next/link";
import type { Project } from "@/types/content";

interface ProjectCardProps {
  project: Project;
  index?: number;
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const isLive = !!project.liveUrl;

  return (
    <article className="group relative flex flex-col justify-between rounded-lg border border-border/60 bg-surface/30 p-6 hover:bg-surface/50 transition-all duration-300 min-h-[320px]">
      {/* Active outline overlay */}
      <div className="absolute inset-0 rounded-lg border border-transparent transition-all duration-300 group-hover:border-text/20 group-hover:scale-[1.01] pointer-events-none" />
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-text/40">
            {`// 0${index + 1} . src / ${project.category.toLowerCase()}`}
          </span>
          {isLive && (
            <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-text/50">
              <span className="h-1.5 w-1.5 rounded-full bg-text/70" />
              <span>Active</span>
            </div>
          )}
        </div>

        {/* Title & Role */}
        <div className="space-y-1">
          <h3 className="text-xl font-heading font-black uppercase tracking-tight text-text transition-colors group-hover:text-text/70 sm:text-2xl">
            <Link
              href={`/projects/${project.slug}`}
              className="focus-ring block outline-none"
            >
              {project.title}
            </Link>
          </h3>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text/45">
            {project.role}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed text-text/60 line-clamp-3">
          {project.shortDescription}
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1">
          {project.stack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="rounded-sm border border-border/60 bg-bg/40 px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-text/50 transition-colors group-hover:border-border group-hover:text-text/75"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/40 pt-4 text-[10px] font-black uppercase tracking-[0.2em]">
          <Link
            href={`/projects/${project.slug}`}
            className="group/link focus-ring inline-flex items-center gap-1.5 text-text transition-all hover:text-text/60"
          >
            <span>Case Study</span>
            <span className="transition-transform duration-300 group-hover/link:translate-x-1">→</span>
          </Link>
          {isLive && (
            <Link
              href={project.liveUrl!}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1 text-text/40 transition-colors hover:text-text"
            >
              <span>Launch</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
