import { projects } from "@/content/projects";

export function getFeaturedProjects() {
  return projects.filter((project) => project.featured);
}

export function getHomeProjects(limit = 4) {
  const homeProjectSlugs = [
    "harmoniq",
    "ws-tech-venture-studio",
    "orbit-mobile-automation",
    "magma-terminal-workspace"
  ];

  return homeProjectSlugs
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project): project is (typeof projects)[number] => Boolean(project))
    .slice(0, limit);
}

export function getPortfolioMetrics() {
  return [
    { label: "Selected builds", value: projects.length },
    { label: "Live products", value: projects.filter((project) => project.liveUrl).length },
    { label: "Engineering domains", value: new Set(projects.map((project) => project.category)).size },
    { label: "Technologies used", value: new Set(projects.flatMap((project) => project.stack)).size }
  ];
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
