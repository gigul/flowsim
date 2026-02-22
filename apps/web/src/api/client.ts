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
  prefixUrl: API_BASE_URL,
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
    .patch(`projects/${id}`, { json: body })
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
  projectId: string,
  scenarioId: string,
  body: Partial<CreateScenarioRequest>,
): Promise<ApiResponse<Scenario>> {
  return api
    .patch(`projects/${projectId}/scenarios/${scenarioId}`, { json: body })
    .json<ApiResponse<Scenario>>();
}

export async function deleteScenario(
  projectId: string,
  scenarioId: string,
): Promise<void> {
  await api.delete(`projects/${projectId}/scenarios/${scenarioId}`);
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
  await api.post(`simulations/${runId}/cancel`);
}

// ── Compare ───────────────────────────────────────────────────────────

export async function runComparison(
  projectId: string,
  body: CompareRequest,
): Promise<ApiResponse<CompareResult>> {
  return api
    .post(`projects/${projectId}/compare`, { json: body })
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

export async function exportJson(scenarioId: string): Promise<Blob> {
  return api.get(`scenarios/${scenarioId}/export`).blob();
}

export async function importJson(
  projectId: string,
  file: File,
): Promise<ApiResponse<Scenario>> {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post(`projects/${projectId}/import`, {
      body: formData,
      headers: {}, // let browser set Content-Type for multipart
    })
    .json<ApiResponse<Scenario>>();
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
    update: (projectId: string, scenarioId: string, body: Partial<CreateScenarioRequest>) => updateScenario(projectId, scenarioId, body).then((r) => r.data ?? r),
    delete: deleteScenario,
  },
  simulation: {
    start: (scenarioId: string, body?: SimulateRequest) => startSimulation(scenarioId, body).then((r) => r.data ?? r),
    getStatus: (runId: string) => getSimulationStatus(runId).then((r) => r.data ?? r),
    getResults: (runId: string) => getSimulationResults(runId).then((r) => r.data ?? r),
    cancel: cancelSimulation,
  },
  compare: {
    run: (projectId: string, body: CompareRequest) => runComparison(projectId, body).then((r) => r.data ?? r),
  },
  templates: {
    list: () => listTemplates().then((r) => r.data ?? r),
    get: (slug: string) => getTemplate(slug).then((r) => r.data ?? r),
  },
  exportCsv,
  exportJson,
  importJson,
} as const;

export { apiClient as api };
