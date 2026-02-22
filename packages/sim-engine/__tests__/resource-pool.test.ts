import { describe, it, expect } from 'vitest';
import { ResourcePool } from '../src/resource-pool.js';

describe('ResourcePool', () => {
  it('acquire and release', () => {
    const pool = new ResourcePool(2);
    expect(pool.availableCount).toBe(2);
    expect(pool.acquire(0)).toBe(true);
    expect(pool.availableCount).toBe(1);
    expect(pool.busyCount).toBe(1);
    expect(pool.acquire(0)).toBe(true);
    expect(pool.availableCount).toBe(0);
    pool.release(1);
    expect(pool.availableCount).toBe(1);
  });

  it('respects capacity limit', () => {
    const pool = new ResourcePool(1);
    expect(pool.acquire(0)).toBe(true);
    expect(pool.acquire(0)).toBe(false);
  });

  it('calculates utilization correctly', () => {
    const pool = new ResourcePool(2);
    // 0..5: 1 busy, 5..10: 2 busy
    pool.acquire(0);
    pool.acquire(5);
    // total busy-resource-time = 1*5 + 2*5 = 15
    // max possible = 2 * 10 = 20
    const u = pool.utilization(10);
    expect(u).toBeCloseTo(0.75, 5);
  });

  it('utilization with zero duration returns 0', () => {
    const pool = new ResourcePool(1);
    expect(pool.utilization(0)).toBe(0);
  });
});
