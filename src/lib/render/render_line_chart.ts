import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_scene";
import {
  buildLineChartData,
  chartAxis,
  chartBackground,
  chartTitle,
  clampNumber,
  computeChartLayout,
  formatValue,
  getChartColor,
  gridLines,
  truncateLabel,
} from "@/lib/render/chart_helpers";

export function renderLineChart(block: DashboardBlock, dataset: ParsedDataset, _analysis: DatasetAnalysis): VisualElement[] {
  const chartData = buildLineChartData(block, dataset);
  const layout = computeChartLayout(block, { bottomPadding: 48 });
  const hasData = chartData.length >= 2;
  const maxValue = Math.max(...chartData.map((item) => item.value), 0);
  const minValue = Math.min(...chartData.map((item) => item.value), 0);
  const domainSpan = maxValue - minValue;
  const safeDomainSpan = domainSpan === 0 ? 1 : domainSpan;
  const slotWidth = hasData ? layout.chartWidth / chartData.length : layout.chartWidth;
  const canShowEveryCategoryLabel = slotWidth >= 52;
  const categoryLabelStep = slotWidth < 34 ? 3 : slotWidth < 52 ? 2 : 1;
  const canShowEveryValueLabel = slotWidth >= 64;
  const valueLabelStep = slotWidth < 40 ? 3 : slotWidth < 64 ? 2 : 1;
  const valueLabelHeight = 14;
  const labelGap = 8;

  const elements: VisualElement[] = [
    chartBackground(block),
    chartTitle(block),
    chartAxis(block, layout),
    ...gridLines(block, layout, 3),
  ];

  if (!hasData) {
    elements.push({
      id: `${block.id}-empty`,
      type: "text",
      x: layout.chartLeft,
      y: layout.chartTop + layout.chartHeight / 2 - 10,
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

  const pointPositions = chartData.map((item, index) => {
    const x = index * slotWidth + slotWidth / 2;
    const ratio = (item.value - minValue) / safeDomainSpan;
    const y = clampNumber(layout.chartHeight - ratio * layout.chartHeight, 0, layout.chartHeight);

    return { x, y, item };
  });

  const polylinePoints = pointPositions.flatMap((point) => [point.x, point.y]);

  elements.push({
    id: `${block.id}-line`,
    type: "line",
    x: layout.chartLeft,
    y: layout.chartTop,
    width: layout.chartWidth,
    points: polylinePoints,
    stroke: "--accent",
    strokeWidth: 3,
    role: "decoration",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  });

  pointPositions.forEach((point, index) => {
    const absoluteX = layout.chartLeft + point.x;
    const absoluteY = layout.chartTop + point.y;
    const showValueLabel = canShowEveryValueLabel || index % valueLabelStep === 0;
    const showCategoryLabel = canShowEveryCategoryLabel || index % categoryLabelStep === 0;
    const labelY = clampNumber(absoluteY - valueLabelHeight - labelGap, layout.chartTop + 2, layout.chartBottom - valueLabelHeight - 2);
    const labelField = block.dataBinding?.dateField ?? block.dataBinding?.categoryField;

    elements.push({
      id: `${block.id}-point-${index + 1}`,
      type: "circle",
      x: absoluteX,
      y: absoluteY,
      radius: 7,
      fill: getChartColor(index),
      stroke: "--surface-card",
      strokeWidth: 2,
      role: "dataMark",
      chartId: block.id,
      groupId: block.id,
      dataRef: {
        rowKey: point.item.rowKey,
        field: block.dataBinding?.valueField,
        value: point.item.value,
      },
      editable: true,
      locked: false,
    });

    if (showValueLabel) {
      elements.push({
        id: `${block.id}-value-${index + 1}`,
        type: "text",
        x: absoluteX - slotWidth / 2 + 4,
        y: labelY,
        width: Math.max(40, slotWidth - 8),
        text: formatValue(point.item.value),
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fontStyle: "normal",
        fill: "--text-secondary",
        align: "center",
        role: "dataLabel",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: point.item.rowKey,
          field: block.dataBinding?.valueField,
          value: point.item.value,
        },
        editable: true,
        locked: false,
      });
    }

    if (showCategoryLabel) {
      elements.push({
        id: `${block.id}-category-${index + 1}`,
        type: "text",
        x: absoluteX - slotWidth / 2 + 4,
        y: layout.chartBottom + 8,
        width: Math.max(40, slotWidth - 8),
        text: truncateLabel(point.item.label, 8),
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fontStyle: "normal",
        fill: "--text-primary",
        align: "center",
        role: "dataLabel",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: point.item.rowKey,
          field: labelField,
          value: point.item.label,
        },
        editable: true,
        locked: false,
      });
    }
  });

  return elements;
}
