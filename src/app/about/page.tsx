import type { Metadata } from "next";
import Link from "next/link";
import { experience } from "@/content/experience";
import { siteContent } from "@/content/site";
import { TextScramble } from "@/components/text-scramble";

export const metadata: Metadata = {
  title: "About Me",
  description: "Professional profile, technical capabilities, experience timeline, and academic background of Kayode Williams Olalere.",
  openGraph: {
    title: "About Me | Kayode Williams Olalere",
    description: "Professional profile, technical capabilities, experience timeline, and academic background of Kayode Williams Olalere.",
    url: "/about/"
  }
};

export default function AboutPage() {
  return (
    <div className="space-y-20 pb-16 bg-bg">
      {/* 2-Column Header Grid */}
      <section className="relative pt-12 border-b border-border pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-14">
          {/* Main profile intro */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text/60">
                Professional Profile
              </span>
              <span className="h-px w-10 bg-border" />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-text tracking-tighter uppercase leading-[0.85]">
              <TextScramble text="About" duration={1200} className="font-heading font-black text-text" /> <br />
              <TextScramble text="Me" duration={1200} delay={200} className="text-text/40 italic font-light lowercase" />
            </h1>

            <p className="max-w-3xl text-sm font-black uppercase tracking-[0.18em] text-text/80 md:text-base">
              {siteContent.role}
            </p>

            <p className="max-w-3xl text-lg md:text-xl text-text/50 font-medium leading-relaxed">
              {siteContent.shortBio}
            </p>

            <div className="pt-2">
              <Link
                href="/cv"
                className="focus-ring inline-flex items-center gap-2 rounded bg-text px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-bg hover:bg-text/85 transition-colors"
              >
                <span>Request CV</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Sidebar Card */}
          <div className="rounded-xl border border-border bg-surface/30 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {siteContent.highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="border-b border-border/40 pb-2.5 last:border-0 last:pb-0 space-y-1"
                >
                  <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                    {highlight.title}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-text">
                    {highlight.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Profile Detail Callout */}
      <section className="grid gap-8 border-b border-border py-12 sm:py-16 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
          Profile
        </h2>
        <p className="max-w-3xl text-lg leading-8 text-text/75 sm:text-xl sm:leading-9 pl-6 border-l border-border/80 font-medium italic">
          {siteContent.longBio}
        </p>
      </section>

      {/* Capabilities Modular Grid */}
      <section className="space-y-10 border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
              Capabilities
            </h2>
            <p className="mt-3 text-xs leading-5 text-text/40">
              Specific core competencies mapped across engineering research and production development.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(siteContent.skills).map(([group, items], index) => (
              <div
                key={group}
                className="rounded-xl border border-border bg-surface/30 p-6 hover:border-text/25 hover:bg-surface/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-text/40">
                    {`// 0${index + 1} . ${group.toLowerCase()}`}
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text">
                    {group}
                  </h3>
                </div>
                <div className="mt-6 flex flex-wrap gap-1">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="rounded-sm border border-border bg-bg/40 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-text/50"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Experience Timeline */}
      <section className="space-y-10 border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
              Experience
            </h2>
            <p className="mt-3 text-xs leading-5 text-text/40">
              Roles covering independent contract delivery, tech R&D, and structural mentoring.
            </p>
          </div>
          <div className="relative border-l border-border/80 pl-8 ml-3 space-y-12 py-2">
            {experience.map((item) => (
              <div key={item.id} className="group relative space-y-3">
                {/* Node connector dot */}
                <div className="absolute -left-[37px] mt-1.5 h-2 w-2 rounded-full border border-border/85 bg-bg transition-all duration-300 ease-out group-hover:scale-125 group-hover:border-text group-hover:bg-text" />

                {/* Date & Organization Header */}
                <div className="flex flex-wrap items-center gap-x-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-text/40">
                  <span>{item.period}</span>
                  <span>&middot;</span>
                  <span className="text-text/75">{item.organization}</span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold uppercase tracking-[0.06em] text-text transition-colors duration-300 group-hover:text-text/70">
                  {item.title}
                </h3>
                <p className="max-w-2xl text-xs leading-relaxed text-text/60">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education and Certificates Grid */}
      <section className="space-y-10 py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text/50">
              Credentials
            </h2>
            <p className="mt-3 text-xs leading-5 text-text/40">
              Academic degrees and professional program certificates.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Education Panel */}
            <div className="rounded-xl border border-border bg-surface/30 p-6 sm:p-8 space-y-6">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                Academic Degrees
              </span>
              <div className="space-y-6">
                {siteContent.education.map((item) => (
                  <div
                    key={`${item.institution}-${item.program}`}
                    className="space-y-3 border-b border-border/40 pb-5 last:border-b-0 last:pb-0"
                  >
                    <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                      {item.period}
                    </span>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-text">
                      {item.institution}
                    </h4>
                    <p className="text-xs font-semibold text-text/60">
                      {item.program}
                    </p>
                    <ul className="space-y-1.5 text-xs text-text/55 leading-relaxed">
                      {item.notes.map((note) => (
                        <li key={note}>&middot; {note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications Panel */}
            <div className="rounded-xl border border-border bg-surface/30 p-6 sm:p-8 space-y-6">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                Program Certificates
              </span>
              <div className="space-y-6">
                {siteContent.certifications.map((item) => (
                  <div
                    key={`${item.issuer}-${item.title}`}
                    className="space-y-3 border-b border-border/40 pb-5 last:border-b-0 last:pb-0 flex flex-col justify-between min-h-[120px]"
                  >
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/40">
                        {item.date}
                      </span>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-text">
                        {item.title}
                      </h4>
                      <p className="text-xs text-text/60">
                        {item.issuer}
                      </p>
                    </div>
                    {item.credentialUrl ? (
                      <Link
                        href={item.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring self-start inline-flex rounded border border-border bg-surface px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-text transition-colors hover:bg-surface/80 hover:border-text/25"
                      >
                        View Certificate
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
