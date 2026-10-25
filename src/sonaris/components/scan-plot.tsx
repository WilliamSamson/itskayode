"use client";

import { useId, useMemo } from "react";

interface ScanPlotProps {
  points: { x: number; y: number; z: number }[];
  rover: { x: number; z: number; heading: number };
  width: number;
  depth: number;
}

/** Global X/Z projection of the reconstructed scan, not native sensor polar/range data. */
export default function ScanPlot({ points, rover, width, depth }: ScanPlotProps) {
  const id = useId();
  const roomWidth = Number.isFinite(width) ? Math.min(100, Math.max(0.1, width)) : 6;
  const roomDepth = Number.isFinite(depth) ? Math.min(100, Math.max(0.1, depth)) : 5;
  const span = Math.max(roomWidth, roomDepth);
  const padding = span * 0.13;
  const halfX = roomWidth / 2;
  const halfZ = roomDepth / 2;
  const fontSize = span * 0.035;
  const markerSize = span * 0.025;
  const sampled = useMemo(() => {
    const finite = points.filter((point) => [point.x, point.y, point.z].every(Number.isFinite));
    if (finite.length <= 2000) return finite;
    return Array.from({ length: 2000 }, (_, index) => finite[Math.floor(index * finite.length / 2000)]);
  }, [points]);
  const validRover = [rover.x, rover.z, rover.heading].every(Number.isFinite);

  return (
    <figure className="m-0 border border-neutral-800 bg-black p-3 text-neutral-400">
      <svg
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        viewBox={`${-halfX - padding} ${-halfZ - padding} ${roomWidth + padding * 2} ${roomDepth + padding * 2}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto max-h-[360px] min-h-[200px] w-full"
      >
        <title id={`${id}-title`}>Scan top projection in metres</title>
        <desc id={`${id}-description`}>Global X/Z projection of reconstructed scan points. Positive X points right; positive Z points up. Height is collapsed, not measured as native raw sensor range. The arrow marks rover position and heading.</desc>
        <defs><clipPath id={`${id}-clip`}><rect x={-halfX} y={-halfZ} width={roomWidth} height={roomDepth} /></clipPath></defs>
        <rect x={-halfX} y={-halfZ} width={roomWidth} height={roomDepth} fill="none" stroke="currentColor" strokeWidth={span * 0.002} />
        <g stroke="currentColor" strokeWidth={span * 0.001} strokeDasharray={`${span * 0.01} ${span * 0.01}`} opacity={0.5}>
          <line x1={-halfX} x2={halfX} y1={0} y2={0} />
          <line x1={0} x2={0} y1={-halfZ} y2={halfZ} />
        </g>
        <g clipPath={`url(#${id}-clip)`}>
          <g className="text-red-500" fill="currentColor">
            {sampled.map((point, index) => <circle key={index} cx={point.x} cy={-point.z} r={span * 0.0025} />)}
          </g>
          {validRover && <g transform={`translate(${rover.x} ${-rover.z}) rotate(${-rover.heading})`} className="text-neutral-100" fill="currentColor">
            <path d={`M ${markerSize * 1.8} 0 L ${-markerSize} ${-markerSize} L ${-markerSize * 0.5} 0 L ${-markerSize} ${markerSize} Z`} />
          </g>}
        </g>
        <g fill="currentColor" fontSize={fontSize} fontFamily="sans-serif">
          <text x={halfX} y={fontSize * 1.3} textAnchor="end">+X {halfX.toFixed(2)} m</text>
          <text x={0} y={-halfZ - fontSize * 0.4} textAnchor="middle">+Z {halfZ.toFixed(2)} m</text>
          <text x={-halfX} y={halfZ + fontSize * 1.5}>−{halfX.toFixed(2)} m</text>
          <text x={halfX} y={halfZ + fontSize * 1.5} textAnchor="end">−Z {halfZ.toFixed(2)} m</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-[11px] leading-relaxed">
        Top projection of global scan points · height collapsed · not native raw sensor ranges.
        {" "}{sampled.length.toLocaleString()} shown of {points.length.toLocaleString()} points; room boundary is a simulation assumption. Rover arrow is a heading symbol, not its physical footprint.
      </figcaption>
    </figure>
  );
}
