/**
 * Worker thread entry point for running simulations.
 *
 * Receives { model, config } via parentPort messages.
 * Posts back:
 *   { type: 'progress', value: number }  — progress percentage 0-100
 *   { type: 'result', data: SimResult }  — final result
 *   { type: 'error', message: string }   — on failure
 *
 * Since the sim-engine does not yet expose a high-level SimEngine class,
 * this worker implements a basic discrete-event simulation loop using the
 * engine primitives (RNG, distributions, EventQueue, ResourcePool).
 */
import { parentPort, workerData } from 'node:worker_threads';
import { createRng } from '@flowsim/sim-engine';
import { sampleDistribution } from '@flowsim/sim-engine';
import { EventQueue } from '@flowsim/sim-engine';
import { ResourcePool } from '@flowsim/sim-engine';
import type {
  ProcessModel,
  SimConfig,
  SimResult,
  SimEvent,
  SimNode,
  NodeMetrics,
  Bottleneck,
  SourceParams,
  ProcessParams,
  QueueParams,
  SinkParams,
} from '@flowsim/sim-engine';
import {
  BOTTLENECK_UTILIZATION_THRESHOLD,
  BOTTLENECK_QUEUE_THRESHOLD,
} from '@flowsim/shared';

if (!parentPort) {
  throw new Error('sim-worker must be run as a worker thread');
}

const port = parentPort;

port.on('message', (msg: { model: ProcessModel; config: SimConfig }) => {
  try {
    const result = runSimulation(msg.model, msg.config);
    port.postMessage({ type: 'result', data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    port.postMessage({ type: 'error', message });
  }
});

function runSimulation(model: ProcessModel, config: SimConfig): SimResult {
  const rng = createRng(config.seed);
  const eventQueue = new EventQueue();

  // Build lookup maps
  const nodeMap = new Map<string, SimNode>();
  for (const node of model.nodes) {
    nodeMap.set(node.id, node);
  }

  // Build adjacency: from -> to[]
  const adjacency = new Map<string, string[]>();
  for (const edge of model.edges) {
    const list = adjacency.get(edge.from) || [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  // Resource pools for process nodes
  const resourcePools = new Map<string, ResourcePool>();
  for (const node of model.nodes) {
    if (node.type === 'process') {
      const params = node.params as ProcessParams;
      resourcePools.set(node.id, new ResourcePool(params.resourceCount));
    }
  }

  // Queue state: nodeId -> entity ids waiting
  const queues = new Map<string, string[]>();
  for (const node of model.nodes) {
    if (node.type === 'queue') {
      queues.set(node.id, []);
    }
  }

  // Tracking
  let entityCounter = 0;
  const entityCreateTimes = new Map<string, number>();
  const entityEnqueueTimes = new Map<string, number>();
  const leadTimes: number[] = [];

  // Per-node stats
  const nodeProcessed = new Map<string, number>();
  const nodeWaitTimes = new Map<string, number[]>();
  const nodeServiceTimes = new Map<string, number[]>();
  const queueLengthSamples = new Map<string, number[]>();

  for (const node of model.nodes) {
    nodeProcessed.set(node.id, 0);
    nodeWaitTimes.set(node.id, []);
    nodeServiceTimes.set(node.id, []);
    queueLengthSamples.set(node.id, []);
  }

  // Time series
  const tsTimestamps: number[] = [];
  const tsWip: number[] = [];
  const tsThroughput: number[] = [];
  let currentWip = 0;
  let completedCount = 0;
  const timeSeriesInterval = Math.max(1, config.duration / 100);
  let nextTsSample = timeSeriesInterval;

  // Schedule initial arrivals for source nodes
  for (const node of model.nodes) {
    if (node.type === 'source') {
      const params = node.params as SourceParams;
      const interArrival = sampleDistribution(params.interArrivalTime, rng);
      eventQueue.enqueue({
        time: interArrival,
        type: 'ENTITY_CREATED',
        entityId: `e-${entityCounter++}`,
        nodeId: node.id,
        priority: 0,
      });
    }
  }

  let simTime = 0;
  const maxEvents = 1_000_000; // safety limit
  let eventCount = 0;
  let lastProgressReport = 0;

  while (!eventQueue.isEmpty && eventCount < maxEvents) {
    const event = eventQueue.dequeue()!;
    simTime = event.time;

    if (simTime > config.duration) break;

    eventCount++;

    // Report progress periodically
    const progress = Math.min(100, Math.floor((simTime / config.duration) * 100));
    if (progress >= lastProgressReport + 10) {
      lastProgressReport = progress;
      port.postMessage({ type: 'progress', value: progress });
    }

    // Sample time series
    while (nextTsSample <= simTime) {
      tsTimestamps.push(nextTsSample);
      tsWip.push(currentWip);
      tsThroughput.push(completedCount);
      nextTsSample += timeSeriesInterval;
    }

    switch (event.type) {
      case 'ENTITY_CREATED': {
        const node = nodeMap.get(event.nodeId)!;
        entityCreateTimes.set(event.entityId, simTime);
        currentWip++;
        nodeProcessed.set(node.id, (nodeProcessed.get(node.id) || 0) + 1);

        // Schedule next arrival
        const srcParams = node.params as SourceParams;
        const nextInterval = sampleDistribution(srcParams.interArrivalTime, rng);
        eventQueue.enqueue({
          time: simTime + nextInterval,
          type: 'ENTITY_CREATED',
          entityId: `e-${entityCounter++}`,
          nodeId: node.id,
          priority: 0,
        });

        // Route to next node
        routeEntity(event.entityId, event.nodeId, simTime);
        break;
      }

      case 'ENTITY_ENQUEUED': {
        const node = nodeMap.get(event.nodeId)!;
        if (node.type === 'queue') {
          const queue = queues.get(node.id)!;
          const qParams = node.params as QueueParams;

          if (queue.length < qParams.capacity) {
            queue.push(event.entityId);
            entityEnqueueTimes.set(event.entityId, simTime);
            queueLengthSamples.get(node.id)!.push(queue.length);
          }
          // If at capacity, entity is dropped (simplified)

          // Try to move to next node if possible
          tryDequeueToNext(node.id, simTime);
        } else {
          // Not a queue node, route forward
          routeEntity(event.entityId, event.nodeId, simTime);
        }
        break;
      }

      case 'SERVICE_START': {
        const node = nodeMap.get(event.nodeId)!;
        if (node.type === 'process') {
          const pParams = node.params as ProcessParams;
          const serviceTime = sampleDistribution(pParams.serviceTime, rng);
          nodeServiceTimes.get(node.id)!.push(serviceTime);

          eventQueue.enqueue({
            time: simTime + serviceTime,
            type: 'SERVICE_END',
            entityId: event.entityId,
            nodeId: event.nodeId,
            priority: 0,
          });
        }
        break;
      }

      case 'SERVICE_END': {
        const pool = resourcePools.get(event.nodeId);
        if (pool) {
          pool.release(simTime);
        }
        nodeProcessed.set(
          event.nodeId,
          (nodeProcessed.get(event.nodeId) || 0) + 1,
        );

        // Try to pull next entity from predecessor queue
        for (const edge of model.edges) {
          if (edge.to === event.nodeId) {
            const predNode = nodeMap.get(edge.from);
            if (predNode && predNode.type === 'queue') {
              tryDequeueToNext(predNode.id, simTime);
            }
          }
        }

        // Route to next
        routeEntity(event.entityId, event.nodeId, simTime);
        break;
      }

      case 'ENTITY_DEPARTED': {
        const createTime = entityCreateTimes.get(event.entityId);
        if (createTime !== undefined) {
          const lt = simTime - createTime;
          if (simTime >= config.warmupPeriod) {
            leadTimes.push(lt);
          }
        }
        currentWip--;
        completedCount++;
        nodeProcessed.set(
          event.nodeId,
          (nodeProcessed.get(event.nodeId) || 0) + 1,
        );
        break;
      }
    }
  }

  // Final time series sample
  tsTimestamps.push(simTime);
  tsWip.push(currentWip);
  tsThroughput.push(completedCount);

  // ── Compute results ────────────────────────────────────────────
  const effectiveTime = Math.max(1, config.duration - config.warmupPeriod);

  const avgLeadTime =
    leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

  const avgWIP =
    tsWip.length > 0
      ? tsWip.reduce((a, b) => a + b, 0) / tsWip.length
      : 0;

  const summary = {
    throughput: completedCount / effectiveTime,
    avgLeadTime,
    avgWIP,
    totalEntities: completedCount,
    simulatedTime: simTime,
  };

  // Per-node metrics
  const nodeMetricsMap: Record<string, NodeMetrics> = {};
  for (const node of model.nodes) {
    const pool = resourcePools.get(node.id);
    const waitArr = nodeWaitTimes.get(node.id) || [];
    const svcArr = nodeServiceTimes.get(node.id) || [];
    const qSamples = queueLengthSamples.get(node.id) || [];

    nodeMetricsMap[node.id] = {
      utilization: pool ? pool.utilization(config.duration) : 0,
      avgQueueLength:
        qSamples.length > 0
          ? qSamples.reduce((a, b) => a + b, 0) / qSamples.length
          : 0,
      avgWaitTime:
        waitArr.length > 0
          ? waitArr.reduce((a, b) => a + b, 0) / waitArr.length
          : 0,
      avgServiceTime:
        svcArr.length > 0
          ? svcArr.reduce((a, b) => a + b, 0) / svcArr.length
          : 0,
      processed: nodeProcessed.get(node.id) || 0,
    };
  }

  // Bottleneck detection
  const bottlenecks: Bottleneck[] = [];
  for (const [nodeId, metrics] of Object.entries(nodeMetricsMap)) {
    if (
      metrics.utilization >= BOTTLENECK_UTILIZATION_THRESHOLD ||
      metrics.avgQueueLength >= BOTTLENECK_QUEUE_THRESHOLD
    ) {
      bottlenecks.push({
        nodeId,
        utilization: metrics.utilization,
        avgQueueLength: metrics.avgQueueLength,
      });
    }
  }
  bottlenecks.sort((a, b) => b.utilization - a.utilization);

  return {
    summary,
    nodeMetrics: nodeMetricsMap,
    bottlenecks,
    timeSeries: {
      timestamps: tsTimestamps,
      wip: tsWip,
      throughputCumulative: tsThroughput,
    },
  };

  // ── Helper functions ───────────────────────────────────────────

  function routeEntity(entityId: string, fromNodeId: string, time: number) {
    const targets = adjacency.get(fromNodeId);
    if (!targets || targets.length === 0) return;

    // Pick first target (or random for multiple)
    const targetId =
      targets.length === 1 ? targets[0] : targets[rng.nextInt(0, targets.length - 1)];
    const targetNode = nodeMap.get(targetId);
    if (!targetNode) return;

    switch (targetNode.type) {
      case 'queue':
        eventQueue.enqueue({
          time,
          type: 'ENTITY_ENQUEUED',
          entityId,
          nodeId: targetId,
          priority: 0,
        });
        break;

      case 'process': {
        const pool = resourcePools.get(targetId)!;
        if (pool.acquire(time)) {
          eventQueue.enqueue({
            time,
            type: 'SERVICE_START',
            entityId,
            nodeId: targetId,
            priority: 0,
          });
        } else {
          // No resource available; check if there's a queue predecessor
          // For simplicity, if the entity can't start service, hold it
          // (in a real engine, it would go back to a queue)
          // We'll re-enqueue it with a small delay
          eventQueue.enqueue({
            time: time + 0.001,
            type: 'ENTITY_ENQUEUED',
            entityId,
            nodeId: targetId,
            priority: 1,
          });
        }
        break;
      }

      case 'sink':
        eventQueue.enqueue({
          time,
          type: 'ENTITY_DEPARTED',
          entityId,
          nodeId: targetId,
          priority: 0,
        });
        break;

      case 'source':
        // Should not route to a source
        break;
    }
  }

  function tryDequeueToNext(queueNodeId: string, time: number) {
    const queue = queues.get(queueNodeId);
    if (!queue || queue.length === 0) return;

    const targets = adjacency.get(queueNodeId);
    if (!targets || targets.length === 0) return;

    const targetId = targets[0];
    const targetNode = nodeMap.get(targetId);
    if (!targetNode || targetNode.type !== 'process') return;

    const pool = resourcePools.get(targetId);
    if (!pool || !pool.acquire(time)) return;

    const entityId = queue.shift()!;

    // Record wait time
    const enqueueTime = entityEnqueueTimes.get(entityId);
    if (enqueueTime !== undefined) {
      nodeWaitTimes.get(queueNodeId)!.push(time - enqueueTime);
    }

    eventQueue.enqueue({
      time,
      type: 'SERVICE_START',
      entityId,
      nodeId: targetId,
      priority: 0,
    });
  }
}
