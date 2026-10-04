import type { NavigationTool } from "./world-navigation";

export interface TouchPoint {
  x: number;
  y: number;
}

export interface TwoFingerPose {
  first: TouchPoint;
  second: TouchPoint;
}

export interface TouchGestureDelta {
  zoom: number;
  orbitX: number;
  orbitY: number;
  panX: number;
  panY: number;
  movement: number;
}

/**
 * Preserve the old world gesture mapping: pinch zooms, twist orbits, and a
 * parallel two-finger slide uses the opposite tool from a one-finger drag.
 */
export function twoFingerGesture(
  previous: TwoFingerPose,
  current: TwoFingerPose,
  activeTool: NavigationTool,
): TouchGestureDelta {
  const dx0 = current.first.x - previous.first.x;
  const dy0 = current.first.y - previous.first.y;
  const dx1 = current.second.x - previous.second.x;
  const dy1 = current.second.y - previous.second.y;
  const prevX = previous.second.x - previous.first.x;
  const prevY = previous.second.y - previous.first.y;
  const nextX = current.second.x - current.first.x;
  const nextY = current.second.y - current.first.y;
  const distDelta = Math.hypot(nextX, nextY) - Math.hypot(prevX, prevY);
  let angleDelta = Math.atan2(nextY, nextX) - Math.atan2(prevY, prevX);
  if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
  if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
  const midDx = (dx0 + dx1) / 2;
  const midDy = (dy0 + dy1) / 2;
  const slide = Math.abs(distDelta) < 3.5 && (Math.abs(midDx) > 1 || Math.abs(midDy) > 1);
  return {
    zoom: Math.abs(distDelta) > 1 ? -distDelta * 1.8 : 0,
    orbitX: (Math.abs(angleDelta) > 0.02 ? -angleDelta * 45 : 0) +
      (slide && activeTool === "pan" ? midDx * 0.75 : 0),
    orbitY: slide && activeTool === "pan" ? midDy * 0.75 : 0,
    panX: slide && activeTool === "orbit" ? midDx : 0,
    panY: slide && activeTool === "orbit" ? midDy : 0,
    movement: Math.max(Math.hypot(dx0, dy0), Math.hypot(dx1, dy1)),
  };
}
