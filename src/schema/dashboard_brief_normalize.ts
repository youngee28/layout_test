import type { ResolvedTable } from "@/schema/resolved_table";
import {
  asChartRole,
  asChartType,
  asIntent,
  asKpiAggregation,
  asKpiRole,
  asPriority,
  asPurposeType,
  asRecord,
  asString,
  asStringArray,
  asSuitability,
  normalizeDashboardBriefFields,
  pickField,
  tableById,
} from "@/schema/dashboard_brief_parse";
import type {
  DashboardBrief,
  DashboardBriefChartCandidate,
  DashboardBriefChartRole,
  DashboardBriefInsight,
  DashboardBriefKpi,
} from "@/schema/dashboard_brief_types";

function normalizeInsight(input: unknown, index: number, tableIds: readonly string[]): DashboardBriefInsight | null {
  const raw = asRecord(input);
  const statement = asString(raw?.statement);
  const evidence = asString(raw?.evidence);
  const normalizedTableIds = asStringArray(raw?.tableIds).filter((tableId) => tableIds.includes(tableId));

  if (!raw || !statement || !evidence || normalizedTableIds.length === 0) {
    return null;
  }

  return {
    id: asString(raw.id) ?? `insight-${index + 1}`,
    statement,
    evidence,
    tableIds: normalizedTableIds,
    priority: asPriority(raw.priority),
  };
}

function normalizeKpi(input: unknown, index: number, tables: readonly ResolvedTable[]): DashboardBriefKpi | null {
  const raw = asRecord(input);
  const name = asString(raw?.name);
  const table = tableById(tables, asString(raw?.tableId));
  const calculation = asString(raw?.calculation);
  const reason = asString(raw?.reason);

  if (!raw || !name || !table || !calculation || !reason) {
    return null;
  }

  const field = pickField(raw.field, table);
  const unit = asString(raw.unit);

  return {
    id: asString(raw.id) ?? `kpi-${index + 1}`,
    name,
    role: asKpiRole(raw.role),
    tableId: table.id,
    ...(field ? { field } : {}),
    aggregation: asKpiAggregation(raw.aggregation),
    calculation,
    reason,
    ...(unit ? { unit } : {}),
  };
}

function normalizeChartCandidate(input: unknown, index: number, tables: readonly ResolvedTable[]): DashboardBriefChartCandidate | null {
  const raw = asRecord(input);
  const table = tableById(tables, asString(raw?.tableId));
  const chartType = asChartType(raw?.chartType);
  const intent = asIntent(raw?.intent);
  const reason = asString(raw?.reason);

  if (!raw || !table || !chartType || !intent || !reason) {
    return null;
  }

  const risks = asStringArray(raw.risks);

  return {
    id: asString(raw.id) ?? `chart-candidate-${index + 1}`,
    tableId: table.id,
    chartType,
    intent,
    suitability: asSuitability(raw.suitability),
    fields: normalizeDashboardBriefFields(raw.fields, table),
    reason,
    ...(risks.length > 0 ? { risks } : {}),
  };
}

function normalizeChartRole(input: unknown, index: number, tables: readonly ResolvedTable[], kpiIds: readonly string[]): DashboardBriefChartRole | null {
  const raw = asRecord(input);
  const title = asString(raw?.title);
  const purpose = asString(raw?.purpose);
  const normalizedTableIds = asStringArray(raw?.tableIds).filter((tableId) => tables.some((table) => table.id === tableId));
  const chartCandidates = Array.isArray(raw?.chartCandidates)
    ? raw.chartCandidates
        .map((candidate, candidateIndex) => normalizeChartCandidate(candidate, candidateIndex, tables))
        .filter((candidate): candidate is DashboardBriefChartCandidate => candidate !== null)
    : [];

  if (!raw || !title || !purpose || normalizedTableIds.length === 0 || chartCandidates.length === 0) {
    return null;
  }

  const question = asString(raw.question);

  return {
    id: asString(raw.id) ?? `chart-role-${index + 1}`,
    role: asChartRole(raw.role),
    title,
    purpose,
    ...(question ? { question } : {}),
    priority: asPriority(raw.priority),
    tableIds: normalizedTableIds,
    requiredKpis: asStringArray(raw.requiredKpis).filter((kpiId) => kpiIds.includes(kpiId)),
    chartCandidates,
  };
}

export function isDashboardBrief(input: unknown): input is DashboardBrief {
  const raw = asRecord(input);

  return Boolean(
    raw &&
      typeof raw.id === "string" &&
      typeof raw.title === "string" &&
      typeof raw.purpose === "string" &&
      Array.isArray(raw.insights) &&
      Array.isArray(raw.kpis) &&
      Array.isArray(raw.chartRoles),
  );
}

export function normalizeDashboardBriefs(input: unknown, tables: readonly ResolvedTable[]): DashboardBrief[] {
  if (!Array.isArray(input)) {
    throw new Error("Dashboard briefs payload must be an array.");
  }

  return input
    .map((entry, index) => normalizeBrief(entry, index, tables))
    .filter((brief): brief is DashboardBrief => brief !== null);
}

function normalizeBrief(entry: unknown, index: number, tables: readonly ResolvedTable[]): DashboardBrief | null {
  const raw = asRecord(entry);
  const title = asString(raw?.title);
  const purpose = asString(raw?.purpose);
  const audienceOrUseCase = asString(raw?.audienceOrUseCase);
  const summary = asString(raw?.summary);
  const mainTable = tableById(tables, asString(raw?.mainTableId)) ?? tables[0];
  const tableIds = tables.map((table) => table.id);
  const sourceTableIds = asStringArray(raw?.sourceTableIds).filter((tableId) => tableIds.includes(tableId));

  if (!raw || !title || !purpose || !audienceOrUseCase || !summary || !mainTable || sourceTableIds.length === 0) {
    return null;
  }

  const insights = Array.isArray(raw.insights)
    ? raw.insights
        .map((insight, insightIndex) => normalizeInsight(insight, insightIndex, tableIds))
        .filter((insight): insight is DashboardBriefInsight => insight !== null)
    : [];
  const kpis = Array.isArray(raw.kpis)
    ? raw.kpis.map((kpi, kpiIndex) => normalizeKpi(kpi, kpiIndex, tables)).filter((kpi): kpi is DashboardBriefKpi => kpi !== null)
    : [];
  const kpiIds = kpis.map((kpi) => kpi.id);
  const chartRoles = Array.isArray(raw.chartRoles)
    ? raw.chartRoles
        .map((role, roleIndex) => normalizeChartRole(role, roleIndex, tables, kpiIds))
        .filter((role): role is DashboardBriefChartRole => role !== null)
    : [];

  if (insights.length === 0 || kpis.length === 0 || chartRoles.length === 0) {
    return null;
  }

  const primaryQuestion = asString(raw.primaryQuestion);

  return {
    id: asString(raw.id) ?? `dashboard-brief-${index + 1}`,
    title,
    purposeType: asPurposeType(raw.purposeType),
    purpose,
    audienceOrUseCase,
    ...(primaryQuestion ? { primaryQuestion } : {}),
    summary,
    sourceTableIds,
    mainTableId: mainTable.id,
    supportingTableIds: asStringArray(raw.supportingTableIds).filter((tableId) => tableIds.includes(tableId)),
    insights,
    kpis,
    chartRoles,
    candidateStrategy: asString(raw.candidateStrategy) ?? purpose,
  };
}
