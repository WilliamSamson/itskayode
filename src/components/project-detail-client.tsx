"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/types/content";

interface ProjectDetailClientProps {
  project: Project;
  nextProject: Project | undefined;
}

export function ProjectDetailClient({ project, nextProject }: ProjectDetailClientProps) {
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <article className="pb-20 pt-4 sm:pb-24 sm:pt-8">
      {/* Back Link */}
      <Link
        href="/projects"
        className="focus-ring group inline-flex items-center gap-2 border-b border-transparent pb-1 text-xs font-black uppercase tracking-[0.2em] text-text/40 transition-colors hover:text-text"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
        <span>Back to Work</span>
      </Link>

      {/* Dashboard Header */}
      <header className="mt-10 border-b border-border pb-12 sm:mt-14 sm:pb-16 md:mt-16">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-14">
          {/* Main Title Block */}
          <div className="space-y-6">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text/40">
              {`// WORK / SOURCE / ${project.category.toUpperCase()}`}
            </span>
            <h1 className="max-w-4xl text-4xl font-heading font-black uppercase tracking-tighter leading-[0.85] text-text sm:text-6xl md:text-7xl lg:text-8xl">
              {project.title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-text/60 sm:text-lg md:text-xl font-medium">
              {project.shortDescription}
            </p>
          </div>

          {/* Metadata Sidebar Panel */}
          <div className="rounded-xl border border-border bg-surface/30 p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Role */}
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                  Role Scope
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-text">
                  {project.role}
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-1.5">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                  Timeline
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-text">
                  {project.timeline}
                </p>
              </div>

              {/* Technical Tools */}
              <div className="space-y-2">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                  System Tools
                </span>
                <div className="flex flex-wrap gap-1">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-sm border border-border bg-bg/40 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-text/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Full-width Overview Callout */}
      <section className="border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
            Overview
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-text/75 sm:text-xl sm:leading-9 pl-6 border-l border-border/80 font-medium italic">
            {project.description}
          </p>
        </div>
      </section>

      {/* Interactive Live Demo / Sandbox */}
      {project.liveUrl ? (
        <section className="border-b border-border py-12 sm:py-16">
          <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
                Live Sandbox
              </h2>
              <p className="mt-3 text-xs leading-5 text-text/40">
                Interact with the application directly inside this frame, or launch it in a new window.
              </p>
            </div>
            <div className="w-full">
              <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
                {/* Browser window header */}
                <div className="flex items-center justify-between border-b border-border/80 bg-surface/50 px-4 py-3 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  </div>
                  <div className="mx-4 flex-1 max-w-md rounded bg-bg px-3 py-1 text-center font-mono text-[9px] text-text/45 truncate">
                    {project.liveUrl}
                  </div>
                  <div className="w-[30px]" />
                </div>
                {/* Iframe container */}
                <div className="relative w-full aspect-[16/10] bg-bg min-h-[300px] sm:min-h-[450px]">
                  {iframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/50 backdrop-blur-[1px] transition-opacity duration-300">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-text border-t-transparent" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text/40">
                        Connecting to sandbox...
                      </span>
                    </div>
                  )}
                  <iframe
                    src={project.liveUrl}
                    title={`${project.title} Live Preview`}
                    className="h-full w-full border-0 bg-transparent"
                    onLoad={() => setIframeLoading(false)}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Case Study Cards Deck */}
      <section aria-label="Case study" className="border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
              Case Study
            </h2>
            <p className="mt-3 text-xs leading-5 text-text/40">
              Technical break-down of the challenge, implementation approach, and project outcomes.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Challenge Card */}
            <div className="group rounded-xl border border-border/80 bg-surface/20 p-6 space-y-4 hover:border-text/25 hover:bg-surface/30 transition-all duration-300">
              <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-text/35 uppercase">
                {"// 01 . challenge"}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text">
                The Problem
              </h3>
              <p className="text-xs leading-relaxed text-text/60">
                {project.problem}
              </p>
            </div>

            {/* Approach Card */}
            <div className="group rounded-xl border border-border/80 bg-surface/20 p-6 space-y-4 hover:border-text/25 hover:bg-surface/30 transition-all duration-300">
              <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-text/35 uppercase">
                {"// 02 . approach"}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text">
                The Solution
              </h3>
              <p className="text-xs leading-relaxed text-text/60">
                {project.solution}
              </p>
            </div>

            {/* Outcome Card */}
            <div className="group rounded-xl border border-border/80 bg-surface/20 p-6 space-y-4 hover:border-text/25 hover:bg-surface/30 transition-all duration-300">
              <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-text/35 uppercase">
                {"// 03 . outcome"}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text">
                The Impact
              </h3>
              <p className="text-xs leading-relaxed text-text/60">
                {project.impact}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Styled Action Buttons Row */}
      <section className="flex flex-wrap items-center justify-between gap-6 border-b border-border py-12">
        <div className="flex flex-wrap gap-4">
          {project.liveUrl ? (
            <Link
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded bg-text px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-bg hover:bg-text/80 transition-colors"
            >
              <span>Launch App</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          ) : null}
          {project.githubUrl ? (
            <Link
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded border border-border bg-surface px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-text hover:bg-surface/85 hover:border-text/25 transition-all"
            >
              <span>View Source</span>
            </Link>
          ) : null}
        </div>

        <Link
          href="/contact"
          className="focus-ring group/contact inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-text hover:text-text/70 transition-colors"
        >
          <span>Discuss Project</span>
          <span className="transition-transform group-hover/contact:translate-x-1">→</span>
        </Link>
      </section>

      {/* Premium Next Project Card Block */}
      {nextProject ? (
        <section className="pt-16">
          <Link
            href={`/projects/${nextProject.slug}`}
            className="focus-ring group relative block overflow-hidden rounded-xl border border-border/80 bg-surface/30 p-8 sm:p-10 hover:border-text/25 hover:bg-surface/50 transition-all duration-300"
          >
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-text/40">
              Up Next
            </span>
            <div className="mt-4 flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-end">
              <h3 className="text-2xl sm:text-4xl font-heading font-black uppercase tracking-tight text-text group-hover:text-text/70 transition-colors">
                {nextProject.title}
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-text/50 group-hover:text-text transition-colors">
                <span>View Case Study</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        </section>
      ) : null}
    </article>
  );
}
