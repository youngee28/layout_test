import { writeSceneApiLogStage } from "@/app/api/scene/api_log";
import { generateJsonText } from "@/lib/ai/gpt_client";
import { deriveChartOptionsFromBriefs } from "@/lib/dashboard-candidates/derive_chart_options_from_briefs";
import { parseGeneratedJson } from "@/lib/dashboard-candidates/parse_generated_json";
import { buildDashboardBriefsPrompt } from "@/lib/dashboard-candidates/prompts/dashboard_briefs_prompt";
import { DASHBOARD_BRIEFS_SCHEMA } from "@/lib/dashboard-candidates/schemas";
import { applyTableChartOptionRules } from "@/lib/dashboard-candidates/table_chart_option_rules";
import { normalizeDashboardBriefs, type DashboardBrief } from "@/schema/dashboard_brief";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionGroup } from "@/schema/table_chart_option";

export async function generateDashboardBriefs({
  documentContext,
  tables,
  apiLogRunId,
}: {
  readonly documentContext: ResolvedDocumentContext;
  readonly tables: readonly ResolvedTable[];
  readonly apiLogRunId?: string;
}): Promise<{
  readonly dashboardBriefs: DashboardBrief[];
  readonly chartOptionsByTable: TableChartOptionGroup[];
}> {
  if (tables.length === 0) {
    return {
      dashboardBriefs: [],
      chartOptionsByTable: [],
    };
  }

  const responseText = await generateJsonText({
    prompt: buildDashboardBriefsPrompt({ documentContext, tables }),
    schemaName: "dashboard_briefs_response",
    responseJsonSchema: DASHBOARD_BRIEFS_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include dashboard brief output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const dashboardBriefs = normalizeDashboardBriefs(
    typeof parsed === "object" && parsed !== null && "dashboardBriefs" in parsed
      ? (parsed as { dashboardBriefs: unknown }).dashboardBriefs
      : [],
    tables,
  );
  const chartOptionsByTable = applyTableChartOptionRules({
    chartOptionsByTable: deriveChartOptionsFromBriefs({ dashboardBriefs, tables }),
    tables,
  });

  if (dashboardBriefs.length === 0) {
    throw new Error("유효한 대시보드 brief를 생성하지 못했습니다.");
  }

  if (apiLogRunId) {
    await writeSceneApiLogStage({
      runId: apiLogRunId,
      stageName: "02",
      responseJson: {
        dashboardBriefs,
        chartOptionsByTable,
      },
    });
  }

  return {
    dashboardBriefs,
    chartOptionsByTable,
  };
}
