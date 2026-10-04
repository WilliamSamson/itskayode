import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { writing } from "@/content/writing";

interface WritingPageProps {
  params: Promise<{ slug: string }>;
}

const publishedWriting = writing.filter((item) => item.status === "published");

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

export function generateStaticParams() {
  return publishedWriting.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: WritingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = publishedWriting.find((entry) => entry.slug === slug);

  if (!item) {
    return { title: "Writing Not Found" };
  }

  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: `/writing/${item.slug}/` },
    openGraph: {
      type: "article",
      title: item.title,
      description: item.summary,
      url: `/writing/${item.slug}/`
    }
  };
}

export default async function WritingDetailPage({ params }: WritingPageProps) {
  const { slug } = await params;
  const item = publishedWriting.find((entry) => entry.slug === slug);

  if (!item?.sections) {
    notFound();
  }

  const isResearch = item.kind === "research";

  return (
    <article className="pb-20 pt-4 sm:pt-8">
      <Link
        href="/writing"
        className="focus-ring inline-flex rounded-md bg-surface px-4 py-2 text-[11px] font-semibold text-text/50 hover:text-text"
      >
        ← Research and writing
      </Link>

      <header
        className={`relative mt-8 overflow-hidden rounded-xl p-6 sm:p-10 lg:p-14 ${
          isResearch ? "bg-text text-bg" : "bg-accent-violet/[0.08] text-text"
        }`}
      >
        {isResearch ? (
          <>
            <span className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[36px] border-accent-green/20" />
            <span className="absolute -bottom-28 left-[45%] h-64 w-64 rounded-full border-[42px] border-accent-blue/15" />
          </>
        ) : null}
        <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <div
              className={`flex flex-wrap items-center gap-3 text-[11px] ${
                isResearch ? "text-bg/40" : "text-text/40"
              }`}
            >
              <time dateTime={item.publishedAt}>
                {dateFormatter.format(new Date(`${item.publishedAt}T00:00:00Z`))}
              </time>
              <span aria-hidden>·</span>
              <span>{isResearch ? "Published research" : "Technical note"}</span>
            </div>
            <h1
              className={`mt-7 max-w-6xl font-heading text-[15px] font-semibold leading-[0.98] tracking-tight ${
                isResearch ? "text-bg" : "text-text"
              }`}
            >
              {item.title}
            </h1>
            <p className={`mt-7 max-w-3xl text-[13px] leading-8 ${isResearch ? "text-bg/55" : "text-text/60"}`}>
              {item.summary}
            </p>
          </div>

          {isResearch ? (
            <div className="rounded-xl bg-bg/[0.08] p-5 backdrop-blur">
              <span className="text-[11px] font-semibold text-accent-green">
                First author
              </span>
              <p className="mt-2 text-[13px] font-semibold text-bg">{item.primaryAuthor}</p>
              <p className="mt-4 text-[11px] leading-6 text-bg/40">
                {item.venue}, Volume {item.volume}, pages {item.pages}
              </p>
              <p className="mt-2 text-[11px] text-bg/45">DOI {item.doi}</p>
              {item.externalUrl ? (
                <Link
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring mt-5 inline-flex h-10 items-center rounded-md bg-bg px-4 text-[13px] font-semibold text-text"
                >
                  View publication ↗
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className={`grid gap-10 py-12 sm:py-16 ${isResearch ? "lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16" : ""}`}>
        {isResearch ? (
          <aside className="h-fit rounded-xl bg-accent-green/10 p-6 lg:sticky lg:top-28">
            <p className="text-[11px] text-text/35">Authors</p>
            <ol className="mt-4 space-y-3">
              {item.authors?.map((author, index) => (
                <li key={author} className="grid grid-cols-[1.5rem_1fr] gap-2 text-[11px] leading-5 text-text/55">
                  <span className="tabular-nums text-[11px] text-text/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={index === 0 ? "font-semibold text-text" : ""}>{author}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {item.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-md bg-bg/75 px-2.5 py-1 text-[11px] text-text/45"
                >
                  {topic}
                </span>
              ))}
            </div>
          </aside>
        ) : null}

        <div className="space-y-6">
          {item.sections.map((section, index) => (
            <section
              key={section.heading}
              className={`grid gap-5 rounded-xl p-6 sm:p-8 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-8 ${
                index === 0
                  ? "bg-accent-blue/[0.08]"
                  : index === 1
                    ? "bg-accent-green/[0.08]"
                    : "bg-accent-orange/[0.08]"
              }`}
            >
              <span className="tabular-nums text-[11px] text-text/30">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="space-y-5">
                <h2 className="font-heading text-[15px] font-semibold tracking-tight text-text">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[13px] leading-8 text-text/65">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
