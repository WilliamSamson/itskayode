import type { Metadata } from "next";
import { TextAnimate } from "@/components/magicui/text-animate";
import { ProjectsFilter } from "@/components/projects-filter";
import { projects } from "@/content/projects";

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
      <header className="technical-grid max-w-3xl space-y-4 rounded-xl border border-accent-blue/10 bg-accent-blue/[0.025] p-6 sm:p-10">
        <TextAnimate
          as="h1"
          animation="blurIn"
          by="text"
          className="font-heading text-[15px] font-semibold tracking-tight text-text"
        >
          Work
        </TextAnimate>
        <TextAnimate animation="slideUp" by="word" delay={0.15} className="text-[13px] leading-8 text-text/60">
          Selected software, mobile, and engineering projects.
        </TextAnimate>
      </header>

      <ProjectsFilter projects={projects} />
    </div>
  );
}
