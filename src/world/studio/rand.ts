/**
 * Seeded PRNG for studio geometry and textures. Same seed, same island
 * (AGENTS.md 8.4); Math.random() would reshuffle the build on every load.
 */
let state = 0x5eed1234;

export function rand(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Restarts the sequence so every build of the island is identical. */
export function resetRand(): void {
  state = 0x5eed1234;
}
