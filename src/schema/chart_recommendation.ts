import type { DashboardSpec } from "@/schema/dashboard_spec";

type UnknownRecord = Record<string, unknown>;

export type ChartRecommendation = {
  id: string;
  tableId: string;
  chartType: "bar" | "rankingBar" | "line" | "kpi" | "comboBarLine";
  intent?: "trend" | "comparison" | "ranking" | "highlight" | "summary" | "share";
  title?: string;
  message?: string;
  usedFields: {
    categoryField?: string;
    valueField?: string;
    barValueField?: string;
    lineValueField?: string;
    dateField?: string;
    groupField?: string;
  };
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

export function isChartRecommendation(input: unknown): input is ChartRecommendation {
  const raw = asRecord(input);

  if (!raw || typeof raw.id !== "string" || typeof raw.tableId !== "string") {
    return false;
  }

  if (!(raw.chartType === "bar" || raw.chartType === "rankingBar" || raw.chartType === "line" || raw.chartType === "kpi" || raw.chartType === "comboBarLine")) {
    return false;
  }

  const usedFields = asRecord(raw.usedFields);

  if (!usedFields) {
    return false;
  }

  return (
    (raw.intent === undefined || raw.intent === "trend" || raw.intent === "comparison" || raw.intent === "ranking" || raw.intent === "highlight" || raw.intent === "summary" || raw.intent === "share") &&
    (raw.title === undefined || typeof raw.title === "string") &&
    (raw.message === undefined || typeof raw.message === "string") &&
    (usedFields.categoryField === undefined || typeof usedFields.categoryField === "string") &&
    (usedFields.valueField === undefined || typeof usedFields.valueField === "string") &&
    (usedFields.barValueField === undefined || typeof usedFields.barValueField === "string") &&
    (usedFields.lineValueField === undefined || typeof usedFields.lineValueField === "string") &&
    (usedFields.dateField === undefined || typeof usedFields.dateField === "string") &&
    (usedFields.groupField === undefined || typeof usedFields.groupField === "string")
  );
}

export function createChartRecommendations(spec: DashboardSpec): ChartRecommendation[] {
  return spec.blocks
    .flatMap((block) => {
      const tableId = block.dataBinding?.tableId;
      const chartType = block.chartType;

      if (!tableId || !chartType) {
        return [];
      }

      if (!(chartType === "bar" || chartType === "rankingBar" || chartType === "line" || chartType === "kpi" || chartType === "comboBarLine")) {
        return [];
      }

      return [{
        id: block.id,
        tableId,
        chartType,
        intent: block.intent,
        title: block.title,
        message: block.message,
        usedFields: {
          categoryField: block.dataBinding?.categoryField,
          valueField: block.dataBinding?.valueField,
          barValueField: block.dataBinding?.barValueField,
          lineValueField: block.dataBinding?.lineValueField,
          dateField: block.dataBinding?.dateField,
          groupField: block.dataBinding?.groupField,
        },
      } satisfies ChartRecommendation];
    });
}
