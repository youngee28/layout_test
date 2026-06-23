import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedDataset } from "@/lib/data/parse_csv";
import {
  buildChartData,
  chartBackground,
  chartTitle,
  clampNumber,
  computeBarChartLayout,
  formatValue,
  gridLines,
  truncateLabel,
  type ChartLayout,
} from "@/lib/render/chart_helpers";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_scene";

function createGridLayout(block: DashboardBlock) {
  const barLayout = computeBarChartLayout(block);
  const layout: ChartLayout = {
    chartLeft: barLayout.chartLeft,
    chartRight: barLayout.chartRight,
    chartTop: barLayout.plotTop,
    chartBottom: barLayout.plotBottom,
    chartWidth: barLayout.chartWidth,
    chartHeight: barLayout.plotHeight,
    centerX: barLayout.centerX,
    centerY: barLayout.centerY,
  };

  return {
    barLayout,
    layout,
  };
}

export function renderBarChart(block: DashboardBlock, dataset: ParsedDataset, _analysis: DatasetAnalysis): VisualElement[] {
  const rawData = buildChartData(block, dataset, { sortBy: "none" });
  const needsRankingTreatment =
    block.chartType === "rankingBar" ||
    block.intent === "ranking" ||
    rawData.length > 7 ||
    rawData.some((item) => item.category.length > 8);
  const chartData = buildChartData(block, dataset, {
    sortBy: needsRankingTreatment ? "value" : "none",
    maxItems: 7,
  });
  const maxValue = Math.max(...chartData.map((item) => item.value), 0);
  const minValue = Math.min(...chartData.map((item) => item.value), 0);
  const domainSpan = maxValue - minValue;
  const hasNumericData = chartData.length > 0 && domainSpan > 0;
  const { barLayout, layout } = createGridLayout(block);
  const zeroRatio = hasNumericData ? maxValue / domainSpan : 0;
  const unclampedZeroY = hasNumericData ? layout.chartTop + layout.chartHeight * (1 - zeroRatio) : layout.chartBottom;
  const zeroY = clampNumber(unclampedZeroY, layout.chartTop, layout.chartBottom);
  const slotWidth = chartData.length > 0 ? layout.chartWidth / chartData.length : layout.chartWidth;
  const barWidth = Math.max(12, slotWidth * 0.58);
  const labelGap = 8;
  const valueLabelHeight = 14;
  const canShowEveryCategoryLabel = slotWidth >= 52;
  const categoryLabelStep = slotWidth < 34 ? 3 : slotWidth < 52 ? 2 : 1;

  const elements: VisualElement[] = [
    chartBackground(block),
    chartTitle(block),
    {
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
    },
    ...gridLines(block, layout, 3),
  ];

  if (!hasNumericData) {
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[renderBarChart] layout", {
      chartId: block.id,
      chartTop: layout.chartTop,
      chartBottom: layout.chartBottom,
      plotHeight: layout.chartHeight,
      xAxisLabelTop: barLayout.xAxisLabelTop,
      rankingMode: needsRankingTreatment,
      itemCount: chartData.length,
    });
  }

  chartData.forEach((item, index) => {
    const rawValueHeight = Math.abs(item.value / domainSpan) * layout.chartHeight;
    const cappedValueHeight = Math.min(layout.chartHeight, rawValueHeight);
    const valueField = block.dataBinding?.valueField;
    const barHeight = clampNumber(cappedValueHeight, 2, layout.chartHeight);
    const barX = layout.chartLeft + index * slotWidth + (slotWidth - barWidth) / 2;
    const unclampedBarY = item.value >= 0 ? zeroY - barHeight : zeroY;
    const barY = clampNumber(unclampedBarY, layout.chartTop, layout.chartBottom - barHeight);
    const constrainedBarHeight = Math.min(barHeight, layout.chartBottom - barY);
    const outsideLabelY = barY - labelGap - valueLabelHeight;
    const canPlaceInside = constrainedBarHeight >= valueLabelHeight + 8;
    const shouldPlaceInside = outsideLabelY < layout.chartTop && canPlaceInside;
    const insideLabelY = clampNumber(barY + 4, layout.chartTop + 2, layout.chartBottom - valueLabelHeight - 2);
    const labelY = shouldPlaceInside
      ? insideLabelY
      : clampNumber(outsideLabelY, layout.chartTop + 2, layout.chartBottom - valueLabelHeight - 2);
    const showValueLabel = canPlaceInside || outsideLabelY >= layout.chartTop + 2;
    const categoryLabelY = barLayout.xAxisLabelTop + 6;
    const truncatedCategory = truncateLabel(item.category, 8);
    const showCategoryLabel = canShowEveryCategoryLabel || index % categoryLabelStep === 0;

    if (process.env.NODE_ENV !== "production") {
      console.log("[renderBarChart] bar", {
        chartId: block.id,
        rowKey: item.category,
        chartTop: layout.chartTop,
        chartBottom: layout.chartBottom,
        barY,
        barHeight: constrainedBarHeight,
        labelY: showValueLabel ? labelY : null,
      });
    }

    elements.push({
      id: `${block.id}-bar-${index + 1}`,
      type: "rect",
      x: barX,
      y: barY,
      width: barWidth,
      height: constrainedBarHeight,
      fill: "--accent",
      cornerRadius: 10,
      role: "dataMark",
      chartId: block.id,
      groupId: block.id,
      dataRef: {
        rowKey: item.category,
        field: valueField,
        value: item.value,
      },
      editable: true,
      locked: false,
    });

    if (showValueLabel) {
      elements.push({
        id: `${block.id}-value-${index + 1}`,
        type: "text",
        x: barX - Math.max(10, (slotWidth - barWidth) / 2),
        y: labelY,
        width: Math.max(barWidth + 20, slotWidth),
        text: formatValue(item.value),
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fontStyle: shouldPlaceInside ? "bold" : "normal",
        fill: shouldPlaceInside ? "--surface-card" : "--text-secondary",
        align: "center",
        role: "dataLabel",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: item.category,
          field: valueField,
          value: item.value,
        },
        editable: true,
        locked: false,
      });
    }

    if (showCategoryLabel) {
      elements.push({
        id: `${block.id}-category-${index + 1}`,
        type: "text",
        x: barX - Math.max(10, (slotWidth - barWidth) / 2),
        y: categoryLabelY,
        width: Math.max(barWidth + 20, slotWidth),
        text: truncatedCategory,
        fontSize: 12,
        fontFamily: "--font-geist-sans",
        fontStyle: "normal",
        fill: "--text-primary",
        align: "center",
        role: "dataLabel",
        chartId: block.id,
        groupId: block.id,
        dataRef: {
          rowKey: item.category,
          field: block.dataBinding?.categoryField,
          value: item.category,
        },
        editable: true,
        locked: false,
      });
    }
  });

  return elements;
}
