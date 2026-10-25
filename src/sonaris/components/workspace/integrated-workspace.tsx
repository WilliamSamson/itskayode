"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AssemblyWorkbench } from "./assembly-workbench";
import { PowerWorkbench } from "./power-workbench";
import { WorkspaceCases, type CaseCache } from "./workspace-cases";
import styles from "./integrated-workspace.module.css";
import Link from "next/link";

export function IntegratedWorkspace() {
  const [activeTab, setActiveTab] = useState<"architecture" | "power" | "scan" | "fabrication">(
    "architecture"
  );

  const reducedMotion = useReducedMotion();
  const caseCache = useRef<CaseCache | null>(null);
  const [, setPointCount] = useState(0);

  const tabs = [
    { id: "architecture", label: "3D Spatial Architecture" },
    { id: "power", label: "Power & Electronics" },
    { id: "scan", label: "Scan Reconstruction" },
    { id: "fabrication", label: "Chassis & Fabrication" }
  ] as const;

  return (
    <div
      className={`${styles.instrument} flex min-h-[100dvh] w-full select-none items-center justify-center bg-[#000000] p-1 sm:p-3 md:p-6 font-sans text-[#1A1A24] antialiased`}
    >
      {/* 
        PHYSICAL STUDIO INSTRUMENT FRAME
        Calibrated titanium bezel with warm stone-gray instrument stage.
        Quiet, uncluttered, focused on high-agency 3D interaction.
      */}
      <div className="w-full max-w-[1360px] rounded-[24px] sm:rounded-[36px] md:rounded-[44px] bg-[#2E3138] p-1.5 sm:p-2.5 md:p-3 shadow-2xl">
        <div className="relative flex min-h-[700px] w-full flex-col overflow-hidden rounded-[20px] sm:rounded-[30px] md:rounded-[38px] bg-[#E5E1D8] p-3 sm:p-5 md:min-h-[860px] md:p-6">
          {/* ========================================================= */}
          {/* 1. STUDIO HEADER BAR                                      */}
          {/* ========================================================= */}
          <header className="flex flex-col items-start justify-between gap-3 border-b border-[#D0CBC0] pb-3.5 lg:flex-row lg:items-center">
            {/* Brand Title & Back Navigation */}
            <div className="flex items-center gap-3">
              <Link
                href="/sonaris"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFFFF] text-xs font-bold text-[#111319] border border-[#C8C3B8] shadow-sm hover:bg-[#FAF8F4] hover:border-[#111319] transition-all"
                aria-label="Return to cover"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3L11 11M11 3L3 11" />
                </svg>
              </Link>

              <div className="flex items-baseline gap-2.5">
                <span className="font-heading text-[22px] font-black tracking-tight text-[#111319]">
                  SONARIS
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#68655E]">
                  Studio
                </span>
              </div>
            </div>

            {/* Top-Tier Segmented View Switcher */}
            <nav aria-label="Studio views" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[#D8D4CA] p-1 border border-[#C5BFB3] shadow-inner">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={`relative isolate shrink-0 rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold tracking-tight transition-all ${
                      isActive
                        ? "text-[#FFFFFF] shadow-sm"
                        : "text-[#55524B] hover:text-[#111319] hover:bg-[#FFFFFF]/40"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sonaris-active-tab"
                        className="absolute inset-0 -z-10 rounded-full bg-[#111319] shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
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

            {/* Quiet Hardware State Telemetry Pill */}
            <div className="hidden lg:flex items-center gap-2.5 rounded-full border border-[#C5BFB3] bg-[#F5F2EB]/90 px-3.5 py-1.5 font-mono text-[10px] text-[#4A4740] shadow-sm backdrop-blur-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1F6B42] shadow-[0_0_6px_rgba(31,107,66,0.6)] animate-pulse" />
              <span className="font-semibold tracking-tight">Bioenno 12.8V · Tilting S2 LiDAR · Mecanum Quad</span>
            </div>
          </header>

          {/* ========================================================= */}
          {/* 2. PRIMARY 3D WORKSPACE CANVAS (NO REDUNDANT BANNERS)     */}
          {/* ========================================================= */}
          <main className="relative mt-3 flex w-full flex-1 flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={activeTab}
                aria-label={`${activeTab} workspace`}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                className="flex w-full flex-1 flex-col"
              >
                {activeTab === "architecture" ? (
                  <AssemblyWorkbench />
                ) : activeTab === "power" ? (
                  <PowerWorkbench />
                ) : (
                  <WorkspaceCases tab={activeTab} onPointCount={setPointCount} cache={caseCache} />
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
