import { writeSceneApiLogStage } from "@/app/api/scene/api_log";
import { generateJsonText } from "@/lib/ai/gpt_client";
import { parseGeneratedJson } from "@/lib/dashboard-candidates/parse_generated_json";
import { buildTableChartOptionsPrompt } from "@/lib/dashboard-candidates/prompts/table_chart_options_prompt";
import { TABLE_CHART_OPTIONS_SCHEMA } from "@/lib/dashboard-candidates/schemas";
import { applyTableChartOptionRules } from "@/lib/dashboard-candidates/table_chart_option_rules";
import type { ResolvedDocumentContext, ResolvedTable } from "@/schema/resolved_table";
import { normalizeTableChartOptionGroups, type TableChartOptionGroup } from "@/schema/table_chart_option";

export async function generateTableChartOptions({
  documentContext,
  tables,
  apiLogRunId,
}: {
  readonly documentContext: ResolvedDocumentContext;
  readonly tables: readonly ResolvedTable[];
  readonly apiLogRunId?: string;
}): Promise<{ readonly chartOptionsByTable: TableChartOptionGroup[] }> {
  if (tables.length === 0) {
    return {
      chartOptionsByTable: [],
    };
  }

  const responseText = await generateJsonText({
    prompt: buildTableChartOptionsPrompt({ documentContext, tables }),
    schemaName: "table_chart_options_response",
    responseJsonSchema: TABLE_CHART_OPTIONS_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include table chart option output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const normalizedOptions = normalizeTableChartOptionGroups(
    typeof parsed === "object" && parsed !== null && "chartOptionsByTable" in parsed
      ? (parsed as { chartOptionsByTable: unknown }).chartOptionsByTable
      : [],
    tables,
  );
  const chartOptionsByTable = applyTableChartOptionRules({
    chartOptionsByTable: normalizedOptions,
    tables,
  });

  if (apiLogRunId) {
    await writeSceneApiLogStage({
      runId: apiLogRunId,
      stageName: "02",
      responseJson: {
        chartOptionsByTable,
      },
    });
  }

  return {
    chartOptionsByTable,
  };
}
