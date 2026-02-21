"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { StardustBackground } from "@/components/stardust-background";
import { ContactModal } from "@/components/contact-modal";
import { siteContent } from "@/content/site";
import { getHomeProjects } from "@/lib/content";

export default function HomePage() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const homeProjects = getHomeProjects(4);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("talk") === "1") {
      setIsContactModalOpen(true);
    }
  }, []);

  return (
    <div className="relative isolate overflow-hidden bg-black">
      <StardustBackground />
      <div className="relative z-10 space-y-20 pt-10 md:space-y-32">
        {/* Hero Section */}
        <section className="relative pt-10 md:pt-28 pb-10 overflow-hidden">
          {/* Background Depth Components */}
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] pointer-events-none" />

          <div className="relative z-10 grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
            <div className="space-y-10 md:space-y-14">
              {/* Status Indicator */}
              <div className="inline-flex items-center gap-4 group">
                <div className="flex flex-col gap-1 items-end">
                  <div className="h-[1px] w-8 bg-primary/40 group-hover:w-12 transition-all duration-500" />
                  <div className="h-[1px] w-5 bg-primary group-hover:w-8 transition-all duration-500 delay-75" />
                </div>
                <div className="relative inline-flex items-center gap-3 px-5 py-2">
                  <div className="pointer-events-none absolute left-2 right-2 top-0 flex">
                    <span className="h-px w-1/2 bg-primary" />
                    <span className="h-px w-1/2 border-t border-dotted border-primary/80" />
                  </div>
                  <div className="pointer-events-none absolute left-2 right-2 bottom-0 flex">
                    <span className="h-px w-1/2 border-t border-dotted border-primary/80" />
                    <span className="h-px w-1/2 bg-primary" />
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/85">
                    Available for hire
                  </p>
                </div>
              </div>

              {/* Hero Headline */}
              <div className="space-y-5">
                <h1 className="text-large-h1 sm:text-fluid-h1 font-heading font-black uppercase tracking-[-0.04em] leading-[0.84] text-white">
                  <span className="block">Crafting</span>
                  <span className="block text-primary">Digital</span>
                  <span className="block">Experiences</span>
                </h1>
                <div className="flex items-center gap-3">
                  <span className="h-[1px] w-12 bg-white/15" />
                  <span className="h-[1px] w-24 bg-primary/80" />
                </div>
              </div>

              <div className="space-y-10 md:space-y-14">
                <div className="flex flex-col gap-6">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">01 // Intro</span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </div>

                  <div className="space-y-4 max-w-2xl text-xl md:text-3xl font-heading font-medium tracking-tight leading-[1.2]">
                    <p className="text-text/60">
                      I&apos;m <span className="text-white font-black">{siteContent.fullName.split(' ')[0]}</span>, an engineer building at the
                    </p>
                    <p className="text-white">
                      intersection of <span className="text-primary italic font-light underline decoration-1 underline-offset-8">bits and atoms</span>,
                    </p>
                    <p className="text-white">
                      bridging complex software with
                    </p>
                    <p className="text-primary">
                      physical robotics <span className="text-text/60 font-normal">and systems architecture.</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 md:gap-10 pt-4">
                  <Link
                    href="/projects"
                    className="group relative inline-flex items-center justify-center px-10 py-6 border border-white text-white font-black text-xs md:text-sm uppercase tracking-[0.3em] transition-all hover:bg-white hover:text-black overflow-hidden"
                  >
                    <span className="relative z-10">Explore Works</span>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="group inline-flex items-center gap-6 text-xs md:text-sm font-black text-white uppercase tracking-[0.4em] transition-all hover:text-primary outline-none"
                  >
                    <span>Let&apos;s Talk</span>
                    <div className="flex flex-col gap-1 items-start">
                      <div className="h-[1px] w-12 bg-white/20 group-hover:w-16 group-hover:bg-primary transition-all duration-500" />
                      <div className="h-[1px] w-8 bg-white/40 group-hover:w-12 group-hover:bg-primary transition-all duration-500 delay-75" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-6 w-full max-w-[140px] md:max-w-[200px] aspect-square md:mt-14">
              <div className="relative h-full w-full p-3">
                {/* Revolving Technical Rings */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-primary/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-1.5 border border-dotted border-white/20 rounded-full"
                />

                {/* Main Image Container */}
                <div className="relative h-full w-full rounded-full overflow-hidden border border-white/10 bg-surface shadow-2xl shadow-primary/5">
                  <Image
                    src="/images/founder.png"
                    alt="Kayode Williams Olalere"
                    width={900}
                    height={1100}
                    priority
                    className="h-full w-full object-cover scale-110 transition-transform hover:scale-125 duration-700"
                  />
                  {/* Glass Overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-primary/5" />
                </div>

                {/* Decorative Tiered Accents */}
                <div className="absolute -top-2 -right-2 flex flex-col gap-1 items-end">
                  <div className="h-[1px] w-12 bg-primary/60" />
                  <div className="h-[1px] w-8 bg-primary" />
                </div>
                <div className="absolute -bottom-2 -left-2 flex flex-col gap-1 items-start">
                  <div className="h-[1px] w-8 bg-primary" />
                  <div className="h-[1px] w-12 bg-primary/60" />
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                  Engineer &middot; Architect
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Modal */}
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />

        {/* Quote Section */}
        <section className="flex justify-center px-4">
          <div className="max-w-xl md:max-w-2xl w-full">
            <div className="relative border border-white/10 p-6 md:p-10 bg-black">
              <div className="absolute -top-3 left-4 bg-black px-2 text-2xl md:text-3xl text-white/30 font-serif font-black">&quot;</div>
              <p className="min-h-[3.75rem] text-center text-lg font-medium italic leading-relaxed text-white md:min-h-[4rem] md:text-left md:text-xl">
                <span className="font-mono">
                  The best engineering turns complex systems into dependable outcomes.
                </span>
              </p>
              <div className="absolute -bottom-3 right-4 bg-black px-2 text-2xl md:text-3xl text-white/30 font-serif font-black">&quot;</div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
              className="mt-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/70"
            >
              Kayode Olalere
            </motion.p>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects">
          <div className="flex items-end justify-between mb-8 transition-all px-4 md:px-0">
            <SectionHeading title="Work" description="A collection of technical challenges and creative solutions." />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {homeProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <div className="mt-8 px-4 md:px-0">
            <Link
              href="/projects"
              className="inline-flex items-center gap-3 border border-primary px-6 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white transition-colors hover:bg-primary hover:text-black"
            >
              View All Projects
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start px-4 md:px-0">
          <div className="md:col-span-1">
            <SectionHeading title="Abilities" line={false} />
            <p className="text-text/60 font-medium leading-relaxed mt-[-1rem] md:mt-[-2rem] text-sm md:text-base">
              Technologies I have used across production projects and focused exploratory builds.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base md:text-lg uppercase tracking-widest border-b border-white/10 pb-2">
                Languages & Logic
              </h3>
              <p className="text-text/70 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Dart (Flutter), Python, C, C++, Rust, JavaScript, TypeScript, Kotlin, Java, Bash, SQL.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base md:text-lg uppercase tracking-widest border-b border-white/10 pb-2">
                Robotics & Mechatronics
              </h3>
              <p className="text-text/70 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                ROS, Arduino, MATLAB, KiCad, Onshape, SolidWorks, Automation Technologies, Control Systems.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base md:text-lg uppercase tracking-widest border-b border-white/10 pb-2">
                Systems & Mobile
              </h3>
              <p className="text-text/70 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Flutter, Firebase, Supabase, REST APIs, Systems Architecture, Protocol Firewalls, R&D Methodologies.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base md:text-lg uppercase tracking-widest border-b border-white/10 pb-2">
                Platforms
              </h3>
              <p className="text-text/70 text-sm md:text-base leading-7 md:leading-8 font-medium italic">
                Android, iOS, IoT Systems, Web, Research-Grade Prototypes.
              </p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about-me" className="max-w-4xl px-4 md:px-0">
          <SectionHeading title="Perspective" />
          <div className="space-y-6 md:space-y-10">
            <p className="text-xl md:text-3xl lg:text-4xl font-heading font-medium text-white leading-tight tracking-tight">
              I build with <span className="text-primary underline decoration-4 underline-offset-[12px]">first-principles thinking</span>, turning difficult technical ideas into practical systems people can rely on.
            </p>
            <p className="text-base md:text-lg text-text/40 max-w-2xl leading-relaxed font-medium">
              My work spans full-stack products, robotics, and systems architecture. I care about clear execution, measurable outcomes, and building technology that solves real problems, not just impressive demos.
            </p>
            <Link href="/about" className="group inline-flex items-center gap-4 text-xs md:text-sm font-bold text-white tracking-widest uppercase mt-4">
              Read My Story
              <span className="transition-transform group-hover:translate-x-2">——→</span>
            </Link>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contacts" className="border-t border-white/5 pt-16 md:pt-32 pb-10 px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-4xl md:text-6xl lg:text-8xl font-heading font-black text-white tracking-tighter leading-[0.9]">START A <br /><span className="text-primary">CONVERSATION</span>.</h2>
              <p className="text-lg md:text-xl text-text/40 max-w-md font-medium tracking-tight">
                Currently available for new projects and collaborations. If you have an idea, let&apos;s bring it to life.
              </p>
            </div>
            <div className="flex flex-col gap-4 md:gap-6 justify-center">
              <a href={`mailto:${siteContent.email}`} className="text-xl md:text-3xl lg:text-4xl font-heading font-bold text-white hover:text-primary transition-colors underline decoration-1 underline-offset-[8px] md:underline-offset-[12px] decoration-white/10 break-all sm:break-normal">
                {siteContent.email}
              </a>
              <div className="flex flex-wrap gap-6 md:gap-10 pt-4">
                {siteContent.socials.map(s => (
                  <Link key={s.label} href={s.href} className="text-[10px] md:text-xs font-black uppercase tracking-widest text-text/40 hover:text-white transition-colors">
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
