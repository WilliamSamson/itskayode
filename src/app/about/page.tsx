import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { SectionHeading } from "@/components/section-heading";
import { experience } from "@/content/experience";
import { siteContent } from "@/content/site";

export const metadata: Metadata = {
  title: "About Me",
  description: "Professional profile, capabilities, experience, education, and values of Kayode Williams Olalere."
};

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-10 md:space-y-28">
      <section className="relative pt-12">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Professional Profile</span>
            <div className="h-[1px] w-12 bg-white/10" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white tracking-tighter uppercase leading-[0.85]">
            About <br />
            <span className="text-primary italic font-light lowercase">Me</span>
          </h1>

          <p className="max-w-3xl text-sm font-semibold uppercase tracking-[0.18em] text-white/75 md:text-base">
            {siteContent.role}
          </p>

          <p className="mt-2 max-w-3xl text-lg md:text-xl text-text/50 font-medium leading-relaxed">
            {siteContent.shortBio}
          </p>

          <div className="mt-2 flex flex-wrap gap-4">
            <Link
              href="/cv"
              className="focus-ring inline-flex items-center gap-2 rounded-sm border border-primary px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-primary hover:text-black"
            >
              View CV
            </Link>
          </div>
        </div>

        <div className="absolute -top-10 right-0 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
          <div className="h-[1px] w-24 bg-primary/40" />
          <div className="h-[1px] w-16 bg-primary" />
          <div className="h-[1px] w-32 bg-primary/20" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {siteContent.highlights.map((item) => (
          <Card key={item.title} className="border border-white/10 bg-surface/80">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">{item.title}</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="max-w-5xl space-y-6">
        <SectionHeading title="Profile Summary" description="Execution, systems thinking, and multidisciplinary engineering depth." />
        <p className="text-base leading-8 text-text/75 md:text-lg md:leading-9">{siteContent.longBio}</p>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Capabilities" description="Tools and domains I have worked with across production delivery and R&D." />
        <div className="space-y-4">
          {Object.entries(siteContent.skills).map(([group, items], index) => (
            <Card key={group} className="overflow-hidden border border-white/10 bg-surface/80 p-0">
              <div className="grid md:grid-cols-[240px_1fr]">
                <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r md:p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{`0${index + 1}`}</p>
                  <h3 className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">{group}</h3>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="h-px w-10 bg-primary/80" />
                    <span className="h-px w-7 border-t border-dotted border-primary/80" />
                  </div>
                </div>

                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap gap-2.5">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/90 transition-colors hover:border-primary hover:text-white"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          Applied across production systems, client delivery, and exploratory R&D work.
        </p>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Experience" description="Independent delivery, research-led prototyping, and technical mentorship." />
        <div className="space-y-4">
          {experience.map((item) => (
            <Card key={item.id} className="border border-white/10 bg-surface/80">
              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="space-y-2 border-b border-white/10 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{item.period}</p>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/75">{item.organization}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold uppercase tracking-[0.06em] text-white">{item.title}</h3>
                  <p className="text-sm leading-7 text-text/75">{item.summary}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Values" description="How I approach engineering, research, and collaboration." />
        <div className="grid gap-4 md:grid-cols-2">
          {siteContent.values.map((value, index) => (
            <Card key={value} className="border border-white/10 bg-surface/80">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{`0${index + 1}`}</p>
              <p className="mt-3 text-sm leading-7 text-text/75">{value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading title="Education and Certificates" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border border-white/10 bg-surface/80">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Education</h3>
            <div className="mt-6 space-y-5">
              {siteContent.education.map((item) => (
                <div key={`${item.institution}-${item.program}`} className="space-y-3 border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{item.period}</p>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">{item.institution}</p>
                  <p className="text-sm text-text/75">{item.program}</p>
                  <ul className="space-y-2 text-sm leading-7 text-text/75">
                    {item.notes.map((note) => (
                      <li key={note}>- {note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-white/10 bg-surface/80">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Certificates</h3>
            <div className="mt-6 space-y-5">
              {siteContent.certifications.map((item) => (
                <div key={`${item.issuer}-${item.title}`} className="space-y-3 border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{item.date}</p>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-text/75">{item.issuer}</p>
                  {item.credentialUrl ? (
                    <Link
                      href={item.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-flex rounded-sm border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-primary hover:text-primary"
                    >
                      View Certificate
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
