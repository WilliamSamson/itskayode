import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/20 px-3 py-1 text-xs font-medium text-text/80",
        className
      )}
      {...props}
    />
  );
}
