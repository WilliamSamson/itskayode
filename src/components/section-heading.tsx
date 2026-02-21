import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  className?: string;
  line?: boolean;
  description?: string;
}

export function SectionHeading({ title, className, line = true, description }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-4 mb-16", className)}>
      <div className="flex items-center gap-6">
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
          {title}
        </h2>
        {line && <div className="h-px bg-white/10 flex-1 max-w-[100px]" />}
      </div>
      {description && <p className="text-lg text-text/50 max-w-2xl font-medium leading-relaxed">{description}</p>}
    </div>
  );
}
