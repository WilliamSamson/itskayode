/**
 * Integer bit-mix hash to [0, 1). Deterministic and free of the banding a
 * sin-hash shows far from origin (AGENTS.md 8.2).
 */
export function hash01(i: number, salt = 0): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(salt + 1, 0xc2b2ae35), 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
