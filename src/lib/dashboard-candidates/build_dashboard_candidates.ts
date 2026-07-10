import { parseCsvGrid } from "@/lib/data/parse_csv";
import { generateDashboardBriefs } from "@/lib/dashboard-candidates/generate_dashboard_briefs";
import { generateDashboardCandidates } from "@/lib/dashboard-candidates/generate_dashboard_candidates";
import { resolveTablesWithApi } from "@/lib/dashboard-candidates/resolve_tables_with_api";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import type { DashboardBrief } from "@/schema/dashboard_brief";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionGroup } from "@/schema/table_chart_option";

export type DashboardCandidatesBuildResult = {
  readonly documentContext: ResolvedDocumentContext;
  readonly resolvedTables: ResolvedTable[];
  readonly dashboardBriefs: DashboardBrief[];
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
  const dashboardBriefsResult = await generateDashboardBriefs({
    documentContext: resolvedTablesResult.documentContext,
    tables: resolvedTablesResult.tables,
    apiLogRunId,
  });
  const candidateResult = await generateDashboardCandidates({
    documentContext: resolvedTablesResult.documentContext,
    tables: resolvedTablesResult.tables,
    dashboardBriefs: dashboardBriefsResult.dashboardBriefs,
    chartOptionsByTable: dashboardBriefsResult.chartOptionsByTable,
  });

  return {
    documentContext: resolvedTablesResult.documentContext,
    resolvedTables: resolvedTablesResult.tables,
    dashboardBriefs: dashboardBriefsResult.dashboardBriefs,
    chartOptionsByTable: dashboardBriefsResult.chartOptionsByTable,
    dashboardCandidates: candidateResult.dashboardCandidates,
    generationStage: "candidates",
  };
}
