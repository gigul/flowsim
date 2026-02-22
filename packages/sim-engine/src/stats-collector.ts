import type { SimEvent, Entity, NodeMetrics } from './types.js';

interface WIPSnapshot {
  time: number;
  count: number;
}

/**
 * Collects raw event data during a simulation run and computes
 * aggregated per-node and global metrics at finalisation time.
 */
export class StatsCollector {
  /** entity id → Entity (all entities that ever existed). */
  private entities: Map<string, Entity> = new Map();

  /** All events recorded (post-warmup only). */
  private events: SimEvent[] = [];

  /** Current work-in-progress count (entities alive in the system). */
  private currentWIP: number = 0;

  /** Time-weighted WIP snapshots. */
  private wipSnapshots: WIPSnapshot[] = [];

  /** Per-entity: time it entered the system. */
  private entityBirth: Map<string, number> = new Map();

  /** Per-entity: time it departed the system. */
  private entityDeath: Map<string, number> = new Map();

  /** Total entities created (post-warmup). */
  totalCreated: number = 0;

  /** Total entities departed (post-warmup). */
  totalDeparted: number = 0;

  // ── Recording ─────────────────────────────────────────────────

  recordEntity(entity: Entity): void {
    this.entities.set(entity.id, { ...entity });
  }

  recordEvent(event: SimEvent, warmup: number): void {
    if (event.time < warmup) return;
    this.events.push(event);
  }

  recordCreation(entityId: string, time: number, warmup: number): void {
    if (time < warmup) return;
    this.totalCreated++;
    this.entityBirth.set(entityId, time);
    this.snapshotWIP(time, ++this.currentWIP);
  }

  recordDeparture(entityId: string, time: number, warmup: number): void {
    if (time < warmup) return;
    this.totalDeparted++;
    this.entityDeath.set(entityId, time);
    this.snapshotWIP(time, --this.currentWIP);
  }

  // ── WIP tracking ──────────────────────────────────────────────

  private snapshotWIP(time: number, count: number): void {
    this.wipSnapshots.push({ time, count });
  }

  /**
   * Compute time-weighted average WIP for the given interval.
   */
  computeAvgWIP(start: number, end: number): number {
    if (end <= start || this.wipSnapshots.length === 0) return 0;

    // Filter to interval
    let prev = 0;
    let weightedSum = 0;
    let lastTime = start;

    for (const snap of this.wipSnapshots) {
      if (snap.time > end) break;
      if (snap.time > start) {
        weightedSum += prev * (snap.time - lastTime);
        lastTime = snap.time;
      }
      prev = snap.count;
    }
    // Tail
    weightedSum += prev * (end - lastTime);

    return weightedSum / (end - start);
  }

  /**
   * Compute average lead time (time from creation to departure)
   * for all entities that departed during the measurement window.
   */
  computeAvgLeadTime(): number {
    let sum = 0;
    let count = 0;
    for (const [id, deathTime] of this.entityDeath) {
      const birthTime = this.entityBirth.get(id);
      if (birthTime !== undefined) {
        sum += deathTime - birthTime;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Build WIP time-series sampled at the requested timestamps.
   */
  sampleWIP(timestamps: number[]): number[] {
    const result: number[] = [];
    let snapIdx = 0;
    let currentCount = 0;

    for (const t of timestamps) {
      while (
        snapIdx < this.wipSnapshots.length &&
        this.wipSnapshots[snapIdx].time <= t
      ) {
        currentCount = this.wipSnapshots[snapIdx].count;
        snapIdx++;
      }
      result.push(currentCount);
    }
    return result;
  }

  /**
   * Build cumulative throughput at the requested timestamps.
   */
  sampleThroughput(timestamps: number[]): number[] {
    // Build sorted departure times
    const departures = [...this.entityDeath.values()].sort((a, b) => a - b);
    const result: number[] = [];
    let dIdx = 0;

    for (const t of timestamps) {
      while (dIdx < departures.length && departures[dIdx] <= t) {
        dIdx++;
      }
      result.push(dIdx);
    }
    return result;
  }
}
