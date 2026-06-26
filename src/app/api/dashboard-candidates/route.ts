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
          designIntent: { type: "string" },
          svgMarkup: { type: "string" },
          usedFields: {
            type: "array",
            items: { type: "string" },
          },
          notes: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["id", "title", "summary", "designIntent", "svgMarkup"],
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
    "당신은 고품질 인포그래픽 대시보드를 SVG로 직접 설계하는 시각 디자이너입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "후보는 정확히 2개만 생성하세요.",
    "각 후보는 title, summary, designIntent, svgMarkup, usedFields, notes를 가져야 합니다.",
    "",
    "중요: svgMarkup은 단순 차트가 아니라 하나의 완성형 SVG 대시보드 페이지여야 합니다.",
    "SVG는 width='1122' height='1402' viewBox='0 0 1122 1402' 기준으로 작성하세요.",
    "1122x1402 전체 캔버스를 적극적으로 사용하세요.",
    "",
    "각 SVG에는 반드시 다음이 포함되어야 합니다.",
    "- 큰 제목",
    "- 부제 또는 요약 문장",
    "- KPI 카드 3개 이상",
    "- 메인 차트 영역 1개",
    "- 인사이트 카드 2~3개",
    "- 출처/푸터 영역",
    "",
    "디자인 요구사항:",
    "- 보고서형 인포그래픽 대시보드처럼 보여야 합니다.",
    "- 카드형 패널, 라운드 박스, 그림자, 그라데이션, 아이콘형 도형, 큰 숫자 타이포그래피를 활용하세요.",
    "- 단순 차트 하나, 표 하나, 중앙에 작은 그래프만 있는 SVG는 실패입니다.",
    "- 회색 배경 위에 작은 차트만 올린 목업은 만들지 마세요.",
    "- 전체 결과는 하나의 완성된 dashboard page처럼 보여야 합니다.",
    "- 후보 2개는 서로 다른 레이아웃과 디자인 분위기를 가져야 합니다.",
    "",
    "SVG 안전 규칙:",
    "- SVG 외부 HTML/CSS/JS를 만들지 마세요.",
    "- script, foreignObject, iframe, image, use, animate, set을 사용하지 마세요.",
    "- onClick, onLoad 등 이벤트 속성을 사용하지 마세요.",
    "- 외부 URL, javascript:, href, xlink:href 외부 참조를 사용하지 마세요.",
    "- style 태그, style 속성, class 속성을 사용하지 마세요.",
    "- 모든 스타일은 fill, stroke, opacity, font-size, font-weight 등 SVG presentation attribute로 작성하세요.",
    "- defs, linearGradient, radialGradient, stop, filter, feDropShadow, feGaussianBlur, feOffset, feColorMatrix는 사용할 수 있습니다.",
    "- url(#id) 형태의 내부 참조만 허용됩니다.",
    "",
    "데이터 규칙:",
    "- 입력 표에 없는 수치나 항목을 임의로 만들지 마세요.",
    "- 차트와 KPI 숫자는 입력 표 데이터에 기반해야 합니다.",
    "- usedFields에는 사용한 컬럼명을 넣으세요.",
    "",
    "[확정된 표 정보]",
    JSON.stringify(
      tables.map((table) => ({
        id: table.id,
        title: table.title,
        context: table.context,
        columns: table.columns,
        analysis: table.analysis,
        rows: table.rows.slice(0, 30),
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

async function generateDashboardCandidates({ tables }: { tables: ResolvedTable[] }): Promise<{ responseText: string; dashboardCandidates: DashboardCandidate[] }> {
  if (tables.length === 0) {
    throw new Error("표 정보를 찾지 못해 SVG 후보를 생성할 수 없습니다.");
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

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
  ).filter((candidate) => Boolean(candidate.svgPreview));

  if (dashboardCandidates.length === 0) {
    throw new Error("유효한 SVG 후보를 생성하지 못했습니다.");
  }

  return {
    responseText,
    dashboardCandidates,
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
