/**
 * Manages a fixed pool of identical resources (e.g. workers, machines).
 * Tracks busy-time for utilization calculation.
 */
export class ResourcePool {
  private readonly total: number;
  private busy: number = 0;

  /** Accumulated busy-resource-seconds (sum across all resource slots). */
  private cumulativeBusyTime: number = 0;

  /** Last wall-clock time at which the busy count changed. */
  private lastChangeTime: number = 0;

  constructor(count: number) {
    this.total = count;
  }

  /** Try to acquire one resource.  Returns true on success. */
  acquire(currentTime: number): boolean {
    if (this.busy >= this.total) return false;
    this.flushBusyTime(currentTime);
    this.busy++;
    return true;
  }

  /** Release one resource. */
  release(currentTime: number): void {
    if (this.busy <= 0) return;
    this.flushBusyTime(currentTime);
    this.busy--;
  }

  get availableCount(): number {
    return this.total - this.busy;
  }

  get busyCount(): number {
    return this.busy;
  }

  get totalCount(): number {
    return this.total;
  }

  /**
   * Compute time-weighted utilization ∈ [0, 1].
   * @param totalTime – wall-clock duration of the simulation.
   */
  utilization(totalTime: number): number {
    if (totalTime <= 0) return 0;
    // flush up to totalTime so we don't lose the tail
    this.flushBusyTime(totalTime);
    return this.cumulativeBusyTime / (this.total * totalTime);
  }

  // ── Internal ──────────────────────────────────────────────────

  private flushBusyTime(currentTime: number): void {
    const dt = currentTime - this.lastChangeTime;
    if (dt > 0) {
      this.cumulativeBusyTime += this.busy * dt;
      this.lastChangeTime = currentTime;
    }
  }
}
