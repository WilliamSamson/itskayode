"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NodeDecryptor } from "@/components/games/node-decryptor";
import { GravitySandbox } from "@/components/games/gravity-sandbox";
import { FrequencyMatcher } from "@/components/games/frequency-matcher";
import { LogicGateBridge } from "@/components/games/logic-gate-bridge";
import { TerraForge } from "@/components/games/terra-forge";
import { StardustBackground } from "@/components/stardust-background";
import { cn } from "@/lib/utils";

type ArtifactType = "decryptor" | "sandbox" | "matcher" | "bridge" | "forge";

export default function FunPage() {
    const [fragments, setFragments] = useState(0);
    const [activeArtifact, setActiveArtifact] = useState<ArtifactType>("decryptor");

    useEffect(() => {
        const saved = localStorage.getItem("system_fragments");
        if (saved) setFragments(parseInt(saved));
    }, []);

    const handleWin = () => {
        setFragments((prev) => {
            const next = prev + 1;
            localStorage.setItem("system_fragments", next.toString());
            return next;
        });
    };

    const handleArtifactSelect = useCallback((artifact: ArtifactType) => {
        setActiveArtifact((prev) => (prev === artifact ? prev : artifact));
    }, []);

    const getActiveArtifact = () => {
        switch (activeArtifact) {
            case "decryptor":
                return <NodeDecryptor onSuccess={handleWin} />;
            case "sandbox":
                return <GravitySandbox onCollect={handleWin} />;
            case "matcher":
                return <FrequencyMatcher onSuccess={handleWin} />;
            case "bridge":
                return <LogicGateBridge onSuccess={handleWin} />;
            case "forge":
                return <TerraForge onCollect={handleWin} />;
            default:
                return <NodeDecryptor onSuccess={handleWin} />;
        }
    };

    const menuItems: { id: ArtifactType; label: string }[] = [
        { id: "decryptor", label: "01 // Node_Decryptor" },
        { id: "sandbox", label: "02 // Gravity_Sandbox" },
        { id: "matcher", label: "03 // Signal_R&D" },
        { id: "bridge", label: "04 // Robotics_Logic" },
        { id: "forge", label: "05 // Terra_Forge" }
    ];

    return (
        <div className="relative min-h-screen isolate overflow-hidden bg-black pt-20">
            <StardustBackground variant="stars" />

            {/* HUD - Fragment Counter */}
            <div className="fixed top-24 right-4 md:right-12 z-50 flex flex-col items-end gap-2 group pointer-events-none transition-all">
                <div className="flex items-center gap-3 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-md">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.4em] text-white/30">System Fragments</span>
                        <span className="text-xl md:text-2xl font-heading font-black text-primary tracking-tighter text-right">
                            {fragments.toString().padStart(3, '0')}
                        </span>
                    </div>
                    <div className="h-6 md:h-8 w-[1px] bg-white/10" />
                    <div className="relative h-8 w-8 md:h-10 md:w-10 flex items-center justify-center">
                        <div className="absolute inset-0 border border-primary/20 rounded-lg rotate-45 animate-reverse-spin" />
                        <div className="absolute inset-1 border border-primary/40 rounded-sm -rotate-12 animate-spin" />
                        <span className="text-primary text-lg md:text-xl">⁂</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 opacity-40">
                    <div className="h-[1px] w-12 bg-primary/40" />
                    <div className="h-[1px] w-20 bg-primary/20" />
                </div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] pointer-events-none" />

            <main className="relative z-10 container mx-auto px-6 py-12">
                <motion.div
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-4xl mx-auto space-y-20"
                >
                    {/* Header */}
                    <header className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-5 py-2 border border-white/5 bg-white/[0.02] rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
                                Experimental Playground // v1.0
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-8xl font-heading font-black text-white uppercase tracking-tighter leading-none break-words">
                                Fun <span className="text-primary italic font-light lowercase">Space</span>
                            </h1>
                            <p className="max-w-xl text-text/40 text-base md:text-xl font-medium tracking-tight">
                                A collection of technical artifacts and interactive experiments built at the intersection of bits and atoms.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 py-4">
                            <div className="h-[1px] w-24 bg-primary" />
                            <div className="h-[1px] w-12 bg-white/10" />
                        </div>
                    </header>

                    {/* Interactive Switcher */}
                    <nav className="scrollbar-hide relative z-30 flex flex-wrap items-center gap-x-6 gap-y-4 overflow-x-auto border-b border-white/5 pb-8 scroll-smooth md:gap-x-10">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={activeArtifact === item.id}
                                onClick={() => handleArtifactSelect(item.id)}
                                onPointerUp={() => handleArtifactSelect(item.id)}
                                style={{ touchAction: "manipulation" }}
                                className={cn(
                                    "relative whitespace-nowrap pb-2 text-[9px] font-black uppercase tracking-[0.3em] transition-all md:text-[10px]",
                                    activeArtifact === item.id ? "text-primary" : "text-white/30 hover:text-white"
                                )}
                            >
                                {item.label}
                                <span
                                    className={cn(
                                        "absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary transition-opacity duration-200",
                                        activeArtifact === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </button>
                        ))}
                    </nav>

                    {/* Game Section */}
                    <section className="relative min-h-[600px]">
                        <motion.div
                            key={activeArtifact}
                            initial={false}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {getActiveArtifact()}
                        </motion.div>

                        <div className="absolute -top-12 -left-12 opacity-10 pointer-events-none">
                            <div className="h-[1px] w-32 bg-primary mb-1" />
                            <div className="h-32 w-[1px] bg-primary" />
                        </div>
                    </section>

                    <footer className="pt-20 border-t border-white/5 text-center space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                            Technical R&D Suite // Complete
                        </p>
                    </footer>
                </motion.div>
            </main>
        </div>
    );
}
