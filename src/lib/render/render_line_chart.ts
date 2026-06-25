import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_element";
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

function createTrendTrailElements(blockId: string, pointPositions: Array<{ x: number; y: number }>, offsetX: number, offsetY: number): VisualElement[] {
  const trailElements: VisualElement[] = [];

  pointPositions.forEach((point, index) => {
    const nextPoint = pointPositions[index + 1];

    if (!nextPoint) {
      return;
    }

    const distance = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
    const steps = Math.max(2, Math.ceil(distance / 18));

    for (let step = 1; step < steps; step += 1) {
      const progress = step / steps;

      trailElements.push({
        id: `${blockId}-trail-${index + 1}-${step}`,
        type: "circle",
        x: offsetX + point.x + (nextPoint.x - point.x) * progress,
        y: offsetY + point.y + (nextPoint.y - point.y) * progress,
        radius: 2,
        fill: "--accent",
        chartId: blockId,
        groupId: blockId,
        editable: false,
        locked: true,
      });
    }
  });

  return trailElements;
}

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

  elements.push(...createTrendTrailElements(block.id, pointPositions, layout.chartLeft, layout.chartTop));

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
