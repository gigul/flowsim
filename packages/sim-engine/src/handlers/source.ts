import type { SimEvent, SimNode, SourceParams, Entity, RNG } from '../types.js';
import { sampleDistribution } from '../distributions.js';
import { EventQueue } from '../event-queue.js';

export class SourceHandler {
  private readonly node: SimNode;
  private readonly params: SourceParams;
  private readonly rng: RNG;
  private readonly eventQueue: EventQueue;
  private readonly adjacency: Map<string, string[]>;
  private entityCounter: number = 0;

  constructor(
    node: SimNode,
    rng: RNG,
    eventQueue: EventQueue,
    adjacency: Map<string, string[]>,
  ) {
    this.node = node;
    this.params = node.params as SourceParams;
    this.rng = rng;
    this.eventQueue = eventQueue;
    this.adjacency = adjacency;
  }

  /** Schedule the very first entity creation at time 0. */
  init(): void {
    this.eventQueue.enqueue({
      time: 0,
      type: 'ENTITY_CREATED',
      entityId: '',
      nodeId: this.node.id,
      priority: 0,
    });
  }

  /**
   * Handle ENTITY_CREATED:
   *  1. Create an entity.
   *  2. Schedule the next ENTITY_CREATED.
   *  3. Route the new entity to the first downstream node.
   *
   * Returns the newly created entity.
   */
  handleEntityCreated(event: SimEvent, duration: number): Entity {
    this.entityCounter++;
    const entity: Entity = {
      id: `e-${this.node.id}-${this.entityCounter}`,
      createdAt: event.time,
      currentNodeId: this.node.id,
      priority: 0,
    };

    // Schedule next creation (only if within simulation horizon)
    const interArrival = sampleDistribution(this.params.interArrivalTime, this.rng);
    const nextTime = event.time + interArrival;
    if (nextTime < duration) {
      this.eventQueue.enqueue({
        time: nextTime,
        type: 'ENTITY_CREATED',
        entityId: '',
        nodeId: this.node.id,
        priority: 0,
      });
    }

    // Route to downstream node(s)
    const targets = this.adjacency.get(this.node.id) ?? [];
    if (targets.length > 0) {
      const targetId = targets[0]; // take first downstream node
      entity.currentNodeId = targetId;
      // We don't know the downstream type here; the engine will inspect it
      // and decide between ENTITY_ENQUEUED and SERVICE_START.
      this.eventQueue.enqueue({
        time: event.time,
        type: 'ENTITY_ENQUEUED', // default – engine may upgrade to SERVICE_START
        entityId: entity.id,
        nodeId: targetId,
        priority: 0,
      });
    }

    return entity;
  }
}
