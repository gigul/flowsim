import { create } from 'zustand';
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge as rfAddEdge } from '@xyflow/react';
import { generateId } from '@/lib/utils';
import { DEFAULT_PARAMS, type NodeTypeKey } from '@/lib/constants';
import type { ProcessModel, SimNode, SimEdge } from '@/lib/validation';

export interface FlowNodeData {
  nodeType: NodeTypeKey;
  label: string;
  params: Record<string, unknown>;
  [key: string]: unknown;
}

interface HistoryEntry {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

interface GraphState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  bottleneckNodeIds: Set<string>;
  dirty: boolean;

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeTypeKey, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<FlowNodeData>) => void;
  addEdge: (source: string, target: string) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  loadFromModel: (model: ProcessModel) => void;
  toProcessModel: (modelId: string, modelName: string) => ProcessModel;
  setBottleneckNodes: (ids: string[]) => void;
  markClean: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const MAX_HISTORY = 20;

function createDefaultLabel(type: NodeTypeKey, nodes: Node[]): string {
  const count = nodes.filter(
    (n) => (n.data as FlowNodeData).nodeType === type,
  ).length;
  const labels: Record<NodeTypeKey, string> = {
    source: 'Source',
    queue: 'Queue',
    process: 'Process',
    sink: 'Sink',
  };
  return `${labels[type]} ${count + 1}`;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  bottleneckNodeIds: new Set(),
  dirty: false,
  history: [],
  historyIndex: -1,

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<FlowNodeData>[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    get().pushHistory();
    set((state) => ({
      edges: rfAddEdge(
        { ...connection, id: `e-${generateId()}`, type: 'animated' },
        state.edges,
      ),
      dirty: true,
    }));
  },

  addNode: (type, position) => {
    get().pushHistory();
    const { nodes } = get();
    const label = createDefaultLabel(type, nodes);
    const newNode: Node<FlowNodeData> = {
      id: `node-${generateId()}`,
      type,
      position,
      data: {
        nodeType: type,
        label,
        params: structuredClone(DEFAULT_PARAMS[type]) as Record<string, unknown>,
      },
    };
    set({ nodes: [...nodes, newNode], dirty: true });
  },

  removeNode: (id) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      dirty: true,
    }));
  },

  updateNodeData: (id, data) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...(n.data as FlowNodeData), ...data } } : n,
      ),
      dirty: true,
    }));
  },

  addEdge: (source, target) => {
    get().pushHistory();
    const edge: Edge = {
      id: `e-${generateId()}`,
      source,
      target,
      type: 'animated',
    };
    set((state) => ({ edges: [...state.edges, edge], dirty: true }));
  },

  removeEdge: (id) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      dirty: true,
    }));
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  loadFromModel: (model) => {
    const nodes: Node<FlowNodeData>[] = model.nodes.map((sn, i) => ({
      id: sn.id,
      type: sn.type,
      position: { x: 250 * i, y: 100 },
      data: {
        nodeType: sn.type as NodeTypeKey,
        label: sn.label ?? sn.type,
        params: sn.params as Record<string, unknown>,
      },
    }));

    const edges: Edge[] = model.edges.map((se) => ({
      id: se.id,
      source: se.from,
      target: se.to,
      type: 'animated',
    }));

    set({
      nodes,
      edges,
      selectedNodeId: null,
      dirty: false,
      history: [],
      historyIndex: -1,
    });
  },

  toProcessModel: (modelId, modelName) => {
    const { nodes, edges } = get();

    const simNodes: SimNode[] = nodes.map((n) => {
      const d = n.data as FlowNodeData;
      return {
        id: n.id,
        type: d.nodeType,
        label: d.label,
        params: d.params,
      } as SimNode;
    });

    const simEdges: SimEdge[] = edges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
    }));

    return {
      id: modelId,
      name: modelName,
      nodes: simNodes,
      edges: simEdges,
      config: {
        seed: 42,
        duration: 480,
        timeUnit: 'min' as const,
        warmupPeriod: 60,
      },
    };
  },

  markClean: () => {
    set({ dirty: false });
  },

  setBottleneckNodes: (ids) => {
    set({ bottleneckNodeIds: new Set(ids) });
  },

  canUndo: () => {
    return get().historyIndex >= 0;
  },

  canRedo: () => {
    const { historyIndex, history } = get();
    return historyIndex < history.length - 1;
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const entry: HistoryEntry = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < 0) return;
    const entry = history[historyIndex];
    set({
      nodes: structuredClone(entry.nodes),
      edges: structuredClone(entry.edges),
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const nextEntry = history[historyIndex + 1];
    set({
      nodes: structuredClone(nextEntry.nodes),
      edges: structuredClone(nextEntry.edges),
      historyIndex: historyIndex + 1,
    });
  },
}));
