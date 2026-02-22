import { create } from 'zustand';
import type { SimResult, SimConfig } from '@/lib/validation';
import * as api from '@/api/client';

type SimStatus = 'idle' | 'pending' | 'running' | 'done' | 'error';

interface SimState {
  runId: string | null;
  status: SimStatus;
  progress: number;
  result: SimResult | null;
  error: string | null;

  // Actions
  startSimulation: (
    scenarioId: string,
    config?: Partial<SimConfig>,
  ) => Promise<void>;
  pollStatus: () => Promise<void>;
  fetchResults: () => Promise<void>;
  cancelSimulation: () => Promise<void>;
  reset: () => void;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const useSimStore = create<SimState>((set, get) => ({
  runId: null,
  status: 'idle',
  progress: 0,
  result: null,
  error: null,

  startSimulation: async (scenarioId, config) => {
    set({ status: 'pending', progress: 0, result: null, error: null });
    try {
      const res = await api.startSimulation(scenarioId, config ? { config } : undefined);
      set({ runId: res.data.id, status: 'running' });

      // Start polling
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        get().pollStatus();
      }, 1000);
    } catch (err) {
      set({
        status: 'error',
        error:
          err instanceof Error ? err.message : 'Failed to start simulation',
      });
    }
  },

  pollStatus: async () => {
    const { runId } = get();
    if (!runId) return;

    try {
      const res = await api.getSimulationStatus(runId);
      const { status, progress, error } = res.data;

      if (status === 'done') {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        set({ status: 'done', progress: 100 });
        get().fetchResults();
      } else if (status === 'error') {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        set({ status: 'error', error: error ?? 'Simulation failed' });
      } else {
        set({
          status: status === 'pending' ? 'pending' : 'running',
          progress,
        });
      }
    } catch (err) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to poll status',
      });
    }
  },

  fetchResults: async () => {
    const { runId } = get();
    if (!runId) return;

    try {
      const res = await api.getSimulationResults(runId);
      set({ result: res.data });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to fetch results',
      });
    }
  },

  cancelSimulation: async () => {
    const { runId } = get();
    if (!runId) return;

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    try {
      await api.cancelSimulation(runId);
    } catch {
      // Ignore cancel errors
    }
    set({ status: 'idle', progress: 0 });
  },

  reset: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    set({
      runId: null,
      status: 'idle',
      progress: 0,
      result: null,
      error: null,
    });
  },
}));
