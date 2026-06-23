import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement, CssVariableToken } from "@/schema/visual_scene";

export function parseNumericValue(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const numeric = Number(normalized);

  return Number.isFinite(numeric) ? numeric : null;
}

export function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function truncateLabel(value: string, maxLength = 8): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}

export type ChartDatum = {
  category: string;
  value: number;
};

export type LineChartDatum = {
  label: string;
  value: number;
  rowKey: string;
  sortValue: number;
};

export function buildChartData(
  block: DashboardBlock,
  dataset: ParsedDataset,
  options?: {
    sortBy?: "value" | "none";
    maxItems?: number;
  },
): ChartDatum[] {
  const categoryField = block.dataBinding?.categoryField;
  const valueField = block.dataBinding?.valueField;

  if (!categoryField || !valueField) {
    return [];
  }

  const grouped = new Map<string, number>();

  dataset.rows.forEach((row, index) => {
    const category = (row[categoryField] ?? "").trim() || `Row ${index + 1}`;
    const value = parseNumericValue(row[valueField]);

    if (value === null) {
      return;
    }

    grouped.set(category, (grouped.get(category) ?? 0) + value);
  });

  let items = Array.from(grouped.entries()).map(([category, value]) => ({ category, value }));

  if (options?.sortBy === "value") {
    items.sort((left, right) => right.value - left.value);
  }

  if (options?.maxItems && items.length > options.maxItems) {
    const othersSum = items.slice(options.maxItems - 1).reduce((sum, item) => sum + item.value, 0);
    items = items.slice(0, options.maxItems - 1);

    if (othersSum > 0) {
      items.push({ category: "Others", value: othersSum });
    }
  }

  return items;
}

export function buildLineChartData(block: DashboardBlock, dataset: ParsedDataset): LineChartDatum[] {
  const valueField = block.dataBinding?.valueField;
  const dateField = block.dataBinding?.dateField;
  const categoryField = block.dataBinding?.categoryField;
  const labelField = dateField ?? categoryField;

  if (!valueField || !labelField) {
    return [];
  }

  const items = dataset.rows
    .map((row, index) => {
      const label = (row[labelField] ?? "").trim() || `Row ${index + 1}`;
      const value = parseNumericValue(row[valueField]);

      if (value === null) {
        return null;
      }

      const sortValue = dateField
        ? Date.parse(row[dateField] ?? "")
        : index;

      return {
        label,
        value,
        rowKey: label,
        sortValue: Number.isFinite(sortValue) ? sortValue : index,
      } satisfies LineChartDatum;
    })
    .filter((item): item is LineChartDatum => item !== null);

  items.sort((left, right) => left.sortValue - right.sortValue);

  return items;
}

export function resolveTitle(block: DashboardBlock): string {
  if (block.title) {
    return block.title;
  }

  const categoryField = block.dataBinding?.categoryField ?? block.dataBinding?.dateField ?? "Category";
  const valueField = block.dataBinding?.valueField ?? "Value";

  return `${valueField} by ${categoryField}`;
}

export type ChartLayout = {
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
  chartWidth: number;
  chartHeight: number;
  centerX: number;
  centerY: number;
};

export type BarChartLayout = {
  chartLeft: number;
  chartRight: number;
  chartWidth: number;
  titleTop: number;
  titleHeight: number;
  topLabelAreaHeight: number;
  plotTop: number;
  plotBottom: number;
  plotHeight: number;
  xAxisLabelTop: number;
  xAxisLabelHeight: number;
  noteAreaTop: number;
  noteAreaHeight: number;
  centerX: number;
  centerY: number;
};

const DEFAULT_TOP_PADDING = 20;
const DEFAULT_SIDE_PADDING = 20;
const DEFAULT_BOTTOM_PADDING = 48;
const TITLE_HEIGHT = 26;

export function computeChartLayout(
  block: DashboardBlock,
  overrides?: {
    topPadding?: number;
    sidePadding?: number;
    bottomPadding?: number;
  },
): ChartLayout {
  const topPadding = overrides?.topPadding ?? DEFAULT_TOP_PADDING;
  const sidePadding = overrides?.sidePadding ?? DEFAULT_SIDE_PADDING;
  const bottomPadding = overrides?.bottomPadding ?? DEFAULT_BOTTOM_PADDING;

  const chartLeft = block.layout.x + sidePadding;
  const chartRight = block.layout.x + block.layout.width - sidePadding;
  const chartTop = block.layout.y + topPadding + TITLE_HEIGHT + 12;
  const chartBottom = block.layout.y + block.layout.height - bottomPadding;
  const chartWidth = Math.max(40, chartRight - chartLeft);
  const chartHeight = Math.max(40, chartBottom - chartTop);

  return {
    chartLeft,
    chartRight,
    chartTop,
    chartBottom,
    chartWidth,
    chartHeight,
    centerX: block.layout.x + block.layout.width / 2,
    centerY: block.layout.y + block.layout.height / 2,
  };
}

export function computeBarChartLayout(block: DashboardBlock): BarChartLayout {
  const sidePadding = 20;
  const titleTop = block.layout.y + 20;
  const titleHeight = 26;
  const topLabelAreaHeight = 24;
  const xAxisLabelHeight = 34;
  const noteAreaHeight = 0;
  const chartLeft = block.layout.x + sidePadding;
  const chartRight = block.layout.x + block.layout.width - sidePadding;
  const chartWidth = Math.max(40, chartRight - chartLeft);
  const plotTop = titleTop + titleHeight + 16 + topLabelAreaHeight;
  const noteAreaTop = block.layout.y + block.layout.height - noteAreaHeight;
  const xAxisLabelTop = noteAreaTop - xAxisLabelHeight;
  const plotBottom = xAxisLabelTop - 10;
  const plotHeight = Math.max(40, plotBottom - plotTop);

  return {
    chartLeft,
    chartRight,
    chartWidth,
    titleTop,
    titleHeight,
    topLabelAreaHeight,
    plotTop,
    plotBottom,
    plotHeight,
    xAxisLabelTop,
    xAxisLabelHeight,
    noteAreaTop,
    noteAreaHeight,
    centerX: block.layout.x + block.layout.width / 2,
    centerY: block.layout.y + block.layout.height / 2,
  };
}

export function chartBackground(block: DashboardBlock): VisualElement {
  return {
    id: `${block.id}-background`,
    type: "rect",
    x: block.layout.x,
    y: block.layout.y,
    width: block.layout.width,
    height: block.layout.height,
    fill: "--surface-card",
    stroke: "--border-strong",
    strokeWidth: 1,
    cornerRadius: 24,
    role: "chartBackground",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };
}

export function chartTitle(block: DashboardBlock): VisualElement {
  return {
    id: `${block.id}-title`,
    type: "text",
    x: block.layout.x + DEFAULT_SIDE_PADDING,
    y: block.layout.y + DEFAULT_TOP_PADDING,
    width: Math.max(80, block.layout.width - DEFAULT_SIDE_PADDING * 2),
    text: resolveTitle(block),
    fontSize: 18,
    fontFamily: "--font-geist-sans",
    fontStyle: "bold",
    fill: "--text-primary",
    role: "chartTitle",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };
}

export function chartAxis(block: DashboardBlock, layout: ChartLayout): VisualElement {
  return {
    id: `${block.id}-axis`,
    type: "line",
    x: layout.chartLeft,
    y: layout.chartBottom,
    width: layout.chartWidth,
    stroke: "--border-strong",
    strokeWidth: 2,
    role: "axis",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };
}

export function gridLines(
  block: DashboardBlock,
  layout: ChartLayout,
  count: number,
): VisualElement[] {
  const lines: VisualElement[] = [];

  for (let index = 1; index <= count; index += 1) {
    const fraction = index / (count + 1);

    lines.push({
      id: `${block.id}-grid-${index}`,
      type: "line",
      x: layout.chartLeft,
      y: layout.chartTop + layout.chartHeight * fraction,
      width: layout.chartWidth,
      stroke: "--border-strong",
      strokeWidth: 1,
      role: "grid",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });
  }

  return lines;
}

const CHART_COLORS: CssVariableToken[] = [
  "--accent",
  "--accent-strong",
  "--accent-soft",
  "--text-primary",
  "--text-secondary",
];

export function getChartColor(index: number): CssVariableToken {
  return CHART_COLORS[index % CHART_COLORS.length];
}
