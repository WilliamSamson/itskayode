"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  assemblyParts,
  CANONICAL_HARNESS,
  createAssemblyState,
  getPartProposalFacts,
  snapPosition,
  type AssemblyConnection,
  type AssemblyState,
  type AssemblyPart
} from "@/sonaris/lib/sonaris-assembly";
import styles from "./assembly-workbench.module.css";

const AssemblyStage = dynamic(() => import("./assembly-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-[var(--sonaris-deck)] flex flex-col items-center justify-center gap-2 font-mono text-[11px] text-[var(--sonaris-studio-muted)] select-none">
      <strong className="tracking-wider uppercase text-[var(--sonaris-studio-ink)] text-[12px]">
        SONARIS · 3D Spatial Twin
      </strong>
      <span className="text-[10px]">Loading Geometry Engine</span>
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

const SUBSYSTEM_FILTERS: {
  id: "all" | AssemblyPart["group"];
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "structure", label: "Chassis" },
  { id: "drive", label: "Drive" },
  { id: "compute", label: "Compute" },
  { id: "sensing", label: "Sensing" },
  { id: "power", label: "Power" },
  { id: "safety", label: "Safety" }
];

const EMPTY_CONNECTIONS: AssemblyConnection[] = [];
const NOOP_PORT = () => {};
const BODY_PART_IDS = ["shell", "bumper"];
const NO_HIDDEN_PARTS: string[] = [];
const SHELL_FINISHES = [
  { hex: 0xded8ca, css: "#DED8CA", label: "Studio Ivory shell" },
  { hex: 0x34393f, css: "#34393F", label: "Stealth Graphite shell" },
  { hex: 0xc8bf9f, css: "#C8BF9F", label: "Desert Sand shell" }
] as const;

export function AssemblyWorkbench({ category: _category = "all" }: { category?: string } = {}) {
  const [state, setState] = useState<AssemblyState>(createAssemblyState);
  const [selectedId, setSelectedId] = useState("lidar");
  const [exploded, setExploded] = useState(false);
  const [explodeRatio, setExplodeRatio] = useState(0);
  const [view3D, setView3D] = useState<"top" | "isometric" | "front">("isometric");
  const [showHarness, setShowHarness] = useState(false);
  const [showBody, setShowBody] = useState(true);
  const [shellColor, setShellColor] = useState<number>(0xded8ca);
  const [activeGroup, setActiveGroup] = useState<"all" | AssemblyPart["group"]>("all");
  const [running, setRunning] = useState(false);

  const current = useRef(state);
  current.current = state;

  const commit = useCallback((next: AssemblyState) => {
    setState(next);
  }, []);

  const selectedIndex = useMemo(
    () => Math.max(0, assemblyParts.findIndex((p) => p.id === selectedId)),
    [selectedId]
  );
  const selected = assemblyParts[selectedIndex] || assemblyParts[0];
  const facts = useMemo(() => getPartProposalFacts(selected), [selected]);

  const visiblePartsCount = useMemo(
    () =>
      activeGroup === "all"
        ? assemblyParts.length
        : assemblyParts.filter((p) => p.group === activeGroup).length,
    [activeGroup]
  );

  // Unified list of connected electrical & mechanical nodes (flat, deduplicated)
  const linkedNodes = useMemo(() => {
    const items: { id: string; label: string; tag: string }[] = [];
    const seen = new Set<string>();

    for (const c of CANONICAL_HARNESS) {
      if (c.fromPart !== selected.id && c.toPart !== selected.id) continue;
      const isOutgoing = c.fromPart === selected.id;
      const otherId = isOutgoing ? c.toPart : c.fromPart;
      if (seen.has(otherId)) continue;
      const otherPart = assemblyParts.find((p) => p.id === otherId);
      if (!otherPart) continue;
      const localPort = selected.ports.find(
        (p) => p.id === (isOutgoing ? c.fromPort : c.toPort)
      );
      seen.add(otherId);
      items.push({
        id: otherPart.id,
        label: otherPart.label,
        tag: localPort?.kind ?? "signal"
      });
    }

    for (const m of facts.mechanicalLinks) {
      if (seen.has(m.partId)) continue;
      const target = assemblyParts.find((p) => p.id === m.partId);
      if (!target) continue;
      seen.add(m.partId);
      items.push({
        id: target.id,
        label: target.label,
        tag: "mount"
      });
    }

    return items;
  }, [selected, facts]);

  const stageConnections = useMemo(
    () => (showHarness ? CANONICAL_HARNESS : EMPTY_CONNECTIONS),
    [showHarness]
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

  const stepPart = (delta: number) => {
    const nextIdx = (selectedIndex + delta + assemblyParts.length) % assemblyParts.length;
    setSelectedId(assemblyParts[nextIdx].id);
  };

  const focusLinkedPart = (partId: string) => {
    const targetPart = assemblyParts.find((p) => p.id === partId);
    if (targetPart && activeGroup !== "all" && activeGroup !== targetPart.group) {
      setActiveGroup("all");
    }
    setSelectedId(partId);
  };

  const assemble = () => {
    commit({ ...current.current, positions: createAssemblyState().positions });
    setExploded(false);
    setExplodeRatio(0);
    setActiveGroup("all");
  };

  const basePos = state.positions[selected.id] ?? selected.home;
  const livePos: [number, number, number] = [
    Math.round(basePos[0] + selected.explode[0] * explodeRatio),
    Math.round(basePos[1] + selected.explode[1] * explodeRatio),
    Math.round(basePos[2] + selected.explode[2] * explodeRatio)
  ];
  const seatOffsetMm = Math.round(
    Math.hypot(
      basePos[0] - selected.home[0],
      basePos[1] - selected.home[1],
      basePos[2] - selected.home[2]
    )
  );
  const isDisplaced = seatOffsetMm > 0;

  return (
    <div className={styles.workbench}>
      <div className={styles.instrumentFrame}>
        {/* ============================================================= */}
        {/* QUIET ARCHITECTURAL CONTROL STRIP                             */}
        {/* ============================================================= */}
        <div className={styles.controlStrip}>
          <div className={styles.toolGroup} role="group" aria-label="Subsystem filter">
            {SUBSYSTEM_FILTERS.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className={styles.instrumentCluster}>
            <label className={styles.inlineScrubber}>
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
            </label>

            <div className={styles.flatGroup} role="group" aria-label="Camera perspective">
              {(
                [
                  { id: "isometric", label: "Iso" },
                  { id: "top", label: "Top" },
                  { id: "front", label: "Front" }
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={styles.flatBtn}
                  aria-pressed={view3D === v.id}
                  onClick={() => setView3D(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className={styles.flatGroup}>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={showBody}
                onClick={() => setShowBody((v) => !v)}
                title="Show or hide the removable body shell and bumper"
              >
                Body
              </button>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={showHarness}
                onClick={() => setShowHarness((v) => !v)}
              >
                Harness
              </button>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={running}
                onClick={() => setRunning((v) => !v)}
              >
                Motion
              </button>
              <button type="button" className={styles.flatBtn} onClick={assemble}>
                Reset
              </button>
            </div>

            {showBody && (
              <div className="flex items-center gap-1.5 pl-1" role="group" aria-label="Body shell finish">
                {SHELL_FINISHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    aria-label={sw.label}
                    aria-pressed={shellColor === sw.hex}
                    onClick={() => setShellColor(sw.hex)}
                    style={{ backgroundColor: sw.css }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      shellColor === sw.hex
                        ? "scale-110 border-[#991F1F] ring-2 ring-[#991F1F]/35"
                        : "border-[#9E988E] opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* 3D VIEWPORT & SCROLL-FREE SPECIFICATION SHEET                 */}
        {/* ============================================================= */}
        <div className={styles.canvasRow}>
          <div className={styles.stage}>
            <AssemblyStage
              parts={assemblyParts}
              positions={state.positions}
              connections={stageConnections}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={move}
              onPort={NOOP_PORT}
              onDropPart={move}
              exploded={exploded}
              explodeAmount={explodeRatio}
              view={view3D}
              mode="orbit"
              activeGroup={activeGroup}
              running={running}
              hiddenPartIds={showBody ? NO_HIDDEN_PARTS : BODY_PART_IDS}
              shellColor={shellColor}
            />

            <div className={styles.stageHud}>
              <span>Orbit · Scroll zoom · Click part · Shift+drag slide</span>
              <span className={styles.monoVal}>
                {visiblePartsCount}/{assemblyParts.length} parts
              </span>
            </div>
          </div>

          {/* Right Specification Ledger: Hairlines & Typography Only (No Cards, No Scroll) */}
          <aside className={styles.inspector} aria-label="Component specifications">
            <div className={styles.inspectorTop}>
              <div className={styles.kickerRow}>
                <span className={styles.kicker}>{groupLabels[selected.group]}</span>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => stepPart(-1)}
                    aria-label="Previous component"
                  >
                    ‹
                  </button>
                  <span>
                    {selectedIndex + 1}/{assemblyParts.length}
                  </span>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => stepPart(1)}
                    aria-label="Next component"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className={styles.titleSelectWrap}>
                <select
                  value={selectedId}
                  onChange={(e) => focusLinkedPart(e.target.value)}
                  className={styles.partSelect}
                  aria-label="Select component"
                >
                  {assemblyParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <span className={styles.selectChevron}>▾</span>
                <div className={styles.modelRow}>
                  <span className={styles.model}>{selected.model}</span>
                  {selected.source.startsWith("https://") && (
                    <a
                      href={selected.source}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.source}
                    >
                      Datasheet ↗
                    </a>
                  )}
                </div>
              </div>

              <p className={styles.summary}>{facts.role}</p>

              <dl className={styles.ledger}>
                <div className={styles.ledgerRow}>
                  <dt>Basis</dt>
                  <dd>
                    {selected.evidence === "manufacturer drawing"
                      ? "Manufacturer drawing footprint"
                      : selected.evidence === "proposal"
                        ? "Approved proposal specification"
                        : "Concept layout geometry"}
                  </dd>
                </div>
                <div className={styles.ledgerRow}>
                  <dt>Electrical</dt>
                  <dd>{facts.electrical}</dd>
                </div>
                <div className={styles.ledgerRow}>
                  <dt>Envelope</dt>
                  <dd className={styles.monoVal}>{selected.size.join(" × ")} mm</dd>
                </div>
                <div className={styles.ledgerRow}>
                  <dt>Datum</dt>
                  <dd className={styles.monoVal}>
                    {livePos.join(" / ")} mm
                    {isDisplaced && (
                      <button
                        type="button"
                        className={styles.inlineAction}
                        onClick={() => move(selectedId, [...selected.home])}
                      >
                        Reset (Δ{seatOffsetMm}mm)
                      </button>
                    )}
                  </dd>
                </div>
                <div className={styles.ledgerRow}>
                  <dt>300² Bed</dt>
                  <dd>{facts.bedFit300}</dd>
                </div>
                <div className={styles.ledgerRow}>
                  <dt>Open Gate</dt>
                  <dd>{facts.engineeringGate}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.linksBlock}>
              <div className={styles.linksHeader}>
                Linked in Assembly ({linkedNodes.length})
              </div>
              <div className={styles.inlineLinks}>
                {linkedNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={styles.nodeLink}
                    onClick={() => focusLinkedPart(node.id)}
                  >
                    {node.label}
                    <small>{node.tag}</small>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AssemblyWorkbench;
