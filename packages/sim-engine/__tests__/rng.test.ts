import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('produces deterministic sequences with the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences with different seeds', () => {
    const a = createRng(42);
    const b = createRng(99);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns values within [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 10);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('reset restores the sequence', () => {
    const rng = createRng(42);
    const first = Array.from({ length: 10 }, () => rng.next());
    rng.reset(42);
    const second = Array.from({ length: 10 }, () => rng.next());
    expect(first).toEqual(second);
  });
});
