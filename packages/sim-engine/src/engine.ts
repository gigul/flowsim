import type {
  ProcessModel,
  SimResult,
  SimEvent,
  Entity,
  NodeMetrics,
  TimeSeries,
} from './types.js';
import { createRng } from './rng.js';
import { EventQueue } from './event-queue.js';
import { StatsCollector } from './stats-collector.js';
import { SourceHandler } from './handlers/source.js';
import { QueueHandler } from './handlers/queue.js';
import { ProcessHandler } from './handlers/process.js';
import { SinkHandler } from './handlers/sink.js';
import { detectBottlenecks } from './bottleneck.js';

export class SimEngine {
  private readonly model: ProcessModel;

  constructor(model: ProcessModel) {
    this.model = model;
  }

  run(): SimResult {
    const { nodes, edges, config } = this.model;
    const { seed, duration, warmupPeriod } = config;

    // ── Initialise core structures ──────────────────────────────
    const rng = createRng(seed);
    const eventQueue = new EventQueue();
    const stats = new StatsCollector();
    const entities = new Map<string, Entity>();

    // ── Build adjacency map (nodeId → [downstream nodeIds]) ─────
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      const list = adjacency.get(edge.from);
      if (list) list.push(edge.to);
    }

    // ── Build reverse adjacency (nodeId → [upstream nodeIds]) ───
    const reverseAdj = new Map<string, string[]>();
    for (const node of nodes) {
      reverseAdj.set(node.id, []);
    }
    for (const edge of edges) {
      const list = reverseAdj.get(edge.to);
      if (list) list.push(edge.from);
    }

    // ── Create handlers ─────────────────────────────────────────
    const sourceHandlers = new Map<string, SourceHandler>();
    const queueHandlers = new Map<string, QueueHandler>();
    const processHandlers = new Map<string, ProcessHandler>();
    const sinkHandlers = new Map<string, SinkHandler>();

    const nodeTypeMap = new Map<string, string>();

    for (const node of nodes) {
      nodeTypeMap.set(node.id, node.type);
      switch (node.type) {
        case 'source': {
          const handler = new SourceHandler(node, rng, eventQueue, adjacency);
          sourceHandlers.set(node.id, handler);
          break;
        }
        case 'queue': {
          const handler = new QueueHandler(node);
          queueHandlers.set(node.id, handler);
          break;
        }
        case 'process': {
          const handler = new ProcessHandler(node, rng, eventQueue, adjacency);
          processHandlers.set(node.id, handler);
          break;
        }
        case 'sink': {
          const handler = new SinkHandler(node);
          sinkHandlers.set(node.id, handler);
          break;
        }
      }
    }

    // ── Schedule initial Source events ───────────────────────────
    for (const handler of sourceHandlers.values()) {
      handler.init();
    }

    // ── Main DES loop ───────────────────────────────────────────
    let clock = 0;

    while (!eventQueue.isEmpty) {
      const event = eventQueue.dequeue()!;

      // Stop if past the simulation horizon
      if (event.time > duration) break;

      clock = event.time;

      this.dispatchEvent(
        event,
        entities,
        sourceHandlers,
        queueHandlers,
        processHandlers,
        sinkHandlers,
        nodeTypeMap,
        adjacency,
        reverseAdj,
        eventQueue,
        stats,
        duration,
        warmupPeriod,
      );
    }

    // ── Finalise ────────────────────────────────────────────────
    const effectiveStart = warmupPeriod;
    const effectiveDuration = duration - warmupPeriod;

    // Per-node metrics
    const nodeMetricsMap: Record<string, NodeMetrics> = {};

    for (const [id, handler] of processHandlers) {
      // Find associated upstream queue (if any)
      const upstreamIds = reverseAdj.get(id) ?? [];
      let avgQL = 0;
      let avgWT = 0;
      for (const uid of upstreamIds) {
        const qh = queueHandlers.get(uid);
        if (qh) {
          avgQL = qh.avgQueueLength(duration);
          avgWT = qh.avgWaitTime();
        }
      }

      nodeMetricsMap[id] = {
        utilization: handler.utilization(duration),
        avgQueueLength: avgQL,
        avgWaitTime: avgWT,
        avgServiceTime: handler.avgServiceTime,
        processed: handler.processed,
      };
    }

    // Also record queue nodes in nodeMetrics
    for (const [id, handler] of queueHandlers) {
      if (!nodeMetricsMap[id]) {
        nodeMetricsMap[id] = {
          utilization: 0,
          avgQueueLength: handler.avgQueueLength(duration),
          avgWaitTime: handler.avgWaitTime(),
          avgServiceTime: 0,
          processed: 0,
        };
      }
    }

    // Bottlenecks
    const bottlenecks = detectBottlenecks(nodeMetricsMap);

    // Time series: sample at duration/100 intervals
    const numSamples = 100;
    const step = effectiveDuration / numSamples;
    const timestamps: number[] = [];
    for (let i = 0; i <= numSamples; i++) {
      timestamps.push(effectiveStart + i * step);
    }
    const wipSeries = stats.sampleWIP(timestamps);
    const throughputSeries = stats.sampleThroughput(timestamps);

    const timeSeries: TimeSeries = {
      timestamps,
      wip: wipSeries,
      throughputCumulative: throughputSeries,
    };

    // Summary
    const avgLeadTime = stats.computeAvgLeadTime();
    const avgWIP = stats.computeAvgWIP(effectiveStart, duration);
    const throughput =
      effectiveDuration > 0 ? stats.totalDeparted / effectiveDuration : 0;

    return {
      summary: {
        throughput,
        avgLeadTime,
        avgWIP,
        totalEntities: stats.totalCreated,
        simulatedTime: duration,
      },
      nodeMetrics: nodeMetricsMap,
      bottlenecks,
      timeSeries,
    };
  }

  // ── Event dispatcher ──────────────────────────────────────────

  private dispatchEvent(
    event: SimEvent,
    entities: Map<string, Entity>,
    sourceHandlers: Map<string, SourceHandler>,
    queueHandlers: Map<string, QueueHandler>,
    processHandlers: Map<string, ProcessHandler>,
    sinkHandlers: Map<string, SinkHandler>,
    nodeTypeMap: Map<string, string>,
    adjacency: Map<string, string[]>,
    reverseAdj: Map<string, string[]>,
    eventQueue: EventQueue,
    stats: StatsCollector,
    duration: number,
    warmup: number,
  ): void {
    const nodeType = nodeTypeMap.get(event.nodeId);

    switch (event.type) {
      case 'ENTITY_CREATED': {
        const sourceHandler = sourceHandlers.get(event.nodeId);
        if (!sourceHandler) break;

        const entity = sourceHandler.handleEntityCreated(event, duration);
        entities.set(entity.id, entity);
        stats.recordEntity(entity);
        stats.recordCreation(entity.id, event.time, warmup);
        break;
      }

      case 'ENTITY_ENQUEUED': {
        // The target node could be a queue, a process, or a sink.
        // Route appropriately.

        if (nodeType === 'queue') {
          const qHandler = queueHandlers.get(event.nodeId);
          if (!qHandler) break;

          // Check if the downstream process can take immediately
          const downstream = adjacency.get(event.nodeId) ?? [];
          let forwarded = false;
          for (const dsId of downstream) {
            const ph = processHandlers.get(dsId);
            if (ph && ph.hasAvailableResource(event.time)) {
              // Skip queue, go directly to service
              eventQueue.enqueue({
                time: event.time,
                type: 'SERVICE_START',
                entityId: event.entityId,
                nodeId: dsId,
                priority: event.priority,
              });
              forwarded = true;
              break;
            }
          }

          if (!forwarded) {
            const entity = entities.get(event.entityId);
            if (entity) {
              const accepted = qHandler.enqueue(entity, event.time);
              if (!accepted) {
                // Queue full – entity is dropped (lost)
                // In a more sophisticated model we could reroute
              }
            }
          }
        } else if (nodeType === 'process') {
          // Direct connection source → process (no queue in between)
          const ph = processHandlers.get(event.nodeId);
          if (ph && ph.hasAvailableResource(event.time)) {
            eventQueue.enqueue({
              time: event.time,
              type: 'SERVICE_START',
              entityId: event.entityId,
              nodeId: event.nodeId,
              priority: event.priority,
            });
          }
          // If no resource, entity is lost (no queue to buffer).
          // Alternatively, the model should always have a queue before a process.
        } else if (nodeType === 'sink') {
          // Route to sink
          eventQueue.enqueue({
            time: event.time,
            type: 'ENTITY_DEPARTED',
            entityId: event.entityId,
            nodeId: event.nodeId,
            priority: event.priority,
          });
        }
        break;
      }

      case 'SERVICE_START': {
        const ph = processHandlers.get(event.nodeId);
        if (!ph) break;
        ph.handleServiceStart(event);
        break;
      }

      case 'SERVICE_END': {
        const ph = processHandlers.get(event.nodeId);
        if (!ph) break;
        ph.handleServiceEnd(event);

        // Try to pull next entity from upstream queue
        const upstreams = reverseAdj.get(event.nodeId) ?? [];
        for (const uid of upstreams) {
          const qh = queueHandlers.get(uid);
          if (qh && qh.length > 0) {
            const nextEntity = qh.dequeue(event.time);
            if (nextEntity) {
              eventQueue.enqueue({
                time: event.time,
                type: 'SERVICE_START',
                entityId: nextEntity.id,
                nodeId: event.nodeId,
                priority: nextEntity.priority,
              });
            }
            break;
          }
        }
        break;
      }

      case 'ENTITY_DEPARTED': {
        const sh = sinkHandlers.get(event.nodeId);
        if (!sh) break;
        const entity = entities.get(event.entityId);
        if (entity) {
          sh.handleEntityDeparted(event, entity);
          stats.recordDeparture(event.entityId, event.time, warmup);
          entities.delete(event.entityId);
        }
        break;
      }
    }
  }
}
