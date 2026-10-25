/** Illustrative motion in SVG units, not measured rover performance. */
export function roverPose(seconds: number) {
  const t = ((seconds % 18) + 18) % 18;
  const ease = (start: number, end: number) => {
    const u = Math.min(1, Math.max(0, (t - start) / (end - start)));
    return u * u * u * (10 + u * (-15 + u * 6));
  };
  // Quintic easing gives zero velocity and acceleration at each stop.
  const x = 24 * (ease(1, 3) - ease(4, 6));
  const y = 18 * (ease(7, 8) - ease(9, 10));
  const angle = 30 * (ease(11, 13) - ease(14, 16));
  const yawTravel = angle * Math.PI / 180 * 58;
  return { x, y, angle, wheels: [x - y - yawTravel, x + y + yawTravel, x + y - yawTravel, x - y + yawTravel] };
}
