import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("bg-surface border-2 border-surface/50 rounded-lg p-6 hover:border-text/20 transition-colors duration-200", className)} {...props} />;
}
