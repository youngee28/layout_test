import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { CssVariableToken, VisualElement } from "@/schema/visual_scene";
import {
  buildChartData,
  chartBackground,
  chartTitle,
  computeChartLayout,
  formatValue,
  formatPercent,
  getChartColor,
} from "@/lib/render/chart_helpers";

export function renderPieChart(block: DashboardBlock, dataset: ParsedDataset, _analysis: DatasetAnalysis): VisualElement[] {
  const chartData = buildChartData(block, dataset, { sortBy: "value", maxItems: 8 });
  const layout = computeChartLayout(block, { bottomPadding: 20, topPadding: 52 });
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const legendTop = layout.chartTop + 10;
  const legendItemHeight = 28;
  const circleRadius = 56;

  const elements: VisualElement[] = [
    chartBackground(block),
    chartTitle(block),
  ];

  if (!hasData) {
    elements.push({
      id: `${block.id}-empty`,
      type: "text",
      x: layout.chartLeft,
      y: layout.chartTop + (layout.chartHeight / 2) - 10,
      width: layout.chartWidth,
      text: "No plottable values",
      fontSize: 16,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-muted",
      align: "center",
      role: "annotation",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });

    return elements;
  }

  const summaryCircle: VisualElement = {
    id: `${block.id}-summary-circle`,
    type: "circle",
    x: layout.chartLeft + layout.chartWidth * 0.32,
    y: legendTop + Math.min(chartData.length, 6) * legendItemHeight * 0.5 + circleRadius + 20,
    radius: circleRadius,
    fill: "--accent-soft" as CssVariableToken,
    stroke: "--accent" as CssVariableToken,
    strokeWidth: 2,
    role: "chartBackground",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };

  const totalLabel: VisualElement = {
    id: `${block.id}-total-label`,
    type: "text",
    x: summaryCircle.x - 60,
    y: summaryCircle.y - 12,
    width: 120,
    text: `Total: ${formatValue(total)}`,
    fontSize: 14,
    fontFamily: "--font-geist-sans",
    fontStyle: "bold",
    fill: "--text-primary" as CssVariableToken,
    align: "center",
    role: "dataLabel",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };

  elements.push(summaryCircle, totalLabel);

  if (chartData.length > 0) {
    const topItem = chartData[0];

    elements.push({
      id: `${block.id}-top-category`,
      type: "text",
      x: summaryCircle.x - 60,
      y: summaryCircle.y + 18,
      width: 120,
      text: `${topItem.category}: ${formatPercent(topItem.value, total)}`,
      fontSize: 12,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-secondary",
      align: "center",
      role: "annotation",
      chartId: block.id,
      groupId: block.id,
      dataRef: {
        rowKey: topItem.category,
        field: block.dataBinding?.valueField,
        value: topItem.value,
      },
      editable: true,
      locked: false,
    });
  }

  const legendX = layout.chartLeft + layout.chartWidth * 0.58;
  const maxVisible = Math.min(chartData.length, 8);

  for (let index = 0; index < maxVisible; index += 1) {
    const item = chartData[index];
    const rowY = legendTop + index * legendItemHeight;
    const rowColor = getChartColor(index);

    elements.push(
      {
        id: `${block.id}-legend-marker-${index + 1}`,
        type: "circle",
        x: legendX,
        y: rowY + 6,
        radius: 6,
        fill: rowColor,
        role: "dataMark",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: item.category,
          field: block.dataBinding?.valueField,
          value: item.value,
        },
        editable: true,
        locked: false,
      },
      {
        id: `${block.id}-legend-label-${index + 1}`,
        type: "text",
        x: legendX + 16,
        y: rowY,
        width: Math.max(60, layout.chartWidth * 0.3),
        text: `${item.category} — ${formatValue(item.value)} (${formatPercent(item.value, total)})`,
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fontStyle: "normal",
        fill: "--text-primary",
        role: "legend",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: item.category,
          field: block.dataBinding?.valueField,
          value: item.value,
        },
        editable: true,
        locked: false,
      },
    );
  }

  return elements;
}
