"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface Entity {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: "atom" | "bit";
    size: number;
    mass: number;
}

interface GravitySandboxProps {
    onCollect?: () => void;
}

const INITIAL_BIT_COUNT = 12;

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const createBits = (count: number, width: number, height: number, prefix = "bit"): Entity[] =>
    Array.from({ length: count }).map((_, index) => ({
        id: `${prefix}-${Date.now()}-${index}-${Math.floor(Math.random() * 10_000)}`,
        x: Math.random() * (width - 32) + 16,
        y: Math.random() * (height - 32) + 16,
        vx: 0,
        vy: 0,
        type: "bit",
        size: 16,
        mass: 1,
    }));

const createInitialAtom = (width: number, height: number, isMobile: boolean): Entity => {
    const size = isMobile ? 54 : 70;
    const x = clamp(width * 0.5, size / 2 + 12, width - size / 2 - 12);
    const y = clamp(height * 0.56, size / 2 + 12, height - size / 2 - 12);

    return {
        id: "atom-core",
        x,
        y,
        vx: 0,
        vy: 0,
        type: "atom",
        size,
        mass: 18,
    };
};

export function GravitySandbox({ onCollect }: GravitySandboxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [atom, setAtom] = useState<Entity | null>(null);
    const atomRef = useRef<Entity | null>(null);
    const [bits, setBits] = useState<Entity[]>([]);
    const [isMagnetMode, setIsMagnetMode] = useState(false);
    const [combo, setCombo] = useState(0);
    const [lastCollectTime, setLastCollectTime] = useState(0);
    const [isOverloaded, setIsOverloaded] = useState(false);
    const [capturedTotal, setCapturedTotal] = useState(0);
    const [pulseRadius, setPulseRadius] = useState(0);
    const [pulseKey, setPulseKey] = useState(0);
    const [isDraggingAtom, setIsDraggingAtom] = useState(false);

    const comboRef = useRef(0);
    const requestRef = useRef<number | null>(null);
    const pulseTimeoutRef = useRef<number | null>(null);
    const draggingAtomRef = useRef(false);
    const dragVelocityRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        atomRef.current = atom;
    }, [atom]);

    useEffect(() => {
        comboRef.current = combo;
    }, [combo]);

    const getArenaSize = useCallback(() => {
        const width = containerRef.current?.offsetWidth ?? 640;
        const height = containerRef.current?.offsetHeight ?? 420;
        return { width, height };
    }, []);

    const initializeSandbox = useCallback(() => {
        const isMobile = window.innerWidth < 768;
        const { width, height } = getArenaSize();
        setAtom(createInitialAtom(width, height, isMobile));
        setBits(createBits(INITIAL_BIT_COUNT, width, height, "bit-seed"));
    }, [getArenaSize]);

    const resetSandbox = useCallback(() => {
        initializeSandbox();
        comboRef.current = 0;
        setCombo(0);
        setLastCollectTime(0);
        setIsOverloaded(false);
        setCapturedTotal(0);
        setPulseRadius(0);
    }, [initializeSandbox]);

    useEffect(() => {
        initializeSandbox();
    }, [initializeSandbox]);

    useEffect(() => {
        const checkCombo = window.setInterval(() => {
            if (Date.now() - lastCollectTime > 1500 && combo > 0) {
                comboRef.current = 0;
                setCombo(0);
                setIsOverloaded(false);
            }
        }, 100);

        return () => window.clearInterval(checkCombo);
    }, [lastCollectTime, combo]);

    const triggerPulse = useCallback(() => {
        setPulseKey((prev) => prev + 1);
        setPulseRadius(1);

        if (pulseTimeoutRef.current !== null) {
            window.clearTimeout(pulseTimeoutRef.current);
        }

        pulseTimeoutRef.current = window.setTimeout(() => {
            setPulseRadius(0);
        }, 900);
    }, []);

    useEffect(() => {
        const autoPulse = window.setInterval(() => {
            triggerPulse();
        }, 12000);

        return () => window.clearInterval(autoPulse);
    }, [triggerPulse]);

    useEffect(() => {
        return () => {
            if (pulseTimeoutRef.current !== null) {
                window.clearTimeout(pulseTimeoutRef.current);
            }
        };
    }, []);

    const updatePhysics = useCallback(() => {
        const { width: containerWidth, height: containerHeight } = getArenaSize();
        let collectedThisFrame = 0;

        setAtom((current) => {
            if (!current) return current;
            if (draggingAtomRef.current) return current;

            let { x, y, vx, vy } = current;
            const radius = current.size / 2;

            if (x - radius < 0) { x = radius; vx *= -0.82; }
            if (x + radius > containerWidth) { x = containerWidth - radius; vx *= -0.82; }
            if (y - radius < 0) { y = radius; vy *= -0.82; }
            if (y + radius > containerHeight) { y = containerHeight - radius; vy *= -0.82; }

            if (Math.hypot(vx, vy) < 0.03) {
                vx = 0;
                vy = 0;
            }

            return {
                ...current,
                x: x + vx,
                y: y + vy,
                vx: vx * 0.992,
                vy: vy * 0.992,
            };
        });

        setBits((prevBits) => {
            const activeAtom = atomRef.current;
            if (!activeAtom) return prevBits;

            let updatedBits = [...prevBits];
            let collected = 0;

            if (pulseRadius > 0) {
                updatedBits = updatedBits.map((bit) => {
                    const dx = bit.x - containerWidth / 2;
                    const dy = bit.y - containerHeight / 2;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const safeDist = Math.max(dist, 0.001);
                    const push = isOverloaded ? 2.6 : 2;

                    return {
                        ...bit,
                        vx: bit.vx + (dx / safeDist) * push * 0.16,
                        vy: bit.vy + (dy / safeDist) * push * 0.16,
                    };
                });
            }

            updatedBits = updatedBits.map((bit) => {
                const dx = activeAtom.x - bit.x;
                const dy = activeAtom.y - bit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const safeDist = Math.max(dist, 0.001);
                const influenceRadius = activeAtom.size * (isMagnetMode ? 3.1 : 1.7);

                let vx = bit.vx * 0.988;
                let vy = bit.vy * 0.988;

                if (dist < influenceRadius) {
                    const influence = 1 - dist / influenceRadius;
                    const pull = (isMagnetMode ? 0.22 : 0.06) * influence * (isOverloaded ? 1.2 : 1);
                    const swirl = (isMagnetMode ? 0.08 : 0.015) * (0.3 + influence);

                    vx += (dx / safeDist) * pull + (-dy / safeDist) * swirl;
                    vy += (dy / safeDist) * pull + (dx / safeDist) * swirl;
                }

                const half = bit.size / 2;
                let nextX = bit.x + vx;
                let nextY = bit.y + vy;

                if (nextX < half) {
                    nextX = half;
                    vx *= -0.45;
                }
                if (nextX > containerWidth - half) {
                    nextX = containerWidth - half;
                    vx *= -0.45;
                }
                if (nextY < half) {
                    nextY = half;
                    vy *= -0.45;
                }
                if (nextY > containerHeight - half) {
                    nextY = containerHeight - half;
                    vy *= -0.45;
                }

                return {
                    ...bit,
                    x: clamp(nextX, half, containerWidth - half),
                    y: clamp(nextY, half, containerHeight - half),
                    vx,
                    vy,
                };
            });

            updatedBits = updatedBits.filter((bit) => {
                const dx = activeAtom.x - bit.x;
                const dy = activeAtom.y - bit.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const relativeVx = bit.vx - activeAtom.vx;
                const relativeVy = bit.vy - activeAtom.vy;
                const relativeSpeed = Math.hypot(relativeVx, relativeVy);
                const radialAlignment = (dx * relativeVx + dy * relativeVy) / ((distance + 0.001) * (relativeSpeed + 0.001));

                const coreRadius = activeAtom.size * 0.34 + bit.size * 0.35;
                const latchRadius = activeAtom.size * (isMagnetMode ? 0.82 : 0.64) + bit.size * 0.45;
                const lockSpeedThreshold = (isMagnetMode ? 1.7 : 1.05) * (isOverloaded ? 1.2 : 1);

                const inCore = distance < coreRadius;
                const inLatchZone =
                    distance < latchRadius &&
                    relativeSpeed < lockSpeedThreshold &&
                    radialAlignment > -0.22;

                if (inCore || inLatchZone) {
                    collected++;
                    return false;
                }

                return true;
            });

            if (collected > 0) {
                collectedThisFrame = collected;
                const newBits = createBits(collected, containerWidth, containerHeight, "bit-respawn");
                updatedBits = [...updatedBits, ...newBits];
            }

            return updatedBits;
        });

        if (collectedThisFrame > 0) {
            const nextCombo = comboRef.current + collectedThisFrame;
            comboRef.current = nextCombo;

            setCombo(nextCombo);
            if (nextCombo >= 5) setIsOverloaded(true);

            setLastCollectTime(Date.now());
            setCapturedTotal((prev) => prev + collectedThisFrame);

            for (let i = 0; i < collectedThisFrame; i++) onCollect?.();
        }

        requestRef.current = window.requestAnimationFrame(updatePhysics);
    }, [getArenaSize, isMagnetMode, isOverloaded, onCollect, pulseRadius]);

    useEffect(() => {
        requestRef.current = window.requestAnimationFrame(updatePhysics);

        return () => {
            if (requestRef.current !== null) window.cancelAnimationFrame(requestRef.current);
        };
    }, [updatePhysics]);

    const handleAtomDragStart = () => {
        draggingAtomRef.current = true;
        setIsDraggingAtom(true);
        dragVelocityRef.current = { x: 0, y: 0 };
    };

    const handleAtomDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { width, height } = getArenaSize();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setAtom((current) => {
            if (!current) return current;
            const radius = current.size / 2;

            const nextX = clamp(info.point.x - rect.left, radius, width - radius);
            const nextY = clamp(info.point.y - rect.top, radius, height - radius);

            dragVelocityRef.current = {
                x: dragVelocityRef.current.x * 0.68 + info.delta.x * 0.32,
                y: dragVelocityRef.current.y * 0.68 + info.delta.y * 0.32,
            };

            return {
                ...current,
                x: nextX,
                y: nextY,
                vx: dragVelocityRef.current.x,
                vy: dragVelocityRef.current.y,
            };
        });
    };

    const handleAtomDragEnd = () => {
        draggingAtomRef.current = false;
        setIsDraggingAtom(false);
        setAtom((current) => {
            if (!current) return current;
            return {
                ...current,
                vx: dragVelocityRef.current.x * 1.05,
                vy: dragVelocityRef.current.y * 1.05,
            };
        });
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="text-xl font-heading font-black uppercase tracking-tight text-white md:text-2xl">
                        Gravity Sandbox
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                        Single Atom Simulation
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMagnetMode((prev) => !prev)}
                        className={cn(
                            "rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                            isMagnetMode
                                ? "border-primary bg-primary text-black"
                                : "border-white/15 bg-white/5 text-white/60 hover:border-primary/40 hover:text-white"
                        )}
                    >
                        Magnet {isMagnetMode ? "ON" : "OFF"}
                    </button>
                    <button
                        onClick={triggerPulse}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 transition-all hover:border-primary/40 hover:text-white"
                    >
                        Pulse
                    </button>
                    <button
                        onClick={resetSandbox}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 transition-all hover:border-primary/40 hover:text-white"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 md:gap-6 md:text-[10px]">
                <span>Combo x{combo.toString().padStart(2, "0")}</span>
                <span>Captured {capturedTotal.toString().padStart(3, "0")}</span>
                <span className={isOverloaded ? "text-primary" : "text-white/50"}>
                    {isOverloaded ? "State Unstable" : "State Stable"}
                </span>
                <span>Bits {bits.length.toString().padStart(2, "0")}</span>
            </div>

            <div
                ref={containerRef}
                className={cn(
                    "relative isolate h-[360px] w-full cursor-crosshair overflow-hidden rounded-[2rem] border bg-[linear-gradient(145deg,#080808_0%,#111111_100%)] transition-all duration-300 md:h-[460px]",
                    isOverloaded ? "border-primary/35" : "border-white/10"
                )}
            >
                {isOverloaded && (
                    <motion.div
                        animate={{ x: [-1, 1, -1], y: [1, -1, 1] }}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="pointer-events-none absolute inset-0 z-0 bg-primary/[0.05]"
                    />
                )}

                <AnimatePresence>
                    {pulseRadius > 0 && (
                        <motion.div
                            key={pulseKey}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 0.9, 0], scale: 4.8 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
                        >
                            <svg width="220" height="220" viewBox="0 0 220 220" className="opacity-30">
                                <circle cx="110" cy="110" r="90" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
                                <circle cx="110" cy="110" r="66" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="5 6" className="text-primary/60" />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {bits.map((bit) => (
                        <motion.div
                            key={bit.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                x: bit.x - bit.size / 2,
                                y: bit.y - bit.size / 2,
                            }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="pointer-events-none absolute"
                            style={{ width: bit.size, height: bit.size }}
                        >
                            <div className="h-full w-full rotate-45 rounded-[4px] border border-primary/40 bg-primary/25" />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {atom && (
                    <motion.div
                        key={atom.id}
                        drag
                        dragConstraints={containerRef}
                        dragElastic={0.02}
                        dragMomentum={false}
                        onDragStart={handleAtomDragStart}
                        onDrag={handleAtomDrag}
                        onDragEnd={handleAtomDragEnd}
                        className="absolute z-10 cursor-grab active:cursor-grabbing"
                        animate={{
                            x: atom.x - atom.size / 2,
                            y: atom.y - atom.size / 2,
                            scale: isDraggingAtom ? 1.03 : 1,
                        }}
                        transition={
                            isDraggingAtom
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 200, damping: 26, mass: 0.7 }
                        }
                        style={{
                            width: atom.size,
                            height: atom.size,
                            left: 0,
                            top: 0,
                        }}
                    >
                        <div className="relative flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-black/55">
                            <div className="absolute inset-[6%] rounded-full border border-primary/20" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 5.5, ease: "linear" }}
                                className="absolute inset-[13%] rounded-full border border-dashed border-primary/55"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ repeat: Infinity, duration: 8.5, ease: "linear" }}
                                className="absolute inset-[22%] rounded-full border border-white/25"
                            />

                            <div className="relative flex h-[34%] w-[34%] rotate-45 items-center justify-center rounded-[4px] border border-primary/55 bg-primary/75">
                                <span className="-rotate-45 text-[8px] font-black uppercase tracking-[0.14em] text-black/80">
                                    core
                                </span>
                            </div>

                            <span className="absolute left-[15%] top-[28%] h-1.5 w-1.5 rounded-full bg-primary/85" />
                            <span className="absolute right-[19%] top-[19%] h-1 w-1 rounded-full bg-white/70" />
                            <span className="absolute bottom-[18%] right-[26%] h-1.5 w-1.5 rounded-full bg-primary/70" />
                        </div>
                    </motion.div>
                )}

                <div className="pointer-events-none absolute bottom-4 left-4 text-[8px] font-black uppercase tracking-[0.2em] text-white/35 md:bottom-6 md:left-6 md:text-[9px]">
                    Drag atom to collect bits
                </div>
            </div>
        </div>
    );
}
