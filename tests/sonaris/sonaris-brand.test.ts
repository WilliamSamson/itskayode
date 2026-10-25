import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const page = readFileSync('src/app/sonaris/page.tsx', 'utf8');
describe('SONARIS independent identity', () => {
 it('overrides portfolio title and icons', () => {
  expect(page).toContain("absolute: 'SONARIS");
  expect(page).toContain('/sonaris/brand/rover.png');
  expect(page).toContain("title: 'SONARIS'");
 });
 it('uses its cleaned PNG wordmark without replacing the rover animation', () => {
  expect(page).toContain('/sonaris/brand/wordmark.png');
  expect(page).toContain('<RoverTopView');
  expect(page).toContain('bg-[var(--sonaris-red)]');
 });
 it('has its own share image route and source assets', () => {
  expect(existsSync('src/app/sonaris/opengraph-image.tsx')).toBe(true);
  expect(existsSync('public/sonaris/brand/wordmark.png')).toBe(true);
  expect(existsSync('public/sonaris/brand/rover.png')).toBe(true);
  expect(readFileSync('tailwind.config.ts', 'utf8')).toContain('./src/sonaris/');
 });
});
