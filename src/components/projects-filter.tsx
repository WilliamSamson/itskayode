"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
    <section aria-label="Project list">
      <div role="tablist" aria-label="Project categories" className="mb-12 flex flex-wrap gap-3">
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
                "relative py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                "border border-white/5",
                active
                  ? "bg-primary text-black border-primary scale-105"
                  : "bg-white/[0.01] text-white/40 hover:text-white hover:border-white/20"
              )}
            >
              {filter}
              {active && (
                <motion.div
                  layoutId="filter-accent"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}
