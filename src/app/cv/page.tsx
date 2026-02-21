import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CV",
  description: "Live resume view for Kayode Williams Olalere."
};

const cvPath = "/cv/kayode-olalere-cv.pdf";

export default function CvPage() {
  return (
    <div className="space-y-6 pb-16 pt-8 md:space-y-8 md:pt-10">
      <section className="border border-white/10 bg-surface/80 p-5 md:p-7">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Resume</span>
            <span className="h-px w-10 bg-white/10" />
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-white md:text-5xl">
                CV Viewer
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-text/65 md:text-base md:leading-8">
                Review the live resume here. Use download if you need a local copy.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={cvPath}
                download="Kayode-Williams-Olalere-Resume.pdf"
                className="focus-ring inline-flex items-center rounded-sm border border-primary px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-primary hover:text-black"
              >
                Download
              </a>
              <Link
                href="/about"
                className="focus-ring inline-flex items-center rounded-sm border border-white/20 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="h-[80vh] min-h-[560px] overflow-hidden border border-white/10 bg-black">
          <iframe
            src={`${cvPath}#toolbar=1&navpanes=0&view=FitH`}
            title="Kayode Williams Olalere Resume"
            className="h-full w-full"
          />
        </div>

        <p className="text-xs text-text/55 md:text-sm">
          If preview is unavailable in your browser,{" "}
          <a href={cvPath} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">
            open the resume in a new tab
          </a>
          .
        </p>
      </section>
    </div>
  );
}
