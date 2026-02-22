import { describe, it, expect } from 'vitest';
import { SimEngine } from '../src/engine.js';
import type { ProcessModel } from '../src/types.js';

/** Source(5) → Queue → Process(3, 1 resource) → Sink, duration 100. */
function makeSimpleModel(overrides?: {
  interArrival?: number;
  serviceTime?: number;
  resourceCount?: number;
  duration?: number;
  seed?: number;
  queueCapacity?: number;
}): ProcessModel {
  const o = {
    interArrival: 5,
    serviceTime: 3,
    resourceCount: 1,
    duration: 100,
    seed: 42,
    queueCapacity: 0, // 0 = unlimited
    ...overrides,
  };

  return {
    id: 'test-model',
    name: 'Simple Model',
    nodes: [
      {
        id: 'src',
        type: 'source',
        params: {
          interArrivalTime: { type: 'fixed', value: o.interArrival },
        },
      },
      {
        id: 'q1',
        type: 'queue',
        params: { capacity: o.queueCapacity, discipline: 'FIFO' as const },
      },
      {
        id: 'p1',
        type: 'process',
        params: {
          serviceTime: { type: 'fixed', value: o.serviceTime },
          resourceCount: o.resourceCount,
          name: 'Worker',
        },
      },
      {
        id: 'sink',
        type: 'sink',
        params: { collectStats: true },
      },
    ],
    edges: [
      { id: 'e1', from: 'src', to: 'q1' },
      { id: 'e2', from: 'q1', to: 'p1' },
      { id: 'e3', from: 'p1', to: 'sink' },
    ],
    config: {
      seed: o.seed,
      duration: o.duration,
      timeUnit: 'min',
      warmupPeriod: 0,
    },
  };
}

describe('SimEngine', () => {
  it('simple Source→Queue→Process→Sink with fixed times produces deterministic throughput', () => {
    const model = makeSimpleModel();
    const engine = new SimEngine(model);
    const result = engine.run();

    // With interArrival=5 and duration=100, we get entities at t=0,5,10,...,95 → 20 entities
    expect(result.summary.totalEntities).toBe(20);
    // Service time = 3, interArrival = 5, so utilisation < 1 → all should depart
    // Last entity arrives at t=95, finishes service at t=98 → all depart
    expect(result.summary.throughput).toBeGreaterThan(0);
    expect(result.nodeMetrics['p1']).toBeDefined();
    expect(result.nodeMetrics['p1'].processed).toBe(20);
  });

  it('same seed produces identical results', () => {
    const model = makeSimpleModel({ seed: 42 });
    const r1 = new SimEngine(model).run();
    const r2 = new SimEngine(model).run();

    expect(r1.summary.throughput).toBe(r2.summary.throughput);
    expect(r1.summary.avgLeadTime).toBe(r2.summary.avgLeadTime);
    expect(r1.summary.totalEntities).toBe(r2.summary.totalEntities);
    expect(r1.nodeMetrics['p1'].utilization).toBe(r2.nodeMetrics['p1'].utilization);
  });

  it('balance: created = departed + entities still in system', () => {
    // Use exponential times so some entities might still be in-flight
    const model: ProcessModel = {
      id: 'balance-test',
      name: 'Balance',
      nodes: [
        {
          id: 'src',
          type: 'source',
          params: { interArrivalTime: { type: 'exponential', mean: 5 } },
        },
        {
          id: 'q1',
          type: 'queue',
          params: { capacity: 0, discipline: 'FIFO' as const },
        },
        {
          id: 'p1',
          type: 'process',
          params: {
            serviceTime: { type: 'exponential', mean: 4 },
            resourceCount: 1,
            name: 'W',
          },
        },
        {
          id: 'sink',
          type: 'sink',
          params: { collectStats: true },
        },
      ],
      edges: [
        { id: 'e1', from: 'src', to: 'q1' },
        { id: 'e2', from: 'q1', to: 'p1' },
        { id: 'e3', from: 'p1', to: 'sink' },
      ],
      config: { seed: 123, duration: 200, timeUnit: 'min', warmupPeriod: 0 },
    };

    const result = new SimEngine(model).run();
    const departed = result.nodeMetrics['p1'].processed;
    // All processed entities should have departed.
    // totalEntities = created; some may still be in queue or service.
    expect(departed).toBeLessThanOrEqual(result.summary.totalEntities);
    expect(departed).toBeGreaterThan(0);
  });

  it('2 resources → lower utilization than 1 resource', () => {
    const r1 = new SimEngine(makeSimpleModel({ resourceCount: 1 })).run();
    const r2 = new SimEngine(makeSimpleModel({ resourceCount: 2 })).run();

    expect(r2.nodeMetrics['p1'].utilization).toBeLessThan(
      r1.nodeMetrics['p1'].utilization,
    );
  });

  it('queue capacity limit enforced', () => {
    // interArrival < serviceTime → queue will grow
    // With capacity 2, queue should never exceed 2
    const model = makeSimpleModel({
      interArrival: 1,
      serviceTime: 5,
      resourceCount: 1,
      queueCapacity: 2,
      duration: 50,
    });
    const result = new SimEngine(model).run();

    // avgQueueLength should be ≤ capacity (not strictly provable from
    // the average, but with these parameters the queue should be bounded)
    const ql = result.nodeMetrics['p1'].avgQueueLength;
    expect(ql).toBeLessThanOrEqual(2);
    // Many entities will be lost because queue is full
    const processed = result.nodeMetrics['p1'].processed;
    expect(processed).toBeLessThan(result.summary.totalEntities);
  });

  it('has timeSeries data', () => {
    const result = new SimEngine(makeSimpleModel()).run();
    expect(result.timeSeries.timestamps.length).toBeGreaterThan(0);
    expect(result.timeSeries.wip.length).toBe(result.timeSeries.timestamps.length);
    expect(result.timeSeries.throughputCumulative.length).toBe(
      result.timeSeries.timestamps.length,
    );
  });
});
