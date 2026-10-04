/** Continuous upwind-to-downwind cloud lane in the island's unscaled weather space. */
export const CLOUD_PATH_HALF_LENGTH = 700;
export const CLOUD_PATH_LENGTH = CLOUD_PATH_HALF_LENGTH * 2;

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** New clouds condense before entering view and dissolve before regeneration. */
export function cloudVisibility(progress: number): number {
  return smoothstep(progress / 0.12) * smoothstep((1 - progress) / 0.18);
}

/**
 * Longitudinal progress is strictly monotonic. Gentle crosswind meanders never
 * reverse the cloud or snap it back along the visible path.
 */
export function cloudFlowPosition(
  progress: number,
  lane: number,
  phase: number,
  windAngle: number,
): { x: number; z: number; along: number } {
  const along = -CLOUD_PATH_HALF_LENGTH + CLOUD_PATH_LENGTH * progress;
  const envelope = Math.sin(Math.PI * progress);
  // Split the stream around the island core, then rejoin its wind lane.
  const side = lane >= 0 ? 1 : -1;
  const islandBypass = side * 420 * envelope * envelope;
  const cross = lane + islandBypass + envelope * (
    Math.sin(progress * Math.PI * 2.7 + phase) * 38 +
    Math.sin(progress * Math.PI * 5.1 + phase * 0.63) * 14
  );
  const wx = Math.cos(windAngle);
  const wz = Math.sin(windAngle);
  return {
    x: wx * along - wz * cross,
    z: wz * along + wx * cross,
    along,
  };
}
