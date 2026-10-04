"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function PageTemplate({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const isOrra = pathname?.startsWith("/orra") || pathname?.startsWith("/world");

  if (isOrra) {
    return <>{children}</>;
  }

  return <div className="page-transition">{children}</div>;
}
