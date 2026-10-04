import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/content";

interface ProjectVisualProps {
  project: Project;
  className?: string;
  priority?: boolean;
}

export function ProjectVisual({ project, className, priority = false }: ProjectVisualProps) {
  if (project.coverImage) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-text", className)}>
        <Image
          src={project.coverImage}
          alt={project.coverAlt ?? `${project.title} interface`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 36vw, 22vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (project.visualKind === "architecture") {
    return (
      <div
        role="img"
        aria-label="Distributed rate limiter architecture"
        className={cn("relative overflow-hidden rounded-xl bg-text p-3 text-bg", className)}
      >
        <span className="absolute left-1/2 top-1/2 h-px w-3/4 -translate-x-1/2 bg-accent-blue/30" />
        <span className="absolute left-1/2 top-1/4 h-1/2 w-px bg-accent-violet/35" />
        <div className="relative grid h-full grid-cols-3 grid-rows-2 place-items-center gap-2">
          {[
            ["API 01", "bg-accent-blue"],
            ["REDIS", "bg-accent-orange"],
            ["API 02", "bg-accent-blue"],
            ["NATS", "bg-accent-violet"],
            ["VALEN", "bg-bg text-text"],
            ["POSTGRES", "bg-accent-green"]
          ].map(([label, tone]) => (
            <span
              key={label}
              className={`relative z-10 rounded-md px-2 py-1 text-[11px] font-semibold sm:text-[11px] ${tone}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (project.visualKind === "mystery") {
    return (
      <div
        role="img"
        aria-label="Murder mystery investigation board"
        className={cn("relative overflow-hidden rounded-xl bg-accent-red/10 p-3", className)}
      >
        <span className="absolute left-[22%] top-[22%] h-px w-[58%] rotate-12 bg-accent-red/60" />
        <span className="absolute left-[28%] top-[62%] h-px w-[48%] -rotate-12 bg-accent-red/60" />
        <div className="relative grid h-full grid-cols-3 items-center gap-2">
          {["SUSPECT", "CLUE 04", "ALIBI"].map((label, index) => (
            <span
              key={label}
              className={`relative z-10 rounded-md bg-surface px-2 py-3 text-center text-[11px] font-semibold text-text shadow-lg ${
                index === 1 ? "-rotate-3" : index === 2 ? "rotate-3" : "rotate-1"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (project.visualKind === "planner") {
    return (
      <div
        role="img"
        aria-label="Offline curriculum planning workspace"
        className={cn("grid grid-cols-[0.35fr_1fr] overflow-hidden rounded-xl bg-accent-green/10", className)}
      >
        <div className="space-y-2 bg-accent-green/90 p-3">
          <span className="block h-2 w-8 rounded-full bg-bg/80" />
          <span className="block h-1.5 w-full rounded-full bg-bg/15" />
          <span className="block h-1.5 w-3/4 rounded-full bg-bg/15" />
          <span className="block h-1.5 w-5/6 rounded-full bg-bg/15" />
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {["Curriculum", "Lessons", "Schedule", "Local AI"].map((label, index) => (
            <span
              key={label}
              className={`flex items-end rounded-md p-2 text-[11px] font-semibold ${
                index === 3 ? "bg-accent-orange/20 text-accent-orange" : "bg-bg text-accent-green"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Autonomous mobile automation interface"
      className={cn("relative overflow-hidden rounded-xl bg-accent-green/[0.12] p-3", className)}
    >
      <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-2">
        <div className="rounded-md bg-bg p-2">
          <span className="block h-2 w-12 rounded-full bg-text/80" />
          <span className="mt-2 block h-1.5 w-8 rounded-full bg-accent-green/35" />
          <span className="mt-5 block h-8 rounded-md bg-accent-green/10" />
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-md bg-text p-2">
          <span className="text-[11px] font-semibold text-bg">If</span>
          <span className="h-5 rounded-full bg-bg/10" />
          <span className="text-[11px] font-semibold text-bg">Then</span>
          <span className="h-5 rounded-full bg-bg/10" />
        </div>
      </div>
    </div>
  );
}
