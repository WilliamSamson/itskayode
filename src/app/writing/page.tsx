import type { Metadata } from "next";
import Link from "next/link";
import { TextAnimate } from "@/components/magicui/text-animate";
import { writing } from "@/content/writing";

export const metadata: Metadata = {
  title: "Research & Writing",
  description:
    "Published control-systems research and engineering notes by Kayode Williams Olalere.",
  openGraph: {
    title: "Research & Writing | Kayode Williams Olalere",
    description:
      "Published research on adaptive neural control, nonlinear dynamic systems, and practical engineering.",
    url: "/writing/"
  }
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

export default function WritingPage() {
  const papers = writing.filter((item) => item.kind === "research");
  const notes = writing
    .filter((item) => item.kind !== "research")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="space-y-10 pb-20 pt-4 sm:space-y-14 sm:pt-8">
      <header className="relative overflow-hidden rounded-xl bg-text px-6 py-10 text-bg sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <span className="absolute -right-12 -top-16 h-60 w-60 rounded-full border-[34px] border-accent-green/20" />
        <span className="absolute bottom-[-8rem] right-[28%] h-64 w-64 rounded-full border-[40px] border-accent-blue/15" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-5">
            <p className="text-[11px] font-semibold text-accent-green">
              Control engineering · Intelligent systems
            </p>
            <TextAnimate
              as="h1"
              animation="blurIn"
              by="text"
              className="max-w-5xl font-heading text-[15px] font-semibold leading-[0.9] tracking-tighter text-bg"
            >
              Research and writing
            </TextAnimate>
            <TextAnimate
              animation="slideUp"
              by="word"
              delay={0.15}
              className="max-w-2xl text-[13px] leading-8 text-bg/55"
            >
              Published research and technical notes at the intersection of adaptive control, neural systems, robotics, and dependable software.
            </TextAnimate>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-bg/10 p-4">
              <strong className="block font-heading text-[15px] font-semibold">01</strong>
              <span className="mt-1 block text-[11px] text-bg/40">
                Publication
              </span>
            </div>
            <div className="rounded-xl bg-bg/10 p-4">
              <strong className="block font-heading text-[15px] font-semibold">1st</strong>
              <span className="mt-1 block text-[11px] text-bg/40">
                Author
              </span>
            </div>
            <div className="col-span-2 rounded-xl bg-accent-green p-4 text-bg sm:col-span-1">
              <strong className="block font-heading text-[15px] font-semibold">2026</strong>
              <span className="mt-1 block text-[11px] text-bg/65">
                Published
              </span>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="published-research" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-accent-blue">
              Peer-reviewed publication
            </p>
            <h2 id="published-research" className="mt-2 font-heading text-[15px] font-semibold tracking-tight text-text">
              Published research
            </h2>
          </div>
          <span className="text-[11px] text-text/35">
            Applied control systems
          </span>
        </div>

        {papers.map((paper) => (
          <article
            key={paper.slug}
            className="grid overflow-hidden rounded-xl bg-accent-green/10 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]"
          >
            <div className="flex flex-col justify-between gap-10 p-6 sm:p-9 lg:p-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-text px-3 py-1.5 text-[11px] font-semibold text-bg">
                    First author
                  </span>
                  <time
                    dateTime={paper.publishedAt}
                    className="rounded-md bg-bg/75 px-3 py-1.5 text-[11px] text-text/45"
                  >
                    {dateFormatter.format(new Date(`${paper.publishedAt}T00:00:00Z`))}
                  </time>
                </div>

                <h3 className="mt-7 max-w-5xl font-heading text-[15px] font-semibold leading-[1.02] tracking-tight text-text">
                  {paper.title}
                </h3>
                <p className="mt-6 max-w-3xl text-[13px] leading-7 text-text/60">
                  {paper.summary}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-text/35">
                  First author
                </p>
                <p className="mt-2 text-[13px] font-semibold text-text">{paper.primaryAuthor}</p>
                <p className="mt-1 max-w-3xl text-[11px] leading-6 text-text/45">
                  With {paper.authors?.slice(1).join(", ")}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={`/writing/${paper.slug}`}
                    className="focus-ring inline-flex h-11 items-center rounded-md bg-text px-5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.02]"
                  >
                    Research overview →
                  </Link>
                  {paper.externalUrl ? (
                    <Link
                      href={paper.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-flex h-11 items-center rounded-md border border-text/15 bg-bg/70 px-5 text-[13px] font-semibold text-text transition-colors hover:bg-bg"
                    >
                      View publication ↗
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative min-h-[24rem] overflow-hidden bg-text p-6 text-bg sm:p-8 lg:min-h-full">
              <span className="absolute -right-16 -top-16 h-60 w-60 rounded-full border-[30px] border-accent-green/20" />
              <div className="relative flex h-full min-h-[21rem] flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-bg/35">
                      Controller architecture
                    </p>
                    <p className="mt-2 text-[13px] font-semibold">{paper.venue}</p>
                  </div>
                  <span className="rounded-md bg-bg/10 px-3 py-1.5 text-[11px] text-bg/55">
                    Vol. {paper.volume}
                  </span>
                </div>

                <div className="relative mx-auto grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="space-y-3">
                    <span className="block rounded-xl bg-accent-blue p-4 text-center text-[11px] font-semibold">
                      Reference
                    </span>
                    <span className="block rounded-xl bg-accent-violet p-4 text-center text-[11px] font-semibold">
                      ESN Model
                    </span>
                  </div>
                  <span className="text-[15px] text-bg/25">→</span>
                  <div className="space-y-3">
                    <span className="block rounded-xl bg-bg p-4 text-center text-[11px] font-semibold text-text">
                      Feedforward
                    </span>
                    <span className="block rounded-xl bg-accent-green p-4 text-center text-[11px] font-semibold">
                      Feedback
                    </span>
                  </div>
                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-bg/15 px-4 py-2 text-[11px] text-bg/50">
                    Nonlinear plant
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-bg/[0.07] p-4">
                    <span className="block text-[11px] text-bg/35">Pages</span>
                    <strong className="mt-1 block text-[13px]">{paper.pages}</strong>
                  </div>
                  <div className="rounded-xl bg-bg/[0.07] p-4">
                    <span className="block text-[11px] text-bg/35">DOI</span>
                    <strong className="mt-1 block truncate text-[13px]">{paper.doi}</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="technical-notes" className="space-y-5 pt-4">
        <div>
          <p className="text-[11px] font-semibold text-accent-violet">
            Engineering practice
          </p>
          <h2 id="technical-notes" className="mt-2 font-heading text-[15px] font-semibold tracking-tight text-text">
            Technical notes
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((item) => (
            <article key={item.slug} className="flex min-h-64 flex-col justify-between rounded-xl bg-surface p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-text/35">
                    {item.status}
                  </span>
                  <time className="text-[11px] text-text/35" dateTime={item.publishedAt}>
                    {dateFormatter.format(new Date(`${item.publishedAt}T00:00:00Z`))}
                  </time>
                </div>
                <h3 className="mt-7 font-heading text-[15px] font-semibold tracking-tight text-text">
                  {item.title}
                </h3>
                <p className="mt-3 text-[13px] leading-7 text-text/55">{item.summary}</p>
              </div>
              {item.status === "published" ? (
                <Link
                  href={`/writing/${item.slug}`}
                  className="focus-ring mt-6 text-[13px] font-semibold text-text/65 hover:text-text"
                >
                  Read note →
                </Link>
              ) : (
                <span className="mt-6 text-[11px] text-text/35">
                  Scheduled
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
