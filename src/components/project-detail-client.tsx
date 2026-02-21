"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/content";

interface ProjectDetailClientProps {
    project: Project;
    nextProject: Project | undefined;
}

export function ProjectDetailClient({ project, nextProject }: ProjectDetailClientProps) {
    return (
        <div className="space-y-24 pb-32">
            {/* Premium Project Hero */}
            <section className="relative pt-12">
                <motion.div
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10"
                >
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{project.category}</span>
                            <div className="h-[1px] w-12 bg-white/10" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">{project.timeline}</span>
                        </div>

                        <h1 className="text-4xl md:text-7xl lg:text-8xl font-heading font-black text-white tracking-tighter uppercase leading-[0.85]">
                            {project.title.split(' ').map((word, i) => (
                                <span key={i} className={i % 2 === 1 ? "text-primary italic font-light lowercase" : "block"}>
                                    {word}
                                </span>
                            ))}
                        </h1>

                        <div className="flex flex-wrap gap-3 mt-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Lead Role</span>
                                <span className="text-sm font-bold text-white uppercase tracking-widest">{project.role}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Decorative Tiered Lines (Hero) */}
                <div className="absolute top-0 right-0 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
                    <div className="h-[1px] w-32 bg-primary/40" />
                    <div className="h-[1px] w-20 bg-primary" />
                    <div className="h-[1px] w-48 bg-primary/20" />
                </div>
            </section>

            {/* Insight Feed Layout */}
            <div className="space-y-24">
                {/* Context & Description */}
                <section className="relative group">
                    <motion.div
                        initial={false}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">01 // Context</span>
                            <div className="h-px bg-white/5 flex-1" />
                        </div>
                        <p className="text-xl md:text-3xl font-heading font-medium text-text/70 leading-tight max-w-4xl tracking-tight">
                            {project.description}
                        </p>
                    </motion.div>
                </section>

                {/* Insights Grid */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "The Problem", content: project.problem, color: "text-white/60" },
                        { label: "The Solution", content: project.solution, color: "text-primary/80 italic font-light" },
                        { label: "The Impact", content: project.impact, color: "text-white/80 font-black uppercase tracking-tight" }
                    ].map((item, i) => (
                        <motion.div
                            key={item.label}
                            initial={false}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="relative group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all flex flex-col min-h-[240px]"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-6 group-hover:text-primary transition-colors">
                                {item.label}
                            </p>
                            <p className={cn("text-base md:text-lg leading-relaxed flex-1", item.color)}>
                                {item.content}
                            </p>

                            {/* Decorative Accent */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-6 h-[1px] bg-primary/40" />
                            </div>
                        </motion.div>
                    ))}
                </section>

                {/* Tech Stack Display */}
                <section className="space-y-8">
                    <motion.div
                        initial={false}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">02 // Stack</span>
                            <div className="h-px bg-white/5 flex-1" />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {project.stack.map((tech, i) => (
                                <motion.span
                                    key={tech}
                                    initial={false}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 border border-white/5 bg-white/[0.01] hover:border-primary/30 hover:text-white transition-all cursor-default"
                                >
                                    {tech}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* visual assets / screenshots */}
                {project.screenshots && project.screenshots.length > 0 && (
                    <section className="space-y-12">
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">03 // Visuals</span>
                            <div className="h-px bg-white/5 flex-1" />
                        </div>
                        <div className="grid gap-8 sm:grid-cols-2">
                            {project.screenshots.map((image, idx) => (
                                <motion.figure
                                    key={`${image}-${idx}`}
                                    initial={false}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 group"
                                >
                                    <Image
                                        src={image}
                                        alt={`${project.title} screenshot ${idx + 1}`}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                                            Module {idx + 1} - Interface Detail
                                        </span>
                                    </div>
                                </motion.figure>
                            ))}
                        </div>
                    </section>
                )}

                {/* CTAs & Links */}
                <section className="flex flex-col sm:flex-row items-center justify-between gap-8 py-16 border-y border-white/5">
                    <div className="flex gap-12">
                        {project.githubUrl && (
                            <Link
                                href={project.githubUrl}
                                target="_blank"
                                className="group flex flex-col gap-2"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-primary transition-colors">Repository</span>
                                <span className="text-sm font-bold text-white hover:underline underline-offset-8">Browse Source →</span>
                            </Link>
                        )}
                        {project.liveUrl && (
                            <Link
                                href={project.liveUrl}
                                target="_blank"
                                className="group flex flex-col gap-2"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-primary transition-colors">Production</span>
                                <span className="text-sm font-bold text-white hover:underline underline-offset-8">View Live Project →</span>
                            </Link>
                        )}
                    </div>

                    <Link
                        href={`/?talk=1&project=${project.slug}#contacts`}
                        className="w-full sm:w-auto py-5 px-12 bg-primary text-black font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 text-center"
                    >
                        Discuss Execution
                    </Link>
                </section>

                {/* Next Project Expansion */}
                {nextProject && (
                    <section className="pt-24">
                        <Link
                            href={`/projects/${nextProject.slug}`}
                            className="group relative block p-12 md:p-24 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden transition-all hover:border-primary/30"
                        >
                            <div className="relative z-10 flex flex-col items-center text-center gap-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary">Up Next</span>
                                <h3 className="text-3xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none group-hover:scale-105 transition-transform duration-500">
                                    {nextProject.title}
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-white transition-colors duration-300">
                                    Execute Transition →
                                </span>
                            </div>

                            {/* Animated decorative element */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-primary/5 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        </Link>
                    </section>
                )}
            </div>
        </div>
    );
}
