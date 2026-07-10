import type {
  DashboardCandidateVisualizationChartType,
  DashboardCandidateVisualizationIntent,
} from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionFields, TableChartOptionPriority, TableChartOptionSuitability } from "@/schema/table_chart_option";
import type {
  DashboardBriefChartRoleType,
  DashboardBriefKpiAggregation,
  DashboardBriefKpiRole,
  DashboardBriefPurposeType,
} from "@/schema/dashboard_brief_types";

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
}

export function asPurposeType(value: unknown): DashboardBriefPurposeType {
  return value === "executive_overview" ||
    value === "performance_monitoring" ||
    value === "diagnostic_analysis" ||
    value === "segment_comparison" ||
    value === "trend_monitoring" ||
    value === "detail_breakdown" ||
    value === "relationship_analysis"
    ? value
    : "executive_overview";
}

export function asPriority(value: unknown): TableChartOptionPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

export function asSuitability(value: unknown): TableChartOptionSuitability {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

export function asKpiRole(value: unknown): DashboardBriefKpiRole {
  return value === "primary" || value === "supporting" || value === "diagnostic" || value === "context"
    ? value
    : "supporting";
}

export function asKpiAggregation(value: unknown): DashboardBriefKpiAggregation {
  return value === "sum" ||
    value === "average" ||
    value === "count" ||
    value === "min" ||
    value === "max" ||
    value === "latest" ||
    value === "ratio" ||
    value === "none"
    ? value
    : "none";
}

export function asChartRole(value: unknown): DashboardBriefChartRoleType {
  return value === "summary" ||
    value === "trend" ||
    value === "breakdown" ||
    value === "ranking" ||
    value === "composition" ||
    value === "diagnostic" ||
    value === "detail" ||
    value === "relationship"
    ? value
    : "summary";
}

export function asChartType(value: unknown): DashboardCandidateVisualizationChartType | undefined {
  return value === "kpi" ||
    value === "bar" ||
    value === "verticalBar" ||
    value === "horizontalBar" ||
    value === "groupedBar" ||
    value === "rankingBar" ||
    value === "line" ||
    value === "pie" ||
    value === "donut" ||
    value === "scatter" ||
    value === "comboBarLine" ||
    value === "matrix" ||
    value === "funnel" ||
    value === "area" ||
    value === "tableSummary"
    ? value
    : undefined;
}

export function asIntent(value: unknown): DashboardCandidateVisualizationIntent | undefined {
  return value === "comparison" ||
    value === "trend" ||
    value === "composition" ||
    value === "stage_change" ||
    value === "relationship" ||
    value === "ranking" ||
    value === "summary"
    ? value
    : undefined;
}

export function tableById(tables: readonly ResolvedTable[], tableId: string | undefined): ResolvedTable | undefined {
  return tableId ? tables.find((table) => table.id === tableId) : undefined;
}

export function pickField(value: unknown, table: ResolvedTable): string | undefined {
  const field = asString(value);
  return field && table.columns.includes(field) ? field : undefined;
}

export function normalizeDashboardBriefFields(input: unknown, table: ResolvedTable): TableChartOptionFields {
  const raw = asRecord(input);

  if (!raw) {
    return {};
  }

  const primaryMeasure = pickField(raw.primaryMeasure ?? raw.valueField, table);
  const secondaryMeasure = pickField(raw.secondaryMeasure, table);
  const category = pickField(raw.category ?? raw.categoryField, table);
  const date = pickField(raw.date ?? raw.dateField, table);
  const group = pickField(raw.group ?? raw.groupField, table);
  const x = pickField(raw.x ?? raw.xField, table);
  const y = pickField(raw.y ?? raw.yField, table);

  return {
    ...(primaryMeasure ? { primaryMeasure } : {}),
    ...(secondaryMeasure ? { secondaryMeasure } : {}),
    ...(category ? { category } : {}),
    ...(date ? { date } : {}),
    ...(group ? { group } : {}),
    ...(x ? { x } : {}),
    ...(y ? { y } : {}),
  };
}
