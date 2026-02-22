import { describe, it, expect } from 'vitest';
import { validateModel } from '../src/validator.js';
import type { ProcessModel } from '../src/types.js';

function makeValidModel(): ProcessModel {
  return {
    id: 'model-1',
    name: 'Test Model',
    nodes: [
      {
        id: 'src',
        type: 'source',
        params: { interArrivalTime: { type: 'fixed', value: 5 } },
      },
      {
        id: 'q1',
        type: 'queue',
        params: { capacity: 100, discipline: 'FIFO' as const },
      },
      {
        id: 'p1',
        type: 'process',
        params: {
          serviceTime: { type: 'fixed', value: 3 },
          resourceCount: 1,
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
      seed: 42,
      duration: 100,
      timeUnit: 'min',
      warmupPeriod: 0,
    },
  };
}

describe('validateModel', () => {
  it('valid model passes', () => {
    const result = validateModel(makeValidModel());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('missing source fails', () => {
    const model = makeValidModel();
    model.nodes = model.nodes.filter((n) => n.type !== 'source');
    model.edges = model.edges.filter((e) => e.from !== 'src' && e.to !== 'src');
    const result = validateModel(model);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Source'))).toBe(true);
  });

  it('missing sink fails', () => {
    const model = makeValidModel();
    model.nodes = model.nodes.filter((n) => n.type !== 'sink');
    model.edges = model.edges.filter((e) => e.from !== 'sink' && e.to !== 'sink');
    const result = validateModel(model);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Sink'))).toBe(true);
  });

  it('negative fixed time fails', () => {
    const model = makeValidModel();
    const src = model.nodes.find((n) => n.type === 'source')!;
    (src.params as any).interArrivalTime = { type: 'fixed', value: -1 };
    const result = validateModel(model);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('fixed value must be >= 0'))).toBe(true);
  });

  it('isolated node fails', () => {
    const model = makeValidModel();
    model.nodes.push({
      id: 'orphan',
      type: 'queue',
      params: { capacity: 10, discipline: 'FIFO' as const },
    });
    const result = validateModel(model);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('isolated'))).toBe(true);
  });

  it('resourceCount < 1 fails', () => {
    const model = makeValidModel();
    const proc = model.nodes.find((n) => n.type === 'process')!;
    (proc.params as any).resourceCount = 0;
    const result = validateModel(model);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('resourceCount'))).toBe(true);
  });
});
