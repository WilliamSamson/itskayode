import type { ExperienceItem } from "@/types/content";

interface TimelineItemProps {
  item: ExperienceItem;
}

export function TimelineItem({ item }: TimelineItemProps) {
  return (
    <article className="relative border-l-2 border-border-subtle pl-8 pb-2">
      <span className="absolute -left-[5px] top-2 h-2 w-2 bg-accent-red rotate-45" aria-hidden="true" />
      <p className="mb-1 text-[11px] font-semibold text-accent-red">{item.period}</p>
      <h3 className="text-[15px] font-semibold text-text">{item.title}</h3>
      <p className="text-[13px] text-text/60 mt-1 mb-3">{item.organization}</p>
      <p className="text-[13px] leading-relaxed text-text/80">{item.summary}</p>
    </article>
  );
}
