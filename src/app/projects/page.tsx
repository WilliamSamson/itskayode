"use client";

import { motion } from "framer-motion";
import { ProjectsFilter } from "@/components/projects-filter";
import { projects } from "@/content/projects";

export default function ProjectsPage() {
  return (
    <div className="space-y-24 pb-20">
      {/* Premium Projects Hero */}
      <section className="relative pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Portfolio Archive</span>
              <div className="h-[1px] w-12 bg-white/10" />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white tracking-tighter uppercase leading-[0.85]">
              Shipped <br />
              <span className="text-primary italic font-light lowercase">Execution</span>
            </h1>

            <p className="text-lg md:text-xl text-text/50 max-w-2xl font-medium leading-relaxed mt-4">
              A curated archive of products, experimental prototypes, and systems architecture. Filter by domain to review specific execution layers.
            </p>
          </div>
        </motion.div>

        {/* Decorative Tiered Lines */}
        <div className="absolute -top-10 right-0 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
          <div className="h-[1px] w-24 bg-primary/40" />
          <div className="h-[1px] w-16 bg-primary" />
          <div className="h-[1px] w-32 bg-primary/20" />
        </div>
      </section>

      {/* Projects Filter & Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <ProjectsFilter projects={projects} />
      </motion.div>
    </div>
  );
}
