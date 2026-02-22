import type { NodeMetrics, Bottleneck } from './types.js';

/**
 * Detect bottleneck nodes: utilization > 0.85 AND avgQueueLength > 1.
 * Returns top 3 sorted by utilization descending.
 */
export function detectBottlenecks(
  nodeMetrics: Record<string, NodeMetrics>,
): Bottleneck[] {
  const candidates: Bottleneck[] = [];

  for (const [nodeId, metrics] of Object.entries(nodeMetrics)) {
    if (metrics.utilization > 0.85 && metrics.avgQueueLength > 1) {
      candidates.push({
        nodeId,
        utilization: metrics.utilization,
        avgQueueLength: metrics.avgQueueLength,
      });
    }
  }

  candidates.sort((a, b) => b.utilization - a.utilization);
  return candidates.slice(0, 3);
}
