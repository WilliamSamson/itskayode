"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FrequencyMatcherProps {
    onSuccess?: () => void;
}

export function FrequencyMatcher({ onSuccess }: FrequencyMatcherProps) {
    // User Controls
    const [userAmp, setUserAmp] = useState(50);
    const [userFreq, setUserFreq] = useState(0.05);
    const [userPhase, setUserPhase] = useState(0);

    // Target (Neural) Signal
    const [targetAmp, setTargetAmp] = useState(70);
    const [targetFreq, setTargetFreq] = useState(0.08);
    const [targetPhase, setTargetPhase] = useState(Math.PI);
    const [jitter, setJitter] = useState(0);

    const [isMatched, setIsMatched] = useState(false);
    const [matchProgress, setMatchProgress] = useState(0);

    const width = 800;
    const height = 300;
    const centerY = height / 2;

    // Atmospheric Noise / Jitter
    useEffect(() => {
        const interval = setInterval(() => {
            setJitter(Math.random() * 2 - 1);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Randomize target periodically or on success
    const randomizeTarget = useCallback(() => {
        setTargetAmp(40 + Math.random() * 40);
        setTargetFreq(0.03 + Math.random() * 0.07);
        setTargetPhase(Math.random() * Math.PI * 2);
        setIsMatched(false);
        setMatchProgress(0);
    }, []);

    // Match Logic (RMSE-like)
    useEffect(() => {
        const samples = 10;
        let diffSum = 0;

        for (let i = 0; i < samples; i++) {
            const x = (width / samples) * i;
            const targetY = targetAmp * Math.sin(targetFreq * x + targetPhase);
            const userY = userAmp * Math.sin(userFreq * x + userPhase);
            diffSum += Math.abs(targetY - userY);
        }

        const avgDiff = diffSum / samples;
        const progress = Math.max(0, 100 - (avgDiff * 1.5));
        setMatchProgress(progress);

        if (progress > 95 && !isMatched) {
            setIsMatched(true);
            onSuccess?.();
            setTimeout(randomizeTarget, 1500);
        }
    }, [userAmp, userFreq, userPhase, targetAmp, targetFreq, targetPhase, isMatched, onSuccess, randomizeTarget, width]);

    const generatePath = (amp: number, freq: number, phase: number, addJitter = false) => {
        let points = "";
        for (let x = 0; x <= width; x += 5) {
            const j = addJitter ? jitter * 2 : 0;
            const y = centerY + (amp + j) * Math.sin(freq * x + phase);
            points += `${x === 0 ? "M" : "L"} ${x} ${y} `;
        }
        return points;
    };

    return (
        <div className="flex flex-col gap-6 md:gap-10 w-full max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-heading font-black text-white uppercase tracking-tighter">
                        Frequency Matcher
                    </h3>
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                        Signal R&D // Align waves
                    </p>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Coherence</span>
                        <div className="flex items-center gap-2">
                            <div className="w-20 md:w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    animate={{ width: `${matchProgress}%` }}
                                />
                            </div>
                            <span className="text-[10px] md:text-xs font-mono text-primary">{Math.round(matchProgress)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Oscilloscope Grid Overlay */}
            <div className="relative w-full aspect-square md:aspect-[21/9] bg-black border border-white/5 rounded-[2.5rem] overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,170,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,170,0.03)_1px,transparent_1px)] bg-[size:30px_30px] md:bg-[size:40px_40px] pointer-events-none" />

                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full preserve-3d"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Target Signal */}
                    <motion.path
                        d={generatePath(targetAmp, targetFreq, targetPhase, true)}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                    />

                    {/* User Signal */}
                    <motion.path
                        d={generatePath(userAmp, userFreq, userPhase)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className={cn(
                            "transition-colors duration-300 shadow-[0_0_20px_currentColor]",
                            isMatched ? "text-primary" : "text-primary/40"
                        )}
                        initial={false}
                    />

                    <defs>
                        <radialGradient id="interference-grad">
                            <stop offset="0%" stopColor="var(--primary)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>
                </svg>

                {/* Match Notification */}
                <AnimatePresence>
                    {isMatched && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-20"
                        >
                            <div className="text-center space-y-2 p-6">
                                <h4 className="text-2xl md:text-4xl font-heading font-black text-primary uppercase italic tracking-tighter text-shadow-glow">Signal Locked</h4>
                                <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Stabilizing Neural Bridge...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Corner Data */}
                <div className="absolute top-4 left-6 md:top-6 md:left-8 flex flex-col gap-1 opacity-20 group-hover:opacity-60 transition-opacity">
                    <span className="text-[7px] md:text-[8px] font-mono text-white">REF_SIG::Target_0x{targetAmp.toString(16)}</span>
                    <span className="text-[7px] md:text-[8px] font-mono text-white">USR_SIG::Active_v2RC</span>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[
                    { label: "Amplitude", value: userAmp, set: setUserAmp, min: 20, max: 100, step: 1 },
                    { label: "Frequency", value: userFreq, set: setUserFreq, min: 0.01, max: 0.15, step: 0.001 },
                    { label: "Phase Shift", value: userPhase, set: setUserPhase, min: 0, max: Math.PI * 2, step: 0.1 }
                ].map((ctrl) => (
                    <div key={ctrl.label} className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40">{ctrl.label}</span>
                            <span className="text-xs font-mono text-primary">{ctrl.value.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            value={ctrl.value}
                            onChange={(e) => ctrl.set(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                ))}
            </div>

            {/* Technical Footer */}
            <div className="flex items-center gap-4 py-6 md:py-8 border-t border-white/5">
                <div className="flex-1 h-[1px] bg-white/5" />
                <p className="text-[7px] md:text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">
                    Oscilloscope Kernel v4.2
                </p>
                <div className="flex-1 h-[1px] bg-white/5" />
            </div>
        </div>
    );
}
