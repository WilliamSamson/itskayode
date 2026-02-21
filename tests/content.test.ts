import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { experience } from "@/content/experience";
import { siteContent } from "@/content/site";

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
});
