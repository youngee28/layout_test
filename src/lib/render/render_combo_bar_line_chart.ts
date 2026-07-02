import type { ParsedDataset } from "@/lib/data/parse_csv";
import { chartAxis, chartBackground, chartTitle, clampNumber, computeChartLayout, formatValue, gridLines, parseNumericValue, truncateLabel } from "@/lib/render/chart_helpers";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_element";

type ComboDatum = {
  readonly label: string;
  readonly rowKey: string;
  readonly barValue: number;
  readonly lineValue: number;
  readonly sortValue: number;
};

function buildComboData(block: DashboardBlock, dataset: ParsedDataset): ComboDatum[] {
  const labelField = block.dataBinding?.dateField ?? block.dataBinding?.categoryField;
  const barValueField = block.dataBinding?.barValueField;
  const lineValueField = block.dataBinding?.lineValueField;

  if (!labelField || !barValueField || !lineValueField) {
    return [];
  }

  const grouped = new Map<string, ComboDatum>();

  dataset.rows.forEach((row, index) => {
    const label = (row[labelField] ?? "").trim() || `Row ${index + 1}`;
    const barValue = parseNumericValue(row[barValueField]);
    const lineValue = parseNumericValue(row[lineValueField]);

    if (barValue === null || lineValue === null) {
      return;
    }

    const sortValue = block.dataBinding?.dateField ? Date.parse(row[labelField] ?? "") : index;
    const existing = grouped.get(label);

    grouped.set(label, {
      label,
      rowKey: label,
      barValue: (existing?.barValue ?? 0) + barValue,
      lineValue: (existing?.lineValue ?? 0) + lineValue,
      sortValue: existing?.sortValue ?? (Number.isFinite(sortValue) ? sortValue : index),
    });
  });

  return Array.from(grouped.values()).sort((left, right) => left.sortValue - right.sortValue);
}

function emptyState(block: DashboardBlock, elements: VisualElement[], y: number, width: number): VisualElement[] {
  elements.push({
    id: `${block.id}-empty`,
    type: "text",
    x: block.layout.x + 20,
    y,
    width,
    text: "No plottable combo values",
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

export function renderComboBarLineChart(block: DashboardBlock, dataset: ParsedDataset): VisualElement[] {
  const chartData = buildComboData(block, dataset);
  const layout = computeChartLayout(block, { bottomPadding: 56 });
  const elements: VisualElement[] = [
    chartBackground(block),
    chartTitle(block),
    chartAxis(block, layout),
    ...gridLines(block, layout, 3),
  ];

  if (chartData.length < 2) {
    return emptyState(block, elements, layout.chartTop + layout.chartHeight / 2 - 10, layout.chartWidth);
  }

  const maxBarValue = Math.max(...chartData.map((item) => item.barValue), 0);
  const maxLineValue = Math.max(...chartData.map((item) => item.lineValue), 0);

  if (maxBarValue <= 0 || maxLineValue <= 0) {
    return emptyState(block, elements, layout.chartTop + layout.chartHeight / 2 - 10, layout.chartWidth);
  }

  const slotWidth = layout.chartWidth / chartData.length;
  const barWidth = Math.max(12, slotWidth * 0.44);
  const linePoints = chartData.map((item, index) => {
    const x = layout.chartLeft + index * slotWidth + slotWidth / 2;
    const y = layout.chartBottom - (item.lineValue / maxLineValue) * layout.chartHeight;

    return { x, y: clampNumber(y, layout.chartTop, layout.chartBottom), item };
  });

  elements.push(
    {
      id: `${block.id}-bar-legend`,
      type: "text",
      x: layout.chartLeft,
      y: layout.chartTop - 24,
      width: layout.chartWidth / 2,
      text: `Bar: ${block.dataBinding?.barValueField ?? "value"}`,
      fontSize: 12,
      fontFamily: "--font-geist-sans",
      fill: "--accent",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
    {
      id: `${block.id}-line-legend`,
      type: "text",
      x: layout.chartLeft + layout.chartWidth / 2,
      y: layout.chartTop - 24,
      width: layout.chartWidth / 2,
      text: `Line: ${block.dataBinding?.lineValueField ?? "value"}`,
      fontSize: 12,
      fontFamily: "--font-geist-sans",
      fill: "--accent-strong",
      align: "right",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
  );

  chartData.forEach((item, index) => {
    const slotCenterX = layout.chartLeft + index * slotWidth + slotWidth / 2;
    const barHeight = clampNumber((item.barValue / maxBarValue) * layout.chartHeight, 2, layout.chartHeight);
    const barX = slotCenterX - barWidth / 2;
    const barY = layout.chartBottom - barHeight;
    const showLabel = slotWidth >= 48 || index % 2 === 0;

    elements.push({
      id: `${block.id}-bar-${index + 1}`,
      type: "rect",
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      fill: "--accent",
      cornerRadius: 8,
      chartId: block.id,
      groupId: block.id,
      dataRef: {
        rowKey: item.rowKey,
        field: block.dataBinding?.barValueField,
        value: item.barValue,
      },
      editable: true,
      locked: false,
    });

    if (showLabel) {
      elements.push({
        id: `${block.id}-category-${index + 1}`,
        type: "text",
        x: slotCenterX - slotWidth / 2 + 4,
        y: layout.chartBottom + 8,
        width: Math.max(36, slotWidth - 8),
        text: truncateLabel(item.label, 8),
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fill: "--text-primary",
        align: "center",
        chartId: block.id,
        groupId: block.id,
        editable: true,
        locked: false,
      });
    }
  });

  linePoints.forEach((point, index) => {
    const nextPoint = linePoints[index + 1];

    if (nextPoint) {
      const distance = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
      const steps = Math.max(2, Math.ceil(distance / 14));

      for (let step = 1; step < steps; step += 1) {
        const progress = step / steps;

        elements.push({
          id: `${block.id}-line-dot-${index + 1}-${step}`,
          type: "circle",
          x: point.x + (nextPoint.x - point.x) * progress,
          y: point.y + (nextPoint.y - point.y) * progress,
          radius: 2,
          fill: "--accent-strong",
          chartId: block.id,
          groupId: block.id,
          editable: false,
          locked: true,
        });
      }
    }

    elements.push({
      id: `${block.id}-line-point-${index + 1}`,
      type: "circle",
      x: point.x,
      y: point.y,
      radius: 6,
      fill: "--accent-strong",
      stroke: "--surface-card",
      strokeWidth: 2,
      chartId: block.id,
      groupId: block.id,
      dataRef: {
        rowKey: point.item.rowKey,
        field: block.dataBinding?.lineValueField,
        value: point.item.lineValue,
      },
      editable: true,
      locked: false,
    });
  });

  elements.push({
    id: `${block.id}-scale-note`,
    type: "text",
    x: layout.chartLeft,
    y: block.layout.y + block.layout.height - 24,
    width: layout.chartWidth,
    text: `Bar max ${formatValue(maxBarValue)} · line max ${formatValue(maxLineValue)}`,
    fontSize: 11,
    fontFamily: "--font-geist-sans",
    fill: "--text-muted",
    align: "center",
    chartId: block.id,
    groupId: block.id,
    editable: true,
    locked: false,
  });

  return elements;
}
