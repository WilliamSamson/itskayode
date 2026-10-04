import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Shared HUD controls, in the dock's language: solid black, neutral text,
 * and a white pill for whatever is on.
 */

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  children: ReactNode;
};

export function IconButton({ label, active = false, className = "", children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`shrink-0 grid place-items-center size-9 rounded-full transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
        active ? "bg-white text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

type TextToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Omit for one-shot actions; set for switches, which then report aria-pressed. */
  pressed?: boolean;
  children: ReactNode;
};

export function TextToggle({ pressed, className = "", children, ...rest }: TextToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`h-8 shrink-0 rounded-full px-3 font-sans text-[12px] font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
        pressed ? "bg-white text-black" : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A reading inside the island: quiet label, bright tabular value. */
export function Reading({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap px-2 font-sans">
      <span className="text-[11px] text-neutral-400">{label}</span>
      <span className="font-mono text-[12px] font-semibold tabular-nums text-white">{value}</span>
    </span>
  );
}

export function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-neutral-800" />;
}
