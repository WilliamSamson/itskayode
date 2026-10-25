"use client";

import { useId } from "react";
import { validateConnection, type Component, type Connection } from "@/sonaris/lib/sonaris-engine";

interface ConnectionDiagramProps {
  components: Component[];
  connections: Connection[];
  onSelect: (id: string) => void;
}

const number = (value: number | null, unit: string) =>
  value !== null && Number.isFinite(value) ? `${Number(value.toFixed(3))} ${unit}` : `${unit} unresolved`;

/** Register-level endpoint relationships, never inferred pin wiring. */
export default function ConnectionDiagram({ components, connections, onSelect }: ConnectionDiagramProps) {
  const id = useId();
  if (!connections.length) return <p className="border border-neutral-800 p-3 text-[13px] text-neutral-400">No registered connections. Add source and target components to draw their relationship; no wiring is inferred.</p>;
  const shown = connections.slice(0, 20);
  const node = (componentId: string, x: number, y: number) => {
    const component = components.find((item) => item.id === componentId);
    const name = component?.name ?? `Missing: ${componentId}`;
    return <g
      transform={`translate(${x} ${y})`}
      role={component ? "button" : undefined}
      tabIndex={component ? 0 : undefined}
      aria-label={component ? `Select ${name} in component inspector` : name}
      onClick={component ? () => onSelect(component.id) : undefined}
      onKeyDown={component ? (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(component.id); }
      } : undefined}
      className={component ? "cursor-pointer text-neutral-300 outline-none focus:text-white" : "text-red-400"}
    >
      <title>{name}</title>
      <rect width={190} height={48} rx={4} fill="black" stroke="currentColor" strokeWidth={1.5} />
      <text x={95} y={28} textAnchor="middle" fill="currentColor" fontSize={12}>{name.length > 25 ? `${name.slice(0, 24)}…` : name}</text>
    </g>;
  };
  return <figure className="m-0 border border-neutral-800 bg-black p-3">
    <div className="max-h-[460px] overflow-auto" role="region" aria-label="Connection diagram; scroll for registered connections" tabIndex={0}>
      <svg role="group" aria-labelledby={`${id}-title ${id}-description`} viewBox={`0 0 720 ${shown.length * 118}`} className="block min-w-[640px] w-full">
        <title id={`${id}-title`}>Registered component connections</title>
        <desc id={`${id}-description`}>Each row shows an actual source-to-target relationship. Select an endpoint to inspect it. Dashed red lines indicate invalid or unresolved nominal data. Solid neutral lines still require pinout and other electrical verification.</desc>
        <defs>
          <marker id={`${id}-arrow`} markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="context-stroke" /></marker>
        </defs>
        {shown.map((connection, index) => {
          const check = validateConnection(connection, components);
          const nominal = check.startsWith("Compatible supplied nominal values only");
          const status = nominal ? "Nominal only · pinout unverified" : check;
          const y = index * 118;
          return <g key={connection.id}>
            <title>{`${connection.from} to ${connection.to}: ${check}. Register status: ${connection.status}`}</title>
            <line x1={206} y1={y + 42} x2={514} y2={y + 42} stroke="currentColor" className={nominal ? "text-neutral-400" : "text-red-400"} strokeWidth={1.5} strokeDasharray={nominal ? undefined : "6 5"} markerEnd={`url(#${id}-arrow)`} />
            <text x={360} y={y + 24} textAnchor="middle" fill="currentColor" className="text-neutral-300" fontSize={12}>{number(connection.voltage, "V")} · {number(connection.current, "A")}</text>
            {node(connection.from, 12, y + 18)}
            {node(connection.to, 518, y + 18)}
            <text x={360} y={y + 85} textAnchor="middle" fill="currentColor" className={nominal ? "text-neutral-400" : "text-red-400"} fontSize={11}>{status}</text>
            <text x={360} y={y + 103} textAnchor="middle" fill="currentColor" className="text-neutral-500" fontSize={11}>Register status: {connection.status}</text>
          </g>;
        })}
      </svg>
    </div>
    <figcaption className="mt-2 text-[11px] leading-relaxed text-neutral-400">Showing {shown.length} of {connections.length} registered connections. The full register remains below. Arrows describe registered endpoints, not physical pins or verified wiring.</figcaption>
  </figure>;
}
