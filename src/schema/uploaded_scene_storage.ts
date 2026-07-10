import type { ChartRecommendation } from "@/schema/chart_recommendation";
import { isChartRecommendation } from "@/schema/chart_recommendation";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import { isDashboardCandidate } from "@/schema/dashboard_candidate";
import type { DashboardBrief } from "@/schema/dashboard_brief";
import { isDashboardBrief } from "@/schema/dashboard_brief";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionGroup } from "@/schema/table_chart_option";
import { isVisualScene, type VisualScene } from "@/schema/visual_element";

const UPLOADED_SCENE_STORAGE_KEY = "uploaded-scene";

export type CanvasScenePayload = {
  scene?: VisualScene;
  documentContext?: ResolvedDocumentContext;
  resolvedTables?: ResolvedTable[];
  dashboardBriefs?: DashboardBrief[];
  chartOptionsByTable?: TableChartOptionGroup[];
  chartRecommendations?: ChartRecommendation[];
  dashboardCandidates?: DashboardCandidate[];
  generationStage?: "candidates" | "ready";
};

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function isResolvedTable(input: unknown): input is ResolvedTable {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const table = input as Record<string, unknown>;
  const range = table.range;

  return (
    typeof table.id === "string" &&
    (table.kind === "table" || table.kind === "note" || table.kind === "metadata" || table.kind === "titleBlock") &&
    typeof range === "object" &&
    range !== null &&
    Array.isArray(table.columns) &&
    Array.isArray(table.rows) &&
    Array.isArray(table.gridRows)
  );
}

function isDocumentContext(input: unknown): input is ResolvedDocumentContext {
  if (input === undefined) {
    return true;
  }

  if (typeof input !== "object" || input === null) {
    return false;
  }

  const context = input as Record<string, unknown>;

  return (
    (context.title === undefined || typeof context.title === "string") &&
    (context.summary === undefined || typeof context.summary === "string") &&
    Array.isArray(context.tableContexts) &&
    Array.isArray(context.relationships)
  );
}

function isTableChartOptionGroup(input: unknown): input is TableChartOptionGroup {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const group = input as Record<string, unknown>;

  return (
    typeof group.tableId === "string" &&
    (group.tableRole === "primary" ||
      group.tableRole === "supporting" ||
      group.tableRole === "lookup" ||
      group.tableRole === "context") &&
    typeof group.tableSummary === "string" &&
    Array.isArray(group.lenses)
  );
}

export function isCanvasScenePayload(input: unknown): input is CanvasScenePayload {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const payload = input as Record<string, unknown>;

  const sceneValid = payload.scene === undefined || isVisualScene(payload.scene);

  if (!sceneValid) {
    return false;
  }

  const documentContextValid = isDocumentContext(payload.documentContext);

  const resolvedTablesValid =
    payload.resolvedTables === undefined ||
    (Array.isArray(payload.resolvedTables) && payload.resolvedTables.every(isResolvedTable));

  const chartOptionsByTableValid =
    payload.chartOptionsByTable === undefined ||
    (Array.isArray(payload.chartOptionsByTable) && payload.chartOptionsByTable.every(isTableChartOptionGroup));

  const dashboardBriefsValid =
    payload.dashboardBriefs === undefined ||
    (Array.isArray(payload.dashboardBriefs) && payload.dashboardBriefs.every(isDashboardBrief));

  const chartRecommendationsValid =
    payload.chartRecommendations === undefined ||
    (Array.isArray(payload.chartRecommendations) && payload.chartRecommendations.every(isChartRecommendation));

  const dashboardCandidatesValid =
    payload.dashboardCandidates === undefined ||
    (Array.isArray(payload.dashboardCandidates) && payload.dashboardCandidates.every(isDashboardCandidate));

  const generationStageValid =
    payload.generationStage === undefined ||
    payload.generationStage === "candidates" ||
    payload.generationStage === "ready";

  return (
    sceneValid &&
    documentContextValid &&
    resolvedTablesValid &&
    dashboardBriefsValid &&
    chartOptionsByTableValid &&
    chartRecommendationsValid &&
    dashboardCandidatesValid &&
    generationStageValid
  );
}

export function stashUploadedScene(input: unknown): CanvasScenePayload {
  const payload = isCanvasScenePayload(input)
    ? input
    : isVisualScene(input)
      ? { scene: input, generationStage: "ready" as const }
      : null;

  if (!payload) {
    throw new Error("Uploaded scene payload is not valid.");
  }

  const storage = getSessionStorage();
  storage?.setItem(UPLOADED_SCENE_STORAGE_KEY, JSON.stringify(payload));

  return payload;
}

export function readUploadedScenePayload(): CanvasScenePayload | null {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const rawScene = storage.getItem(UPLOADED_SCENE_STORAGE_KEY);

  if (!rawScene) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawScene);

    if (isCanvasScenePayload(parsed)) {
      return parsed;
    }

    if (isVisualScene(parsed)) {
      return { scene: parsed, generationStage: "ready" as const };
    }

    if (typeof parsed === "object" && parsed !== null && "scene" in parsed && isVisualScene((parsed as Record<string, unknown>).scene)) {
      return { scene: (parsed as { scene: VisualScene }).scene, generationStage: "ready" as const };
    }

    storage.removeItem(UPLOADED_SCENE_STORAGE_KEY);
    return null;
  } catch {
    storage.removeItem(UPLOADED_SCENE_STORAGE_KEY);
    return null;
  }
}

export function readUploadedScene(): VisualScene | null {
  return readUploadedScenePayload()?.scene ?? null;
}
