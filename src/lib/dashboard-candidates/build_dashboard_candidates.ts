import { parseCsvGrid } from "@/lib/data/parse_csv";
import { generateDashboardCandidates } from "@/lib/dashboard-candidates/generate_dashboard_candidates";
import { generateTableChartOptions } from "@/lib/dashboard-candidates/generate_table_chart_options";
import { resolveTablesWithApi } from "@/lib/dashboard-candidates/resolve_tables_with_api";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionGroup } from "@/schema/table_chart_option";

export type DashboardCandidatesBuildResult = {
  readonly documentContext: ResolvedDocumentContext;
  readonly resolvedTables: ResolvedTable[];
  readonly chartOptionsByTable: TableChartOptionGroup[];
  readonly dashboardCandidates: DashboardCandidate[];
  readonly generationStage: "candidates";
};

export async function buildDashboardCandidatesFromCsv({
  csvText,
  apiLogRunId,
}: {
  readonly csvText: string;
  readonly apiLogRunId?: string;
}): Promise<DashboardCandidatesBuildResult> {
  const grid = parseCsvGrid(csvText);
  const resolvedTablesResult = await resolveTablesWithApi({ grid, apiLogRunId });
  const tableChartOptionsResult = await generateTableChartOptions({
    documentContext: resolvedTablesResult.documentContext,
    tables: resolvedTablesResult.tables,
    apiLogRunId,
  });
  const candidateResult = await generateDashboardCandidates({
    documentContext: resolvedTablesResult.documentContext,
    tables: resolvedTablesResult.tables,
    chartOptionsByTable: tableChartOptionsResult.chartOptionsByTable,
  });

  return {
    documentContext: resolvedTablesResult.documentContext,
    resolvedTables: resolvedTablesResult.tables,
    chartOptionsByTable: tableChartOptionsResult.chartOptionsByTable,
    dashboardCandidates: candidateResult.dashboardCandidates,
    generationStage: "candidates",
  };
}
