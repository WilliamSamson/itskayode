"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function RouteTransition() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setVisible(true);
    setAnimating(true);
    setProgress(15);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        // Exponential slowdown
        const diff = 85 - prev;
        return prev + Math.max(diff * 0.15, 1);
      });
    }, 120);
  };

  const completeProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setProgress(100);
    
    // Smooth transition to 100%, then fade out
    setTimeout(() => {
      setAnimating(false);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200); // Duration of fade-out
    }, 300); // Time to show 100% state
  };

  useEffect(() => {
    const handleRouteIntent = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
        return;
      }

      startProgress();
    };

    document.addEventListener("click", handleRouteIntent, true);
    return () => {
      document.removeEventListener("click", handleRouteIntent, true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    completeProgress();
  }, [pathname]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 w-full bg-transparent transition-opacity duration-200",
        visible && animating ? "opacity-100" : "opacity-0"
      )}
      aria-hidden="true"
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
