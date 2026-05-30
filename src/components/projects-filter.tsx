"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/project-card";
import type { Project, ProjectCategory } from "@/types/content";

type FilterType = "All" | ProjectCategory;

const filters: FilterType[] = ["All", "Web", "Mobile", "Backend", "AI"];

interface ProjectsFilterProps {
  projects: Project[];
}

export function ProjectsFilter({ projects }: ProjectsFilterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") {
      return projects;
    }

    return projects.filter((project) => project.category === activeFilter);
  }, [activeFilter, projects]);

  return (
    <section aria-label="Project list" className="space-y-12">
      {/* Segmented modular tab control */}
      <div
        role="tablist"
        aria-label="Project categories"
        className="inline-flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-surface/30 p-1 sm:p-1.5"
      >
        {filters.map((filter) => {
          const active = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "focus-ring rounded-md px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200 select-none outline-none",
                active
                  ? "bg-text text-bg shadow-sm"
                  : "text-text/45 hover:text-text hover:bg-surface/50"
              )}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Grid container with page transition entry */}
      <div
        key={activeFilter}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 page-transition"
      >
        {filteredProjects.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
