import type { SimEvent, SimNode, Entity } from '../types.js';

export class SinkHandler {
  private readonly node: SimNode;
  private departures: { entityId: string; leadTime: number; time: number }[] = [];

  constructor(node: SimNode) {
    this.node = node;
  }

  get id(): string {
    return this.node.id;
  }

  get departureCount(): number {
    return this.departures.length;
  }

  get avgLeadTime(): number {
    if (this.departures.length === 0) return 0;
    const total = this.departures.reduce((s, d) => s + d.leadTime, 0);
    return total / this.departures.length;
  }

  /**
   * Handle ENTITY_DEPARTED: record departure timestamp, compute lead time.
   */
  handleEntityDeparted(event: SimEvent, entity: Entity): void {
    const leadTime = event.time - entity.createdAt;
    this.departures.push({
      entityId: event.entityId,
      leadTime,
      time: event.time,
    });
  }

  /** Return the cumulative departure count at each departure time. */
  getDepartureTimes(): { time: number; cumulative: number }[] {
    return this.departures.map((d, i) => ({ time: d.time, cumulative: i + 1 }));
  }
}
