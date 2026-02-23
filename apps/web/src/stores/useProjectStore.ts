import { create } from 'zustand';
import type { Project, Scenario } from '@/lib/validation';
import * as api from '@/api/client';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  scenarios: Scenario[];
  currentScenarioId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  fetchScenarios: (projectId: string) => Promise<void>;
  createScenario: (
    projectId: string,
    name: string,
    modelJson: Scenario['modelJson'],
  ) => Promise<Scenario>;
  deleteScenario: (scenarioId: string) => Promise<void>;
  setCurrentScenario: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  scenarios: [],
  currentScenarioId: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.listProjects();
      const projects = Array.isArray(res) ? res : (res as any).data ?? [];
      set({ projects, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch projects',
        loading: false,
      });
    }
  },

  createProject: async (name) => {
    set({ loading: true, error: null });
    try {
      const res = await api.createProject({ name });
      const project = (res as any).data ?? res;
      set((state) => ({
        projects: [...state.projects, project],
        currentProjectId: project.id,
        loading: false,
      }));
      return project;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create project',
        loading: false,
      });
      throw err;
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId:
          state.currentProjectId === id ? null : state.currentProjectId,
        loading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete project',
        loading: false,
      });
    }
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, scenarios: [], currentScenarioId: null });
    if (id) {
      get().fetchScenarios(id);
    }
  },

  fetchScenarios: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.listScenarios(projectId);
      const scenarios = Array.isArray(res) ? res : (res as any).data ?? [];
      set({ scenarios, loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to fetch scenarios',
        loading: false,
      });
    }
  },

  createScenario: async (projectId, name, modelJson) => {
    set({ loading: true, error: null });
    try {
      const res = await api.createScenario(projectId, { name, modelJson });
      const scenario = (res as any).data ?? res;
      set((state) => ({
        scenarios: [...state.scenarios, scenario],
        currentScenarioId: scenario.id,
        loading: false,
      }));
      return scenario;
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to create scenario',
        loading: false,
      });
      throw err;
    }
  },

  deleteScenario: async (scenarioId) => {
    set({ loading: true, error: null });
    try {
      await api.deleteScenario(scenarioId);
      set((state) => ({
        scenarios: state.scenarios.filter((s) => s.id !== scenarioId),
        currentScenarioId:
          state.currentScenarioId === scenarioId
            ? null
            : state.currentScenarioId,
        loading: false,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to delete scenario',
        loading: false,
      });
    }
  },

  setCurrentScenario: (id) => {
    set({ currentScenarioId: id });
  },
}));
