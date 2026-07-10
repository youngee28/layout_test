import { generateJsonText } from "@/lib/ai/gpt_client";
import { parseGeneratedJson } from "@/lib/dashboard-candidates/parse_generated_json";
import { buildDashboardCandidatesPrompt } from "@/lib/dashboard-candidates/prompts/dashboard_candidates_prompt";
import { DASHBOARD_CANDIDATES_SCHEMA } from "@/lib/dashboard-candidates/schemas";
import { normalizeDashboardCandidates, type DashboardCandidate } from "@/schema/dashboard_candidate";
import type { DashboardBrief } from "@/schema/dashboard_brief";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import type { TableChartOptionGroup } from "@/schema/table_chart_option";

export async function generateDashboardCandidates({
  documentContext,
  tables,
  dashboardBriefs,
  chartOptionsByTable,
}: {
  readonly documentContext: ResolvedDocumentContext;
  readonly tables: readonly ResolvedTable[];
  readonly dashboardBriefs: readonly DashboardBrief[];
  readonly chartOptionsByTable: readonly TableChartOptionGroup[];
}): Promise<{ readonly dashboardCandidates: DashboardCandidate[] }> {
  if (tables.length === 0) {
    throw new Error("표 정보를 찾지 못해 SVG 후보를 생성할 수 없습니다.");
  }

  const responseText = await generateJsonText({
    prompt: buildDashboardCandidatesPrompt({ documentContext, tables, dashboardBriefs, chartOptionsByTable }),
    schemaName: "dashboard_candidates_response",
    responseJsonSchema: DASHBOARD_CANDIDATES_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include dashboard candidate output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const dashboardCandidates = normalizeDashboardCandidates(
    typeof parsed === "object" && parsed !== null && "candidates" in parsed
      ? (parsed as { candidates: unknown }).candidates
      : [],
  ).filter((candidate) => Boolean(candidate.svgPreview));

  if (dashboardCandidates.length === 0) {
    throw new Error("유효한 SVG 후보를 생성하지 못했습니다.");
  }

  return {
    dashboardCandidates,
  };
}
