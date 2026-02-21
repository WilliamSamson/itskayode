"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteContent } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run GSAP on client side
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Marquee slide in
      gsap.fromTo(marqueeRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
          }
        }
      );

      // Content fade
      gsap.fromTo(contentRef.current?.children || [],
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 80%',
          }
        }
      );

    }, footerRef);

    return () => ctx.revert();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className="relative mt-20 py-16 border-t border-white/5"
    >
      {/* Marquee */}
      <div
        ref={marqueeRef}
        className="overflow-hidden mb-12"
      >
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="text-6xl md:text-8xl font-black font-heading text-white/5 mx-8 select-none uppercase tracking-tighter"
            >
              Execution. Systems. Innovation.
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="container mx-auto"
      >
        <div className="flex flex-col justify-between items-center gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-white/75 text-sm font-medium">
              © {year} {siteContent.fullName}
            </p>
          </div>

          {/* Scope */}
          <div className="text-center">
            <p className="font-mono text-xs md:text-sm text-white/55 tracking-wider">
              {siteContent.role} | Systems Architect | AI & Robotics
            </p>
          </div>

          {/* Back to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex items-center gap-2 text-white/55 hover:text-white transition-colors duration-300"
          >
            <span className="text-xs uppercase tracking-[0.1em] font-bold">Back to top</span>
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>

        {/* Decorative line */}
        <div className="mt-12 flex justify-center">
          <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
        </div>
      </div>
    </footer>
  );
}
