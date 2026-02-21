"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TerraForgeProps {
    onCollect?: () => void;
}

interface Point {
    x: number;
    y: number;
}

type MineralType = "common" | "rare";

interface Mineral extends Point {
    id: string;
    value: number;
    type: MineralType;
    pulsePhase: number;
}

interface Telemetry {
    x: number;
    y: number;
    speed: number;
    range: number;
    score: number;
    minerals: number;
}

const WORLD_HALF = 1800;
const TARGET_MINERALS = 24;

const PHYSICS = {
    accelerationForward: 0.66,
    accelerationReverse: 0.34,
    maxSpeed: 9.6,
    drag: 0.955,
    turnRate: 0.085,
    collectRadius: 30,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const wrapWorld = (value: number) => {
    if (value > WORLD_HALF) return -WORLD_HALF;
    if (value < -WORLD_HALF) return WORLD_HALF;
    return value;
};

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const createMineral = (id: number): Mineral => {
    const isRare = Math.random() > 0.82;

    return {
        id: `mineral-${id}`,
        x: randomInRange(-WORLD_HALF, WORLD_HALF),
        y: randomInRange(-WORLD_HALF, WORLD_HALF),
        type: isRare ? "rare" : "common",
        value: isRare ? 3 : 1,
        pulsePhase: Math.random() * Math.PI * 2,
    };
};

// --- Upgrade System Types ---

type UpgradeType = "SPEED" | "VISION" | "EFFICIENCY";

interface Upgrade {
    id: string;
    type: UpgradeType;
    name: string;
    description: string;
    rarity: "common" | "rare" | "legendary";
    value: number; // Magnitude of effect (e.g. 0.1 for +10%)
}

interface LootCrate extends Point {
    id: string;
    angle: number; // For floating animation
}

interface RoverStats {
    speedMultiplier: number;
    visionMultiplier: number;
    collectionMultiplier: number;
    efficiencyMultiplier: number;
}

const AVAILABLE_UPGRADES: Upgrade[] = [
    { id: "speed-1", type: "SPEED", name: "Turbine Injection", description: "+15% Max Speed", rarity: "common", value: 0.15 },
    { id: "speed-2", type: "SPEED", name: "Ion Thrusters", description: "+25% Max Speed", rarity: "rare", value: 0.25 },
    { id: "vision-1", type: "VISION", name: "High-Beams", description: "+20% Vision Range", rarity: "common", value: 0.2 },
    { id: "vision-2", type: "VISION", name: "Lidar Array", description: "+35% Vision Range", rarity: "rare", value: 0.35 },
    { id: "eff-1", type: "EFFICIENCY", name: "Mining Laser", description: "+1 Fragment per node", rarity: "common", value: 1 },
    { id: "eff-2", type: "EFFICIENCY", name: "Auto-Harvester", description: "+2 Fragments per node", rarity: "rare", value: 2 },
];

const UPGRADE_TYPE_META: Record<UpgradeType, { code: string; label: string; frame: string; glow: string }> = {
    SPEED: {
        code: "DYN",
        label: "Propulsion",
        frame: "border-primary/50 text-primary",
        glow: "from-primary/18",
    },
    VISION: {
        code: "VIS",
        label: "Sensorics",
        frame: "border-cyan-400/55 text-cyan-300",
        glow: "from-cyan-400/18",
    },
    EFFICIENCY: {
        code: "SYS",
        label: "Extraction",
        frame: "border-amber-400/60 text-amber-300",
        glow: "from-amber-400/18",
    },
};

const UPGRADE_RARITY_META: Record<Upgrade["rarity"], { tag: string; color: string; dot: string; ring: string }> = {
    common: {
        tag: "COMMON",
        color: "text-zinc-300",
        dot: "bg-zinc-400",
        ring: "border-zinc-500/45",
    },
    rare: {
        tag: "RARE",
        color: "text-sky-300",
        dot: "bg-sky-400",
        ring: "border-sky-400/45",
    },
    legendary: {
        tag: "LEGENDARY",
        color: "text-amber-300",
        dot: "bg-amber-400",
        ring: "border-amber-400/55",
    },
};


export function TerraForge({ onCollect }: TerraForgeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const worldRef = useRef({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
    });

    const mineralsRef = useRef<Mineral[]>([]);
    const lootCratesRef = useRef<LootCrate[]>([]);
    const keysRef = useRef<Record<string, boolean>>({});
    const joystickInputRef = useRef<Point>({ x: 0, y: 0 });
    const viewportRef = useRef({ width: 0, height: 0, dpr: 1 });

    const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef(0);
    const hudTickRef = useRef(0);
    const mineralIdRef = useRef(0);
    const scoreRef = useRef(0);
    const crateSpawnTimerRef = useRef(0);
    const statsRef = useRef<RoverStats>({
        speedMultiplier: 1,
        visionMultiplier: 1,
        collectionMultiplier: 1,
        efficiencyMultiplier: 1,
    });
    const showUpgradeUIRef = useRef(false);

    const [rotationVisual, setRotationVisual] = useState(0);
    const [telemetry, setTelemetry] = useState<Telemetry>({
        x: 0,
        y: 0,
        speed: 0,
        range: 0,
        score: 0,
        minerals: TARGET_MINERALS,
    });
    const [stats, setStats] = useState<RoverStats>({
        speedMultiplier: 1,
        visionMultiplier: 1,
        collectionMultiplier: 1,
        efficiencyMultiplier: 1,
    });
    // VERIFICATION: Pre-load upgrades to test visuals
    const [activeUpgrades, setActiveUpgrades] = useState<Upgrade[]>([
        { id: "vis-1", type: "VISION", name: "Test Vis", description: "", rarity: "common", value: 0 },
        { id: "spd-1", type: "SPEED", name: "Test Spd 1", description: "", rarity: "common", value: 0 },
        { id: "spd-2", type: "SPEED", name: "Test Spd 2", description: "", rarity: "rare", value: 0 },
        { id: "eff-1", type: "EFFICIENCY", name: "Test Eff 1", description: "", rarity: "common", value: 0 },
        { id: "eff-2", type: "EFFICIENCY", name: "Test Eff 2", description: "", rarity: "rare", value: 0 },
    ]);
    const [showUpgradeUI, setShowUpgradeUI] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);

    const [logs, setLogs] = useState<string[]>([
        "> [SYSTEM] Rover_OS_v5.0 online",
        "> [MISSION] Harvest fragments from surface nodes",
    ]);

    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [joystick, setJoystick] = useState({
        active: false,
        origin: { x: 0, y: 0 },
        current: { x: 0, y: 0 },
    });

    useEffect(() => {
        statsRef.current = stats;
    }, [stats]);

    useEffect(() => {
        showUpgradeUIRef.current = showUpgradeUI;
    }, [showUpgradeUI]);

    useEffect(() => {
        const initial = Array.from({ length: TARGET_MINERALS }, () => {
            mineralIdRef.current += 1;
            return createMineral(mineralIdRef.current);
        });
        mineralsRef.current = initial;
    }, []);

    const spawnLootCrate = () => {
        const id = `crate-${Date.now()}`;
        lootCratesRef.current.push({
            id,
            x: randomInRange(-WORLD_HALF, WORLD_HALF),
            y: randomInRange(-WORLD_HALF, WORLD_HALF),
            angle: 0,
        });
        setLogs((prev) => [
            `> [DETECT] Supply drop signature detected`,
            ...prev,
        ].slice(0, 4));
    };

    const triggerUpgradeUI = () => {
        // Pause game logic by setting flag (need to handle in loop)
        const options = [];
        const pool = [...AVAILABLE_UPGRADES];
        for (let i = 0; i < 3; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            options.push(pool[idx]);
        }
        setUpgradeOptions(options);
        setShowUpgradeUI(true);
    };

    const applyUpgrade = (upgrade: Upgrade) => {
        setActiveUpgrades(prev => [...prev, upgrade]);
        setStats(prev => {
            const next = { ...prev };
            if (upgrade.type === "SPEED") next.speedMultiplier += upgrade.value;
            if (upgrade.type === "VISION") next.visionMultiplier += upgrade.value;
            if (upgrade.type === "EFFICIENCY") next.efficiencyMultiplier += upgrade.value; // For score
            // Collection multiplier logic if needed
            return next;
        });
        setShowUpgradeUI(false);
        setLogs((prev) => [
            `> [UPGRADE] Installed: ${upgrade.name}`,
            ...prev,
        ].slice(0, 4));
    };

    useEffect(() => {
        const updateDeviceState = () => {
            setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        updateDeviceState();
        window.addEventListener("resize", updateDeviceState);
        return () => window.removeEventListener("resize", updateDeviceState);
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreen(active);

            if (!active) {
                const orientation = window.screen.orientation as ScreenOrientation & {
                    unlock?: () => void;
                };
                orientation.unlock?.();
            }
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            keysRef.current[event.code] = true;
        };

        const onKeyUp = (event: KeyboardEvent) => {
            keysRef.current[event.code] = false;
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const toggleImmersive = async () => {
        const container = containerRef.current;
        if (!container) return;

        const anyContainer = container as HTMLDivElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
        };

        const anyDocument = document as Document & {
            webkitExitFullscreen?: () => Promise<void> | void;
        };

        const orientation = window.screen.orientation as ScreenOrientation & {
            lock?: (orientation: "landscape" | "portrait" | "any") => Promise<void>;
            unlock?: () => void;
        };

        try {
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                } else if (anyContainer.webkitRequestFullscreen) {
                    await anyContainer.webkitRequestFullscreen();
                } else {
                    setLogs((prev) => [
                        "> [SYSTEM] Fullscreen not supported on this browser",
                        ...prev,
                    ].slice(0, 4));
                    return;
                }

                try {
                    await orientation.lock?.("landscape");
                } catch {
                    setLogs((prev) => [
                        "> [INFO] Landscape lock unavailable, fullscreen enabled",
                        ...prev,
                    ].slice(0, 4));
                }
            } else if (document.exitFullscreen) {
                await document.exitFullscreen();
                orientation.unlock?.();
            } else if (anyDocument.webkitExitFullscreen) {
                await anyDocument.webkitExitFullscreen();
                orientation.unlock?.();
            }
        } catch {
            setLogs((prev) => [
                "> [ERROR] Unable to toggle immersive mode",
                ...prev,
            ].slice(0, 4));
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            viewportRef.current = { width, height, dpr };
        };

        const drawScene = (time: number) => {
            const { width, height } = viewportRef.current;
            const rover = worldRef.current;
            const minerals = mineralsRef.current;

            ctx.clearRect(0, 0, width, height);

            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, "#060606");
            bgGradient.addColorStop(1, "#0f0f0f");
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;

            const gridSize = 92;
            const offsetX = ((-rover.position.x % gridSize) + gridSize) % gridSize;
            const offsetY = ((-rover.position.y % gridSize) + gridSize) % gridSize;

            ctx.strokeStyle = "rgba(255,255,255,0.045)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = offsetX; x < width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = offsetY; y < height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            // Start Lighting Layer
            ctx.save();
            ctx.globalCompositeOperation = "multiply";

            // Fog of War (Darkness)
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0, 0, width, height);

            // Headlamp Vision Cone
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            // Cone angle +/- 25 degrees, length 300px
            ctx.arc(centerX, centerY, 320, rover.rotation - 0.5, rover.rotation + 0.5);
            ctx.lineTo(centerX, centerY);

            // Proximity Light (Around rover)
            ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
            ctx.fill(); // Cut out darkness

            // Soften edges of light
            ctx.shadowColor = "white";
            ctx.shadowBlur = 40;
            ctx.stroke();
            ctx.restore();

            // Draw Visible Minerals Only
            minerals.forEach((mineral) => {
                const screenX = centerX + (mineral.x - rover.position.x);
                const screenY = centerY + (mineral.y - rover.position.y);

                // Simple culling
                if (screenX < -60 || screenX > width + 60 || screenY < -60 || screenY > height + 60) {
                    return;
                }

                // Check visibility (distance + angle)
                const dx = screenX - centerX;
                const dy = screenY - centerY;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                let angleDiff = angle - rover.rotation;
                // Normalize angle
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                const inCone = dist < 320 && Math.abs(angleDiff) < 0.6; // Slightly wider than cutout
                const inProximity = dist < 90;

                if (inCone || inProximity) {
                    const pulse = 1 + Math.sin(time * 0.004 + mineral.pulsePhase) * 0.2;
                    const radius = (mineral.type === "rare" ? 4.2 : 2.6) * pulse;

                    ctx.beginPath();
                    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                    // Brighter colors when illuminated
                    ctx.fillStyle = mineral.type === "rare" ? "#ff2222" : "#ffffff";
                    ctx.shadowBlur = mineral.type === "rare" ? 8 : 4; // Reduced glow
                    ctx.shadowColor = mineral.type === "rare" ? "#ff0000" : "#aaaaaa";
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            // Draw Loot Crates (Always visible / glowing)
            lootCratesRef.current.forEach(crate => {
                const screenX = centerX + (crate.x - rover.position.x);
                const screenY = centerY + (crate.y - rover.position.y);

                if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50) {
                    ctx.save();
                    ctx.translate(screenX, screenY);
                    ctx.rotate(crate.angle + time * 0.002); // Rotate slowly

                    // Glow
                    ctx.shadowColor = "#fbbf24";
                    ctx.shadowBlur = 20;

                    // Box
                    ctx.fillStyle = "#18181b"; // Zinc-950
                    ctx.fillRect(-14, -14, 28, 28);

                    // Border/Cross
                    ctx.strokeStyle = "#fbbf24"; // Amber-400
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-14, -14, 28, 28);
                    ctx.beginPath();
                    ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
                    ctx.moveTo(14, -14); ctx.lineTo(-14, 14);
                    ctx.stroke();

                    ctx.restore();
                }
            });

            // HUD / Scan Circle
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, PHYSICS.collectRadius * statsRef.current.collectionMultiplier, 0, Math.PI * 2);
            ctx.stroke();
        };

        const loop = (time: number) => {
            const liveStats = statsRef.current;

            if (showUpgradeUIRef.current) {
                // Pause loop but keep rendering? Or just stop requesting animation frame?
                // Let's just return to pause physics, but we might want to keep drawing for background?
                // For simplicity, just pause.
                // Actually if we pause, we need to make sure we can resume.
                // We'll rely on the React state update to trigger re-renders if needed, 
                // but usually the RAF loop handles everything.
                // Let's just not update physics but still draw.
                drawScene(time);
                rafRef.current = window.requestAnimationFrame(loop);
                return;
            }

            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
            const dt = Math.min((time - lastFrameTimeRef.current) / 16.6667, 2.2);
            lastFrameTimeRef.current = time;

            // Spawn Logic
            crateSpawnTimerRef.current += dt;
            if (crateSpawnTimerRef.current > 200) { // FAST SPAWN FOR DEBUG
                spawnLootCrate();
                crateSpawnTimerRef.current = 0;
            }

            const rover = worldRef.current;

            const turnInput = clamp(
                (keysRef.current.ArrowLeft || keysRef.current.KeyA ? -1 : 0) +
                (keysRef.current.ArrowRight || keysRef.current.KeyD ? 1 : 0) +
                (Math.abs(joystickInputRef.current.x) > 0.08 ? joystickInputRef.current.x : 0),
                -1,
                1,
            );

            const throttleInput = clamp(
                (keysRef.current.ArrowUp || keysRef.current.KeyW ? 1 : 0) +
                (keysRef.current.ArrowDown || keysRef.current.KeyS ? -1 : 0) +
                (Math.abs(joystickInputRef.current.y) > 0.08 ? joystickInputRef.current.y : 0),
                -1,
                1,
            );

            const speed = Math.hypot(rover.velocity.x, rover.velocity.y);
            const maxSpeed = PHYSICS.maxSpeed * liveStats.speedMultiplier;
            const speedFactor = Math.min(speed / maxSpeed, 1);

            rover.rotation += turnInput * PHYSICS.turnRate * (0.55 + speedFactor * 0.65) * dt;

            if (Math.abs(throttleInput) > 0.01) {
                const throttleAccel = (throttleInput > 0 ? PHYSICS.accelerationForward : PHYSICS.accelerationReverse) * liveStats.speedMultiplier;
                rover.velocity.x += Math.sin(rover.rotation) * throttleAccel * throttleInput * dt;
                rover.velocity.y += -Math.cos(rover.rotation) * throttleAccel * throttleInput * dt;
            }

            rover.velocity.x *= Math.pow(PHYSICS.drag, dt);
            rover.velocity.y *= Math.pow(PHYSICS.drag, dt);

            const currentSpeed = Math.hypot(rover.velocity.x, rover.velocity.y);
            if (currentSpeed > maxSpeed) {
                const ratio = maxSpeed / currentSpeed;
                rover.velocity.x *= ratio;
                rover.velocity.y *= ratio;
            }

            rover.position.x = wrapWorld(rover.position.x + rover.velocity.x * dt);
            rover.position.y = wrapWorld(rover.position.y + rover.velocity.y * dt);

            let collected = 0;
            let scoreGain = 0;
            let rareHits = 0;

            const collectRadius = (PHYSICS.collectRadius * liveStats.collectionMultiplier) + Math.min(currentSpeed * 0.9, 7);
            mineralsRef.current = mineralsRef.current.filter((mineral) => {
                const dx = mineral.x - rover.position.x;
                const dy = mineral.y - rover.position.y;
                const distance = Math.hypot(dx, dy);

                if (distance < collectRadius) {
                    collected += 1;
                    scoreGain += mineral.value * liveStats.efficiencyMultiplier; // Efficiency boosts score? Or separate? 
                    // Let's say efficiency boosts score for now.
                    if (mineral.type === "rare") rareHits += 1;
                    return false;
                }

                return true;
            });

            // Crate Collision
            lootCratesRef.current = lootCratesRef.current.filter(crate => {
                const dx = crate.x - rover.position.x;
                const dy = crate.y - rover.position.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 40) { // Crate collect radius
                    triggerUpgradeUI();
                    return false;
                }
                return true;
            });

            if (collected > 0) {
                scoreRef.current += scoreGain;

                while (mineralsRef.current.length < TARGET_MINERALS) {
                    mineralIdRef.current += 1;
                    mineralsRef.current.push(createMineral(mineralIdRef.current));
                }

                const rareTag = rareHits > 0 ? ` // rare:${rareHits}` : "";
                setLogs((prev) => [
                    `> [EXTRACT] +${scoreGain} data (${collected} nodes${rareTag})`,
                    ...prev,
                ].slice(0, 4));

                for (let i = 0; i < collected; i++) onCollect?.();
            }

            drawScene(time);

            hudTickRef.current += dt;
            if (hudTickRef.current >= 2) {
                hudTickRef.current = 0;
                const speedNow = Math.hypot(rover.velocity.x, rover.velocity.y);
                const rangeNow = Math.hypot(rover.position.x, rover.position.y);

                setRotationVisual(rover.rotation);
                setTelemetry({
                    x: rover.position.x,
                    y: rover.position.y,
                    speed: speedNow,
                    range: rangeNow,
                    score: scoreRef.current,
                    minerals: mineralsRef.current.length,
                });
            }

            rafRef.current = window.requestAnimationFrame(loop);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        rafRef.current = window.requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        };
    }, [onCollect]);

    const headingDegrees = ((rotationVisual * 180 / Math.PI) % 360 + 360) % 360;
    const maxRoverSpeed = PHYSICS.maxSpeed * stats.speedMultiplier;
    const speedPercent = clamp((telemetry.speed / Math.max(maxRoverSpeed, 0.01)) * 100, 0, 100);
    const radarRange = 680;
    const roverPoint = worldRef.current.position;
    const radarBlips: Array<{ id: string; x: number; y: number; type: "crate" }> = [];

    for (const crate of lootCratesRef.current) {
        const dx = crate.x - roverPoint.x;
        const dy = crate.y - roverPoint.y;
        const dist = Math.hypot(dx, dy);
        if (dist > radarRange) continue;
        radarBlips.push({
            id: crate.id,
            x: clamp(dx / radarRange, -1, 1),
            y: clamp(dy / radarRange, -1, 1),
            type: "crate",
        });
    }

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="text-xl font-heading font-black uppercase tracking-tighter text-white">
                        Terra Forge
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
                        WASD to drive // Gather surface fragments
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleImmersive}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/65 transition-all hover:border-primary/50 hover:text-white"
                    >
                        {isFullscreen ? "Exit Immersive" : "Immersive Landscape"}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 md:gap-6 md:text-[10px]">
                <span>Range {Math.floor(telemetry.range)}m</span>
                <span>Speed {telemetry.speed.toFixed(1)}</span>
                <span>Score {telemetry.score.toString().padStart(3, "0")}</span>
                <span>Nodes {telemetry.minerals.toString().padStart(2, "0")}</span>
            </div>

            <div
                ref={containerRef}
                className={cn(
                    "relative h-[360px] w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-black md:h-[460px]",
                    isTouchDevice ? "cursor-default" : "cursor-none"
                )}
            >
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 block h-full w-full"
                />

                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 perspective-[800px]"
                    style={{ transform: `translate(-50%, -50%) rotate(${rotationVisual}rad)` }}
                >
                    <div
                        className="relative h-16 w-12"
                        style={{
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {/* ROVER CHASSIS - 3D Box Construction */}

                        {/* Main Body Elevation Group */}
                        <div className="absolute inset-0" style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>

                            {/* Top Deck */}
                            <div className={cn(
                                "absolute inset-0 z-20 rounded-md border border-white/10 transition-colors duration-500",
                                activeUpgrades.length > 4 ? "bg-amber-900" :
                                    activeUpgrades.length > 2 ? "bg-blue-900" : "bg-zinc-900"
                            )}
                                style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>
                                <div className="absolute top-8 left-1/2 w-8 h-4 -translate-x-1/2 bg-zinc-950 rounded border border-white/5" />
                                <div className="absolute top-2 left-1/2 w-8 h-5 -translate-x-1/2 bg-sky-900/40 border border-sky-400/30 rounded-sm backdrop-blur-sm shadow-[0_0_10px_rgba(56,189,248,0.1)]" />

                                {/* VISUAL UPGRADE: Radar Dish (Vision) */}
                                {activeUpgrades.some(u => u.type === "VISION") && (
                                    <div className="absolute top-6 right-1 w-3 h-3 rounded-full border border-sky-400/50 bg-sky-900/80"
                                        style={{ transform: `translateZ(4px) rotate(${time * 0.005}rad)` }}>
                                        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-sky-400/50 -translate-x-1/2" />
                                    </div>
                                )}
                            </div>

                            {/* Sides (Simulated 3D Extrusion) */}
                            {/* Left Wall */}
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-[10px] origin-left border-y border-white/5 transition-colors duration-500",
                                activeUpgrades.length > 4 ? "bg-amber-800" :
                                    activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateY(-90deg)" }}>
                                {/* VISUAL UPGRADE: Mining Laser (Efficiency) */}
                                {activeUpgrades.some(u => u.type === "EFFICIENCY") && (
                                    <div className="absolute top-1/2 left-[-4px] w-6 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                        style={{ transform: "translateX(-50%) rotateY(90deg)" }} />
                                )}
                            </div>
                            {/* Right Wall */}
                            <div className={cn(
                                "absolute right-0 top-0 bottom-0 w-[10px] origin-right border-y border-white/5 transition-colors duration-500",
                                activeUpgrades.length > 4 ? "bg-amber-800" :
                                    activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateY(90deg)" }}>
                                {/* VISUAL UPGRADE: Mining Laser (Efficiency - Dual) */}
                                {activeUpgrades.filter(u => u.type === "EFFICIENCY").length > 1 && (
                                    <div className="absolute top-1/2 right-[-4px] w-6 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                        style={{ transform: "translateX(50%) rotateY(-90deg)" }} />
                                )}
                            </div>

                            {/* Rear Wall */}
                            <div className={cn(
                                "absolute bottom-0 left-0 right-0 h-[10px] origin-bottom flex items-center justify-center gap-1 border-x border-white/5 transition-colors duration-500",
                                activeUpgrades.length > 4 ? "bg-amber-800" :
                                    activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateX(-90deg)" }}>
                                {activeUpgrades.some(u => u.type === "SPEED") ? (
                                    // Speed Thrusters
                                    <>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                    </>
                                ) : (
                                    // Standard
                                    <>
                                        <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse" />
                                        <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse delay-75" />
                                    </>
                                )}
                            </div>
                            {/* Front Wall */}
                            <div className={cn(
                                "absolute top-0 left-0 right-0 h-[10px] origin-top border-x border-white/5 transition-colors duration-500",
                                activeUpgrades.length > 4 ? "bg-amber-800" :
                                    activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateX(90deg)" }} />

                            {/* VISUAL UPGRADE: Spoiler (Speed Level 2) */}
                            {activeUpgrades.filter(u => u.type === "SPEED").length > 1 && (
                                <div className="absolute -bottom-2 left-0 right-0 h-4 bg-zinc-900 border border-white/10"
                                    style={{ transform: "translateZ(12px) rotateX(-20deg)", transformOrigin: "bottom" }} />
                            )}
                        </div>


                        {/* Tracks / Wheels (Base Layer) */}
                        <div className="absolute -left-2 top-0 bottom-0 w-3 bg-zinc-900 border border-white/10"
                            style={{ transform: "translateZ(4px)" }}>
                            <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,#000_4px)] opacity-50" />
                        </div>
                        <div className="absolute -right-2 top-0 bottom-0 w-3 bg-zinc-900 border border-white/10"
                            style={{ transform: "translateZ(4px)" }}>
                            <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,#000_4px)] opacity-50" />
                        </div>

                        {/* Shadow */}
                        <div className="absolute inset-0 bg-black/60 blur-md rounded-full scale-125" style={{ transform: "translateZ(0px)" }} />
                    </div>
                </div>

                <div className="pointer-events-none absolute left-4 top-4 z-20 w-[220px] rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md md:left-6 md:top-6 md:w-[250px]">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black uppercase tracking-[0.28em] text-white/55">Nav Matrix</p>
                        <span className="text-[8px] font-mono text-primary">{headingDegrees.toFixed(0).padStart(3, "0")}deg</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] uppercase tracking-[0.18em]">
                        <span className="text-white/35">X</span>
                        <span className="font-mono text-white/80">{Math.floor(telemetry.x).toString().padStart(5, "0")}</span>
                        <span className="text-white/35">Y</span>
                        <span className="font-mono text-white/80">{Math.floor(telemetry.y).toString().padStart(5, "0")}</span>
                        <span className="text-white/35">Range</span>
                        <span className="font-mono text-white/80">{Math.floor(telemetry.range).toString().padStart(4, "0")}m</span>
                    </div>
                </div>

                <div className="pointer-events-none absolute right-4 top-4 z-20 w-[196px] rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md md:right-6 md:top-6 md:w-[230px]">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.24em]">
                        <span className="text-white/50">Velocity</span>
                        <span className="font-mono text-white/85">{telemetry.speed.toFixed(1)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                            className="h-full bg-primary"
                            animate={{ width: `${speedPercent}%` }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border border-white/10 bg-black/45 py-1.5">
                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/35">Score</p>
                            <p className="text-[10px] font-mono text-white/85">{telemetry.score.toString().padStart(3, "0")}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/45 py-1.5">
                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/35">Nodes</p>
                            <p className="text-[10px] font-mono text-white/85">{telemetry.minerals.toString().padStart(2, "0")}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/45 py-1.5">
                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/35">Mods</p>
                            <p className="text-[10px] font-mono text-white/85">{activeUpgrades.length.toString().padStart(2, "0")}</p>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-20 w-[220px] rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5 backdrop-blur-md md:bottom-6 md:left-6 md:w-[280px]">
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.24em] text-white/40">System Console</p>
                    <div className="flex flex-col gap-0.5">
                        {logs.map((log, index) => (
                            <motion.p
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1 - index * 0.2, x: 0 }}
                                className="overflow-hidden whitespace-nowrap font-mono text-[8px] text-primary/70"
                            >
                                {log}
                            </motion.p>
                        ))}
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-4 right-4 z-20 h-28 w-28 overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md md:bottom-6 md:right-6 md:h-32 md:w-32">
                    <p className="mb-1 text-center text-[7px] font-black uppercase tracking-[0.22em] text-white/45">Radar</p>
                    <div className="relative h-full w-full">
                        <div className="absolute inset-1 rounded-full border border-white/10" />
                        <div className="absolute inset-4 rounded-full border border-white/10" />
                        <motion.div
                            className="absolute left-1/2 top-1/2 h-[1px] w-[42%] origin-left bg-primary/55"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
                            style={{ transformOrigin: "0% 50%" }}
                        />
                        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                        {radarBlips.slice(0, 10).map((blip) => (
                            <span
                                key={blip.id}
                                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/90"
                                style={{
                                    left: `${50 + blip.x * 40}%`,
                                    top: `${50 + blip.y * 40}%`,
                                }}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {isFullscreen && isPortrait && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 px-6 text-center"
                        >
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">
                                    Landscape Recommended
                                </p>
                                <p className="text-sm text-white/70">
                                    Rotate your device for full cockpit visibility.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    className={cn(
                        "absolute inset-0 z-20 touch-none",
                        isTouchDevice ? "block" : "hidden"
                    )}
                    onTouchStart={(event) => {
                        const touch = event.touches[0];
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;

                        setJoystick({ active: true, origin: { x, y }, current: { x, y } });
                        joystickInputRef.current = { x: 0, y: 0 };
                    }}
                    onTouchMove={(event) => {
                        if (!joystick.active) return;

                        const touch = event.touches[0];
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;

                        setJoystick((prev) => ({ ...prev, current: { x, y } }));

                        const dx = x - joystick.origin.x;
                        const dy = y - joystick.origin.y;

                        joystickInputRef.current = {
                            x: clamp(dx / 48, -1, 1),
                            y: clamp(-dy / 48, -1, 1),
                        };
                    }}
                    onTouchEnd={() => {
                        setJoystick({ active: false, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
                        joystickInputRef.current = { x: 0, y: 0 };
                    }}
                >
                    <AnimatePresence>
                        {joystick.active && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="pointer-events-none absolute"
                                style={{ left: joystick.origin.x, top: joystick.origin.y, x: "-50%", y: "-50%" }}
                            >
                                <div className="h-24 w-24 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
                                <div
                                    className="absolute h-12 w-12 rounded-full bg-primary/50 shadow-[0_0_14px_rgba(255,255,255,0.35)]"
                                    style={{
                                        left: "50%",
                                        top: "50%",
                                        x: clamp(joystick.current.x - joystick.origin.x, -38, 38) - 24,
                                        y: clamp(joystick.current.y - joystick.origin.y, -38, 38) - 24,
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {showUpgradeUI && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 p-5 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:p-8"
                            >
                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
                                <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
                                <div className="pointer-events-none absolute -right-20 bottom-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

                                <div className="relative mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.34em] text-primary/85">System Upgrade Interface</p>
                                        <h3 className="text-2xl font-heading font-black uppercase tracking-tight text-white md:text-3xl">
                                            Select Next Module
                                        </h3>
                                        <p className="max-w-xl text-xs font-mono text-white/55 md:text-sm">
                                            Rover control is paused. Choose one upgrade path to continue the mission.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-right">
                                        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/40">Installed Modules</p>
                                        <p className="font-heading text-xl font-black text-white">{activeUpgrades.length.toString().padStart(2, "0")}</p>
                                    </div>
                                </div>

                                <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {upgradeOptions.map((upgrade, index) => {
                                        const typeMeta = UPGRADE_TYPE_META[upgrade.type];
                                        const rarityMeta = UPGRADE_RARITY_META[upgrade.rarity];

                                        return (
                                            <motion.button
                                                key={upgrade.id}
                                                onClick={() => applyUpgrade(upgrade)}
                                                whileHover={{ y: -4 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={{ duration: 0.16 }}
                                                className={cn(
                                                    "group relative overflow-hidden rounded-2xl border bg-zinc-950/90 p-4 text-left transition-all",
                                                    "hover:border-white/35 hover:bg-zinc-900/95",
                                                    rarityMeta.ring
                                                )}
                                            >
                                                <div className={cn(
                                                    "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                                                    typeMeta.glow
                                                )} />
                                                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 group-hover:opacity-100" />

                                                <div className="relative space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className={cn(
                                                            "rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.22em]",
                                                            typeMeta.frame
                                                        )}>
                                                            {typeMeta.code}
                                                        </div>

                                                        <div className="text-right">
                                                            <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", rarityMeta.color)}>
                                                                {rarityMeta.tag}
                                                            </p>
                                                            <span className={cn("ml-auto mt-1 block h-1.5 w-1.5 rounded-full", rarityMeta.dot)} />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                                                            Module {String(index + 1).padStart(2, "0")} · {typeMeta.label}
                                                        </p>
                                                        <h4 className="mt-1 text-lg font-heading font-black uppercase tracking-tight text-white transition-colors group-hover:text-primary">
                                                            {upgrade.name}
                                                        </h4>
                                                        <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                                                            {upgrade.description}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                                        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/45">
                                                            Install Module
                                                        </p>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="h-[2px] w-5 bg-white/35" />
                                                            <span className={cn("h-2 w-2 rounded-sm border", typeMeta.frame)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                                    <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-white/40">
                                        Pick one upgrade to resume operation
                                    </p>
                                    <div className="flex items-center gap-1.5 opacity-45">
                                        <span className="h-[1px] w-10 bg-white/50" />
                                        <span className="h-[1px] w-6 bg-primary/80" />
                                        <span className="h-[1px] w-3 bg-white/30" />
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
