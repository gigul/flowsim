import type { RNG } from './types.js';

/**
 * Mulberry32 – a fast, high-quality 32-bit seeded PRNG.
 * Period: 2^32.  Passes gjrand and PractRand tests.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): RNG {
  let gen = mulberry32(seed);

  return {
    next(): number {
      return gen();
    },

    nextInt(min: number, max: number): number {
      const range = max - min + 1;
      return min + Math.floor(gen() * range);
    },

    reset(newSeed: number): void {
      gen = mulberry32(newSeed);
    },
  };
}
