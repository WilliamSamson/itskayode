"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type GateType = "AND" | "OR" | "NOT" | "EMPTY";

interface GridCell {
    id: string;
    type: GateType;
    input1: boolean;
    input2: boolean;
    output: boolean;
}

interface Level {
    id: number;
    title: string;
    description: string;
    inputs: boolean[];
    targets: boolean[];
    allowedGates: GateType[];
}

const LEVELS: Level[] = [
    {
        id: 1,
        title: "01 // Neural_Path",
        description: "Standard signal bridge. Bridge the gap to the target.",
        inputs: [true, false, false],
        targets: [true, false, false],
        allowedGates: ["OR", "AND"]
    },
    {
        id: 2,
        title: "02 // Bit_Inverter",
        description: "The signal is too high. Invert it to match system requirements.",
        inputs: [true, true, true],
        targets: [false, false, false],
        allowedGates: ["NOT", "AND"]
    },
    {
        id: 3,
        title: "03 // Dual_Sync",
        description: "Two independent lines. Use vertical branching to sync them.",
        inputs: [true, false, true],
        targets: [false, true, false],
        allowedGates: ["AND", "OR", "NOT"]
    },
    {
        id: 4,
        title: "04 // Logic_Filter",
        description: "Filter out the noise from the middle channel.",
        inputs: [true, true, true],
        targets: [true, false, true],
        allowedGates: ["NOT", "AND"]
    },
    {
        id: 5,
        title: "05 // Mainframe_Bridge",
        description: "Ultimate routing. Stabilize all three channels simultaneously.",
        inputs: [false, true, false],
        targets: [true, false, true],
        allowedGates: ["AND", "OR", "NOT"]
    }
];

interface LogicGateBridgeProps {
    onSuccess?: () => void;
}

export function LogicGateBridge({ onSuccess }: LogicGateBridgeProps) {
    const GRID_COLS = 5;
    const GRID_ROWS = 3;

    const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
    const level = LEVELS[currentLevelIdx];

    const [grid, setGrid] = useState<GridCell[][]>(() =>
        Array.from({ length: GRID_ROWS }, (_, r) =>
            Array.from({ length: GRID_COLS }, (_, c) => ({
                id: `${r}-${c}`,
                type: "EMPTY",
                input1: false,
                input2: false,
                output: false
            }))
        )
    );

    const [isSolved, setIsSolved] = useState(false);
    const [selectedGate, setSelectedGate] = useState<GateType>("AND");

    const calculateLogic = useCallback((currentGrid: GridCell[][], levelInputs: boolean[]) => {
        const nextGrid = [...currentGrid.map(row => [...row.map(cell => ({ ...cell }))])];

        for (let c = 0; c < GRID_COLS; c++) {
            for (let r = 0; r < GRID_ROWS; r++) {
                const cell = nextGrid[r][c];

                if (c === 0) {
                    cell.input1 = levelInputs[r];
                    cell.input2 = levelInputs[r];
                } else {
                    const leftCell = nextGrid[r][c - 1];
                    cell.input1 = leftCell.output;
                    const upperIdx = r > 0 ? r - 1 : r;
                    const upperLeftCell = nextGrid[upperIdx][c - 1];
                    cell.input2 = upperLeftCell.output;
                }

                switch (cell.type) {
                    case "AND": cell.output = cell.input1 && cell.input2; break;
                    case "OR": cell.output = cell.input1 || cell.input2; break;
                    case "NOT": cell.output = !cell.input1; break;
                    case "EMPTY": cell.output = cell.input1; break;
                }
            }
        }
        return nextGrid;
    }, [GRID_COLS, GRID_ROWS]);

    useEffect(() => {
        setGrid(prev => calculateLogic(prev, level.inputs));
    }, [currentLevelIdx, calculateLogic, level.inputs]);

    useEffect(() => {
        const finalResults = grid.map(row => row[GRID_COLS - 1].output);
        const solved = level.targets.every((target, i) => finalResults[i] === target);
        const hasGates = grid.some(row => row.some(cell => cell.type !== "EMPTY"));

        if (solved && hasGates && !isSolved) {
            setIsSolved(true);
            onSuccess?.();
        } else if (!solved || !hasGates) {
            setIsSolved(false);
        }
    }, [grid, level.targets, GRID_COLS, isSolved, onSuccess]);

    const toggleCell = (r: number, c: number) => {
        if (isSolved) return;
        setGrid(prev => {
            const next = prev.map(row => [...row]);
            const currentType = next[r][c].type;
            next[r][c].type = currentType === selectedGate ? "EMPTY" : selectedGate;
            return calculateLogic(next, level.inputs);
        });
    };

    const nextLevel = () => {
        if (currentLevelIdx < LEVELS.length - 1) {
            setCurrentLevelIdx(prev => prev + 1);
            resetGrid();
        } else {
            setCurrentLevelIdx(0);
            resetGrid();
        }
        setIsSolved(false);
    };

    const resetGrid = () => {
        setGrid(Array.from({ length: GRID_ROWS }, (_, r) =>
            Array.from({ length: GRID_COLS }, (_, c) => ({
                id: `${r}-${c}`,
                type: "EMPTY",
                input1: false,
                input2: false,
                output: false
            }))
        ));
    };

    const gateIcons = {
        AND: "⊼",
        OR: "⊽",
        NOT: "¬",
        EMPTY: "—"
    };

    return (
        <div className="flex flex-col gap-6 md:gap-10 w-full max-w-4xl mx-auto pb-20">
            {/* Level Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-heading font-black text-white uppercase tracking-tighter">
                        {level.title}
                    </h3>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30 max-w-md">
                        {level.description}
                    </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5 md:mb-2">Target_Vector</span>
                        <div className="flex gap-1.5 md:gap-2">
                            {level.targets.map((t, i) => (
                                <div key={i} className={cn(
                                    "w-3.5 h-3.5 md:w-4 md:h-4 rounded-sm border flex items-center justify-center text-[7px] md:text-[8px] font-bold",
                                    t ? "border-primary text-primary" : "border-white/20 text-white/20"
                                )}>
                                    {t ? "1" : "0"}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Breadboard Grid */}
            <div className="scrollbar-hide relative overflow-x-auto rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 md:rounded-[2.5rem] md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] md:bg-[size:30px_30px] pointer-events-none" />

                <div className="flex items-center gap-6 md:gap-12 relative z-10 min-w-[500px] md:min-w-0">
                    {/* Input Vector */}
                    <div className="flex flex-col gap-3 md:gap-4">
                        {level.inputs.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center border-2 transition-all",
                                    val ? "bg-primary border-primary text-black" : "bg-black border-white/20 text-white/40"
                                )}>
                                    <span className="text-xs md:text-base font-bold">{val ? "1" : "0"}</span>
                                </div>
                                <span className="text-[6px] font-black uppercase text-white/20">In_{i}</span>
                            </div>
                        ))}
                    </div>

                    {/* The Grid */}
                    <div className="flex-1 grid gap-2 md:gap-4" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
                        {grid.map((row, r) => (
                            row.map((cell, c) => (
                                <button
                                    key={cell.id}
                                    onClick={() => toggleCell(r, c)}
                                    className={cn(
                                        "aspect-square rounded-lg md:rounded-xl border-2 flex flex-col items-center justify-center transition-all group relative",
                                        cell.type !== "EMPTY"
                                            ? "bg-white/10 border-primary text-primary"
                                            : "bg-white/[0.02] border-white/5 text-white/10 hover:border-white/20"
                                    )}
                                >
                                    <span className="text-xl md:text-2xl font-black">{gateIcons[cell.type]}</span>

                                    {cell.output && (
                                        <motion.div
                                            layoutId={`flow-${cell.id}`}
                                            className="absolute inset-0 bg-primary/10 rounded-lg md:rounded-xl animate-pulse"
                                        />
                                    )}

                                    <div className="absolute top-1/2 -left-0.5 md:-left-1 w-1 md:w-2 h-1 md:h-2 rounded-full bg-white/10 -translate-y-1/2" />
                                    <div className="absolute top-1/2 -right-0.5 md:-right-1 w-1 md:w-2 h-1 md:h-2 rounded-full bg-white/10 -translate-y-1/2" />
                                </button>
                            ))
                        ))}
                    </div>

                    {/* Output Vector */}
                    <div className="flex flex-col gap-3 md:gap-4">
                        {grid.map((row, i) => {
                            const actualVal = row[GRID_COLS - 1].output;
                            const targetVal = level.targets[i];
                            const isCorrect = actualVal === targetVal;

                            return (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all",
                                        actualVal ? "bg-primary border-primary text-black" : "bg-black border-white/10 text-white/20",
                                        isCorrect && "ring-1 md:ring-2 ring-primary/40 ring-offset-2 md:ring-offset-4 ring-offset-black"
                                    )}>
                                        <span className="text-base md:text-xl font-black">{isCorrect ? "✓" : "!"}</span>
                                    </div>
                                    <span className="text-[6px] font-black uppercase text-white/20">Out_{i}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Solving Overlay */}
                <AnimatePresence>
                    {isSolved && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center"
                        >
                            <motion.h4
                                initial={{ scale: 0.8, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="text-2xl md:text-4xl font-heading font-black text-primary uppercase italic tracking-tighter"
                            >
                                Sequence Verified
                            </motion.h4>
                            <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mt-2 mb-6 md:mb-8">
                                Robotics_Core_Update // Success
                            </p>

                            <button
                                onClick={nextLevel}
                                className="px-8 md:px-12 py-3 md:py-4 bg-primary text-black font-black uppercase text-[10px] md:text-[12px] tracking-widest rounded-full hover:scale-105 transition-transform"
                            >
                                {currentLevelIdx === LEVELS.length - 1 ? "Repeat Suite" : "Engage Next Node"}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2 md:gap-4 md:pb-0">
                    {level.allowedGates.map((gate) => (
                        <button
                            key={gate}
                            onClick={() => setSelectedGate(gate)}
                            className={cn(
                                "px-4 md:px-6 py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border-2 flex-shrink-0",
                                selectedGate === gate
                                    ? "bg-primary border-primary text-black"
                                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                            )}
                        >
                            {gateIcons[gate]} {gate}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                    <div className="flex items-center gap-3 md:gap-4 py-3 md:py-4 px-4 md:px-6 bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl">
                        <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">Node Cost</span>
                        <span className="text-lg md:text-xl font-heading font-black text-primary italic">
                            {grid.flat().filter(c => c.type !== "EMPTY").length}μs
                        </span>
                    </div>

                    <button
                        onClick={resetGrid}
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors"
                    >
                        [ Clear ]
                    </button>
                </div>
            </div>

            {/* Level Selector Dots */}
            <div className="flex justify-center gap-3 md:gap-4">
                {LEVELS.map((l, i) => (
                    <button
                        key={l.id}
                        onClick={() => { setCurrentLevelIdx(i); resetGrid(); }}
                        className={cn(
                            "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all",
                            i === currentLevelIdx ? "bg-primary w-6 md:w-8" : "bg-white/10"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
