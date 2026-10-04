"use client";

import Link from "next/link";
import Image from "next/image";
import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { siteContent } from "@/content/site";

const navVisuals = {
  "/": {
    icon: "M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6"
  },
  "/projects": {
    icon: "M4 6h16v12H4zM8 3v3m8-3v3M8 10h8"
  },
  "/orra": {
    icon: "M4.5 9.5h15M6.5 9.5L12 18l5.5-8.5M12 9.5V18M2.8 13.6a9.5 5 -20 1 0 18.4 -3.2a9.5 5 -20 0 0 -15 -2"
  },
  "/world": {
    icon: "M4.5 9.5h15M6.5 9.5L12 18l5.5-8.5M12 9.5V18M2.8 13.6a9.5 5 -20 1 0 18.4 -3.2a9.5 5 -20 0 0 -15 -2"
  },
  "/writing": {
    icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"
  },
  "/about": {
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0"
  },
  "/contact": {
    icon: "M3 6h18v12H3zM3 7l9 7 9-7"
  }
} as const;

export function Navbar({ className, ...props }: ComponentPropsWithoutRef<"header">) {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActiveRoute = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        data-site-navbar="1"
        className={cn("sticky top-0 z-50 w-full px-2 pt-2 sm:px-4 sm:pt-3", className)}
        {...props}
      >
        <div className="flex h-16 w-full items-center justify-between gap-5 rounded-xl border border-border-subtle bg-text/95 px-3 backdrop-blur-xl sm:h-[4.5rem] sm:px-5">
          <Link href="/" className="focus-ring group flex shrink-0 items-center gap-3 rounded-md">
            <span
              aria-hidden
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-bg shadow-sm transition-transform duration-300 group-hover:rotate-6"
            >
              <Image
                src="/itskayode-light.png"
                alt="Kayode Olalere"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="hidden font-heading text-[11px] font-semibold tracking-tight text-bg sm:block">
              {siteContent.name}
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden h-full items-center gap-1 lg:flex">
            {siteContent.nav.map((item) => {
              const active = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring relative inline-flex h-full items-center px-4 text-[11px] font-semibold transition-colors",
                    active ? "text-bg" : "text-bg/35 hover:text-bg"
                  )}
                >
                  {item.label.replace(" Me", "")}
                  {active ? (
                    <motion.span
                      layoutId="desktop-nav-line"
                      className="absolute inset-x-4 bottom-0 h-0.5 bg-accent-green"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/contact"
            className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-bg px-4 text-[11px] font-semibold text-text transition-transform hover:scale-[1.02]"
          >
            Contact
            <span aria-hidden>↗</span>
          </Link>
        </div>
      </header>

      {mounted ? (
        <motion.nav
          aria-label="Mobile navigation"
          initial={{ y: 80, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
          className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 sm:gap-1.5 rounded-full border border-border-subtle bg-text/95 p-1.5 sm:p-2 shadow-[0_16px_45px_rgb(0_0_0_/_0.25)] backdrop-blur-xl lg:hidden"
        >
          {siteContent.nav.map((item) => {
            const active = isActiveRoute(item.href);
            const visual = navVisuals[item.href as keyof typeof navVisuals];

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all shrink-0 active:scale-95",
                  active ? "bg-bg text-text shadow-sm font-semibold" : "text-bg/40 hover:bg-bg/10 hover:text-bg"
                )}
              >
                <svg
                  aria-hidden
                  className="h-[19px] w-[19px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                >
                  <path d={visual.icon} />
                </svg>
              </Link>
            );
          })}
        </motion.nav>
      ) : null}
    </>
  );
}
