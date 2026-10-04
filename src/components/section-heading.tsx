import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";

interface SectionHeadingProps {
  title: string;
  className?: string;
  description?: string;
}

export function SectionHeading({ title, className, description }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-4 mb-16", className)}>
      <div className="flex items-center gap-6">
        <span aria-hidden className="flex -space-x-1.5">
          <span className="h-3 w-3 rounded-full bg-accent-blue" />
          <span className="h-3 w-3 rounded-full bg-accent-violet" />
          <span className="h-3 w-3 rounded-full bg-accent-orange" />
        </span>
        <TextAnimate
          as="h2"
          animation="blurIn"
          by="text"
          className="font-heading text-[15px] font-semibold tracking-tight text-text"
        >
          {title}
        </TextAnimate>
      </div>
      {description && (
        <TextAnimate
          animation="slideUp"
          by="word"
          delay={0.08}
          duration={0.45}
          className="max-w-2xl text-[13px] font-semibold leading-relaxed text-text/50"
        >
          {description}
        </TextAnimate>
      )}
    </div>
  );
}
