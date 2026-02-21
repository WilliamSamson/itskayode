"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const GRID_SIZE = 16;
const SEQUENCE_LENGTH = 4;

interface NodeDecryptorProps {
    onSuccess?: () => void;
}

export function NodeDecryptor({ onSuccess }: NodeDecryptorProps) {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [status, setStatus] = useState<"idle" | "playing" | "success" | "error">("idle");
    const [glitchIndex, setGlitchIndex] = useState<number | null>(null);

    const startNewGame = useCallback(() => {
        const newSequence: number[] = [];
        while (newSequence.length < SEQUENCE_LENGTH) {
            const randomNode = Math.floor(Math.random() * GRID_SIZE);
            if (!newSequence.includes(randomNode)) {
                newSequence.push(randomNode);
            }
        }
        setSequence(newSequence);
        setUserSequence([]);
        setStatus("playing");
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleNodeClick = (index: number) => {
        if (status !== "playing") return;
        if (userSequence.includes(index)) return;

        const nextCorrectNode = sequence[userSequence.length];

        if (index === nextCorrectNode) {
            const newUserSequence = [...userSequence, index];
            setUserSequence(newUserSequence);

            if (newUserSequence.length === SEQUENCE_LENGTH) {
                setStatus("success");
                onSuccess?.();
            }
        } else {
            setStatus("error");
            setGlitchIndex(index);
            setTimeout(() => {
                setGlitchIndex(null);
                setUserSequence([]);
                setStatus("playing");
            }, 600);
        }
    };

    return (
        <div className="flex flex-col items-center gap-12 py-12">
            <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-4">
                    <div className="h-[1px] w-8 bg-primary/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
                        System Security Protocol
                    </span>
                    <div className="h-[1px] w-8 bg-primary/40" />
                </div>
                <h2 className="text-3xl md:text-5xl font-heading font-black text-white uppercase tracking-tighter">
                    Node Decryptor
                </h2>
                <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: SEQUENCE_LENGTH }).map((_, i) => (
                        <motion.div
                            key={i}
                            className={cn(
                                "h-1 w-8 transition-all duration-300",
                                i < userSequence.length ? "bg-primary" : "bg-white/10"
                            )}
                            animate={status === "success" ? { scaleY: [1, 2, 1], backgroundColor: ["#ff0000", "#ffffff", "#ff0000"] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                        />
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="grid grid-cols-4 gap-4 md:gap-6 p-6 md:p-10 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-sm">
                    {Array.from({ length: GRID_SIZE }).map((_, i) => {
                        const isSelected = userSequence.includes(i);
                        const isGlitching = glitchIndex === i;

                        return (
                            <motion.button
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleNodeClick(i)}
                                className={cn(
                                    "relative w-12 h-12 md:w-16 md:h-16 rounded-xl border transition-all duration-500 flex items-center justify-center overflow-hidden group",
                                    isSelected
                                        ? "bg-primary border-primary shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                                        : "bg-white/5 border-white/10 hover:border-primary/40",
                                    isGlitching && "bg-white border-white scale-110"
                                )}
                            >
                                {/* Internal UI elements for node */}
                                <span className={cn(
                                    "text-[8px] font-black tracking-widest transition-colors",
                                    isSelected ? "text-black" : "text-white/20 group-hover:text-primary/60"
                                )}>
                                    {i < 10 ? `0${i}` : i}
                                </span>

                                {/* Decorative tiered lines inside node */}
                                <div className="absolute inset-x-2 bottom-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="h-[1px] w-full bg-primary/30" />
                                    <div className="h-[1px] w-2/3 bg-primary/60" />
                                </div>

                                {/* Glitch Overlay */}
                                {isGlitching && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0, 1, 0] }}
                                        className="absolute inset-0 bg-primary/20 mix-blend-overlay"
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Global Status HUD */}
                <div className="absolute -top-6 -right-6 flex flex-col items-end gap-1 pointer-events-none">
                    <div className="h-[1px] w-32 bg-primary/20" />
                    <div className="h-[1px] w-20 bg-primary/40" />
                    <div className="h-[1px] w-48 bg-primary/10" />
                </div>
            </div>

            <div className="max-w-md text-center space-y-6">
                <AnimatePresence mode="wait">
                    {status === "success" ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Access Granted</p>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Security module bypassed. You&apos;ve uncovered a fragment of the system intelligence.
                            </p>
                            <button
                                onClick={startNewGame}
                                className="text-xs font-black uppercase tracking-widest text-white border-b border-primary pb-1 hover:text-primary transition-colors"
                            >
                                Reset Kernel →
                            </button>
                        </motion.div>
                    ) : status === "error" ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sequence Mismatch // Retrying</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.4em]">
                                Select Nodes in Order to Decrypt
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Console-style logs */}
                <div className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-left font-mono text-[9px] text-white/20 h-24 overflow-hidden flex flex-col-reverse">
                    <div className="space-y-1">
                        <p>{`> [SYSTEM] Protocol active`}</p>
                        {userSequence.map((node, i) => (
                            <p key={i}>{`> [NODE_${node}] Verification success`}</p>
                        ))}
                        {status === "error" && <p className="text-primary">{`> [CRITICAL] Hash mismatch detected`}</p>}
                        {status === "success" && <p className="text-primary font-bold">{`> [READY] Module unlocked`}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
