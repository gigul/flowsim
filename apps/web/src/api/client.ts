import ky from 'ky';
import { API_BASE_URL } from '@/lib/constants';
import type {
  Project,
  Scenario,
  SimulationRun,
  SimResult,
  CompareResult,
  Template,
  ApiResponse,
  ApiListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateScenarioRequest,
  SimulateRequest,
  CompareRequest,
  SimulationStatus,
} from '@/lib/validation';

const api = ky.create({
  prefixUrl: `${API_BASE_URL}/api`,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Projects ──────────────────────────────────────────────────────────

export async function listProjects(): Promise<ApiListResponse<Project>> {
  return api.get('projects').json<ApiListResponse<Project>>();
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  return api.get(`projects/${id}`).json<ApiResponse<Project>>();
}

export async function createProject(
  body: CreateProjectRequest,
): Promise<ApiResponse<Project>> {
  return api.post('projects', { json: body }).json<ApiResponse<Project>>();
}

export async function updateProject(
  id: string,
  body: UpdateProjectRequest,
): Promise<ApiResponse<Project>> {
  return api
    .put(`projects/${id}`, { json: body })
    .json<ApiResponse<Project>>();
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`projects/${id}`);
}

// ── Scenarios ─────────────────────────────────────────────────────────

export async function listScenarios(
  projectId: string,
): Promise<ApiListResponse<Scenario>> {
  return api
    .get(`projects/${projectId}/scenarios`)
    .json<ApiListResponse<Scenario>>();
}

export async function createScenario(
  projectId: string,
  body: CreateScenarioRequest,
): Promise<ApiResponse<Scenario>> {
  return api
    .post(`projects/${projectId}/scenarios`, { json: body })
    .json<ApiResponse<Scenario>>();
}

export async function updateScenario(
  scenarioId: string,
  body: Partial<CreateScenarioRequest>,
): Promise<ApiResponse<Scenario>> {
  return api
    .put(`scenarios/${scenarioId}`, { json: body })
    .json<ApiResponse<Scenario>>();
}

export async function deleteScenario(
  scenarioId: string,
): Promise<void> {
  await api.delete(`scenarios/${scenarioId}`);
}

// ── Simulation ────────────────────────────────────────────────────────

export async function startSimulation(
  scenarioId: string,
  body?: SimulateRequest,
): Promise<ApiResponse<SimulationRun>> {
  return api
    .post(`scenarios/${scenarioId}/simulate`, { json: body ?? {} })
    .json<ApiResponse<SimulationRun>>();
}

export async function getSimulationStatus(
  runId: string,
): Promise<
  ApiResponse<{ status: SimulationStatus; progress: number; error?: string }>
> {
  return api
    .get(`simulations/${runId}/status`)
    .json<
      ApiResponse<{ status: SimulationStatus; progress: number; error?: string }>
    >();
}

export async function getSimulationResults(
  runId: string,
): Promise<ApiResponse<SimResult>> {
  return api.get(`simulations/${runId}/results`).json<ApiResponse<SimResult>>();
}

export async function cancelSimulation(runId: string): Promise<void> {
  await api.delete(`simulations/${runId}`);
}

// ── Compare ───────────────────────────────────────────────────────────

export async function runComparison(
  body: CompareRequest,
): Promise<ApiResponse<CompareResult>> {
  return api
    .post('compare', { json: body })
    .json<ApiResponse<CompareResult>>();
}

// ── Templates ─────────────────────────────────────────────────────────

export async function listTemplates(): Promise<ApiListResponse<Template>> {
  return api.get('templates').json<ApiListResponse<Template>>();
}

export async function getTemplate(
  slug: string,
): Promise<ApiResponse<Template>> {
  return api.get(`templates/${slug}`).json<ApiResponse<Template>>();
}

// ── Export / Import ───────────────────────────────────────────────────

export async function exportCsv(runId: string): Promise<Blob> {
  return api.get(`simulations/${runId}/export/csv`).blob();
}

export async function exportJson(projectId: string): Promise<Blob> {
  return api.get(`projects/${projectId}/export/json`).blob();
}

export async function importJson(
  data: Record<string, unknown>,
): Promise<{ projectId: string; name: string; scenariosImported: number; scenarios: Array<{ id: string; name: string }> }> {
  return api
    .post('projects/import/json', { json: data })
    .json();
}

// Convenience namespace object used by pages/components
export const apiClient = {
  projects: {
    list: () => listProjects().then((r) => r.data ?? r),
    get: (id: string) => getProject(id).then((r) => r.data ?? r),
    create: (body: CreateProjectRequest) => createProject(body).then((r) => r.data ?? r),
    update: (id: string, body: UpdateProjectRequest) => updateProject(id, body).then((r) => r.data ?? r),
    delete: deleteProject,
  },
  scenarios: {
    list: (projectId: string) => listScenarios(projectId).then((r) => r.data ?? r),
    create: (projectId: string, body: CreateScenarioRequest) => createScenario(projectId, body).then((r) => r.data ?? r),
    update: (scenarioId: string, body: Partial<CreateScenarioRequest>) => updateScenario(scenarioId, body).then((r) => r.data ?? r),
    delete: deleteScenario,
  },
  simulation: {
    start: (scenarioId: string, body?: SimulateRequest) => startSimulation(scenarioId, body).then((r) => r.data ?? r),
    getStatus: (runId: string) => getSimulationStatus(runId).then((r) => r.data ?? r),
    getResults: (runId: string) => getSimulationResults(runId).then((r) => r.data ?? r),
    cancel: cancelSimulation,
  },
  compare: {
    run: (body: CompareRequest) => runComparison(body).then((r) => r.data ?? r),
  },
  templates: {
    list: () => listTemplates().then((r) => r.data ?? r),
    get: (slug: string) => getTemplate(slug).then((r) => r.data ?? r),
  },
  export: {
    csv: exportCsv,
    json: exportJson,
  },
  import: {
    json: importJson,
  },
} as const;

export { apiClient as api };
