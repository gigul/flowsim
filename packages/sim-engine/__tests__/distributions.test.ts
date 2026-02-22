import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';
import { sampleDistribution } from '../src/distributions.js';
import type { Distribution } from '../src/types.js';

const N = 10_000;

function sampleMany(dist: Distribution, seed = 42): number[] {
  const rng = createRng(seed);
  return Array.from({ length: N }, () => sampleDistribution(dist, rng));
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[], m: number): number {
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

describe('sampleDistribution', () => {
  it('fixed returns exact value', () => {
    const rng = createRng(1);
    const dist: Distribution = { type: 'fixed', value: 5 };
    for (let i = 0; i < 100; i++) {
      expect(sampleDistribution(dist, rng)).toBe(5);
    }
  });

  it('exponential: mean ≈ target over many samples', () => {
    const dist: Distribution = { type: 'exponential', mean: 10 };
    const samples = sampleMany(dist);
    const m = mean(samples);
    expect(m).toBeGreaterThan(9);
    expect(m).toBeLessThan(11);
    // All non-negative
    expect(samples.every((s) => s >= 0)).toBe(true);
  });

  it('normal: mean and stddev ≈ target', () => {
    const dist: Distribution = { type: 'normal', mean: 50, stddev: 5 };
    const samples = sampleMany(dist);
    const m = mean(samples);
    const sd = stddev(samples, m);
    expect(m).toBeGreaterThan(49);
    expect(m).toBeLessThan(51);
    expect(sd).toBeGreaterThan(4.5);
    expect(sd).toBeLessThan(5.5);
  });

  it('uniform: within bounds', () => {
    const dist: Distribution = { type: 'uniform', min: 2, max: 8 };
    const samples = sampleMany(dist);
    expect(samples.every((s) => s >= 2 && s <= 8)).toBe(true);
    const m = mean(samples);
    expect(m).toBeGreaterThan(4.5);
    expect(m).toBeLessThan(5.5);
  });

  it('triangular: within bounds', () => {
    const dist: Distribution = { type: 'triangular', min: 1, mode: 3, max: 7 };
    const samples = sampleMany(dist);
    expect(samples.every((s) => s >= 1 && s <= 7)).toBe(true);
    const m = mean(samples);
    // Expected mean = (min + mode + max) / 3 = 11/3 ≈ 3.67
    expect(m).toBeGreaterThan(3.2);
    expect(m).toBeLessThan(4.2);
  });

  it('all distributions clamp to >= 0', () => {
    // Normal with low mean and high stddev can produce negatives before clamping
    const dist: Distribution = { type: 'normal', mean: 0.1, stddev: 5 };
    const samples = sampleMany(dist);
    expect(samples.every((s) => s >= 0)).toBe(true);
  });
});
