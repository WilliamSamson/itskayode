import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

type ButtonAsButton = CommonProps &
  ComponentPropsWithoutRef<"button"> & {
    href?: never;
  };

type ButtonAsLink = CommonProps & {
  href: string;
} & ComponentPropsWithoutRef<"a">;

function getVariantClasses(variant: ButtonVariant) {
  switch (variant) {
    case "secondary":
      return "border-border/30 bg-transparent text-white hover:border-white hover:bg-white hover:text-black";
    case "ghost":
      return "bg-transparent border-transparent text-text hover:bg-surface";
    case "primary":
    default:
      return "border-accent-red bg-accent-red text-white hover:bg-transparent hover:text-white";
  }
}

const baseClasses =
  "focus-ring inline-flex h-11 items-center justify-center rounded-sm border-2 px-6 text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95";

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", className, children } = props;
  const classes = cn(baseClasses, getVariantClasses(variant), className);

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...(linkProps as ComponentPropsWithoutRef<"a">)}>
        {children}
      </Link>
    );
  }

  const { type, ...buttonProps } = props as ButtonAsButton;
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
