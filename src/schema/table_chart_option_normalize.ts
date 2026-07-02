import type { DashboardCandidateVisualizationChartType, DashboardCandidateVisualizationIntent } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";
import type { TableAnalysisLens, TableAnalysisLensFocus, TableChartOption, TableChartOptionCellRole, TableChartOptionEvidence, TableChartOptionFields, TableChartOptionGroup, TableChartOptionPriority, TableChartOptionSuitability, TableChartOptionTableRole } from "@/schema/table_chart_option_types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
}

function asIntegerArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => Number.isInteger(entry)) : [];
}

function asTableRole(value: unknown): TableChartOptionTableRole {
  return value === "primary" || value === "supporting" || value === "lookup" || value === "context"
    ? value
    : "supporting";
}

function asFocus(value: unknown): TableAnalysisLensFocus | undefined {
  return value === "overview" ||
    value === "trend" ||
    value === "ranking" ||
    value === "composition" ||
    value === "comparison" ||
    value === "relationship" ||
    value === "outlier" ||
    value === "kpi" ||
    value === "stage_change"
    ? value
    : undefined;
}

function asPriority(value: unknown): TableChartOptionPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function asCellRole(value: unknown): TableChartOptionCellRole | undefined {
  return value === "max" ||
    value === "min" ||
    value === "latest" ||
    value === "total" ||
    value === "label" ||
    value === "comparison_base" ||
    value === "notable"
    ? value
    : undefined;
}

function asChartType(value: unknown): DashboardCandidateVisualizationChartType | undefined {
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

function asIntent(value: unknown): DashboardCandidateVisualizationIntent | undefined {
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

function asSuitability(value: unknown): TableChartOptionSuitability {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function pickField(value: unknown, allowedFields: readonly string[]): string | undefined {
  const field = asString(value);
  return field && allowedFields.includes(field) ? field : undefined;
}

function normalizeFields(input: unknown, allowedFields: readonly string[]): TableChartOptionFields {
  const raw = asRecord(input);

  if (!raw) {
    return {};
  }

  const primaryMeasure = pickField(raw.primaryMeasure, allowedFields);
  const secondaryMeasure = pickField(raw.secondaryMeasure, allowedFields);
  const category = pickField(raw.category, allowedFields);
  const date = pickField(raw.date, allowedFields);
  const group = pickField(raw.group, allowedFields);
  const x = pickField(raw.x, allowedFields);
  const y = pickField(raw.y, allowedFields);

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

function normalizeImportantCells(input: unknown, allowedFields: readonly string[], rowCount: number): NonNullable<TableChartOptionEvidence["importantCells"]> {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((entry) => {
    const cell = asRecord(entry);
    const rowIndex = typeof cell?.rowIndex === "number" && Number.isInteger(cell.rowIndex) ? cell.rowIndex : null;
    const field = asString(cell?.field);
    const role = asCellRole(cell?.role);
    const reason = asString(cell?.reason);

    if (rowIndex === null || rowIndex < 0 || rowIndex >= rowCount || !field || !allowedFields.includes(field) || !role || !reason) {
      return [];
    }

    return [{ rowIndex, field, role, reason }];
  });
}

function normalizeEvidence(input: unknown, allowedFields: readonly string[], rowCount: number): TableChartOptionEvidence {
  const raw = asRecord(input);
  const rowScope = raw?.rowScope === "top_n" ||
    raw?.rowScope === "latest" ||
    raw?.rowScope === "filtered" ||
    raw?.rowScope === "specific_rows"
    ? raw.rowScope
    : "all_rows";
  const rowIndexes = asIntegerArray(raw?.rowIndexes).filter((rowIndex) => rowIndex >= 0 && rowIndex < rowCount);
  const importantCells = normalizeImportantCells(raw?.importantCells, allowedFields, rowCount);
  const filterDescription = asString(raw?.filterDescription);

  return {
    rowScope,
    ...(rowIndexes.length > 0 ? { rowIndexes } : {}),
    ...(filterDescription ? { filterDescription } : {}),
    ...(importantCells.length > 0 ? { importantCells } : {}),
  };
}

function normalizeOption(input: unknown, index: number, allowedFields: readonly string[]): TableChartOption | null {
  const raw = asRecord(input);
  const chartType = asChartType(raw?.chartType);
  const intent = asIntent(raw?.intent);
  const reason = asString(raw?.reason);
  const risks = asStringArray(raw?.risks);

  if (!raw || !chartType || !intent || !reason) {
    return null;
  }

  return {
    id: asString(raw.id) ?? `chart-option-${index + 1}`,
    chartType,
    intent,
    suitability: asSuitability(raw.suitability),
    renderSupport: "unsupported",
    reason,
    fields: normalizeFields(raw.fields, allowedFields),
    ...(risks.length > 0 ? { risks } : {}),
  };
}

function normalizeLens(input: unknown, index: number, table: ResolvedTable): TableAnalysisLens | null {
  const raw = asRecord(input);
  const question = asString(raw?.question);
  const focus = asFocus(raw?.focus);
  const subject = asString(raw?.subject);
  const chartOptions = Array.isArray(raw?.chartOptions)
    ? raw.chartOptions
        .map((option, optionIndex) => normalizeOption(option, optionIndex, table.columns))
        .filter((option): option is TableChartOption => option !== null)
    : [];

  if (!raw || !question || !focus || !subject || chartOptions.length === 0) {
    return null;
  }

  return {
    id: asString(raw.id) ?? `${table.id}-lens-${index + 1}`,
    question,
    focus,
    subject,
    priority: asPriority(raw.priority),
    fields: normalizeFields(raw.fields, table.columns),
    evidence: normalizeEvidence(raw.evidence, table.columns, table.rows.length),
    chartOptions,
  };
}

export function normalizeTableChartOptionGroups(input: unknown, tables: readonly ResolvedTable[]): TableChartOptionGroup[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((entry): TableChartOptionGroup[] => {
    const raw = asRecord(entry);
    const tableId = asString(raw?.tableId);
    const table = tableId ? tables.find((candidate) => candidate.id === tableId) : undefined;
    const lenses = table && Array.isArray(raw?.lenses)
      ? raw.lenses
          .map((lens, lensIndex) => normalizeLens(lens, lensIndex, table))
          .filter((lens): lens is TableAnalysisLens => lens !== null)
      : [];

    if (!raw || !table || lenses.length === 0) {
      return [];
    }

    return [{
      tableId: table.id,
      tableRole: asTableRole(raw.tableRole),
      tableSummary: asString(raw.tableSummary) ?? table.context ?? table.title ?? table.id,
      lenses,
    }];
  });
}
