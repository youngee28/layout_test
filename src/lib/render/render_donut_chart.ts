import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_element";
import {
  buildChartData,
  chartBackground,
  chartTitle,
  computeChartLayout,
  formatValue,
  formatPercent,
  getChartColor,
  resolveTitle,
} from "@/lib/render/chart_helpers";

export function renderDonutChart(block: DashboardBlock, dataset: ParsedDataset, _analysis: DatasetAnalysis): VisualElement[] {
  const chartData = buildChartData(block, dataset, { sortBy: "value", maxItems: 8 });
  const layout = computeChartLayout(block, { bottomPadding: 20, topPadding: 52 });
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const legendTop = layout.chartTop + 10;
  const legendItemHeight = 28;
  const outerRadius = 56;
  const innerRadius = 26;

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
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });

    return elements;
  }

  const centerX = layout.chartLeft + layout.chartWidth * 0.32;
  const centerY = legendTop + Math.min(chartData.length, 6) * legendItemHeight * 0.5 + outerRadius + 20;

  const outerCircle: VisualElement = {
    id: `${block.id}-outer-ring`,
    type: "circle",
    x: centerX,
    y: centerY,
    radius: outerRadius,
    fill: "--accent-soft",
    stroke: "--accent",
    strokeWidth: 4,
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };

  const innerCircle: VisualElement = {
    id: `${block.id}-inner-hole`,
    type: "circle",
    x: centerX,
    y: centerY,
    radius: innerRadius,
    fill: "--surface-card",
    stroke: "--border-strong",
    strokeWidth: 1,
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };

  const kpiValue: VisualElement = {
    id: `${block.id}-kpi-value`,
    type: "text",
    x: centerX - 50,
    y: centerY - 10,
    width: 100,
    text: formatValue(total),
    fontSize: 20,
    fontFamily: "--font-geist-sans",
    fontStyle: "bold",
    fill: "--accent-strong",
    align: "center",
    chartId: block.id,
    groupId: block.id,
    dataRef: {
      field: block.dataBinding?.valueField,
      value: total,
    },
    editable: true,
    locked: false,
  };

  const kpiSubtitle: VisualElement = {
    id: `${block.id}-kpi-subtitle`,
    type: "text",
    x: centerX - 50,
    y: centerY + 14,
    width: 100,
    text: block.dataBinding?.valueField ?? "Total",
    fontSize: 11,
    fontFamily: "--font-geist-sans",
    fontStyle: "normal",
    fill: "--text-muted",
    align: "center",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  };

  elements.push(outerCircle, innerCircle, kpiValue, kpiSubtitle);

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
