import type { DashboardBrief, DashboardBriefChartRoleType } from "@/schema/dashboard_brief";
import type { ResolvedTable } from "@/schema/resolved_table";
import type {
  TableAnalysisLensFocus,
  TableChartOptionGroup,
  TableChartOptionTableRole,
} from "@/schema/table_chart_option";

function roleToFocus(role: DashboardBriefChartRoleType): TableAnalysisLensFocus {
  switch (role) {
    case "summary":
      return "overview";
    case "trend":
      return "trend";
    case "breakdown":
      return "comparison";
    case "ranking":
      return "ranking";
    case "composition":
      return "composition";
    case "diagnostic":
      return "outlier";
    case "detail":
      return "overview";
    case "relationship":
      return "relationship";
  }
}

function tableRoleForBrief(brief: DashboardBrief, tableId: string): TableChartOptionTableRole {
  if (brief.mainTableId === tableId) {
    return "primary";
  }

  return brief.supportingTableIds.includes(tableId) ? "supporting" : "context";
}

export function deriveChartOptionsFromBriefs({
  dashboardBriefs,
  tables,
}: {
  readonly dashboardBriefs: readonly DashboardBrief[];
  readonly tables: readonly ResolvedTable[];
}): TableChartOptionGroup[] {
  return tables.flatMap((table): TableChartOptionGroup[] => {
    const lenses = dashboardBriefs.flatMap((brief) =>
      brief.chartRoles.flatMap((role) =>
        role.chartCandidates
          .filter((candidate) => candidate.tableId === table.id)
          .map((candidate) => ({
            id: `${brief.id}-${role.id}-${candidate.id}`,
            question: role.question ?? brief.primaryQuestion ?? role.purpose,
            focus: roleToFocus(role.role),
            subject: role.title,
            priority: role.priority,
            fields: candidate.fields,
            evidence: {
              rowScope: "all_rows" as const,
            },
            chartOptions: [
              {
                id: candidate.id,
                chartType: candidate.chartType,
                intent: candidate.intent,
                suitability: candidate.suitability,
                renderSupport: "unsupported" as const,
                reason: candidate.reason,
                fields: candidate.fields,
                ...(candidate.risks ? { risks: candidate.risks } : {}),
              },
            ],
          })),
      ),
    );

    if (lenses.length === 0) {
      return [];
    }

    const firstBriefForTable = dashboardBriefs.find((brief) => brief.sourceTableIds.includes(table.id));

    return [
      {
        tableId: table.id,
        tableRole: firstBriefForTable ? tableRoleForBrief(firstBriefForTable, table.id) : "context",
        tableSummary: firstBriefForTable?.summary ?? table.context ?? table.title ?? table.id,
        lenses,
      },
    ];
  });
}
