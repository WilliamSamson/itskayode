import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { ContactForm } from "@/components/contact-form";
import { siteContent } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Me",
  description: "Get in touch with Kayode Williams Olalere for projects and collaborations."
};

export default function ContactPage() {
  const linkedIn = siteContent.socials.find((item) => item.label === "LinkedIn")?.href;
  const github = siteContent.socials.find((item) => item.label === "GitHub")?.href;

  return (
    <div className="space-y-20 pb-20">
      <section className="relative pt-12">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Start Conversation</span>
            <div className="h-[1px] w-12 bg-white/10" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white tracking-tighter uppercase leading-[0.85]">
            Contact <br />
            <span className="text-primary italic font-light lowercase">Me</span>
          </h1>

          <p className="mt-2 max-w-3xl text-lg md:text-xl text-text/50 font-medium leading-relaxed">
            Share your project scope, timeline, and technical goals. I usually reply within one business day.
          </p>
        </div>

        <div className="absolute -top-10 right-0 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
          <div className="h-[1px] w-24 bg-primary/40" />
          <div className="h-[1px] w-16 bg-primary" />
          <div className="h-[1px] w-32 bg-primary/20" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="border border-white/10 bg-surface/80">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Primary Channel</p>
            <p className="mt-3 text-sm uppercase tracking-[0.12em] text-white/65">Email</p>
            <Link
              href={`mailto:${siteContent.email}`}
              className="focus-ring mt-2 inline-block break-all text-base font-semibold text-white underline-offset-8 transition-colors hover:text-primary hover:underline"
            >
              {siteContent.email}
            </Link>
            {siteContent.phone ? (
              <>
                <p className="mt-4 text-sm uppercase tracking-[0.12em] text-white/65">Phone</p>
                <Link
                  href={`tel:${siteContent.phone.replace(/\s+/g, "")}`}
                  className="focus-ring mt-2 inline-block text-base font-semibold text-white underline-offset-8 transition-colors hover:text-primary hover:underline"
                >
                  {siteContent.phone}
                </Link>
              </>
            ) : null}
          </Card>

          <Card className="border border-white/10 bg-surface/80">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Professional Profiles</p>
            <div className="mt-4 grid gap-3">
              {linkedIn ? (
                <Link
                  href={linkedIn}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex items-center justify-between border border-white/15 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-primary hover:text-primary"
                >
                  LinkedIn
                  <span aria-hidden>↗</span>
                </Link>
              ) : null}
              {github ? (
                <Link
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex items-center justify-between border border-white/15 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-primary hover:text-primary"
                >
                  GitHub
                  <span aria-hidden>↗</span>
                </Link>
              ) : null}
            </div>
          </Card>

          <Card className="border border-white/10 bg-surface/80">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Engagement Notes</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-text/75">
              <p>- Full-stack builds, mobile systems, and technical architecture work.</p>
              <p>- Research and prototype-heavy collaborations are welcome.</p>
              <p>- Location: {siteContent.location}.</p>
            </div>
          </Card>
        </div>

        <div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
