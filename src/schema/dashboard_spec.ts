type UnknownRecord = Record<string, unknown>;

export type ChartType =
  | "bar"
  | "verticalBar"
  | "horizontalBar"
  | "groupedBar"
  | "rankingBar"
  | "line"
  | "scatter"
  | "pie"
  | "donut"
  | "kpi"
  | "comboBarLine";

export type VisualIntent =
  | "trend"
  | "comparison"
  | "share"
  | "ranking"
  | "highlight"
  | "summary";

export type DashboardBlock = {
  id: string;
  type: "text" | "kpi" | "chart" | "note";
  role: "title" | "summary" | "mainChart" | "supportChart" | "highlight" | "insight";
  title?: string;
  message?: string;
  chartType?: ChartType;
  intent?: VisualIntent;
  dataBinding?: {
    tableId?: string;
    categoryField?: string;
    valueField?: string;
    barValueField?: string;
    lineValueField?: string;
    dateField?: string;
    groupField?: string;
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  highlightRules?: Array<{
    target: "max" | "min" | "negative" | "latest" | "custom";
    field?: string;
    label?: string;
    style?: "emphasis" | "warning" | "muted";
  }>;
};

type DashboardHighlightRule = NonNullable<DashboardBlock["highlightRules"]>[number];

export type DashboardSpec = {
  width: number;
  height: number;
  background: string;
  title?: string;
  summary?: string;
  theme?: string;
  blocks: DashboardBlock[];
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asBlockType(value: unknown): DashboardBlock["type"] {
  return value === "text" || value === "kpi" || value === "chart" || value === "note" ? value : "text";
}

function asBlockRole(value: unknown): DashboardBlock["role"] {
  return value === "title" ||
    value === "summary" ||
    value === "mainChart" ||
    value === "supportChart" ||
    value === "highlight" ||
    value === "insight"
    ? value
    : "insight";
}

function asChartType(value: unknown): ChartType | undefined {
  return value === "bar" ||
    value === "verticalBar" ||
    value === "horizontalBar" ||
    value === "groupedBar" ||
    value === "rankingBar" ||
    value === "line" ||
    value === "scatter" ||
    value === "pie" ||
    value === "donut" ||
    value === "kpi" ||
    value === "comboBarLine"
    ? value
    : undefined;
}

function asIntent(value: unknown): VisualIntent | undefined {
  return value === "trend" ||
    value === "comparison" ||
    value === "share" ||
    value === "ranking" ||
    value === "highlight" ||
    value === "summary"
    ? value
    : undefined;
}

function normalizeDataBinding(value: unknown): DashboardBlock["dataBinding"] {
  const raw = asRecord(value);

  if (!raw) {
    return undefined;
  }

  const tableId = asString(raw.tableId);
  const categoryField = asString(raw.categoryField);
  const valueField = asString(raw.valueField);
  const barValueField = asString(raw.barValueField);
  const lineValueField = asString(raw.lineValueField);
  const dateField = asString(raw.dateField);
  const groupField = asString(raw.groupField);

  if (!tableId && !categoryField && !valueField && !barValueField && !lineValueField && !dateField && !groupField) {
    return undefined;
  }

  return {
    tableId,
    categoryField,
    valueField,
    barValueField,
    lineValueField,
    dateField,
    groupField,
  };
}

function normalizeBindingForBlock(block: {
  type: DashboardBlock["type"];
  chartType?: ChartType;
  dataBinding?: DashboardBlock["dataBinding"];
}): DashboardBlock["dataBinding"] {
  const binding = block.dataBinding;

  if (!binding) {
    return undefined;
  }

  if (block.type === "kpi" || block.chartType === "kpi") {
    return binding.tableId && binding.valueField ? binding : undefined;
  }

  if (block.chartType === "line") {
    return binding.tableId && binding.valueField && (binding.dateField || binding.categoryField) ? binding : undefined;
  }

  if (block.chartType === "comboBarLine") {
    return binding.tableId &&
      binding.barValueField &&
      binding.lineValueField &&
      (binding.dateField || binding.categoryField)
      ? binding
      : undefined;
  }

  if (block.chartType === "bar" || block.chartType === "rankingBar" || block.chartType === "pie" || block.chartType === "donut") {
    return binding.tableId && binding.categoryField && binding.valueField ? binding : undefined;
  }

  return binding;
}

function normalizeHighlightRules(value: unknown): DashboardBlock["highlightRules"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rules = value
    .map((entry) => {
      const raw = asRecord(entry);

      if (!raw) {
        return null;
      }

      const target: DashboardHighlightRule["target"] | null =
        raw.target === "max" ||
        raw.target === "min" ||
        raw.target === "negative" ||
        raw.target === "latest" ||
        raw.target === "custom"
          ? raw.target
          : null;

      if (!target) {
        return null;
      }

      const style: DashboardHighlightRule["style"] =
        raw.style === "emphasis" || raw.style === "warning" || raw.style === "muted"
          ? raw.style
          : undefined;

      return {
        target,
        field: asString(raw.field),
        label: asString(raw.label),
        style,
      };
    })
    .filter((rule): rule is NonNullable<typeof rule> => rule !== null);

  return rules.length > 0 ? rules : undefined;
}

function normalizeBlock(value: unknown, index: number): DashboardBlock | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const layout = asRecord(raw.layout);

  if (!layout) {
    return null;
  }

  const type = asBlockType(raw.type);
  const normalizedChartType = asChartType(raw.chartType);
  const chartType =
    type === "kpi"
      ? "kpi"
      : type === "chart"
        ? normalizedChartType
        : undefined;
  const rawDataBinding = type === "chart" || type === "kpi" ? normalizeDataBinding(raw.dataBinding) : undefined;
  const dataBinding = normalizeBindingForBlock({
    type,
    chartType,
    dataBinding: rawDataBinding,
  });
  const highlightRules = type === "chart" || type === "kpi" ? normalizeHighlightRules(raw.highlightRules) : undefined;
  const normalizedType = (type === "chart" || type === "kpi") && !dataBinding ? "note" : type;
  const normalizedChartTypeForOutput = normalizedType === "chart" || normalizedType === "kpi" ? chartType : undefined;
  const normalizedMessage =
    (type === "chart" || type === "kpi") && !dataBinding
      ? asString(raw.message) ?? "This block is missing required table binding fields for its chart type."
      : asString(raw.message);

  return {
    id: asString(raw.id) ?? `block-${index + 1}`,
    type: normalizedType,
    role: asBlockRole(raw.role),
    title: asString(raw.title),
    message: normalizedMessage,
    chartType: normalizedChartTypeForOutput,
    intent: asIntent(raw.intent),
    dataBinding,
    layout: {
      x: asNumber(layout.x, 0),
      y: asNumber(layout.y, 0),
      width: asNumber(layout.width, 240),
      height: asNumber(layout.height, 160),
    },
    highlightRules,
  };
}

export function normalizeDashboardSpec(input: unknown): DashboardSpec {
  const raw = asRecord(input);

  if (!raw) {
    throw new Error("Dashboard spec payload must be an object.");
  }

  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  const blocks = rawBlocks
    .map((block, index) => normalizeBlock(block, index))
    .filter((block): block is DashboardBlock => block !== null);

  if (blocks.length === 0) {
    throw new Error("Dashboard spec payload did not contain any valid blocks.");
  }

  return {
    width: asNumber(raw.width, 960),
    height: asNumber(raw.height, 560),
    background: asString(raw.background) ?? "--surface-card",
    title: asString(raw.title),
    summary: asString(raw.summary),
    theme: asString(raw.theme),
    blocks,
  };
}
