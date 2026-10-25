import { describe, expect, it } from 'vitest';
import { roverPose } from '@/sonaris/components/rover-motion';

describe('rover motion', () => {
  it('closes its pose and wheel travel at the loop boundary', () => {
    expect(roverPose(0)).toEqual(roverPose(18));
  });
  it('settles between moves and actually travels', () => {
    expect(roverPose(0.5).x).toBe(0);
    expect(roverPose(3).x).toBe(24);
    expect(roverPose(4).x).toBe(24);
    expect(roverPose(8).y).toBe(18);
    expect(roverPose(13).angle).toBe(30);
  });
  it('uses equal wheel travel forward, opposing diagonals sideways, opposing sides for yaw', () => {
    const forward = roverPose(3).wheels;
    expect(new Set(forward).size).toBe(1);
    const side = roverPose(8).wheels;
    expect(side[0]).toBe(side[3]);
    expect(side[1]).toBe(side[2]);
    expect(side[0]).not.toBe(side[1]);
    const yaw = roverPose(13).wheels;
    expect(yaw[0]).toBe(yaw[2]);
    expect(yaw[1]).toBe(yaw[3]);
    expect(yaw[0]).toBe(-yaw[1]);
  });
});
