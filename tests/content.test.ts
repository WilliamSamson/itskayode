import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { experience } from "@/content/experience";
import { siteContent } from "@/content/site";
import { getHomeProjects, getPortfolioMetrics } from "@/lib/content";

describe("content integrity", () => {
  it("has unique project slugs", () => {
    const slugs = projects.map((project) => project.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("ensures featured projects include at least three entries", () => {
    const featuredProjects = projects.filter((project) => project.featured);
    expect(featuredProjects.length).toBeGreaterThanOrEqual(3);
  });

  it("ensures each project has case-study fields", () => {
    for (const project of projects) {
      expect(project.problem.length).toBeGreaterThan(15);
      expect(project.solution.length).toBeGreaterThan(15);
      expect(project.impact.length).toBeGreaterThan(15);
      expect(project.stack.length).toBeGreaterThan(1);
    }
  });

  it("ensures timeline and site navigation are populated", () => {
    expect(experience.length).toBeGreaterThan(2);
    expect(siteContent.nav.length).toBeGreaterThan(2);
    expect(siteContent.socials.length).toBeGreaterThan(1);
  });

  it("derives portfolio metrics from project records", () => {
    const metrics = getPortfolioMetrics();
    expect(metrics[0].value).toBe(projects.length);
    expect(metrics[1].value).toBe(projects.filter((project) => project.liveUrl).length);
    expect(metrics[2].value).toBe(new Set(projects.map((project) => project.category)).size);
    expect(metrics[3].value).toBe(new Set(projects.flatMap((project) => project.stack)).size);
  });

  it("uses the intended selected work order on the homepage", () => {
    expect(getHomeProjects().map((project) => project.slug)).toEqual([
      "harmoniq",
      "ws-tech-venture-studio",
      "orbit-mobile-automation",
      "magma-terminal-workspace"
    ]);
  });
});
