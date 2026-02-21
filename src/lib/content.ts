import { projects } from "@/content/projects";

export function getFeaturedProjects() {
  return projects.filter((project) => project.featured);
}

export function getHomeProjects(limit = 4) {
  return getFeaturedProjects().slice(0, limit);
}

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getNextProjectSlug(currentSlug: string) {
  const currentIndex = projects.findIndex((project) => project.slug === currentSlug);

  if (currentIndex === -1) {
    return projects[0]?.slug;
  }

  const nextIndex = (currentIndex + 1) % projects.length;
  return projects[nextIndex]?.slug;
}
