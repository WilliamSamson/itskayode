import Link from "next/link";
import { ProjectVisual } from "@/components/project-visual";
import type { Project } from "@/types/content";

interface ProjectCardProps {
  project: Project;
  index?: number;
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const isLive = !!project.liveUrl;
  const categoryStyles = {
    Web: "border-accent-blue/30 bg-accent-blue/10",
    Mobile: "border-accent-green/30 bg-accent-green/10",
    Backend: "border-accent-orange/30 bg-accent-orange/10",
    AI: "border-accent-violet/30 bg-accent-violet/10",
    Desktop: "border-text/20 bg-surface"
  };
  const categoryText = {
    Web: "text-accent-blue",
    Mobile: "text-accent-green",
    Backend: "text-accent-orange",
    AI: "text-accent-violet",
    Desktop: "text-text"
  };
  const categoryDecor = {
    Web: "bg-accent-blue",
    Mobile: "bg-accent-green",
    Backend: "bg-accent-orange",
    AI: "bg-accent-violet",
    Desktop: "bg-text"
  };
  const rotations = [
    "md:-rotate-[1.25deg]",
    "md:rotate-[0.8deg]",
    "md:-rotate-[0.6deg]",
    "md:rotate-[1.1deg]"
  ];

  return (
    <article
      className={`group relative mx-auto w-full max-w-[22rem] rounded-xl border p-1.5 pb-8 shadow-[0_12px_30px_rgb(76_61_122_/_0.1)] transition-all duration-300 hover:z-10 hover:rotate-0 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgb(76_61_122_/_0.18)] sm:p-2 sm:pb-11 ${categoryStyles[project.category]} ${rotations[index % rotations.length]}`}
    >
      <div className="relative z-10 flex min-h-[190px] flex-col justify-between rounded-xl border border-border-subtle bg-bg p-3 sm:min-h-[245px] sm:p-5">
        <div className="space-y-3 sm:space-y-4">
          {(project.coverImage || project.visualKind) && (
            <ProjectVisual project={project} className="aspect-[16/9] w-full" />
          )}
          <span aria-hidden className={`block h-1 w-10 rounded-full sm:w-12 ${categoryDecor[project.category]}`} />

          <div className="space-y-1.5 sm:space-y-2">
            <h3 className="font-heading text-[13px] font-semibold leading-tight tracking-tight text-text sm:text-[15px]">
              <Link href={`/projects/${project.slug}`} className="focus-ring block outline-none">
                {project.title}
              </Link>
            </h3>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-text/55">
              {project.shortDescription}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {project.stack.slice(0, 3).map((tech, techIndex) => (
              <span
                key={tech}
                className={`rounded-md border border-current/15 px-2 py-1 text-[11px] sm:px-2.5 ${techIndex === 2 ? "hidden sm:inline-flex" : "inline-flex"} ${categoryText[project.category]}`}
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/projects/${project.slug}`}
              className={`group/link focus-ring inline-flex items-center gap-1 rounded-md border border-current/20 px-2.5 py-1.5 text-[11px] sm:px-3 ${categoryText[project.category]}`}
            >
              <span className="sm:hidden">View</span>
              <span className="hidden sm:inline">Project details</span>
              <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
            </Link>
            {isLive ? (
              <Link
                href={project.liveUrl!}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1 rounded-md bg-text px-2.5 py-1.5 text-[11px] text-bg transition-colors hover:bg-primary sm:px-3"
              >
                <span className="hidden sm:inline">Visit</span>
                <span aria-hidden>↗</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <p className="absolute inset-x-3 bottom-2.5 truncate text-center text-[11px] text-text/45 sm:inset-x-4 sm:bottom-3">
        {project.role}
      </p>
    </article>
  );
}
