"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProjectVisual } from "@/components/project-visual";
import type { Project } from "@/types/content";

interface ProjectDetailClientProps {
  project: Project;
  nextProject: Project | undefined;
}

export function ProjectDetailClient({ project, nextProject }: ProjectDetailClientProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [activeVisual, setActiveVisual] = useState<{ src: string; alt: string } | null>(null);
  const categoryTone = {
    Web: "bg-accent-blue/10",
    Mobile: "bg-accent-green/10",
    Backend: "bg-accent-orange/10",
    AI: "bg-accent-violet/10",
    Desktop: "bg-surface"
  }[project.category];

  useEffect(() => {
    if (!activeVisual) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveVisual(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeVisual]);

  return (
    <article className="pb-20 pt-4 sm:pb-24 sm:pt-8">
      <Link
        href="/projects"
        className="focus-ring group inline-flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-[11px] font-semibold text-text/55 transition-colors hover:text-text"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
        <span>Back to projects</span>
      </Link>

      <header className={`relative mt-8 overflow-hidden rounded-xl p-6 sm:mt-10 sm:p-10 lg:p-14 ${categoryTone}`}>
        <span className="absolute -right-10 -top-12 h-44 w-44 rounded-full border-[28px] border-border-subtle" />
        <span className="absolute -bottom-20 left-[42%] h-48 w-48 rounded-full border-[34px] border-border-subtle" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-end">
          <div className="space-y-7">
            <span className="text-[11px] font-semibold text-text/40">
              {project.category}
            </span>
            <h1 className="max-w-4xl font-heading text-[15px] font-semibold leading-[0.85] tracking-tighter text-text">
              {project.title}
            </h1>
            <p className="max-w-2xl text-[13px] font-semibold leading-relaxed text-text/65">
              {project.shortDescription}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg/65 p-2 backdrop-blur-md">
            {[
              ["Contribution", "Solo"],
              ["Timeline", project.timeline],
              ["Role", project.role],
              ["Discipline", project.category]
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`rounded-xl bg-bg/80 p-4 ${index === 2 ? "col-span-2" : ""}`}
              >
                <span className="text-[11px] text-text/35">
                  {label}
                </span>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-text">
                  {value}
                </p>
              </div>
            ))}
            <div className="col-span-2 flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-text/[0.07] px-2.5 py-1 text-[11px] text-text/55"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {(project.coverImage || project.visualKind) && (
        <section aria-label={`${project.title} visuals`} className="py-12 sm:py-16">
          {project.coverImage ? (
            <button
              type="button"
              onClick={() =>
                setActiveVisual({
                  src: project.coverImage!,
                  alt: project.coverAlt ?? `${project.title} interface`
                })
              }
              className="focus-ring group/visual relative block w-full cursor-zoom-in overflow-hidden rounded-xl text-left shadow-[0_24px_80px_rgb(15_15_15_/_0.12)]"
              aria-label={`View ${project.coverAlt ?? `${project.title} interface`} full size`}
            >
              <ProjectVisual
                project={project}
                priority
                className="aspect-[16/9] w-full rounded-xl"
              />
              <span className="absolute bottom-4 right-4 rounded-md bg-text/70 px-3 py-2 text-[11px] font-semibold text-bg opacity-0 backdrop-blur transition-opacity group-hover/visual:opacity-100 group-focus-visible/visual:opacity-100">
                View full size
              </span>
            </button>
          ) : (
            <ProjectVisual
              project={project}
              priority
              className="aspect-[16/9] w-full rounded-xl shadow-[0_24px_80px_rgb(15_15_15_/_0.12)]"
            />
          )}
          {project.gallery && project.gallery.length > 1 ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {project.gallery.slice(1).map((visual) => (
                <button
                  key={visual.src}
                  type="button"
                  onClick={() => setActiveVisual(visual)}
                  className="focus-ring group/visual relative aspect-[16/10] cursor-zoom-in overflow-hidden rounded-xl bg-surface text-left"
                  aria-label={`View ${visual.alt} full size`}
                >
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain transition-transform duration-500 group-hover/visual:scale-[1.02]"
                  />
                  <span className="absolute bottom-3 right-3 rounded-md bg-text/70 px-3 py-2 text-[11px] font-semibold text-bg opacity-0 backdrop-blur transition-opacity group-hover/visual:opacity-100 group-focus-visible/visual:opacity-100">
                    View full size
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-xl bg-text p-7 text-bg sm:p-10">
        <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <h2 className="text-[11px] font-semibold text-bg/50">Overview</h2>
          <p className="max-w-3xl text-[13px] font-semibold leading-8 text-bg/80">
            {project.description}
          </p>
        </div>
      </section>

      {project.liveUrl ? (
        <section className="py-12 sm:py-16">
          <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
            <div>
              <h2 className="text-[11px] font-semibold text-text/50">
                Live preview
              </h2>
              <p className="mt-3 text-[11px] leading-5 text-text/40">
                Interact with the application directly inside this frame, or launch it in a new window.
              </p>
            </div>
            <div className="w-full">
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                {/* Browser window header */}
                <div className="flex items-center justify-between border-b border-border/80 bg-surface/50 px-4 py-3 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  </div>
                  <div className="mx-4 flex-1 max-w-md rounded-md bg-bg px-3 py-1 text-center text-[11px] text-text/45 truncate">
                    {project.liveUrl}
                  </div>
                  <div className="w-[30px]" />
                </div>
                {/* Iframe container */}
                <div className="relative w-full aspect-[16/10] bg-bg min-h-[300px] sm:min-h-[450px]">
                  {iframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/50 backdrop-blur-[1px] transition-opacity duration-300">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-text border-t-transparent" />
                      <span className="text-[11px] text-text/40">
                        Loading preview
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

      <section aria-label="Case study" className="py-12 sm:py-16">
        <div className="grid gap-8">
          <div>
            <h2 className="text-[11px] font-semibold text-text/50">
              Case study
            </h2>
            <p className="mt-3 max-w-xl text-[11px] leading-5 text-text/40">
              Technical breakdown of the challenge, implementation approach, and project outcomes.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="group space-y-4 rounded-xl bg-accent-blue/10 p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
              <span className="text-[11px] text-text/35">
                01 — Challenge
              </span>
              <h3 className="text-[13px] font-semibold text-text">
                The problem
              </h3>
              <p className="text-[13px] leading-relaxed text-text/60">
                {project.problem}
              </p>
            </div>

            <div className="group space-y-4 rounded-xl bg-accent-green/10 p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
              <span className="text-[11px] text-text/35">
                02 — Approach
              </span>
              <h3 className="text-[13px] font-semibold text-text">
                The solution
              </h3>
              <p className="text-[13px] leading-relaxed text-text/60">
                {project.solution}
              </p>
            </div>

            <div className="group space-y-4 rounded-xl bg-accent-orange/10 p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
              <span className="text-[11px] text-text/35">
                03 — Outcome
              </span>
              <h3 className="text-[13px] font-semibold text-text">
                The impact
              </h3>
              <p className="text-[13px] leading-relaxed text-text/60">
                {project.impact}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-xl bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap gap-4">
          {project.liveUrl ? (
            <Link
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-text px-6 py-3.5 text-[13px] font-semibold text-bg hover:bg-text/80 transition-colors"
            >
              <span>Launch app</span>
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
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-border bg-surface px-6 py-3.5 text-[13px] font-semibold text-text hover:bg-surface/85 hover:border-text/25 transition-all"
            >
              <span>View source</span>
            </Link>
          ) : null}
        </div>

        <Link
          href="/contact"
          className="focus-ring group/contact inline-flex items-center gap-2 text-[13px] font-semibold text-text hover:text-text/70 transition-colors"
        >
          <span>Discuss project</span>
          <span className="transition-transform group-hover/contact:translate-x-1">→</span>
        </Link>
      </section>

      {nextProject ? (
        <section className="pt-16">
          <Link
            href={`/projects/${nextProject.slug}`}
            className="focus-ring group relative block overflow-hidden rounded-xl bg-accent-violet/10 p-8 transition-all duration-300 hover:-translate-y-1 sm:p-10"
          >
            <span className="text-[11px] font-semibold text-text/40">
              Up next
            </span>
            <div className="mt-4 flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-end">
              <h3 className="text-[15px] font-heading font-semibold tracking-tight text-text group-hover:text-text/70 transition-colors">
                {nextProject.title}
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text/50 group-hover:text-text transition-colors">
                <span>View case study</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        </section>
      ) : null}

      {activeVisual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size project image"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-text/90 p-3 backdrop-blur-sm sm:p-8"
          onClick={() => setActiveVisual(null)}
        >
          <button
            type="button"
            onClick={() => setActiveVisual(null)}
            className="focus-ring absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-bg text-[15px] font-semibold text-text sm:right-7 sm:top-7"
            aria-label="Close full-size image"
          >
            ×
          </button>
          <div
            className="relative h-full max-h-[90vh] w-full max-w-[96rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activeVisual.src}
              alt={activeVisual.alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
