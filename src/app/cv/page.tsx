import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Request Resume",
  description: "Securely request the professional resume and R&D portfolio details of Kayode Williams Olalere.",
  openGraph: {
    title: "Request Resume | Kayode Williams Olalere",
    description: "Securely request the professional resume and R&D portfolio details of Kayode Williams Olalere.",
    url: "/cv/"
  }
};

export default function CvPage() {
  return (
    <div className="space-y-12 bg-bg pb-16 pt-8 md:space-y-16 md:pt-10">
      <section className="grid gap-8 border-b border-border pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pb-12">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text/60">Resume</span>
            <span className="h-px w-10 bg-border" />
          </div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-text md:text-5xl">
            Request Resume
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-text/65 md:text-base md:leading-8">
            My resume is shared directly on request to protect personal contact information. Include your role,
            organization, or project context below.
          </p>
        </div>
        <Link
          href="/about"
          className="focus-ring inline-flex items-center justify-center rounded-sm border border-border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-text transition-colors hover:border-text hover:bg-text hover:text-bg"
        >
          Back to profile
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <ContactForm
          title="Request Resume"
          eyebrow="Resume Request"
          submitLabel="Request Resume"
          subject="Resume Request"
          defaultMessage="I would like to request your current resume. My context is: "
        />
      </section>
    </div>
  );
}
