import type { Metadata } from "next";
import Link from "next/link";
import { TextAnimate } from "@/components/magicui/text-animate";
import { experience } from "@/content/experience";
import { siteContent } from "@/content/site";

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
      {/* Header */}
      <section className="technical-grid relative overflow-hidden rounded-xl border border-accent-blue/10 bg-accent-blue/[0.025] p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-14">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-text/60">
                Profile
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-semibold text-text tracking-tight leading-[0.9]">
              <TextAnimate as="span" animation="blurIn" by="text" className="font-heading font-semibold text-text">
                About
              </TextAnimate>
              <br />
              <TextAnimate
                as="span"
                animation="slideUp"
                by="word"
                delay={0.15}
                className="font-light italic text-text/40"
              >
                Me
              </TextAnimate>
            </h1>

            <p className="max-w-3xl text-[13px] font-semibold text-text/80">
              {siteContent.role}
            </p>

            <TextAnimate
              animation="slideUp"
              by="word"
              delay={0.2}
              duration={0.7}
              className="max-w-3xl text-[13px] font-semibold leading-relaxed text-text/50"
            >
              {siteContent.shortBio}
            </TextAnimate>

            <div className="pt-2">
              <Link
                href="/cv"
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-text px-6 py-3.5 text-[13px] font-semibold text-bg hover:bg-text/85 transition-colors"
              >
                <span>Request CV</span>
              </Link>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="rounded-xl border border-border bg-surface/30 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {siteContent.highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="border-b border-border/40 pb-2.5 last:border-0 last:pb-0 space-y-1"
                >
                  <span className="text-[11px] text-text/40">
                    {highlight.title}
                  </span>
                  <p className="text-[13px] font-semibold text-text">
                    {highlight.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="grid gap-8 border-b border-border py-12 sm:py-16 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
        <h2 className="text-[11px] font-semibold text-text/50">
          Profile
        </h2>
        <p className="max-w-3xl text-[13px] leading-8 text-text/75 pl-6 border-l border-border/80 font-semibold italic">
          {siteContent.longBio}
        </p>
      </section>

      {/* Capabilities */}
      <section className="space-y-10 border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-[11px] font-semibold text-text/50">
              Capabilities
            </h2>
            <p className="mt-3 text-[11px] leading-5 text-text/40">
              Core competencies across engineering research and production development.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(siteContent.skills).map(([group, items], index) => (
              <div
                key={group}
                className="rounded-xl border border-border bg-surface/30 p-6 hover:border-text/25 hover:bg-surface/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[11px] text-text/40">
                    {`0${index + 1}`}
                  </span>
                  <h3 className="text-[13px] font-semibold text-text">
                    {group}
                  </h3>
                </div>
                <div className="mt-6 flex flex-wrap gap-1">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-border bg-bg/40 px-2 py-0.5 text-[11px] text-text/50"
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

      {/* Experience */}
      <section className="space-y-10 border-b border-border py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-[11px] font-semibold text-text/50">
              Experience
            </h2>
            <p className="mt-3 text-[11px] leading-5 text-text/40">
              Roles covering independent contract delivery, tech R&D, and structural mentoring.
            </p>
          </div>
          <div className="relative border-l border-border/80 pl-8 ml-3 space-y-12 py-2">
            {experience.map((item) => (
              <div key={item.id} className="group relative space-y-3">
                <div className="absolute -left-[37px] mt-1.5 h-2 w-2 rounded-full border border-border/85 bg-bg transition-all duration-300 ease-out group-hover:scale-125 group-hover:border-text group-hover:bg-text" />

                <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-text/40">
                  <span>{item.period}</span>
                  <span>&middot;</span>
                  <span className="text-text/75">{item.organization}</span>
                </div>

                <h3 className="text-[13px] font-semibold text-text transition-colors duration-300 group-hover:text-text/70">
                  {item.title}
                </h3>
                <p className="max-w-2xl text-[13px] leading-relaxed text-text/60">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="space-y-10 py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <h2 className="text-[11px] font-semibold text-text/50">
              Credentials
            </h2>
            <p className="mt-3 text-[11px] leading-5 text-text/40">
              Academic degrees and professional program certificates.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Education */}
            <div className="rounded-xl border border-border bg-surface/30 p-6 sm:p-8 space-y-6">
              <span className="text-[11px] font-semibold text-text/40">
                Degrees
              </span>
              <div className="space-y-6">
                {siteContent.education.map((item) => (
                  <div
                    key={`${item.institution}-${item.program}`}
                    className="space-y-3 border-b border-border/40 pb-5 last:border-b-0 last:pb-0"
                  >
                    <span className="text-[11px] text-text/40">
                      {item.period}
                    </span>
                    <h4 className="text-[13px] font-semibold text-text">
                      {item.institution}
                    </h4>
                    <p className="text-[11px] font-semibold text-text/60">
                      {item.program}
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-text/55 leading-relaxed">
                      {item.notes.map((note) => (
                        <li key={note}>&middot; {note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="rounded-xl border border-border bg-surface/30 p-6 sm:p-8 space-y-6">
              <span className="text-[11px] font-semibold text-text/40">
                Certificates
              </span>
              <div className="space-y-6">
                {siteContent.certifications.map((item) => (
                  <div
                    key={`${item.issuer}-${item.title}`}
                    className="space-y-3 border-b border-border/40 pb-5 last:border-b-0 last:pb-0 flex flex-col justify-between min-h-[120px]"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] text-text/40">
                        {item.date}
                      </span>
                      <h4 className="text-[13px] font-semibold text-text">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-text/60">
                        {item.issuer}
                      </p>
                    </div>
                    {item.credentialUrl ? (
                      <Link
                        href={item.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring self-start inline-flex rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text transition-colors hover:bg-surface/80 hover:border-text/25"
                      >
                        View certificate
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
