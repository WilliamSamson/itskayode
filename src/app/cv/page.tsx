import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { TextAnimate } from "@/components/magicui/text-animate";

export const metadata: Metadata = {
  title: "Request Resume",
  description: "Request the professional resume and portfolio details of Kayode Williams Olalere.",
  openGraph: {
    title: "Request Resume | Kayode Williams Olalere",
    description: "Request the professional resume and portfolio details of Kayode Williams Olalere.",
    url: "/cv/"
  }
};

export default function CvPage() {
  return (
    <div className="space-y-12 bg-bg pb-16 pt-8 md:space-y-16 md:pt-10">
      <section className="grid gap-8 border-b border-border pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pb-12">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-text/60">Resume</span>
          </div>
          <TextAnimate
            as="h1"
            animation="blurIn"
            by="text"
            className="font-heading text-[15px] font-semibold tracking-tight text-text"
          >
            Request Resume
          </TextAnimate>
          <TextAnimate
            animation="slideUp"
            by="word"
            delay={0.15}
            className="max-w-2xl text-[13px] leading-7 text-text/65"
          >
            My resume is shared directly on request to protect personal contact information. Include your role,
            organization, or project context below.
          </TextAnimate>
        </div>
        <Link
          href="/about"
          className="focus-ring inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-[11px] font-semibold text-text transition-colors hover:border-text hover:bg-text hover:text-bg"
        >
          Back to profile
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <ContactForm
          title="Request Resume"
          eyebrow="Resume request"
          submitLabel="Request Resume"
          subject="Resume Request"
          defaultMessage="I would like to request your current resume. My context is: "
        />
      </section>
    </div>
  );
}
