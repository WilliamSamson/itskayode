import Link from "next/link";
import { cn } from "@/lib/utils";

interface SocialIconProps {
  kind: "github" | "linkedin" | "email";
  href: string;
  label: string;
  className?: string;
}

function IconPath({ kind }: { kind: SocialIconProps["kind"] }) {
  if (kind === "github") {
    return (
      <path d="M12 .6a12 12 0 0 0-3.79 23.39c.6.12.82-.26.82-.58l-.01-2.03c-3.34.73-4.04-1.41-4.04-1.41-.55-1.37-1.33-1.73-1.33-1.73-1.08-.73.08-.72.08-.72 1.2.08 1.83 1.2 1.83 1.2 1.05 1.8 2.77 1.28 3.44.98.1-.76.41-1.28.74-1.57-2.66-.3-5.47-1.3-5.47-5.77 0-1.27.47-2.3 1.23-3.11-.13-.3-.53-1.52.11-3.16 0 0 1-.31 3.3 1.19a11.7 11.7 0 0 1 6.01 0c2.3-1.5 3.29-1.19 3.29-1.19.65 1.64.25 2.86.12 3.16.77.81 1.23 1.84 1.23 3.11 0 4.48-2.82 5.47-5.5 5.77.43.37.81 1.08.81 2.19l-.01 3.24c0 .32.21.71.83.58A12 12 0 0 0 12 .6Z" />
    );
  }

  if (kind === "linkedin") {
    return (
      <path d="M4.98 3.5A2.49 2.49 0 1 1 0 3.5a2.49 2.49 0 0 1 4.98 0ZM.4 8.5h4.6V24H.4V8.5Zm7.2 0h4.4v2.1h.1c.6-1.2 2.1-2.5 4.4-2.5 4.7 0 5.5 3 5.5 7v8.9h-4.6v-7.9c0-1.9 0-4.3-2.6-4.3-2.6 0-3 2-3 4.2v8H7.6V8.5Z" />
    );
  }

  return (
    <path d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1.2l-10 5.6-10-5.6V5Zm0 4.5V19a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9.5l-9.5 5.3a1 1 0 0 1-1 0L2 9.5Z" />
  );
}

export function SocialIcon({ kind, href, label, className }: SocialIconProps) {
  return (
    <Link
      aria-label={label}
      href={href}
      className={cn(
        "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-sm text-text transition-colors duration-200 hover:text-primary",
        className
      )}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <IconPath kind={kind} />
      </svg>
    </Link>
  );
}
