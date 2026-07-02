import { config as loadEnv } from "dotenv";
import { NextResponse } from "next/server";
import { createSceneApiLogForPost, writeSceneApiLogResponseJson } from "@/app/api/scene/api_log";
import { buildDashboardCandidatesFromCsv } from "@/lib/dashboard-candidates/build_dashboard_candidates";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

export const dynamic = "force-dynamic";

function getCsvTextFromBody(body: unknown): string {
  if (typeof body !== "object" || body === null || !("csvText" in body)) {
    throw new Error("Request body must include a csvText string.");
  }

  const { csvText } = body as { csvText: unknown };

  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error("Request body must include a csvText string.");
  }

  return csvText;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const logContext = createSceneApiLogForPost({ body });
    const result = await buildDashboardCandidatesFromCsv({
      csvText,
      apiLogRunId: logContext.runId,
    });

    void writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: result,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof SyntaxError
        ? "Request body must be valid JSON."
        : error instanceof Error
          ? error.message
          : String(error);
    const status = message.startsWith("Request body") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
