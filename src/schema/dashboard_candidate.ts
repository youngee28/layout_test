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
  goal: string;
  narrative: string;
  sourceTableIds: string[];
  viewpoints: DashboardCandidateViewpoint[];
  layoutStrategy: string;
  blocks: DashboardCandidateBlock[];
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

export function isDashboardCandidate(input: unknown): input is DashboardCandidate {
  const raw = asRecord(input);

  return Boolean(
    raw &&
      typeof raw.id === "string" &&
      typeof raw.title === "string" &&
      typeof raw.summary === "string" &&
      typeof raw.goal === "string" &&
      typeof raw.narrative === "string" &&
      Array.isArray(raw.sourceTableIds) &&
      Array.isArray(raw.viewpoints) &&
      typeof raw.layoutStrategy === "string" &&
      Array.isArray(raw.blocks),
  );
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
      const blocks = Array.isArray(raw.blocks)
        ? raw.blocks
            .map((block, blockIndex) => normalizeBlock(block, blockIndex))
            .filter((block): block is DashboardCandidateBlock => block !== null)
        : [];

      if (blocks.length === 0) {
        return null;
      }

      const viewpoints = Array.isArray(raw.viewpoints)
        ? raw.viewpoints
            .map((viewpoint) => asViewpoint(viewpoint))
            .filter((viewpoint): viewpoint is DashboardCandidateViewpoint => viewpoint !== null)
        : [];

      const preview = normalizePreview(raw.preview);

      return {
        id: asString(raw.id) ?? `candidate-${index + 1}`,
        title,
        summary: asString(raw.summary) ?? `${title} 후보`,
        goal: asString(raw.goal) ?? "핵심 메시지를 빠르게 전달하는 인포그래픽 구성을 제안합니다.",
        narrative: asString(raw.narrative) ?? "핵심 인사이트를 먼저 보여주고 근거 블록으로 이어지는 구조입니다.",
        sourceTableIds: asStringArray(raw.sourceTableIds),
        viewpoints,
        layoutStrategy: asString(raw.layoutStrategy) ?? "hero-first",
        blocks,
        ...(preview ? { preview } : {}),
      } satisfies DashboardCandidate;
    })
    .filter((candidate): candidate is DashboardCandidate => candidate !== null);
}
