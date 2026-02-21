"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/types/content";

interface WorkInsightModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkInsightModal({ project, isOpen, onClose }: WorkInsightModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousModalState = document.body.getAttribute("data-work-modal-open");

    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-work-modal-open", "1");

    return () => {
      document.body.style.overflow = previousOverflow;

      if (previousModalState === null) {
        document.body.removeAttribute("data-work-modal-open");
      } else {
        document.body.setAttribute("data-work-modal-open", previousModalState);
      }
    };
  }, [isOpen]);

  const handleDiscussExecution = () => {
    onClose();
    router.push(`/?talk=1&project=${project.slug}&intent=${Date.now()}#contacts`);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/80"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl md:max-w-3xl lg:max-w-4xl bg-surface border border-white/5 rounded-3xl overflow-hidden pointer-events-auto shadow-2xl shadow-primary/5 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-8 md:p-12 border-b border-white/5 relative shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Work Insight</span>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h2 className="text-3xl md:text-5xl font-heading font-black text-white tracking-tighter uppercase leading-none">
                  {project.title.split(' ').map((word, i) => (
                    <span key={i} className={i % 2 === 1 ? "text-primary italic font-light lowercase" : "inline-block"}>
                      {word}{' '}
                    </span>
                  ))}
                </h2>
                <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.2em] font-black text-white/30">
                  <span>{project.category}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full my-auto" />
                  <span>{project.timeline}</span>
                </div>

                {/* Decorative Tiered Lines (Header) */}
                <div className="absolute top-12 right-12 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
                  <div className="h-[1px] w-12 bg-primary/40" />
                  <div className="h-[1px] w-8 bg-primary" />
                </div>
              </div>

              {/* Content - Scrollable with hidden scrollbar */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-8 md:p-12 space-y-12">
                {/* Description */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">01 // Context</span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </div>
                  <p className="text-lg md:text-xl text-text/70 leading-relaxed font-medium max-w-3xl">
                    {project.description}
                  </p>
                </div>

                {/* Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "The Problem", content: project.problem, color: "text-white/60" },
                    { label: "The Solution", content: project.solution, color: "text-primary/80 italic font-light" },
                    { label: "The Impact", content: project.impact, color: "text-white/80 font-black uppercase tracking-tight" }
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="relative group p-6 rounded-2xl bg-white/[0.02] border border-white/0 hover:border-white/5 transition-all flex flex-col"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 group-hover:text-primary transition-colors">
                        {item.label}
                      </p>
                      <p className={`text-sm md:text-base leading-relaxed flex-1 ${item.color}`}>
                        {item.content}
                      </p>

                      {/* Decorative Detail */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-[1px] bg-primary/20" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Stack */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">02 // Stack</span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {project.stack.map(tech => (
                      <span key={tech} className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 border border-white/5 bg-white/[0.01] hover:border-primary/20 transition-colors">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 md:p-12 shrink-0 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Lead Role</p>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">{project.role}</p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Link
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      handleDiscussExecution();
                    }}
                    className="flex-1 sm:flex-none py-4 px-10 bg-primary text-black font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    Discuss Execution
                  </Link>
                  <Link
                    href={project.liveUrl || `/projects/${project.slug}`}
                    className="flex-1 sm:flex-none py-4 px-10 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all text-center"
                  >
                    View Live
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
