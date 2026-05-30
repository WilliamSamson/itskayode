"use client";

import Link from "next/link";
import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { siteContent } from "@/content/site";

export function Navbar({ className, ...props }: ComponentPropsWithoutRef<"header">) {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navItems = siteContent.nav.map((navItem) => {
    let icon = (className: string) => <span className={className} />;
    let activeBg = "#000000";
    let activeColor = "#ffffff";

    if (navItem.href === "/") {
      icon = (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
      activeBg = "#2563eb"; // Cobalt Blue
      activeColor = "#ff7a00"; // Orange (opposite of Cobalt Blue)
    } else if (navItem.href === "/projects") {
      icon = (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
      activeBg = "#f59e0b"; // Amber Gold
      activeColor = "#1e1b4b"; // Navy (opposite of Gold)
    } else if (navItem.href === "/about") {
      icon = (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
      activeBg = "#0ea5e9"; // Sky Blue
      activeColor = "#e11d48"; // Crimson Red (opposite of Sky Blue)
    } else if (navItem.href === "/contact") {
      icon = (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 0 002 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
      activeBg = "#dc2626"; // Crimson Red
      activeColor = "#00ffff"; // Cyan (opposite of Red)
    }

    return {
      ...navItem,
      icon,
      activeBg,
      activeColor
    };
  });

  return (
    <>
      {/* Top Header Logo */}
      <header
        data-site-navbar="1"
        className={cn("w-full bg-transparent text-text", className)}
        {...props}
      >
        <div className="container flex h-16 items-center justify-between sm:h-20">
          <Link
            href="/"
            className="focus-ring flex items-center gap-3 text-sm font-semibold tracking-tight sm:text-base group"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-text text-[11px] font-black group-hover:bg-text group-hover:text-bg transition-colors"
            >
              KO
            </span>
            <span className="font-heading font-black uppercase tracking-tighter text-text/85 group-hover:text-text transition-colors">
              {siteContent.name}
            </span>
          </Link>

          <Link
            href="/contact"
            className="focus-ring hidden sm:inline-block text-xs font-black uppercase tracking-widest text-text/40 hover:text-text transition-colors"
          >
            Get in touch
          </Link>
        </div>
      </header>

      {/* Floating Island Navigation Dock */}
      {mounted && (
        <motion.div
          initial={{ y: 80, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.15 }}
          className="fixed bottom-6 left-1/2 z-50 pointer-events-auto"
        >
          <nav
            aria-label="Floating navigation"
            className="flex items-center gap-1.5 bg-bg border border-border px-1.5 py-1.5 rounded-full"
          >
            {navItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  className={cn(
                    "relative p-2.5 rounded-full flex items-center justify-center transition-colors focus-ring select-none",
                    isActive ? "text-bg" : "text-text/50 hover:text-text"
                  )}
                  style={{
                    color: isActive ? item.activeColor : undefined
                  }}
                >
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredIndex === index && (
                      <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-text text-bg rounded-md border border-border/20 whitespace-nowrap pointer-events-none z-50 shadow-none"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isActive && (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full -z-10"
                      style={{ backgroundColor: item.activeBg }}
                      animate={{ backgroundColor: item.activeBg }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}

                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center"
                  >
                    {item.icon("w-[18px] h-[18px]")}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </motion.div>
      )}
    </>
  );
}
