import type { SimEvent, SimNode, ProcessParams, Entity, RNG } from '../types.js';
import { sampleDistribution } from '../distributions.js';
import { EventQueue } from '../event-queue.js';
import { ResourcePool } from '../resource-pool.js';

export class ProcessHandler {
  private readonly node: SimNode;
  private readonly params: ProcessParams;
  private readonly rng: RNG;
  private readonly eventQueue: EventQueue;
  private readonly adjacency: Map<string, string[]>;
  readonly resourcePool: ResourcePool;

  private totalServiceTime: number = 0;
  private serviceCount: number = 0;

  constructor(
    node: SimNode,
    rng: RNG,
    eventQueue: EventQueue,
    adjacency: Map<string, string[]>,
  ) {
    this.node = node;
    this.params = node.params as ProcessParams;
    this.rng = rng;
    this.eventQueue = eventQueue;
    this.adjacency = adjacency;
    this.resourcePool = new ResourcePool(this.params.resourceCount);
  }

  get id(): string {
    return this.node.id;
  }

  get processed(): number {
    return this.serviceCount;
  }

  get avgServiceTime(): number {
    return this.serviceCount > 0 ? this.totalServiceTime / this.serviceCount : 0;
  }

  /** Returns true if a resource is available. */
  hasAvailableResource(currentTime: number): boolean {
    return this.resourcePool.availableCount > 0;
  }

  /**
   * Handle SERVICE_START: acquire resource, schedule SERVICE_END.
   * Returns the sampled service duration.
   */
  handleServiceStart(event: SimEvent): number {
    const acquired = this.resourcePool.acquire(event.time);
    if (!acquired) {
      // Should not happen if the engine checks availability first.
      throw new Error(`Process ${this.node.id}: no resource available at time ${event.time}`);
    }

    const serviceTime = sampleDistribution(this.params.serviceTime, this.rng);
    this.totalServiceTime += serviceTime;

    this.eventQueue.enqueue({
      time: event.time + serviceTime,
      type: 'SERVICE_END',
      entityId: event.entityId,
      nodeId: this.node.id,
      priority: event.priority,
    });

    return serviceTime;
  }

  /**
   * Handle SERVICE_END: release resource, route entity downstream.
   * Returns the id of the downstream node (or null if none).
   */
  handleServiceEnd(event: SimEvent): string | null {
    this.resourcePool.release(event.time);
    this.serviceCount++;

    const targets = this.adjacency.get(this.node.id) ?? [];
    if (targets.length > 0) {
      const targetId = targets[0];
      // Schedule routing event – engine decides actual type
      this.eventQueue.enqueue({
        time: event.time,
        type: 'ENTITY_ENQUEUED',
        entityId: event.entityId,
        nodeId: targetId,
        priority: event.priority,
      });
      return targetId;
    }
    return null;
  }

  utilization(totalTime: number): number {
    return this.resourcePool.utilization(totalTime);
  }
}
