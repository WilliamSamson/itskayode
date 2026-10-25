"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AssemblyWorkbench } from "./assembly-workbench";
import { PowerWorkbench } from "./power-workbench";
import { ScanWorkbench, type ScanSessionCache } from "./scan-workbench";
import { FabricationWorkbench } from "./fabrication-workbench";
import styles from "./integrated-workspace.module.css";
import Link from "next/link";

export function IntegratedWorkspace() {
  const [activeTab, setActiveTab] = useState<"architecture" | "power" | "scan" | "fabrication">(
    "architecture"
  );

  const reducedMotion = useReducedMotion();
  const scanCache = useRef<ScanSessionCache | null>(null);

  const tabs = [
    { id: "architecture", label: "Assembly" },
    { id: "power", label: "Power & Electronics" },
    { id: "scan", label: "Scan Reconstruction" },
    { id: "fabrication", label: "Chassis & Fabrication" }
  ] as const;

  return (
    <div
      className={`${styles.instrument} ${styles.viewportShell} sonaris-page flex w-full select-none items-center justify-center font-sans antialiased`}
    >
      {/* 
        PHYSICAL STUDIO INSTRUMENT FRAME
        Scales fluidly across PC monitors, 13"-16" laptops, Samsung Tab S8+ (16:10), and iPad Pro M2/M4 (4:3).
      */}
      <div
        className={`${styles.bezelFrame} w-full rounded-[24px] sm:rounded-[34px] md:rounded-[44px] bg-[var(--sonaris-bezel)] shadow-2xl`}
      >
        <div
          className={`${styles.deckSurface} relative flex w-full flex-col overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[38px] bg-[#E5E1D8]`}
        >
          {/* ========================================================= */}
          {/* 1. STUDIO HEADER BAR                                      */}
          {/* ========================================================= */}
          <header className={`${styles.headerBar} flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--sonaris-border)]`}>
            {/* Brand Title & Back Navigation */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/sonaris"
                className={`${styles.backBtn} flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all`}
                aria-label="Return to cover"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3L11 11M11 3L3 11" />
                </svg>
              </Link>

              <div className="flex items-baseline gap-2">
                <span className="font-heading text-[clamp(18px,1.8vw,22px)] font-black tracking-tight text-[var(--sonaris-studio-ink)]">
                  SONARIS
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--sonaris-orange)]">
                  Studio
                </span>
              </div>
            </div>

            {/* Segmented Pill Switcher: rounded left end, flat middle, rounded right end */}
            <nav aria-label="Studio views" className={styles.segmentedNav}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={styles.segmentedBtn}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sonaris-active-tab"
                        className={styles.segmentedActiveBg}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 450, damping: 38 }
                        }
                      />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </header>

          {/* ========================================================= */}
          {/* 2. PRIMARY 3D WORKSPACE CANVAS                            */}
          {/* ========================================================= */}
          <main className="relative mt-2.5 flex min-h-0 w-full flex-1 flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={activeTab}
                aria-label={`${activeTab} workspace`}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                className="flex min-h-0 w-full flex-1 flex-col"
              >
                {activeTab === "architecture" ? (
                  <AssemblyWorkbench />
                ) : activeTab === "power" ? (
                  <PowerWorkbench />
                ) : activeTab === "scan" ? (
                  <ScanWorkbench cache={scanCache} />
                ) : (
                  <FabricationWorkbench />
                )}
              </motion.section>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default IntegratedWorkspace;
