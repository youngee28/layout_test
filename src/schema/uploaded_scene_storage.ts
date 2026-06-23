import type { ChartRecommendation } from "@/schema/chart_recommendation";
import { isChartRecommendation } from "@/schema/chart_recommendation";
import type { ResolvedTable } from "@/schema/resolved_table";
import { isVisualScene, type VisualScene } from "@/schema/visual_scene";

const UPLOADED_SCENE_STORAGE_KEY = "uploaded-scene";

export type CanvasScenePayload = {
  scene: VisualScene;
  resolvedTables?: ResolvedTable[];
  chartRecommendations?: ChartRecommendation[];
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

export function isCanvasScenePayload(input: unknown): input is CanvasScenePayload {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const payload = input as Record<string, unknown>;

  if (!isVisualScene(payload.scene)) {
    return false;
  }

  const resolvedTablesValid =
    payload.resolvedTables === undefined ||
    (Array.isArray(payload.resolvedTables) && payload.resolvedTables.every(isResolvedTable));

  const chartRecommendationsValid =
    payload.chartRecommendations === undefined ||
    (Array.isArray(payload.chartRecommendations) && payload.chartRecommendations.every(isChartRecommendation));

  return resolvedTablesValid && chartRecommendationsValid;
}

export function stashUploadedScene(input: unknown): CanvasScenePayload {
  const payload = isCanvasScenePayload(input)
    ? input
    : isVisualScene(input)
      ? { scene: input }
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
      return { scene: parsed };
    }

    if (typeof parsed === "object" && parsed !== null && "scene" in parsed && isVisualScene((parsed as Record<string, unknown>).scene)) {
      return { scene: (parsed as { scene: VisualScene }).scene };
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
