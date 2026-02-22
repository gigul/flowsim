import { create } from 'zustand';
import type { CompareResult } from '@/lib/validation';
import * as api from '@/api/client';

interface CompareState {
  selectedScenarioIds: string[];
  compareResult: CompareResult | null;
  loading: boolean;
  error: string | null;

  // Actions
  toggleScenario: (id: string) => void;
  runComparison: (projectId: string) => Promise<void>;
  reset: () => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  selectedScenarioIds: [],
  compareResult: null,
  loading: false,
  error: null,

  toggleScenario: (id) => {
    set((state) => {
      const exists = state.selectedScenarioIds.includes(id);
      if (exists) {
        return {
          selectedScenarioIds: state.selectedScenarioIds.filter(
            (sid) => sid !== id,
          ),
        };
      }
      // Max 5 scenarios
      if (state.selectedScenarioIds.length >= 5) return state;
      return {
        selectedScenarioIds: [...state.selectedScenarioIds, id],
      };
    });
  },

  runComparison: async (projectId) => {
    const { selectedScenarioIds } = get();
    if (selectedScenarioIds.length < 2) {
      set({ error: 'Select at least 2 scenarios to compare' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await api.runComparison(projectId, {
        scenarioIds: selectedScenarioIds,
      });
      set({ compareResult: res.data, loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to run comparison',
        loading: false,
      });
    }
  },

  reset: () => {
    set({
      selectedScenarioIds: [],
      compareResult: null,
      loading: false,
      error: null,
    });
  },
}));
