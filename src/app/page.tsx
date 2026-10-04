import Image from "next/image";
import Link from "next/link";
import { Meteors } from "@/components/magicui/meteors";
import { TextAnimate } from "@/components/magicui/text-animate";
import { siteContent } from "@/content/site";
import { projects } from "@/content/projects";

export default function HomePage() {
  const harmoniq = projects.find((p) => p.slug === "harmoniq");
  const magma = projects.find((p) => p.slug === "magma-terminal-workspace");
  const orbit = projects.find((p) => p.slug === "orbit-mobile-automation");

  return (
    <div className="mx-auto max-w-6xl w-full space-y-[clamp(4rem,9vw,7.5rem)] pb-20 pt-2 sm:pt-6">
      {/* 1. Hero Section — Fluid, Viewport-Controlled Composition */}
      <section className="relative overflow-hidden pb-2 pt-2 sm:pb-6 sm:pt-6">
        <Meteors
          number={14}
          minDelay={0}
          maxDelay={4}
          minDuration={4}
          maxDuration={8}
          className="bg-text/10"
        />

        <div className="relative z-10 grid w-full gap-[clamp(2rem,5vw,4.5rem)] lg:grid-cols-[1.25fr_0.75fr] items-center">
          <div className="space-y-[clamp(1.25rem,2.8vw,1.75rem)]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-text/50">
                Profile
              </span>
            </div>

            <h1 className="max-w-2xl font-heading text-[clamp(2.25rem,5.5vw,3.75rem)] font-semibold leading-[1.08] tracking-tight text-text">
              <TextAnimate
                as="span"
                animation="blurIn"
                by="text"
                duration={0.6}
                className="block text-text font-semibold"
              >
                {`Hi, I'm ${siteContent.fullName.split(" ")[0]}.`}
              </TextAnimate>
              <TextAnimate
                as="span"
                animation="slideUp"
                by="word"
                delay={0.15}
                duration={0.55}
                className="block text-text font-semibold mt-2"
              >
                I build software systems for robotics and intelligent hardware.
              </TextAnimate>
            </h1>

            <p className="max-w-xl text-[clamp(13px,1.2vw,14px)] leading-relaxed text-text/70">
              Systems engineer focused on embedded architecture, autonomous hardware control, and production software.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <a
                href="#selected-work"
                className="focus-ring inline-flex items-center justify-center rounded-md bg-text px-6 py-3 text-[13px] font-semibold text-bg transition-colors hover:bg-text/85"
              >
                <span>Selected work</span>
                <span className="ml-2">↓</span>
              </a>
              <Link
                href="/contact"
                className="focus-ring group inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-[13px] font-semibold text-text transition-colors hover:border-text hover:bg-surface"
              >
                <span>Let&apos;s talk</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>

          {/* Morph Aura + Portrait — Viewport-proportional sizing */}
          <div className="group relative mx-auto w-[clamp(180px,26vw,280px)] max-h-[min(38vh,280px)] aspect-square lg:mt-0">
            <span
              aria-hidden
              className="color-orb absolute -inset-6 rounded-full bg-text/[0.03] blur-3xl"
              style={{ "--float-duration": "10s" } as React.CSSProperties}
            />

            <div
              className="absolute inset-0 border border-border bg-surface/40 transition-all duration-700 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-hover:rotate-2"
              style={{
                animation: "morph 8s ease-in-out infinite",
                borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
              }}
            />

            <div
              className="absolute inset-0 -translate-x-1 -translate-y-1 border border-border-subtle transition-all duration-700 ease-out group-hover:-translate-x-2 group-hover:-translate-y-2"
              style={{
                animation: "morph 8s ease-in-out infinite alternate",
                animationDelay: "-2s",
                borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
              }}
            />

            <div
              className="relative aspect-square w-full h-full overflow-hidden border border-border-strong bg-surface transition-all duration-700 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:rotate-[-1deg]"
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
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-[11px] font-medium text-text/50">
                Engineer · Systems Architect
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Selected Work — Fluid Editorial Project Features */}
      <section id="selected-work" className="space-y-[clamp(3.5rem,7vw,5.5rem)] border-t border-border-subtle pt-[clamp(3rem,6vw,5rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <span className="text-[11px] font-semibold text-text/50">
              Selected work
            </span>
            <h2 className="mt-1 font-heading text-[clamp(1.5rem,3.2vw,2.25rem)] font-semibold tracking-tight text-text">
              Featured systems &amp; software
            </h2>
          </div>
          <Link
            href="/projects"
            className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-text/70 hover:text-text transition-colors"
          >
            <span>Browse all projects</span>
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Project 1: Harmoniq (Asymmetric 60/40 — Visual Left, Narrative Right) */}
        {harmoniq && (
          <article className="grid gap-[clamp(1.75rem,4vw,3.5rem)] lg:grid-cols-[1.25fr_0.75fr] items-center">
            <Link
              href={`/projects/${harmoniq.slug}`}
              className="focus-ring group relative block overflow-hidden rounded-xl border border-border-subtle bg-surface/30 transition-colors hover:border-border max-h-[clamp(240px,36vw,420px)]"
              aria-label={`View ${harmoniq.title} case study`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={harmoniq.coverImage!}
                  alt={harmoniq.coverAlt!}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
            </Link>

            <div className="space-y-[clamp(1rem,2vw,1.5rem)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-accent-blue">
                    {harmoniq.category} · Digital Identity
                  </span>
                  <span className="text-text/30">&middot;</span>
                  <span className="text-[11px] text-text/50">{harmoniq.timeline}</span>
                </div>
                <h3 className="font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] font-semibold tracking-tight text-text">
                  <Link href={`/projects/${harmoniq.slug}`} className="hover:text-text/80 transition-colors">
                    {harmoniq.title}
                  </Link>
                </h3>
              </div>

              <div className="space-y-2.5 text-[13px] leading-relaxed text-text/70">
                <p>
                  <strong className="font-semibold text-text">The Problem: </strong>
                  {harmoniq.problem}
                </p>
                <p>
                  <strong className="font-semibold text-text">Outcome: </strong>
                  {harmoniq.impact}
                </p>
              </div>

              {/* Substantiated Metric */}
              <div className="rounded-lg border border-border-subtle bg-surface/40 px-4 py-3">
                <span className="block text-[11px] font-semibold text-text/50">
                  Substantiated proof point
                </span>
                <p className="mt-0.5 text-[13px] font-medium text-text">
                  Zero-install recipient view · 100% offline NFC vCard fallback
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {harmoniq.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-border-subtle bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-text/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-1">
                <Link
                  href={`/projects/${harmoniq.slug}`}
                  className="focus-ring inline-flex items-center gap-1 text-[13px] font-semibold text-text hover:text-text/70 transition-colors"
                >
                  <span>Read case study</span>
                  <span>→</span>
                </Link>
                {harmoniq.liveUrl && (
                  <Link
                    href={harmoniq.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-text/50 hover:text-text transition-colors"
                  >
                    <span>Visit product</span>
                    <span>↗</span>
                  </Link>
                )}
              </div>
            </div>
          </article>
        )}

        {/* Project 2: Magma (Inverted 45/55 — Narrative Left, Visual Right) */}
        {magma && (
          <article className="grid gap-[clamp(1.75rem,4vw,3.5rem)] border-t border-border-subtle pt-[clamp(3rem,6vw,5rem)] lg:grid-cols-[0.8fr_1.2fr] items-center">
            <div className="space-y-[clamp(1rem,2vw,1.5rem)] lg:order-1 order-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-accent-orange">
                    {magma.category} · Systems Engineering
                  </span>
                  <span className="text-text/30">&middot;</span>
                  <span className="text-[11px] text-text/50">{magma.timeline}</span>
                </div>
                <h3 className="font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] font-semibold tracking-tight text-text">
                  <Link href={`/projects/${magma.slug}`} className="hover:text-text/80 transition-colors">
                    {magma.title}
                  </Link>
                </h3>
              </div>

              <div className="space-y-2.5 text-[13px] leading-relaxed text-text/70">
                <p>
                  <strong className="font-semibold text-text">The Problem: </strong>
                  {magma.problem}
                </p>
                <p>
                  <strong className="font-semibold text-text">Outcome: </strong>
                  {magma.impact}
                </p>
              </div>

              {/* Substantiated Metric */}
              <div className="rounded-lg border border-border-subtle bg-surface/40 px-4 py-3">
                <span className="block text-[11px] font-semibold text-text/50">
                  Substantiated proof point
                </span>
                <p className="mt-0.5 text-[13px] font-medium text-text">
                  GPU-accelerated VTE rendering · Native Debian packaging
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {magma.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-border-subtle bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-text/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-1">
                <Link
                  href={`/projects/${magma.slug}`}
                  className="focus-ring inline-flex items-center gap-1 text-[13px] font-semibold text-text hover:text-text/70 transition-colors"
                >
                  <span>Read case study</span>
                  <span>→</span>
                </Link>
                {magma.githubUrl && (
                  <Link
                    href={magma.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-text/50 hover:text-text transition-colors"
                  >
                    <span>View source on GitHub</span>
                    <span>↗</span>
                  </Link>
                )}
              </div>
            </div>

            <Link
              href={`/projects/${magma.slug}`}
              className="focus-ring group relative block overflow-hidden rounded-xl border border-border-subtle bg-surface/30 transition-colors hover:border-border lg:order-2 order-1 max-h-[clamp(240px,36vw,420px)]"
              aria-label={`View ${magma.title} case study`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={magma.coverImage!}
                  alt={magma.coverAlt!}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
            </Link>
          </article>
        )}

        {/* Project 3: Orbit (Wide Editorial Format) */}
        {orbit && (
          <article className="border-t border-border-subtle pt-[clamp(3rem,6vw,5rem)] space-y-8">
            <Link
              href={`/projects/${orbit.slug}`}
              className="focus-ring group relative block overflow-hidden rounded-xl border border-border-subtle bg-surface/30 transition-colors hover:border-border max-h-[clamp(240px,32vw,380px)]"
              aria-label={`View ${orbit.title} case study`}
            >
              <div className="relative aspect-[21/9] w-full overflow-hidden max-h-[380px]">
                <Image
                  src={orbit.coverImage!}
                  alt={orbit.coverAlt!}
                  fill
                  sizes="100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                />
              </div>
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-accent-green">
                    {orbit.category} · Device Automation
                  </span>
                  <span className="text-text/30">&middot;</span>
                  <span className="text-[11px] text-text/50">{orbit.timeline}</span>
                </div>
                <h3 className="font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] font-semibold tracking-tight text-text">
                  <Link href={`/projects/${orbit.slug}`} className="hover:text-text/80 transition-colors">
                    {orbit.title}
                  </Link>
                </h3>
                <p className="text-[13px] leading-relaxed text-text/70">
                  <strong className="font-semibold text-text">The Problem: </strong>
                  {orbit.problem}
                </p>
                <p className="text-[13px] leading-relaxed text-text/70">
                  <strong className="font-semibold text-text">Outcome: </strong>
                  {orbit.impact}
                </p>
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div className="rounded-lg border border-border-subtle bg-surface/40 p-4 space-y-1">
                  <span className="block text-[11px] font-semibold text-text/50">
                    Substantiated proof point
                  </span>
                  <p className="text-[13px] font-medium text-text">
                    Context-aware policy evaluation · Hive local storage
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-[11px] font-semibold text-text/50">
                    Core technologies
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {orbit.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-border-subtle bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-text/60"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/projects/${orbit.slug}`}
                    className="focus-ring inline-flex items-center gap-1 text-[13px] font-semibold text-text hover:text-text/70 transition-colors"
                  >
                    <span>Read case study</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        )}
      </section>

      {/* 3. Capabilities — Open Section Divided by Fine Rules */}
      <section id="skills" className="border-t border-border-subtle pt-[clamp(3rem,6vw,5rem)]">
        <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <div>
            <span className="text-[11px] font-semibold text-text/50">
              Capabilities
            </span>
            <h2 className="mt-1 font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] font-semibold tracking-tight text-text">
              Technical focus
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-text/60">
              Disciplined engineering across software runtimes, physical mechatronics, and production architectures.
            </p>
          </div>

          <div className="divide-y divide-border-subtle">
            {/* Domain 1: Software */}
            <div className="py-[clamp(1.25rem,2.5vw,1.75rem)] first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-heading text-[15px] font-semibold text-text">
                  Software
                </h3>
                <span className="text-[11px] text-text/40">
                  Distributed systems · Logic · Protocols
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text/70">
                High-throughput services, atomic allocation algorithms, type-safe API boundaries, and offline data sync.
              </p>
              <p className="mt-3 text-[11px] text-text/50">
                <span className="font-semibold text-text/60">Supporting technologies: </span>
                Rust, TypeScript, Python, Go, Fastify, PostgreSQL, Redis, NATS, SQLite, WebSockets.
              </p>
            </div>

            {/* Domain 2: Embedded & Robotics */}
            <div className="py-[clamp(1.25rem,2.5vw,1.75rem)]">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-heading text-[15px] font-semibold text-text">
                  Embedded &amp; Robotics
                </h3>
                <span className="text-[11px] text-text/40">
                  Control systems · Actuation · Firmware
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text/70">
                Nonlinear dynamic system control, sensor integration, microcontroller firmware, and hardware prototyping.
              </p>
              <p className="mt-3 text-[11px] text-text/50">
                <span className="font-semibold text-text/60">Supporting technologies: </span>
                ROS, C / C++, Arduino, MATLAB, KiCad, Onshape, SolidWorks, UART / I2C / SPI.
              </p>
            </div>

            {/* Domain 3: Systems & Product */}
            <div className="py-[clamp(1.25rem,2.5vw,1.75rem)] last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-heading text-[15px] font-semibold text-text">
                  Systems &amp; Product
                </h3>
                <span className="text-[11px] text-text/40">
                  Native platforms · Security · Runtime
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text/70">
                Cross-platform mobile and desktop applications, memory sandboxing, packaging, and production delivery.
              </p>
              <p className="mt-3 text-[11px] text-text/50">
                <span className="font-semibold text-text/60">Supporting technologies: </span>
                Flutter, Android, Next.js, Firebase, Linux / Debian, FFI, WebKitGTK.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Short Profile & Credibility Statement */}
      <section className="border-t border-border-subtle pt-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-semibold text-text/50">
            Approach
          </span>
          <blockquote className="font-heading text-[clamp(1.25rem,2.8vw,1.75rem)] font-semibold leading-[1.3] tracking-tight text-text">
            &ldquo;I approach software like physical engineering: disciplined boundaries, verifiable behavior, and systems built to last under real operational loads.&rdquo;
          </blockquote>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-text/60">
              Available for technical R&amp;D, architecture reviews, and systems delivery.
            </p>
            <Link
              href="/contact"
              className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-text hover:text-text/70 transition-colors"
            >
              <span>Initiate a conversation</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
