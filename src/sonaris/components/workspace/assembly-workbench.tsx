"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  assemblyParts,
  createAssemblyState,
  snapPosition,
  connectionIssue,
  type AssemblyConnection,
  type AssemblyState,
  type AssemblyPart
} from "@/sonaris/lib/sonaris-assembly";
import styles from "./assembly-workbench.module.css";

const AssemblyStage = dynamic(() => import("./assembly-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-[24px] bg-[#E5E1D8] flex flex-col items-center justify-center gap-3 font-mono text-[11px] text-[#68655E] select-none">
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#111319] animate-pulse" />
        <strong className="tracking-wider uppercase text-[#111319] text-[12px]">
          SONARIS · 3D Spatial Twin
        </strong>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[#7A766E]">
        <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[#D5D0C6]">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#111319]" />
        </span>
        <span>Loading Geometry Engine</span>
      </div>
    </div>
  )
});

const groupLabels: Record<AssemblyPart["group"], string> = {
  structure: "Chassis & Decks",
  drive: "Mecanum Drivetrain",
  compute: "Compute & Control",
  sensing: "LiDAR & IMU",
  power: "Battery & Converters",
  safety: "Safety & Disconnect"
};

// Proposed full electrical harness
const PROPOSED_LOOM: Omit<AssemblyConnection, "id">[] = [
  { fromPart: "battery", fromPort: "supply", toPart: "disconnect", toPort: "power-in" },
  { fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-a", toPort: "power-in" },
  { fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-1", toPort: "power-in" },
  { fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-2", toPort: "power-in" },
  { fromPart: "disconnect", fromPort: "drive-supply", toPart: "servo", toPort: "power-in" },
  { fromPart: "converter-a", fromPort: "output", toPart: "pi5", toPort: "power-in" },
  { fromPart: "converter-a", fromPort: "output", toPart: "pico", toPort: "power-in" },
  { fromPart: "converter-a", fromPort: "output", toPart: "lidar", toPort: "power-in" },
  { fromPart: "converter-a", fromPort: "output", toPart: "imu", toPort: "power-in" },
  { fromPart: "lidar", fromPort: "scan-data", toPart: "pi5", toPort: "lidar" },
  { fromPart: "pico", fromPort: "host", toPart: "pi5", toPort: "control" },
  { fromPart: "imu", fromPort: "orientation", toPart: "pico", toPort: "imu" },
  { fromPart: "pico", fromPort: "pwm-a", toPart: "driver-1", toPort: "pwm" },
  { fromPart: "pico", fromPort: "pwm-b", toPart: "driver-2", toPort: "pwm" },
  { fromPart: "driver-1", fromPort: "motor-a", toPart: "motor-front-left", toPort: "drive-in" },
  { fromPart: "driver-1", fromPort: "motor-b", toPart: "motor-rear-left", toPort: "drive-in" },
  { fromPart: "driver-2", fromPort: "motor-a", toPart: "motor-front-right", toPort: "drive-in" },
  { fromPart: "driver-2", fromPort: "motor-b", toPart: "motor-rear-right", toPort: "drive-in" },
  { fromPart: "estop", fromPort: "stop-out", toPart: "disconnect", toPort: "stop-request" }
];

export function AssemblyWorkbench({ category: _category = "all" }: { category?: string } = {}) {
  const [state, setState] = useState<AssemblyState>(createAssemblyState);
  const [selectedId, setSelectedId] = useState("lidar");
  const [exploded, setExploded] = useState(false);
  const [explodeRatio, setExplodeRatio] = useState(0);
  const [view3D, setView3D] = useState<"top" | "isometric" | "front">("isometric");
  const [mode, setMode] = useState<"orbit" | "move" | "connect">("orbit");
  const [running, setRunning] = useState(false);
  const [pendingPort, setPendingPort] = useState<{ partId: string; portId: string } | null>(null);

  const current = useRef(state);
  current.current = state;

  const commit = useCallback((next: AssemblyState) => {
    setState(next);
  }, []);

  const selected = useMemo(
    () => assemblyParts.find((p) => p.id === selectedId) || assemblyParts[0],
    [selectedId]
  );

  const move = useCallback(
    (id: string, rawPosition: [number, number, number]) => {
      const snapped = snapPosition(id, rawPosition);
      commit({
        ...current.current,
        positions: { ...current.current.positions, [id]: snapped }
      });
    },
    [commit]
  );

  const port = useCallback(
    (partId: string, portId: string) => {
      if (!pendingPort) {
        setPendingPort({ partId, portId });
        return;
      }
      if (pendingPort.partId === partId) {
        setPendingPort(null);
        return;
      }
      const link: AssemblyConnection = {
        id: crypto.randomUUID(),
        fromPart: pendingPort.partId,
        fromPort: pendingPort.portId,
        toPart: partId,
        toPort: portId
      };
      const issue = connectionIssue(link);
      if (issue) {
        setPendingPort(null);
        return;
      }
      const duplicate = current.current.connections.some(
        (c) =>
          (c.fromPart === link.fromPart &&
            c.fromPort === link.fromPort &&
            c.toPart === link.toPart &&
            c.toPort === link.toPort) ||
          (c.fromPart === link.toPart &&
            c.fromPort === link.toPort &&
            c.toPart === link.fromPart &&
            c.toPort === link.fromPort)
      );
      if (duplicate) {
        setPendingPort(null);
        return;
      }
      commit({ ...current.current, connections: [...current.current.connections, link] });
      setPendingPort(null);
    },
    [commit, pendingPort]
  );

  const assemble = () => {
    commit({ ...current.current, positions: createAssemblyState().positions });
    setExploded(false);
    setExplodeRatio(0);
  };

  const wireProposedLoom = () => {
    const newLinks: AssemblyConnection[] = PROPOSED_LOOM.map((l) => ({
      ...l,
      id: crypto.randomUUID()
    }));
    commit({ ...current.current, connections: newLinks });
    setMode("connect");
  };

  const position = state.positions[selected.id];
  const wires = state.connections.filter(
    (c) => c.fromPart === selectedId || c.toPart === selectedId
  );

  return (
    <div className={styles.workbench}>
      {/* ============================================================= */}
      {/* TOOLBAR CONTROLS (Decluttered & Studio Standard)              */}
      {/* ============================================================= */}
      <div className={styles.toolbar}>
        {/* Left tools: Mode Controls */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              aria-pressed={mode === "orbit"}
              onClick={() => {
                setMode("orbit");
                setPendingPort(null);
              }}
            >
              Orbit & Inspect
            </button>
            <button
              type="button"
              aria-pressed={mode === "move"}
              onClick={() => {
                setMode("move");
                setPendingPort(null);
              }}
            >
              Move & Place
            </button>
            <button
              type="button"
              aria-pressed={mode === "connect"}
              onClick={() => setMode("connect")}
            >
              Point Connect ({state.connections.length})
            </button>
          </div>
        </div>

        {/* Right tools: Loom, Motion & Reset */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              onClick={wireProposedLoom}
              className="!text-[#A87914] hover:!bg-[#F5EEDC]"
              title="Auto-connect electrical harness in 3D"
            >
              Auto-Wire Loom
            </button>
            <button
              type="button"
              aria-pressed={running}
              onClick={() => setRunning((v) => !v)}
              title={running ? "Pause 3D kinematics" : "Resume 3D kinematics"}
            >
              {running ? "Motion" : "Paused"}
            </button>
            <button type="button" onClick={assemble} title="Reset all parts to assembled home coordinates">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3D SPATIAL VIEWPORT & COMPONENT INSPECTOR                     */}
      {/* ============================================================= */}
      <div className={styles.canvasRow}>
        <div className={styles.stage}>
          <AssemblyStage
            parts={assemblyParts}
            positions={state.positions}
            connections={state.connections}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={move}
            onPort={port}
            onDropPart={move}
            exploded={exploded}
            explodeAmount={explodeRatio}
            view={view3D}
            mode={mode}
            activeGroup="all"
            running={running}
            pendingPort={pendingPort}
          />

          {/* Compact Explode Separation Scrubbing Pill */}
          <div className={styles.explodeOverlay}>
            <span>Explode</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={explodeRatio}
              style={{ touchAction: "none" }}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setExplodeRatio(val);
                setExploded(val > 0.05);
              }}
              className={styles.explodeSlider}
              aria-label="Explode assembly separation slider"
            />
            <span className={styles.explodeVal}>{Math.round(explodeRatio * 100)}%</span>
          </div>

          {/* Quiet Stage Telemetry Pill */}
          <div className={styles.stageLabel}>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1F6B42]" />
              <span>
                {mode === "orbit"
                  ? "Orbit: Drag canvas · Pan: Right-drag · Click to inspect 3D part"
                  : mode === "move"
                    ? "Move Mode: Drag parts along ground plane"
                    : "Connect Mode: Click source port, then destination"}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span>{assemblyParts.length} parts</span>
              <span>·</span>
              <span className="tabular-nums font-bold text-[#111319]">{state.connections.length} links</span>
            </div>
          </div>
        </div>

        {/* Right Component Specifications HUD */}
        <aside className={styles.inspector} aria-label="Component specifications">
          <p className={styles.kicker}>{groupLabels[selected.group]}</p>
          <h2>{selected.label}</h2>
          <p className={styles.model}>{selected.model}</p>

          {/* Compact 3D Component Selector Dropdown */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={styles.partSelect}
            aria-label="Quick select component"
          >
            {assemblyParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({groupLabels[p.group]})
              </option>
            ))}
          </select>

          <div className={styles.provenance}>
            {selected.evidence === "manufacturer drawing"
              ? "Drawing-based specification"
              : selected.evidence === "proposal"
                ? "Proposal specification"
                : "Fabricated custom assembly"}
          </div>

          <p className={styles.note}>{selected.note}</p>

          {selected.source.startsWith("https://") && (
            <a
              href={selected.source}
              target="_blank"
              rel="noreferrer"
              className={styles.source}
            >
              Datasheet reference
            </a>
          )}

          <div className={styles.placement}>
            <span>Physical Envelope (W × H × D)</span>
            <strong>{selected.size.join(" × ")} mm</strong>
          </div>

          {position && (
            <div className={styles.placement}>
              <span>Chassis Datum</span>
              <strong>{position.map((n) => Math.round(n)).join(" / ")} mm</strong>
            </div>
          )}

          <button
            type="button"
            className={styles.seat}
            onClick={() => {
              move(selectedId, [...selected.home]);
            }}
          >
            Snap to Assembly Seat
          </button>

          <h3>Interface Terminals</h3>
          {selected.ports.length === 0 ? (
            <p className={styles.note}>Mechanical component (no direct electrical ports)</p>
          ) : (
            <div className="flex flex-col gap-1.5 pt-1">
              {selected.ports.map((p) => {
                const isLinked = state.connections.some(
                  (c) =>
                    (c.fromPart === selected.id && c.fromPort === p.id) ||
                    (c.toPart === selected.id && c.toPort === p.id)
                );
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setMode("connect");
                      port(selected.id, p.id);
                    }}
                    className={styles.port}
                  >
                    <span
                      className={`${styles.portDot} ${
                        p.kind === "power"
                          ? styles.power
                          : p.kind === "drive"
                            ? styles.drive
                            : styles.signal
                      }`}
                    />
                    <span>
                      {p.label}
                      <small>
                        {p.voltage === null ? "Logic / PWM" : `${p.voltage} V`} ·{" "}
                        {p.role === "in" ? "Input" : "Output"}
                        {isLinked ? " · Connected" : ""}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {pendingPort && (
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setPendingPort(null)}
            >
              Cancel Connection
            </button>
          )}

          {!!wires.length && (
            <>
              <h3>Connected Harness Links</h3>
              <div className="flex flex-col gap-1">
                {wires.map((c) => {
                  const otherId = c.fromPart === selectedId ? c.toPart : c.fromPart;
                  const otherPart = assemblyParts.find((p) => p.id === otherId);
                  return (
                    <div key={c.id} className={styles.wire}>
                      <span className="font-mono text-[11px] font-bold">
                        {otherPart?.label}
                      </span>
                      <button
                        type="button"
                        aria-label="Disconnect wire"
                        onClick={() =>
                          commit({
                            ...state,
                            connections: state.connections.filter((w) => w.id !== c.id)
                          })
                        }
                        className="text-xs text-[#991F1F] hover:font-bold"
                      >
                        Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AssemblyWorkbench;
