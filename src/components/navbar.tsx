"use client";

import Link from "next/link";
import { type ComponentPropsWithoutRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { siteContent } from "@/content/site";

export function Navbar({ className, ...props }: ComponentPropsWithoutRef<"header">) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname ?? "/";
  const { scrollY } = useScroll();

  const navItems = siteContent.nav;

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return currentPath === "/";
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  // Smooth scroll transformations
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.8)"]
  );
  const backdropBlur = useTransform(
    scrollY,
    [0, 50],
    ["blur(0px)", "blur(12px)"]
  );
  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ["1px solid rgba(255, 255, 255, 0)", "1px solid rgba(255, 255, 255, 0.1)"]
  );
  const padding = useTransform(scrollY, [0, 50], ["2rem", "1.25rem"]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      data-site-navbar="1"
      className={cn("fixed top-0 z-50 w-full transition-opacity duration-200", className)}
      {...props}
    >
      <motion.div
        style={{
          backgroundColor,
          backdropFilter: backdropBlur,
          borderBottom,
          paddingTop: padding,
          paddingBottom: padding,
        }}
        className="relative z-50 w-full transition-colors duration-300"
      >
        <div className="container flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 sm:gap-6"
          >
            {/* Custom Stylish Skipping Logo */}
            <div className="relative w-8 h-8">
              <div className="absolute top-[35px] left-0 w-8 h-1 bg-primary/20 rounded-full animate-shadow" />
              <div className="absolute inset-0 w-full h-full bg-primary rounded-[4px] animate-jump flex items-center justify-center text-[10px] font-black text-white transform-gpu">
                KO
              </div>
            </div>
            <span className="inline-block max-w-[140px] truncate text-sm font-heading font-black text-white tracking-tighter uppercase transition-colors group-hover:text-primary sm:max-w-none sm:text-2xl">
              {siteContent.name}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <AnimatePresence mode="popLayout" initial={false}>
              {navItems.map((item) => {
                const originalIndex = siteContent.nav.findIndex(navItem => navItem.href === item.href) + 1;
                const paddedIndex = originalIndex.toString().padStart(2, '0');
                const isActive = isActiveRoute(item.href);

                return (
                  <motion.div
                    key={item.href}
                    layout
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="relative px-6 py-4"
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "relative block text-[11px] font-black uppercase tracking-[0.4em] transition-colors group",
                        isActive ? "text-white" : "text-white/40 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-[8px] font-black tracking-widest transition-colors",
                            isActive ? "text-primary" : "text-primary/40 group-hover:text-primary"
                          )}
                        >
                          {paddedIndex}
                        </span>
                        <span className="relative z-10 transition-transform duration-500 group-hover:-translate-y-1 inline-block">
                          {item.label}
                          {/* Animated underline */}
                          <span
                            className={cn(
                              "absolute -bottom-1.5 left-0 w-full h-[2px] bg-primary transition-transform duration-300 origin-left",
                              isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                            )}
                          />
                        </span>
                      </div>

                      {/* Tiered Decorative Lines */}
                      <div className="absolute -bottom-2 right-0 w-full flex flex-col items-end gap-1">
                        <div
                          className={cn(
                            "h-[1px] bg-primary/20 transition-all duration-500",
                            isActive ? "w-full" : "w-0 group-hover:w-full"
                          )}
                        />
                        <div
                          className={cn(
                            "h-[1px] bg-primary transition-all duration-500 delay-100",
                            isActive ? "w-[60%]" : "w-0 group-hover:w-[60%]"
                          )}
                        />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>

          {/* Mobile Toggle */}
          <button
            className="relative z-50 md:hidden w-12 h-12 flex flex-col items-center justify-center group outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-4 flex flex-col justify-between items-end">
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 8, width: "100%" } : { rotate: 0, y: 0, width: "100%" }}
                transition={{ type: "spring", damping: 20 }}
                className="block h-0.5 bg-white origin-center"
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0, x: 20, width: "0%" } : { opacity: 1, x: 0, width: "60%" }}
                transition={{ duration: 0.2 }}
                className="block h-0.5 bg-white"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -8, width: "100%" } : { rotate: 0, y: 0, width: "100%" }}
                transition={{ type: "spring", damping: 20 }}
                className="block h-0.5 bg-white origin-center"
              />
            </div>
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-40 bg-black flex flex-col md:hidden"
          >
            {/* Split Screen Menu */}
            <div className="flex-1 flex flex-col p-10 pt-32 gap-12 sm:p-20 sm:pt-40">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Explore</span>
                <div className="flex flex-col items-start gap-4">
                  {navItems.map((item, i) => {
                    const originalIndex = siteContent.nav.findIndex(navItem => navItem.href === item.href) + 1;
                    const paddedIndex = originalIndex.toString().padStart(2, '0');
                    const isActive = isActiveRoute(item.href);

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 + 0.3 }}
                      >
                        <Link
                          href={item.href}
                          className="group flex items-center gap-6"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                "text-[10px] font-black transition-colors tracking-[0.5em] mb-1",
                                isActive ? "text-primary" : "text-primary/40 group-hover:text-primary"
                              )}
                            >
                              {paddedIndex}
                            </span>
                            <span
                              className={cn(
                                "text-4xl sm:text-6xl font-heading font-black transition-colors hover-italic uppercase tracking-tighter leading-none",
                                isActive ? "text-primary" : "text-white group-hover:text-primary"
                              )}
                            >
                              {item.label}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "h-[1px] transition-all",
                              isActive ? "w-20 bg-primary" : "w-12 bg-white/10 group-hover:w-20 group-hover:bg-primary"
                            )}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-10">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-4"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Say Hello</span>
                  <a href={`mailto:${siteContent.email}`} className="block text-sm font-bold text-white/60 hover:text-white transition-colors">
                    {siteContent.email}
                  </a>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="space-y-4"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Social</span>
                  <div className="flex flex-col gap-2">
                    {siteContent.socials.map(s => (
                      <Link key={s.label} href={s.href} className="text-sm font-bold text-white/60 hover:text-white transition-colors">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Accent Wall */}
            <div className="absolute right-0 top-0 bottom-0 w-2 sm:w-4 bg-primary" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
