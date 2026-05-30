import type { Metadata } from "next";
import Link from "next/link";
import { ContactActions } from "@/components/contact-actions";
import { ContactForm } from "@/components/contact-form";
import { siteContent } from "@/content/site";
import { TextScramble } from "@/components/text-scramble";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation, request systems design collaboration, or get in touch with Kayode Williams Olalere.",
  openGraph: {
    title: "Contact | Kayode Williams Olalere",
    description: "Start a conversation, request systems design collaboration, or get in touch with Kayode Williams Olalere.",
    url: "/contact/"
  }
};

export default function ContactPage() {
  const linkedIn = siteContent.socials.find((item) => item.label === "LinkedIn")?.href;
  const github = siteContent.socials.find((item) => item.label === "GitHub")?.href;

  return (
    <div className="space-y-16 pb-20 bg-bg">
      {/* Page Header */}
      <section className="relative pt-12 border-b border-border pb-10">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text/60">
              Start Conversation
            </span>
            <span className="h-px w-10 bg-border" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-text tracking-tighter uppercase leading-[0.85]">
            <TextScramble text="Contact" duration={1200} className="font-heading font-black text-text" /> <br />
            <span className="text-text/40 italic font-light lowercase">
              <TextScramble text="Me" duration={1200} delay={200} className="text-text/40 italic font-light lowercase" />
            </span>
          </h1>

          <p className="mt-2 max-w-3xl text-lg md:text-xl text-text/50 font-medium leading-relaxed">
            Share your project scope, timeline, and technical goals. I usually reply within one business day.
          </p>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left Side: Directory Details */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface/30 p-6 sm:p-8 space-y-8">
            {/* Primary Channels */}
            <div className="space-y-4">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/45">
                {"// 01 . primary channels"}
              </span>
              <p className="text-xs text-text/50 leading-relaxed">
                Connect directly through one of my primary communications streams.
              </p>
              <ContactActions />
            </div>

            {/* Social Grid */}
            <div className="space-y-4 border-t border-border/40 pt-6">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/45">
                {"// 02 . profile matrix"}
              </span>
              <div className="grid grid-cols-2 gap-3">
                {linkedIn && (
                  <Link
                    href={linkedIn}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring flex items-center justify-between rounded border border-border bg-surface px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text transition-colors hover:border-text"
                  >
                    <span>LinkedIn</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                )}
                {github && (
                  <Link
                    href={github}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring flex items-center justify-between rounded border border-border bg-surface px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text transition-colors hover:border-text"
                  >
                    <span>GitHub</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Engagement Guidelines */}
            <div className="space-y-4 border-t border-border/40 pt-6">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-text/45">
                {"// 03 . system parameters"}
              </span>
              <div className="space-y-2 font-mono text-[9px] text-text/50 uppercase tracking-widest leading-6">
                <div>
                  <span className="text-text/30">location:</span>{" "}
                  <span className="font-bold text-text/75">{siteContent.location}</span>
                </div>
                <div>
                  <span className="text-text/30">scope:</span>{" "}
                  <span className="font-bold text-text/75">Fullstack, Mobile, Mechatronics, R&D</span>
                </div>
                <div>
                  <span className="text-text/30">timezone:</span>{" "}
                  <span className="font-bold text-text/75">GMT+1 (West Africa Time)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
