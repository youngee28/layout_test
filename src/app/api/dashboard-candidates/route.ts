import { GoogleGenAI } from "@google/genai";
import { config as loadEnv } from "dotenv";
import { NextResponse } from "next/server";
import { createSceneApiLogForPost, writeSceneApiLogRequestAndText, writeSceneApiLogResponseJson } from "@/app/api/scene/api_log";
import { buildResolvedTables } from "@/lib/data/build_resolved_tables";
import { parseCsvGrid, type ParsedCsvGrid } from "@/lib/data/parse_csv";
import { normalizeDashboardCandidates, type DashboardCandidate } from "@/schema/dashboard_candidate";
import { normalizeResolvedTablesResponse, type ResolvedTable } from "@/schema/resolved_table";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const DEFAULT_MODEL = "gemini-2.5-flash";

const RESOLVED_TABLES_SCHEMA = {
  type: "object",
  properties: {
    tables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: ["table", "note", "metadata", "titleBlock"] },
          title: { type: "string" },
          context: { type: "string" },
          range: {
            type: "object",
            properties: {
              startRow: { type: "number" },
              endRow: { type: "number" },
              startCol: { type: "number" },
              endCol: { type: "number" },
            },
            required: ["startRow", "endRow", "startCol", "endCol"],
          },
          headerRow: { type: ["number", "null"] },
          dataStartRow: { type: ["number", "null"] },
          dataEndRow: { type: ["number", "null"] },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["id", "kind", "range", "confidence"],
      },
    },
  },
  required: ["tables"],
} as const;

const DASHBOARD_CANDIDATES_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          goal: { type: "string" },
          narrative: { type: "string" },
          sourceTableIds: { type: "array", items: { type: "string" } },
          viewpoints: {
            type: "array",
            items: {
              type: "string",
              enum: ["comparison", "trend", "composition", "distribution", "flow", "correlation", "ranking", "highlight", "summary"],
            },
          },
          layoutStrategy: { type: "string" },
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                role: { type: "string", enum: ["hero", "support", "evidence", "annotation", "detail", "closure"] },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                type: { type: "string", enum: ["chart", "metric", "text", "note"] },
                chartType: { type: "string", enum: ["bar", "line", "donut", "pie", "kpi", "rankingBar", "scatter", "area"] },
                dataBinding: {
                  type: "object",
                  properties: {
                    tableId: { type: "string" },
                    categoryField: { type: "string" },
                    valueField: { type: "string" },
                    dateField: { type: "string" },
                    groupField: { type: "string" },
                  },
                },
                layout: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["x", "y", "width", "height"],
                },
              },
              required: ["id", "title", "role", "priority", "type", "layout"],
            },
          },
        },
        required: ["id", "title", "summary", "goal", "narrative", "sourceTableIds", "viewpoints", "layoutStrategy", "blocks"],
      },
    },
  },
  required: ["candidates"],
} as const;

export const dynamic = "force-dynamic";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  return apiKey;
}

function parseGeneratedJson(text: string): unknown {
  let normalized = text.trim();

  if (!normalized) {
    throw new Error("Gemini returned an empty response.");
  }

  if (normalized.startsWith("```")) {
    normalized = normalized.replace(/^```json?\s*/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(normalized);
}

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

function buildResolveTablesPrompt({ grid }: { grid: ParsedCsvGrid }): string {
  return [
    "당신은 CSV grid를 읽고 표/메모/메타데이터 영역을 분리하는 문서 구조 해석기입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "모든 row/col 좌표는 0-based 인덱스입니다.",
    "셀 값 자체를 복사/변형하지 말고, 영역 좌표와 의미만 판정하세요.",
    "kind는 table, note, metadata, titleBlock 중 하나여야 합니다.",
    "실제 데이터 표만 kind=table로 반환하세요.",
    "kind=table이면 headerRow, dataStartRow, dataEndRow를 반드시 지정하세요.",
    "headerRow는 dataStartRow보다 반드시 작아야 합니다.",
    "한 table은 하나의 연속된 직사각형 범위(range)만 가져야 합니다.",
    "title과 context는 짧고 명확하게 작성하세요.",
    "confidence는 0~1 사이 값입니다.",
    "빈 줄, 제목 행, 반복 헤더, 주석/메타데이터 영역, 실제 데이터 본문을 구분하세요.",
    "표가 여러 개면 모두 반환하세요.",
    "[Grid 정보]",
    JSON.stringify({
      rowCount: grid.rowCount,
      columnCount: grid.columnCount,
      rows: grid.rows.map((cells, row) => ({ row, cells })),
    }, null, 2),
  ].join("\n");
}

function buildDashboardCandidatesPrompt({ tables }: { tables: ResolvedTable[] }): string {
  return [
    "당신은 최종 인포그래픽 생성을 위한 사전 대시보드 후보를 기획하는 정보디자인 전략가입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "결과는 최종 BI 대시보드가 아니라 인포그래픽 방향성을 잡기 위한 후보여야 합니다.",
    "표를 보고 핵심 메시지, 시선 흐름, 강조 우선순위를 먼저 생각하세요.",
    "후보는 2개 이상 3개 이하로 만드세요.",
    // "각 후보는 서로 다른 관점 또는 스토리텔링 초점을 가져야 합니다.",
    "단순히 비교형/추세형 같은 템플릿 이름으로 끝내지 말고, 실제 데이터의 핵심 메시지를 제목과 goal에 반영하세요.",
    "각 후보는 title, summary, goal, narrative, sourceTableIds, viewpoints, layoutStrategy, blocks를 가져야 합니다.",
    "blocks는 인포그래픽용 정보 위계를 나타내야 하며 role은 hero/support/evidence/annotation/detail/closure 중 하나입니다.",
    "priority는 high/medium/low 중 하나입니다.",
    // "type은 chart/metric/table 중 하나입니다.",
    // "chartType은 bar, rankingBar, line, pie, donut, kpi, scatter, area 중 필요할 때만 사용하세요.",
    "dataBinding의 field명은 반드시 해당 table의 columns 안에서만 선택하세요.",
    "layout은 미리보기용 0~100 좌표계입니다. x/y/width/height를 숫자로 넣고, 전체적으로 hero 블록이 먼저 보이도록 설계하세요.",
    "블록 수는 과도하게 많지 않게 유지하고, 핵심 메시지 전달을 우선하세요.",
    "summary는 80자 이내, goal은 80자 이내, narrative는 120자 이내로 작성하세요.",
    "[확정된 표 정보]",
    JSON.stringify(
      tables.map((table) => ({
        id: table.id,
        title: table.title,
        context: table.context,
        columns: table.columns,
        analysis: table.analysis,
        rows: table.rows.slice(0, 20),
      })),
      null,
      2,
    ),
  ].join("\n");
}

async function resolveTablesWithApi({ grid }: { grid: ParsedCsvGrid }): Promise<{ responseText: string; tables: ResolvedTable[] }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  const response = await ai.models.generateContent({
    model,
    contents: buildResolveTablesPrompt({ grid }),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESOLVED_TABLES_SCHEMA,
    },
  });

  const responseText = response.text;

  if (!responseText) {
    throw new Error("Gemini response did not include resolved tables output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const tables = normalizeResolvedTablesResponse(
    typeof parsed === "object" && parsed !== null && "tables" in parsed ? (parsed as { tables: unknown }).tables : [],
    grid,
  );

  return {
    responseText,
    tables: buildResolvedTables({ grid, resolvedTables: tables }),
  };
}

function buildFallbackCandidates(tables: ResolvedTable[]): DashboardCandidate[] {
  return [
    {
      id: "candidate-data-review",
      title: "데이터 구조 점검형",
      summary: "바로 시각화하기보다 표 구조와 핵심 지표를 먼저 정리하는 구상입니다.",
      goal: "인포그래픽에 쓰일 핵심 표와 수치를 먼저 선별합니다.",
      narrative: tables.length > 0
        ? "감지된 표를 기준으로 제목, 핵심 수치, 보조 설명을 먼저 배치하는 안전한 시작점입니다."
        : "시각화 가능한 표가 적어 우선 데이터 구조를 설명하는 안내형 구성이 적합합니다.",
      sourceTableIds: tables.map((table) => table.id),
      viewpoints: ["summary", "highlight"],
      layoutStrategy: "hero-note-stack",
      preview: {
        headline: "데이터 구조 점검",
        chips: ["summary", "highlight"],
        blocks: [
          {
            id: "fallback-preview-hero",
            previewLabel: "핵심 메시지",
            previewIcon: "text",
            role: "hero",
            x: 0,
            y: 0,
            width: 100,
            height: 24,
          },
          {
            id: "fallback-preview-note",
            previewLabel: "구조 메모",
            previewIcon: "text",
            role: "annotation",
            x: 0,
            y: 28,
            width: 100,
            height: 24,
          },
          {
            id: "fallback-preview-kpi",
            previewLabel: "대표 지표",
            previewIcon: "kpi",
            role: "evidence",
            x: 0,
            y: 58,
            width: 48,
            height: 18,
          },
        ],
      },
      blocks: [
        {
          id: "fallback-hero",
          title: "핵심 메시지 영역",
          description: "데이터의 주제를 한 줄로 요약하는 헤드라인 블록입니다.",
          role: "hero",
          priority: "high",
          type: "text",
          layout: { x: 0, y: 0, width: 100, height: 24 },
        },
        {
          id: "fallback-note",
          title: "구조 확인 메모",
          description: "차트 생성 전, 어떤 표를 메인 근거로 쓸지 정리합니다.",
          role: "annotation",
          priority: "medium",
          type: "note",
          layout: { x: 0, y: 28, width: 100, height: 24 },
        },
        {
          id: "fallback-evidence",
          title: "대표 지표 후보",
          description: "최종 인포그래픽에서 강조할 수치를 고르는 보조 영역입니다.",
          role: "evidence",
          priority: "medium",
          type: "metric",
          layout: { x: 0, y: 58, width: 48, height: 18 },
        },
      ],
    },
  ];
}

async function generateDashboardCandidates({ tables }: { tables: ResolvedTable[] }): Promise<{ responseText: string; dashboardCandidates: DashboardCandidate[] }> {
  if (tables.length === 0) {
    const dashboardCandidates = buildFallbackCandidates(tables);

    return {
      responseText: JSON.stringify({ candidates: dashboardCandidates }, null, 2),
      dashboardCandidates,
    };
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildDashboardCandidatesPrompt({ tables }),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: DASHBOARD_CANDIDATES_SCHEMA,
      },
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("Gemini response did not include dashboard candidate output.");
    }

    const parsed = parseGeneratedJson(responseText);
    const dashboardCandidates = normalizeDashboardCandidates(
      typeof parsed === "object" && parsed !== null && "candidates" in parsed
        ? (parsed as { candidates: unknown }).candidates
        : [],
    );

    if (dashboardCandidates.length > 0) {
      return {
        responseText,
        dashboardCandidates,
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[dashboard-candidates] Falling back to deterministic candidates: ${message}`);
  }

  const fallbackCandidates = buildFallbackCandidates(tables);

  return {
    responseText: JSON.stringify({ candidates: fallbackCandidates }, null, 2),
    dashboardCandidates: fallbackCandidates,
  };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const logContext = createSceneApiLogForPost({ body });
    const grid = parseCsvGrid(csvText);
    const resolvedTablesResult = await resolveTablesWithApi({ grid });
    const candidateResult = await generateDashboardCandidates({ tables: resolvedTablesResult.tables });

    void writeSceneApiLogRequestAndText({
      ...logContext,
      responseText: JSON.stringify(
        {
          resolvedTables: resolvedTablesResult.responseText,
          dashboardCandidates: candidateResult.responseText,
        },
        null,
        2,
      ),
    });

    void writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: {
        resolvedTables: resolvedTablesResult.tables,
        dashboardCandidates: candidateResult.dashboardCandidates,
        generationStage: "candidates",
      },
    });

    return NextResponse.json({
      resolvedTables: resolvedTablesResult.tables,
      dashboardCandidates: candidateResult.dashboardCandidates,
      generationStage: "candidates",
    });
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
