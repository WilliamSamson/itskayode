import type { ExperienceItem } from "@/types/content";

interface TimelineItemProps {
  item: ExperienceItem;
}

export function TimelineItem({ item }: TimelineItemProps) {
  return (
    <article className="relative border-l-2 border-white/10 pl-8 pb-2">
      <span className="absolute -left-[5px] top-2 h-2 w-2 bg-accent-red rotate-45" aria-hidden="true" />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent-red">{item.period}</p>
      <h3 className="text-xl font-bold text-white">{item.title}</h3>
      <p className="text-sm font-mono text-text/60 mt-1 mb-3">{item.organization}</p>
      <p className="text-sm leading-relaxed text-text/80">{item.summary}</p>
    </article>
  );
}
