"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RouteTransition } from "@/components/route-transition";
import { TelemetryTracker } from "@/components/telemetry-tracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrra = pathname?.startsWith("/orra") || pathname?.startsWith("/world");
  const isSonaris = pathname?.startsWith("/sonaris");

  if (isOrra || isSonaris) {
    return (
      <main
        id="main-content"
        className="fixed inset-0 w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-auto bg-black p-0 m-0 z-0 select-none"
      >
        {children}
      </main>
    );
  }

  return (
    <>
      <RouteTransition />
      <TelemetryTracker />
      <Navbar />
      <main
        id="main-content"
        className="relative z-10 w-full flex-1 px-4 py-8 sm:px-5 sm:py-12 lg:px-8 lg:py-16"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
