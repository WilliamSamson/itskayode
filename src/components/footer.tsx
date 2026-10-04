"use client";

import { siteContent } from "@/content/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative mt-20 py-16 border-t border-border/30"
    >
      {/* Marquee */}
      <div
        className="overflow-hidden mb-12"
      >
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="color-marquee mx-8 select-none font-heading text-6xl font-semibold tracking-tighter opacity-[0.08] md:text-8xl"
            >
              Execution. Systems. Innovation.
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-5 lg:px-8">
        <div className="flex flex-col justify-between items-center gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-text/70 text-[13px] font-semibold">
              © {year} {siteContent.fullName}
            </p>
          </div>

          {/* Scope */}
          <div className="text-center">
            <p className="text-[13px] text-text/50">
              {siteContent.role}
            </p>
          </div>

          {/* Back to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex items-center gap-2 text-text/50 hover:text-text transition-colors duration-300"
          >
            <span className="text-[11px] font-semibold">Back to top</span>
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
          <div className="w-16 h-[1px] bg-border/60" />
        </div>
      </div>
    </footer>
  );
}
