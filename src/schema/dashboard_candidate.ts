import { normalizeSvgPreview } from "@/lib/svg/normalize_svg_preview";
import type { ChartType } from "@/schema/dashboard_spec";

type UnknownRecord = Record<string, unknown>;

export type DashboardCandidateViewpoint =
  | "comparison"
  | "trend"
  | "composition"
  | "distribution"
  | "flow"
  | "correlation"
  | "ranking"
  | "highlight"
  | "summary";

export type DashboardCandidatePlanningViewpoint =
  | "main_overview"
  | "relationship"
  | "detail_breakdown";

export type DashboardCandidateBlockRole =
  | "hero"
  | "support"
  | "evidence"
  | "annotation"
  | "detail"
  | "closure";

export type DashboardCandidateBlockPriority = "high" | "medium" | "low";

export type DashboardCandidateBlockType = "chart" | "metric";

export type DashboardCandidatePreviewIcon =
  | "kpi"
  | "bar"
  | "verticalBar"
  | "horizontalBar"
  | "groupedBar"
  | "rankingBar"
  | "line"
  | "pie"
  | "donut"
  | "scatter";

export type DashboardCandidateVisualizationChartType =
  | DashboardCandidatePreviewIcon
  | "matrix"
  | "funnel"
  | "area"
  | "tableSummary";

export type DashboardCandidateVisualizationIntent =
  | "comparison"
  | "trend"
  | "composition"
  | "stage_change"
  | "relationship"
  | "ranking"
  | "summary";

export type DashboardCandidateVisualizationSuitability = "high" | "medium" | "low";

export type DashboardCandidateVisualizationFields = {
  categoryField?: string;
  valueField?: string;
  dateField?: string;
  groupField?: string;
  xField?: string;
  yField?: string;
};

export type DashboardCandidateVisualizationOption = {
  id: string;
  tableId: string;
  chartType: DashboardCandidateVisualizationChartType;
  intent: DashboardCandidateVisualizationIntent;
  fields: DashboardCandidateVisualizationFields;
  reason: string;
  suitability?: DashboardCandidateVisualizationSuitability;
};

export type DashboardCandidatePreviewBlock = {
  id: string;
  previewLabel: string;
  previewIcon: DashboardCandidatePreviewIcon;
  role: DashboardCandidateBlockRole;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DashboardCandidatePreview = {
  headline?: string;
  chips: string[];
  blocks: DashboardCandidatePreviewBlock[];
};

export type DashboardCandidateSvgPreview = {
  markup: string;
  width: number;
  height: number;
  viewBox: string;
};

export type DashboardCandidateBlock = {
  id: string;
  title: string;
  description?: string;
  role: DashboardCandidateBlockRole;
  priority: DashboardCandidateBlockPriority;
  type: DashboardCandidateBlockType;
  chartType?: ChartType | "scatter" | "area";
  dataBinding?: {
    tableId?: string;
    categoryField?: string;
    valueField?: string;
    dateField?: string;
    groupField?: string;
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type DashboardCandidate = {
  id: string;
  title: string;
  summary: string;
  designIntent: string;
  svgPreview?: DashboardCandidateSvgPreview;
  usedFields?: string[];
  notes?: string[];
  goal?: string;
  narrative?: string;
  question?: string;
  viewpoint?: DashboardCandidatePlanningViewpoint;
  sourceTableIds?: string[];
  mainTableId?: string;
  supportingTableIds?: string[];
  visualizationPlan?: DashboardCandidateVisualizationOption[];
  contextUsage?: string;
  viewpoints?: DashboardCandidateViewpoint[];
  layoutStrategy?: string;
  blocks?: DashboardCandidateBlock[];
  preview?: DashboardCandidatePreview;
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function asViewpoint(value: unknown): DashboardCandidateViewpoint | null {
  return value === "comparison" ||
    value === "trend" ||
    value === "composition" ||
    value === "distribution" ||
    value === "flow" ||
    value === "correlation" ||
    value === "ranking" ||
    value === "highlight" ||
    value === "summary"
    ? value
    : null;
}

function asPlanningViewpoint(value: unknown): DashboardCandidatePlanningViewpoint | undefined {
  return value === "main_overview" || value === "relationship" || value === "detail_breakdown" ? value : undefined;
}

function asVisualizationChartType(value: unknown): DashboardCandidateVisualizationChartType | undefined {
  return value === "kpi" ||
    value === "bar" ||
    value === "verticalBar" ||
    value === "horizontalBar" ||
    value === "groupedBar" ||
    value === "rankingBar" ||
    value === "line" ||
    value === "pie" ||
    value === "donut" ||
    value === "scatter" ||
    value === "matrix" ||
    value === "funnel" ||
    value === "area" ||
    value === "tableSummary"
    ? value
    : undefined;
}

function asVisualizationIntent(value: unknown): DashboardCandidateVisualizationIntent | undefined {
  return value === "comparison" ||
    value === "trend" ||
    value === "composition" ||
    value === "stage_change" ||
    value === "relationship" ||
    value === "ranking" ||
    value === "summary"
    ? value
    : undefined;
}

function asVisualizationSuitability(value: unknown): DashboardCandidateVisualizationSuitability | undefined {
  return value === "high" || value === "medium" || value === "low" ? value : undefined;
}

function asRole(value: unknown): DashboardCandidateBlockRole {
  return value === "hero" ||
    value === "support" ||
    value === "evidence" ||
    value === "annotation" ||
    value === "detail" ||
    value === "closure"
    ? value
    : "support";
}

function asPriority(value: unknown): DashboardCandidateBlockPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function asBlockType(value: unknown): DashboardCandidateBlockType {
  if (value === "chart" || value === "metric") {
    return value;
  }

  return "chart";
}

function asChartType(value: unknown): DashboardCandidateBlock["chartType"] {
  return value === "bar" ||
    value === "verticalBar" ||
    value === "horizontalBar" ||
    value === "groupedBar" ||
    value === "rankingBar" ||
    value === "line" ||
    value === "scatter" ||
    value === "pie" ||
    value === "donut" ||
    value === "kpi"
    ? value
    : undefined;
}

function asPreviewIcon(value: unknown): DashboardCandidatePreviewIcon | undefined {
  return value === "kpi" ||
    value === "bar" ||
    value === "verticalBar" ||
    value === "horizontalBar" ||
    value === "groupedBar" ||
    value === "rankingBar" ||
    value === "line" ||
    value === "pie" ||
    value === "donut" ||
    value === "scatter"
    ? value
    : undefined;
}

function normalizeLayout(value: unknown) {
  const raw = asRecord(value);

  if (!raw) {
    return {
      x: 0,
      y: 0,
      width: 50,
      height: 20,
    };
  }

  const x = Math.min(Math.max(asNumber(raw.x, 0), 0), 100);
  const y = Math.min(Math.max(asNumber(raw.y, 0), 0), 100);
  const width = Math.min(Math.max(asNumber(raw.width, 50), 8), 100);
  const height = Math.min(Math.max(asNumber(raw.height, 20), 8), 100);

  return { x, y, width, height };
}

function normalizeDataBinding(value: unknown): DashboardCandidateBlock["dataBinding"] {
  const raw = asRecord(value);

  if (!raw) {
    return undefined;
  }

  const binding = {
    tableId: asString(raw.tableId),
    categoryField: asString(raw.categoryField),
    valueField: asString(raw.valueField),
    dateField: asString(raw.dateField),
    groupField: asString(raw.groupField),
  };

  return Object.values(binding).some(Boolean) ? binding : undefined;
}

function normalizeVisualizationFields(value: unknown): DashboardCandidateVisualizationFields {
  const raw = asRecord(value);

  if (!raw) {
    return {};
  }

  return {
    ...(asString(raw.categoryField) ? { categoryField: asString(raw.categoryField) } : {}),
    ...(asString(raw.valueField) ? { valueField: asString(raw.valueField) } : {}),
    ...(asString(raw.dateField) ? { dateField: asString(raw.dateField) } : {}),
    ...(asString(raw.groupField) ? { groupField: asString(raw.groupField) } : {}),
    ...(asString(raw.xField) ? { xField: asString(raw.xField) } : {}),
    ...(asString(raw.yField) ? { yField: asString(raw.yField) } : {}),
  };
}

function normalizePreviewBlock(value: unknown, index: number): DashboardCandidatePreviewBlock | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const previewIcon = asPreviewIcon(raw.previewIcon);
  const previewLabel = asString(raw.previewLabel);

  if (!previewIcon || !previewLabel) {
    return null;
  }

  return {
    id: asString(raw.id) ?? `candidate-preview-block-${index + 1}`,
    previewLabel: previewLabel.slice(0, 12),
    previewIcon,
    role: asRole(raw.role),
    x: Math.min(Math.max(asNumber(raw.x, 0), 0), 100),
    y: Math.min(Math.max(asNumber(raw.y, 0), 0), 100),
    width: Math.min(Math.max(asNumber(raw.width, 24), 8), 100),
    height: Math.min(Math.max(asNumber(raw.height, 18), 8), 100),
  };
}

function normalizePreview(value: unknown): DashboardCandidatePreview | undefined {
  const raw = asRecord(value);

  if (!raw) {
    return undefined;
  }

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .map((block, blockIndex) => normalizePreviewBlock(block, blockIndex))
        .filter((block): block is DashboardCandidatePreviewBlock => block !== null)
    : [];

  if (blocks.length === 0) {
    return undefined;
  }

  return {
    headline: asString(raw.headline),
    chips: asStringArray(raw.chips),
    blocks,
  };
}

function normalizeSvgPreviewValue(value: unknown): DashboardCandidateSvgPreview | undefined {
  if (typeof value === "string") {
    return normalizeSvgPreview(value) ?? undefined;
  }

  const raw = asRecord(value);

  if (!raw) {
    return undefined;
  }

  const markup = asString(raw.markup);

  if (!markup) {
    return undefined;
  }

  return normalizeSvgPreview(markup) ?? undefined;
}

function normalizeBlock(value: unknown, index: number): DashboardCandidateBlock | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const title = asString(raw.title) ?? `Block ${index + 1}`;

  return {
    id: asString(raw.id) ?? `candidate-block-${index + 1}`,
    title,
    description: asString(raw.description) ?? asString(raw.message),
    role: asRole(raw.role),
    priority: asPriority(raw.priority),
    type: asBlockType(raw.type),
    chartType: asChartType(raw.chartType),
    dataBinding: normalizeDataBinding(raw.dataBinding),
    layout: normalizeLayout(raw.layout),
  };
}

function normalizeVisualizationOption(value: unknown, index: number): DashboardCandidateVisualizationOption | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const tableId = asString(raw.tableId);
  const chartType = asVisualizationChartType(raw.chartType);
  const intent = asVisualizationIntent(raw.intent);
  const reason = asString(raw.reason);

  if (!tableId || !chartType || !intent || !reason) {
    return null;
  }

  return {
    id: asString(raw.id) ?? `visualization-option-${index + 1}`,
    tableId,
    chartType,
    intent,
    fields: normalizeVisualizationFields(raw.fields),
    reason,
    ...(asVisualizationSuitability(raw.suitability)
      ? { suitability: asVisualizationSuitability(raw.suitability) }
      : {}),
  };
}

export function isDashboardCandidate(input: unknown): input is DashboardCandidate {
  const raw = asRecord(input);

  if (
    !raw ||
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.summary !== "string" ||
    typeof raw.designIntent !== "string"
  ) {
    return false;
  }

  const hasValidSvgPreview = normalizeSvgPreviewValue(raw.svgPreview) !== undefined;
  const hasValidBlocks = Array.isArray(raw.blocks);

  return hasValidSvgPreview || hasValidBlocks;
}

export function normalizeDashboardCandidates(input: unknown): DashboardCandidate[] {
  if (!Array.isArray(input)) {
    throw new Error("Dashboard candidates payload must be an array.");
  }

  return input
    .map((entry, index) => {
      const raw = asRecord(entry);

      if (!raw) {
        return null;
      }

      const title = asString(raw.title) ?? `Infographic candidate ${index + 1}`;
      const designIntent = asString(raw.designIntent);

      if (!designIntent) {
        return null;
      }

      const blocks = Array.isArray(raw.blocks)
        ? raw.blocks
            .map((block, blockIndex) => normalizeBlock(block, blockIndex))
            .filter((block): block is DashboardCandidateBlock => block !== null)
        : [];
      const svgPreview = normalizeSvgPreviewValue(raw.svgPreview ?? raw.svgMarkup);

      const viewpoints = Array.isArray(raw.viewpoints)
        ? raw.viewpoints
            .map((viewpoint) => asViewpoint(viewpoint))
            .filter((viewpoint): viewpoint is DashboardCandidateViewpoint => viewpoint !== null)
        : [];

      const preview = normalizePreview(raw.preview);
      const visualizationPlan = Array.isArray(raw.visualizationPlan)
        ? raw.visualizationPlan
            .map((option, optionIndex) => normalizeVisualizationOption(option, optionIndex))
            .filter((option): option is DashboardCandidateVisualizationOption => option !== null)
        : [];

      if (!svgPreview && blocks.length === 0) {
        return null;
      }

      return {
        id: asString(raw.id) ?? `candidate-${index + 1}`,
        title,
        summary: asString(raw.summary) ?? `${title} 후보`,
        designIntent,
        ...(svgPreview ? { svgPreview } : {}),
        ...(asStringArray(raw.usedFields).length > 0 ? { usedFields: asStringArray(raw.usedFields) } : {}),
        ...(asStringArray(raw.notes).length > 0 ? { notes: asStringArray(raw.notes) } : {}),
        ...(asString(raw.goal) ? { goal: asString(raw.goal) } : {}),
        ...(asString(raw.narrative) ? { narrative: asString(raw.narrative) } : {}),
        ...(asString(raw.question) ? { question: asString(raw.question) } : {}),
        ...(asPlanningViewpoint(raw.viewpoint) ? { viewpoint: asPlanningViewpoint(raw.viewpoint) } : {}),
        ...(asStringArray(raw.sourceTableIds).length > 0 ? { sourceTableIds: asStringArray(raw.sourceTableIds) } : {}),
        ...(asString(raw.mainTableId) ? { mainTableId: asString(raw.mainTableId) } : {}),
        ...(asStringArray(raw.supportingTableIds).length > 0
          ? { supportingTableIds: asStringArray(raw.supportingTableIds) }
          : {}),
        ...(visualizationPlan.length > 0 ? { visualizationPlan } : {}),
        ...(asString(raw.contextUsage) ? { contextUsage: asString(raw.contextUsage) } : {}),
        ...(viewpoints.length > 0 ? { viewpoints } : {}),
        ...(asString(raw.layoutStrategy) ? { layoutStrategy: asString(raw.layoutStrategy) } : {}),
        ...(blocks.length > 0 ? { blocks } : {}),
        ...(preview ? { preview } : {}),
      } satisfies DashboardCandidate;
    })
    .filter((candidate): candidate is DashboardCandidate => candidate !== null);
}
