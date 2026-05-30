import Image from "next/image";
import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { siteContent } from "@/content/site";
import { getHomeProjects } from "@/lib/content";
import { TextScramble } from "@/components/text-scramble";

export default function HomePage() {
  const homeProjects = getHomeProjects(4);

  return (
    <div className="relative bg-bg selection:bg-text/10">
      <div className="relative z-10 space-y-20 pt-8 sm:pt-10 md:space-y-32">
        {/* Hero Section */}
        <section className="relative pb-8 pt-8 sm:pb-10 sm:pt-10 md:pt-20">
          <div className="relative z-10 grid max-w-6xl gap-10 md:gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
            <div className="space-y-10 md:space-y-14">
              <div className="space-y-10 md:space-y-14">
                <div className="flex flex-col gap-6">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-text/40">01 // Intro</span>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>

                  <div className="max-w-2xl space-y-4 text-lg font-heading font-medium leading-[1.2] tracking-tight sm:text-xl md:text-3xl text-text">
                    <p className="text-text/60">
                      I&apos;m <span className="text-text font-black">{siteContent.fullName.split(' ')[0]}</span>. <TextScramble text="I build software systems" duration={1200} className="font-heading font-black text-text" />
                    </p>
                    <p className="text-text">
                      <TextScramble text="that control physical hardware" duration={1400} delay={300} className="font-heading font-medium text-text" />
                    </p>
                    <p className="text-text">
                      <TextScramble text="bridging systems architecture" duration={1600} delay={600} className="font-heading font-medium text-text" />
                    </p>
                    <p className="text-text/60">
                      <TextScramble text="with physical robotics." duration={1800} delay={900} className="font-heading font-medium text-text/60" />
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 md:gap-8">
                  <Link
                    href="/projects"
                    className="inline-flex items-center justify-center border border-text px-8 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-text transition-all hover:bg-text hover:text-bg sm:text-xs"
                  >
                    Explore Works
                  </Link>
                  <Link
                    href="/contact"
                    className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-text hover:text-text/75 outline-none sm:text-xs"
                  >
                    <span>Let&apos;s Talk</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-8 w-full max-w-[280px] lg:mt-14 group cursor-pointer">
              {/* Layer 1: Background Solid Accent Shape */}
              <div
                className="absolute inset-0 bg-text/[0.04] border border-text/10 transition-all duration-700 ease-out group-hover:translate-x-2.5 group-hover:translate-y-2.5 group-hover:scale-98 group-hover:rotate-3"
                style={{
                  animation: "morph 8s ease-in-out infinite",
                  borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
                }}
              />
              {/* Layer 2: Background Highlight Ring / Offset */}
              <div
                className="absolute inset-0 border border-text/10 translate-x-[-4px] translate-y-[-4px] transition-all duration-700 ease-out group-hover:translate-x-[-8px] group-hover:translate-y-[-8px] group-hover:scale-102"
                style={{
                  animation: "morph 8s ease-in-out infinite alternate",
                  animationDelay: "-2s",
                  borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
                }}
              />
              {/* Layer 3: Image Container */}
              <div
                className="relative aspect-square w-full overflow-hidden border border-text bg-surface transition-all duration-700 ease-out group-hover:translate-x-[-4px] group-hover:translate-y-[-4px] group-hover:scale-[1.02] group-hover:rotate-[-2deg]"
                style={{
                  animation: "morph 8s ease-in-out infinite",
                  borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
                }}
              >
                <Image
                  src="/images/founder.webp"
                  alt="Kayode Williams Olalere"
                  width={900}
                  height={900}
                  priority
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="mt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text/40">
                  Engineer &middot; Architect
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects">
          <div className="px-4 md:px-0">
            <SectionHeading title="Selected Work" description="Products and systems I have designed and built." />
          </div>
          <div className="border-b border-border px-4 md:px-0">
            {homeProjects.map((project, index) => (
              <ProjectCard key={project.slug} project={project} index={index} />
            ))}
          </div>
          <div className="mt-10 px-4 md:px-0">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 border-b border-text pb-1 text-sm text-text transition-colors hover:border-text/35 hover:text-text/65"
            >
              View all projects
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" className="grid grid-cols-1 items-start gap-10 px-4 md:grid-cols-3 md:gap-16 md:px-0">
          <div className="md:col-span-1">
            <SectionHeading title="Abilities" line={false} />
            <p className="mt-0 text-sm font-medium leading-relaxed text-text/60 md:text-base">
              Technologies I have used across production projects and focused exploratory builds.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <h3 className="text-text font-bold text-base md:text-lg uppercase tracking-widest border-b border-border pb-2">
                Languages & Logic
              </h3>
              <p className="text-text/75 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Dart (Flutter), Python, C, C++, Rust, JavaScript, TypeScript, Kotlin, Java, Bash, SQL.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-text font-bold text-base md:text-lg uppercase tracking-widest border-b border-border pb-2">
                Robotics & Mechatronics
              </h3>
              <p className="text-text/75 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                ROS, Arduino, MATLAB, KiCad, Onshape, SolidWorks, Automation Technologies, Control Systems.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-text font-bold text-base md:text-lg uppercase tracking-widest border-b border-border pb-2">
                Systems & Mobile
              </h3>
              <p className="text-text/75 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Flutter, Firebase, Supabase, REST APIs, Systems Architecture, Protocol Firewalls, R&D Methodologies.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-text font-bold text-base md:text-lg uppercase tracking-widest border-b border-border pb-2">
                Platforms
              </h3>
              <p className="text-text/75 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Android, iOS, IoT Systems, Web, Research-Grade Prototypes.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
