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
      return "border-border bg-transparent text-text hover:border-text hover:bg-text hover:text-bg";
    case "ghost":
      return "bg-transparent border-transparent text-text hover:bg-surface";
    case "primary":
    default:
      return "border-primary bg-primary text-bg hover:bg-transparent hover:text-text";
  }
}

const baseClasses =
  "focus-ring inline-flex h-11 items-center justify-center rounded-md border-2 px-6 text-[13px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95";

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
