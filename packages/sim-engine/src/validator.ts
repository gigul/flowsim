import type {
  ProcessModel,
  SimNode,
  SourceParams,
  QueueParams,
  ProcessParams,
  Distribution,
} from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a ProcessModel for structural and semantic correctness.
 */
export function validateModel(model: ProcessModel): ValidationResult {
  const errors: string[] = [];

  // ── At least one Source and one Sink ───────────────────────────
  const sources = model.nodes.filter((n) => n.type === 'source');
  const sinks = model.nodes.filter((n) => n.type === 'sink');

  if (sources.length === 0) {
    errors.push('Model must have at least one Source node.');
  }
  if (sinks.length === 0) {
    errors.push('Model must have at least one Sink node.');
  }

  // ── Node id uniqueness ────────────────────────────────────────
  const nodeIds = new Set<string>();
  for (const node of model.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: "${node.id}".`);
    }
    nodeIds.add(node.id);
  }

  // ── Edge references valid nodes ───────────────────────────────
  for (const edge of model.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge "${edge.id}" references unknown source node "${edge.from}".`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge "${edge.id}" references unknown target node "${edge.to}".`);
    }
  }

  // ── No isolated nodes (every node has at least one edge) ──────
  const connectedNodes = new Set<string>();
  for (const edge of model.edges) {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  }
  for (const node of model.nodes) {
    if (!connectedNodes.has(node.id)) {
      errors.push(`Node "${node.id}" is isolated (no edges).`);
    }
  }

  // ── Graph connectivity (weak) ─────────────────────────────────
  if (model.nodes.length > 0 && model.edges.length > 0) {
    const adj = new Map<string, Set<string>>();
    for (const id of nodeIds) adj.set(id, new Set());
    for (const edge of model.edges) {
      adj.get(edge.from)?.add(edge.to);
      adj.get(edge.to)?.add(edge.from);
    }
    const visited = new Set<string>();
    const stack = [model.nodes[0].id];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) stack.push(nb);
      }
    }
    if (visited.size < nodeIds.size) {
      errors.push('Graph is not connected – some nodes are unreachable.');
    }
  }

  // ── Parameter validation ──────────────────────────────────────
  for (const node of model.nodes) {
    validateNodeParams(node, errors);
  }

  // ── Config validation ─────────────────────────────────────────
  if (model.config.duration <= 0) {
    errors.push('Simulation duration must be > 0.');
  }
  if (model.config.warmupPeriod < 0) {
    errors.push('Warmup period must be >= 0.');
  }

  return { valid: errors.length === 0, errors };
}

// ── Helpers ───────────────────────────────────────────────────────

function validateNodeParams(node: SimNode, errors: string[]): void {
  switch (node.type) {
    case 'source': {
      const p = node.params as SourceParams;
      validateDistribution(p.interArrivalTime, `Source "${node.id}" interArrivalTime`, errors);
      break;
    }
    case 'queue': {
      const p = node.params as QueueParams;
      if (p.capacity < 0) {
        errors.push(`Queue "${node.id}": capacity must be >= 0.`);
      }
      break;
    }
    case 'process': {
      const p = node.params as ProcessParams;
      if (p.resourceCount < 1) {
        errors.push(`Process "${node.id}": resourceCount must be >= 1.`);
      }
      validateDistribution(p.serviceTime, `Process "${node.id}" serviceTime`, errors);
      break;
    }
    case 'sink':
      // No special validation needed.
      break;
  }
}

function validateDistribution(
  dist: Distribution,
  label: string,
  errors: string[],
): void {
  switch (dist.type) {
    case 'fixed':
      if (dist.value < 0) errors.push(`${label}: fixed value must be >= 0.`);
      break;
    case 'exponential':
      if (dist.mean < 0) errors.push(`${label}: exponential mean must be >= 0.`);
      break;
    case 'normal':
      if (dist.stddev < 0) errors.push(`${label}: normal stddev must be >= 0.`);
      break;
    case 'uniform':
      if (dist.min < 0) errors.push(`${label}: uniform min must be >= 0.`);
      if (dist.max < dist.min) errors.push(`${label}: uniform max must be >= min.`);
      break;
    case 'triangular':
      if (dist.min < 0) errors.push(`${label}: triangular min must be >= 0.`);
      if (dist.mode < dist.min || dist.mode > dist.max) {
        errors.push(`${label}: triangular mode must be between min and max.`);
      }
      break;
  }
}
