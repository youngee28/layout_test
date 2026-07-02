import { writeSceneApiLogStage } from "@/app/api/scene/api_log";
import { generateJsonText } from "@/lib/ai/gpt_client";
import { buildResolvedTables } from "@/lib/data/build_resolved_tables";
import type { ParsedCsvGrid } from "@/lib/data/parse_csv";
import { buildResolveTablesPrompt } from "@/lib/dashboard-candidates/prompts/resolve_tables_prompt";
import { parseGeneratedJson } from "@/lib/dashboard-candidates/parse_generated_json";
import { RESOLVED_TABLES_SCHEMA } from "@/lib/dashboard-candidates/schemas";
import {
  normalizeResolvedDocumentContext,
  normalizeResolvedTablesResponse,
  type ResolvedDocumentContext,
  type ResolvedTable,
} from "@/schema/resolved_table";

export type ResolveTablesResult = {
  readonly documentContext: ResolvedDocumentContext;
  readonly tables: ResolvedTable[];
};

export async function resolveTablesWithApi({
  grid,
  apiLogRunId,
}: {
  readonly grid: ParsedCsvGrid;
  readonly apiLogRunId?: string;
}): Promise<ResolveTablesResult> {
  const responseText = await generateJsonText({
    prompt: buildResolveTablesPrompt({ grid }),
    schemaName: "resolved_tables_response",
    responseJsonSchema: RESOLVED_TABLES_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include resolved tables output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const documentContext = normalizeResolvedDocumentContext(
    typeof parsed === "object" && parsed !== null && "documentContext" in parsed
      ? (parsed as { documentContext: unknown }).documentContext
      : null,
  );
  const tables = normalizeResolvedTablesResponse(
    typeof parsed === "object" && parsed !== null && "tables" in parsed ? (parsed as { tables: unknown }).tables : [],
    grid,
  );
  const resolvedTables = buildResolvedTables({ grid, resolvedTables: tables });

  if (apiLogRunId) {
    await writeSceneApiLogStage({
      runId: apiLogRunId,
      stageName: "01",
      responseJson: {
        documentContext,
        resolvedTables,
      },
    });
  }

  return {
    documentContext,
    tables: resolvedTables,
  };
}
