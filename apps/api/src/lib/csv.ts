import type { SimResult } from '@flowsim/sim-engine';

/**
 * Escape a CSV field value: wrap in double quotes if it contains
 * commas, double quotes, or newlines.
 */
function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert a SimResult to CSV format.
 *
 * Sections:
 * 1. Summary metrics
 * 2. Per-node metrics
 * 3. Bottlenecks
 * 4. Time series data
 */
export function generateCsv(result: SimResult): string {
  const lines: string[] = [];

  // ── Section 1: Summary ─────────────────────────────────────────
  lines.push('# Summary');
  lines.push('metric,value');
  lines.push(`throughput,${result.summary.throughput}`);
  lines.push(`avgLeadTime,${result.summary.avgLeadTime}`);
  lines.push(`avgWIP,${result.summary.avgWIP}`);
  lines.push(`totalEntities,${result.summary.totalEntities}`);
  lines.push(`simulatedTime,${result.summary.simulatedTime}`);
  lines.push('');

  // ── Section 2: Node Metrics ────────────────────────────────────
  lines.push('# Node Metrics');
  lines.push(
    'nodeId,utilization,avgQueueLength,avgWaitTime,avgServiceTime,processed',
  );
  for (const [nodeId, metrics] of Object.entries(result.nodeMetrics)) {
    lines.push(
      [
        escapeField(nodeId),
        metrics.utilization,
        metrics.avgQueueLength,
        metrics.avgWaitTime,
        metrics.avgServiceTime,
        metrics.processed,
      ].join(','),
    );
  }
  lines.push('');

  // ── Section 3: Bottlenecks ─────────────────────────────────────
  lines.push('# Bottlenecks');
  lines.push('nodeId,utilization,avgQueueLength');
  for (const bn of result.bottlenecks) {
    lines.push(
      [escapeField(bn.nodeId), bn.utilization, bn.avgQueueLength].join(','),
    );
  }
  lines.push('');

  // ── Section 4: Time Series ─────────────────────────────────────
  lines.push('# Time Series');
  lines.push('timestamp,wip,throughputCumulative');
  const ts = result.timeSeries;
  for (let i = 0; i < ts.timestamps.length; i++) {
    lines.push(
      [ts.timestamps[i], ts.wip[i], ts.throughputCumulative[i]].join(','),
    );
  }

  return lines.join('\n') + '\n';
}
