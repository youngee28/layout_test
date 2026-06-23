import type { ParsedDataset } from "@/lib/data/parse_csv";
import { renderBarChart } from "@/lib/render/render_bar_chart";
import { renderDonutChart } from "@/lib/render/render_donut_chart";
import { renderKpiBlock } from "@/lib/render/render_kpi_block";
import { renderLineChart } from "@/lib/render/render_line_chart";
import { renderPieChart } from "@/lib/render/render_pie_chart";
import type { DashboardBlock, DashboardSpec } from "@/schema/dashboard_spec";
import type { ResolvedTable } from "@/schema/resolved_table";
import type { CssVariableToken, VisualElement, VisualScene } from "@/schema/visual_scene";

type RenderDashboardSpecToSceneParams = {
  spec: DashboardSpec;
  tables: ResolvedTable[];
};

function toSceneToken(value: string | undefined, fallback: CssVariableToken): CssVariableToken {
  if (typeof value === "string" && value.startsWith("--")) {
    return value as CssVariableToken;
  }

  return fallback;
}

function renderTextBlock(block: DashboardBlock): VisualElement[] {
  return [
    {
      id: `${block.id}-text`,
      type: "text",
      x: block.layout.x,
      y: block.layout.y,
      width: block.layout.width,
      text: block.message ?? block.title ?? "",
      fontSize: block.role === "title" ? 32 : 18,
      fontFamily: "--font-geist-sans",
      fontStyle: block.role === "title" ? "bold" : "normal",
      fill: "--text-primary",
      role: block.role === "title" ? "title" : "annotation",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
  ];
}

function renderNoteBlock(block: DashboardBlock): VisualElement[] {
  const elements: VisualElement[] = [
    {
      id: `${block.id}-note-background`,
      type: "rect",
      x: block.layout.x,
      y: block.layout.y,
      width: block.layout.width,
      height: block.layout.height,
      fill: "--accent-soft",
      stroke: "--border-strong",
      strokeWidth: 1,
      cornerRadius: 20,
      role: "decoration",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
  ];

  if (block.title) {
    elements.push({
      id: `${block.id}-note-title`,
      type: "text",
      x: block.layout.x + 18,
      y: block.layout.y + 16,
      width: Math.max(80, block.layout.width - 36),
      text: block.title,
      fontSize: 16,
      fontFamily: "--font-geist-sans",
      fontStyle: "bold",
      fill: "--text-primary",
      role: "annotation",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });
  }

  if (block.message) {
    elements.push({
      id: `${block.id}-note-message`,
      type: "text",
      x: block.layout.x + 18,
      y: block.layout.y + (block.title ? 46 : 18),
      width: Math.max(80, block.layout.width - 36),
      text: block.message,
      fontSize: 14,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-secondary",
      role: "annotation",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });
  }

  return elements;
}

function resolveDataset(block: DashboardBlock, tables: ResolvedTable[]): { dataset: ParsedDataset; table: ResolvedTable } | null {
  const tableId = block.dataBinding?.tableId;

  if (!tableId) {
    return null;
  }

  const table = tables.find((entry) => entry.id === tableId);

  if (!table) {
    return null;
  }

  return {
    table,
    dataset: {
      columns: table.columns,
      rows: table.rows,
    },
  };
}

function canRenderLineBlock(block: DashboardBlock, table: ResolvedTable): boolean {
  const valueField = block.dataBinding?.valueField;
  const xField = block.dataBinding?.dateField ?? block.dataBinding?.categoryField;

  if (!valueField || !xField) {
    return false;
  }

  if (!table.columns.includes(xField) || !table.columns.includes(valueField)) {
    return false;
  }

  const validPointCount = table.rows.filter((row) => {
    const rawValue = row[valueField];
    const rawX = row[xField];
    return typeof rawX === "string" && rawX.trim() && typeof rawValue === "string" && rawValue.trim();
  }).length;

  return table.analysis.numericColumns.includes(valueField) && validPointCount >= 2;
}

function renderBlock(block: DashboardBlock, tables: ResolvedTable[]): VisualElement[] {
  if (block.type === "text") {
    return renderTextBlock(block);
  }

  if (block.type === "note") {
    return renderNoteBlock(block);
  }

  const resolved = resolveDataset(block, tables);

  if ((block.type === "kpi" || block.type === "chart") && !resolved) {
    return renderNoteBlock({
      ...block,
      title: block.title ?? "Unbound table",
      message: block.message ?? "This block could not resolve a valid tableId binding.",
    });
  }

  if (!resolved) {
    return renderNoteBlock(block);
  }

  const { dataset, table } = resolved;

  if (block.type === "kpi" || block.chartType === "kpi") {
    return renderKpiBlock(block, dataset);
  }

  if (block.type === "chart" && (block.chartType === "bar" || block.chartType === "rankingBar")) {
    return renderBarChart(block, dataset, table.analysis);
  }

  if (block.type === "chart" && block.chartType === "line") {
    if (!canRenderLineBlock(block, table)) {
      return renderNoteBlock({
        ...block,
        title: block.title ?? "Line chart unavailable",
        message: block.message ?? "Line chart requires tableId, valueField, and an ordered x-axis field.",
      });
    }

    return renderLineChart(block, dataset, table.analysis);
  }

  if (block.type === "chart" && block.chartType === "pie") {
    return renderPieChart(block, dataset, table.analysis);
  }

  if (block.type === "chart" && block.chartType === "donut") {
    return renderDonutChart(block, dataset, table.analysis);
  }

  return renderNoteBlock({
    ...block,
    title: block.title ?? `Unsupported chart: ${block.chartType ?? "unknown"}`,
    message: block.message ?? "TODO: Add a renderer for this dashboard block type.",
  });
}

export function renderDashboardSpecToScene({ spec, tables }: RenderDashboardSpecToSceneParams): VisualScene {
  const elements = spec.blocks.flatMap((block) => renderBlock(block, tables));

  return {
    width: spec.width,
    height: spec.height,
    background: toSceneToken(spec.background, "--surface-card"),
    elements,
  };
}
