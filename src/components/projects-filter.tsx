"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/project-card";
import type { Project, ProjectCategory } from "@/types/content";

type FilterType = "All" | ProjectCategory;

const filters: FilterType[] = ["All", "Web", "Mobile", "Desktop", "Backend", "AI"];

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
        aria-label="Project categories"
        className="flex flex-wrap gap-4"
      >
        {filters.map((filter) => {
          const active = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "focus-ring text-[13px] font-semibold transition-colors duration-200 select-none outline-none",
                active
                  ? "text-text"
                  : "text-primary-dim hover:text-primary-subtle"
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
        className="page-transition grid grid-cols-2 gap-3 px-1 py-4 sm:gap-8 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {filteredProjects.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
