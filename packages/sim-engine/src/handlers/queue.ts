import type { SimNode, QueueParams, Entity, QueueDiscipline } from '../types.js';

interface QueueSnapshot {
  time: number;
  length: number;
}

/**
 * Internal buffer for a Queue node.
 * Supports FIFO, LIFO, and PRIORITY disciplines.
 */
export class QueueHandler {
  private readonly node: SimNode;
  private readonly params: QueueParams;
  private readonly buffer: Entity[] = [];
  private readonly discipline: QueueDiscipline;
  private readonly capacity: number;

  /** Time-weighted queue-length tracking. */
  private snapshots: QueueSnapshot[] = [];
  private lastSnapTime: number = 0;

  /** Per-entity enqueue timestamp for wait-time tracking. */
  private enqueueTimes: Map<string, number> = new Map();
  private totalWaitTime: number = 0;
  private waitCount: number = 0;

  constructor(node: SimNode) {
    this.node = node;
    this.params = node.params as QueueParams;
    this.discipline = this.params.discipline;
    this.capacity = this.params.capacity;
  }

  get id(): string {
    return this.node.id;
  }

  get length(): number {
    return this.buffer.length;
  }

  get isFull(): boolean {
    // capacity 0 means unlimited
    return this.capacity > 0 && this.buffer.length >= this.capacity;
  }

  /** Add entity to the queue buffer. Returns false if queue is full. */
  enqueue(entity: Entity, time: number): boolean {
    if (this.isFull) return false;
    this.recordSnapshot(time);
    this.buffer.push(entity);
    this.enqueueTimes.set(entity.id, time);
    return true;
  }

  /** Remove the next entity according to the discipline. */
  dequeue(time: number): Entity | null {
    if (this.buffer.length === 0) return null;
    this.recordSnapshot(time);

    let entity: Entity;
    switch (this.discipline) {
      case 'FIFO':
        entity = this.buffer.shift()!;
        break;
      case 'LIFO':
        entity = this.buffer.pop()!;
        break;
      case 'PRIORITY': {
        // Lower priority number = higher priority
        let bestIdx = 0;
        for (let i = 1; i < this.buffer.length; i++) {
          if (this.buffer[i].priority < this.buffer[bestIdx].priority) {
            bestIdx = i;
          }
        }
        entity = this.buffer.splice(bestIdx, 1)[0];
        break;
      }
    }

    const enqTime = this.enqueueTimes.get(entity.id);
    if (enqTime !== undefined) {
      this.totalWaitTime += time - enqTime;
      this.waitCount++;
      this.enqueueTimes.delete(entity.id);
    }

    return entity;
  }

  /** Compute time-weighted average queue length over the full simulation duration. */
  avgQueueLength(totalDuration: number): number {
    if (totalDuration <= 0) return 0;
    // Flush current state
    this.recordSnapshot(totalDuration);

    let weightedSum = 0;
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const dt = this.snapshots[i + 1].time - this.snapshots[i].time;
      weightedSum += this.snapshots[i].length * dt;
    }
    return weightedSum / totalDuration;
  }

  /** Average time an entity spent waiting in this queue. */
  avgWaitTime(): number {
    if (this.waitCount === 0) return 0;
    return this.totalWaitTime / this.waitCount;
  }

  // ── Internal ──────────────────────────────────────────────────

  private recordSnapshot(time: number): void {
    if (this.snapshots.length === 0 || time > this.lastSnapTime) {
      this.snapshots.push({ time, length: this.buffer.length });
      this.lastSnapTime = time;
    } else if (time === this.lastSnapTime) {
      // Update the latest snapshot's length
      this.snapshots[this.snapshots.length - 1].length = this.buffer.length;
    }
  }
}
