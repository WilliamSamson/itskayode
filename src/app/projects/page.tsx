import type { Metadata } from "next";
import { ProjectsFilter } from "@/components/projects-filter";
import { projects } from "@/content/projects";
import { TextScramble } from "@/components/text-scramble";

export const metadata: Metadata = {
  title: "Selected Works",
  description: "Browse software systems, robotics automation projects, and mechatronic systems architecture cases by Kayode Williams Olalere.",
  openGraph: {
    title: "Selected Works | Kayode Williams Olalere",
    description: "Browse software systems, robotics automation projects, and mechatronic systems architecture cases by Kayode Williams Olalere.",
    url: "/projects/"
  }
};

export default function ProjectsPage() {
  return (
    <div className="space-y-14 pb-20 pt-8 sm:space-y-16 sm:pt-12">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-heading font-black uppercase tracking-tight text-text sm:text-5xl">
          <TextScramble text="Work" duration={1200} className="font-heading font-black text-text" />
        </h1>
        <p className="text-base leading-8 text-text/60 sm:text-lg">
          Selected software, mobile, and engineering projects.
        </p>
      </header>

      <ProjectsFilter projects={projects} />
    </div>
  );
}
