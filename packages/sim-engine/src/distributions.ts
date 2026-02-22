import type { Distribution, RNG } from './types.js';

/**
 * Sample a value from the given distribution using the supplied RNG.
 * All results are clamped to >= 0.
 */
export function sampleDistribution(dist: Distribution, rng: RNG): number {
  let value: number;

  switch (dist.type) {
    case 'fixed':
      value = dist.value;
      break;

    case 'exponential':
      // Inverse-transform sampling: -mean * ln(1 - U)
      // Using 1 - U instead of U avoids log(0).
      value = -dist.mean * Math.log(1 - rng.next());
      break;

    case 'normal': {
      // Box-Muller transform
      const u1 = rng.next();
      const u2 = rng.next();
      const z0 = Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
      value = dist.mean + dist.stddev * z0;
      break;
    }

    case 'uniform':
      value = dist.min + (dist.max - dist.min) * rng.next();
      break;

    case 'triangular': {
      const { min, mode, max } = dist;
      const u = rng.next();
      const fc = (mode - min) / (max - min);
      if (u < fc) {
        value = min + Math.sqrt(u * (max - min) * (mode - min));
      } else {
        value = max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
      break;
    }

    default: {
      const _exhaustive: never = dist;
      throw new Error(`Unknown distribution type: ${(_exhaustive as Distribution).type}`);
    }
  }

  return Math.max(0, value);
}
