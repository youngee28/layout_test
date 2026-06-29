import { config as loadEnv } from "dotenv";
import { NextResponse } from "next/server";
import { createSceneApiLogForPost, writeSceneApiLogResponseJson } from "@/app/api/scene/api_log";
import { buildResolvedTables } from "@/lib/data/build_resolved_tables";
import { parseCsvGrid, type ParsedCsvGrid } from "@/lib/data/parse_csv";
import { generateJsonText } from "@/lib/ai/gpt_client";
import { normalizeDashboardCandidates, type DashboardCandidate } from "@/schema/dashboard_candidate";
import { normalizeResolvedTablesResponse, type ResolvedTable } from "@/schema/resolved_table";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

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

function parseGeneratedJson(text: string): unknown {
  let normalized = text.trim();

  if (!normalized) {
    throw new Error("GPT returned an empty response.");
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
    "당신은 표 데이터를 분석하여 고품질 인포그래픽 대시보드를 SVG로 직접 설계하는 데이터 시각화 디자이너입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "최상위 JSON 객체는 반드시 candidates 배열을 가져야 합니다.",
    "후보는 정확히 3개만 생성하세요.",
    "각 후보는 title, summary, designIntent, svgMarkup, usedFields, notes를 가져야 합니다.",
    "summary는 100자 이내로 작성하세요.",
    "",
    "반환 형식:",
    "{",
    '  "candidates": [',
    "    {",
    '      "title": "string",',
    '      "summary": "string",',
    '      "designIntent": "string",',
    '      "svgMarkup": "string",',
    '      "usedFields": ["string"],',
    '      "notes": ["string"]',
    "    }",
    "  ]",
    "}",
    "",
    "작업 목표:",
    "- 입력된 표 데이터를 기반으로 서로 다른 관점의 인포그래픽 대시보드 후보 3개를 생성하세요.",
    "- 각 후보는 하나의 완성형 SVG 대시보드 페이지여야 합니다.",
    "- 단순히 예쁜 SVG를 만드는 것이 아니라, 데이터 해석 → 분석 질문 → 차트 구성 → 시각 디자인 순서로 설계하세요.",
    "- 데이터에 없는 수치, 항목명, 연도, 비율, 순위, 인사이트를 임의로 만들지 마세요.",
    "",
    "중요 작업 순서:",
    "아래 순서를 반드시 지키세요.",
    "",
    "1. 먼저 표 데이터의 의미를 해석하세요.",
    "- 표의 주제, 주요 지표, 범주형 필드, 수치형 필드, 단위, 비교 기준을 파악하세요.",
    "- 데이터가 퍼널, 순위, 추세, 제품군 비교, 구성비, 단계 변화, 격차 중 어떤 성격을 갖는지 판단하세요.",
    "- 이 단계에서는 절대 SVG 레이아웃을 먼저 상상하지 마세요.",
    "",
    "2. 후보별 분석 질문을 먼저 정의하세요.",
    "- 각 후보는 하나의 명확한 분석 질문에 답해야 합니다.",
    "- 예: 어느 단계에서 이탈이 가장 큰가?",
    "- 예: 어떤 제품군이 매출·성장·수익성 측면에서 우수한가?",
    "- 예: 최종 성과에 가장 큰 영향을 주는 지표는 무엇인가?",
    "- 분석 질문이 불명확한 후보는 만들지 마세요.",
    "",
    "3. 분석 질문에 맞는 차트 유형을 선택하세요.",
    "- 차트 유형은 데이터 구조와 분석 목적에 맞아야 합니다.",
    "- 퍼널/단계 데이터는 funnel, stage comparison, dropout ranking을 우선 사용하세요.",
    "- 제품군 비교 데이터는 bar, rankingBar, matrix, scatter를 사용할 수 있습니다.",
    "- scatter 또는 matrix를 사용할 경우 x축, y축, 크기, 색상의 의미를 반드시 텍스트로 표시하세요.",
    "- 시계열 데이터는 line chart를 사용하세요.",
    "- 단일 핵심 수치는 KPI card로 표현하세요.",
    "- 축, 범례, 항목명, 단위 없이 점·원·선만 배치한 그래프는 금지합니다.",
    "- 의미를 알 수 없는 장식용 미니 차트는 금지합니다.",
    "",
    "4. 차트에 사용할 필드와 표시 값을 먼저 확정하세요.",
    "- 각 차트는 반드시 제목, 항목 라벨, 값, 단위 또는 기준 설명을 가져야 합니다.",
    "- 어떤 값을 어떤 시각 요소로 표현하는지 명확해야 합니다.",
    "- 막대 길이, 원 크기, 선 위치, 점 위치는 실제 값의 상대적 크기를 반영해야 합니다.",
    "- 값이 큰 항목과 작은 항목의 시각적 크기가 반대로 표현되면 실패입니다.",
    "",
    "5. 마지막 단계에서만 SVG를 생성하세요.",
    "- svgMarkup은 앞에서 확정한 분석 질문, 차트 유형, 사용 필드, 핵심 메시지만 시각화해야 합니다.",
    "- SVG 생성 단계에서 새로운 지표, 새로운 항목, 새로운 해석, 새로운 차트 유형을 임의로 추가하지 마세요.",
    "- 장식보다 데이터 해석 가능성을 우선하세요.",
    "",
    "후보 차별화 규칙:",
    "- 후보 3개는 서로 다른 분석 관점을 가져야 합니다.",
    "- 단순히 색상만 다른 후보를 만들지 마세요.",
    "- 후보 3개는 서로 다른 레이아웃과 정보 위계를 가져야 합니다.",
    "- 예: 후보 1은 퍼널 중심, 후보 2는 제품군 비교 중심, 후보 3은 이탈/성과 리더보드 중심처럼 관점이 달라야 합니다.",
    "- 단, 데이터 성격상 적합하지 않은 관점은 억지로 만들지 마세요.",
    "",
    "시각화 설계 규칙:",
    "- 데이터가 말하는 핵심 메시지를 먼저 파악하세요.",
    "- 각 후보는 핵심 메시지를 가장 잘 전달하는 시각 표현을 선택하세요.",
    "- 수치의 크기 비교, 순위, 흐름, 구성비, 단계 변화, 격차, 집중도, 이상값 중 무엇을 보여줄지 판단하세요.",
    "- 표는 사용자가 한눈에 이해할 수 있도록 요약·비교·강조 구조로 재구성하세요.",
    "- 하나의 화면에 너무 많은 차트를 넣지 마세요.",
    "- 핵심 차트 또는 핵심 시각 요소를 크게 배치하세요.",
    "- 모든 시각 요소는 입력 데이터에 근거해야 합니다.",
    "- 데이터에 적합하지 않은 요소는 억지로 넣지 마세요.",
    "",
    "차트 품질 규칙:",
    "- 모든 차트에는 차트 제목이 있어야 합니다.",
    "- 모든 차트에는 항목명이 있어야 합니다.",
    "- 수치 단위가 있는 경우 단위를 표시하세요.",
    "- 차트가 무엇을 비교하는지 제목과 라벨만 보고 이해 가능해야 합니다.",
    "- 하단 보조 그래프도 반드시 무엇을 나타내는지 제목, 항목명, 수치 의미를 표시하세요.",
    "- 축/범례/항목명 없이 도형만 있는 차트는 실패입니다.",
    "- 점만 배치된 그래프, 의미 불명확한 버블, 장식용 선 그래프는 실패입니다.",
    "- 제목과 실제 차트 내용이 일치하지 않으면 실패입니다.",
    "",
    "디자인 요구사항:",
    "- 보고서형 인포그래픽 대시보드처럼 보여야 합니다.",
    "- 카드형 패널, 라운드 박스, 그림자, 그라데이션, 아이콘형 도형, 큰 숫자 타이포그래피를 활용하세요.",
    "- 전체 결과는 하나의 완성된 dashboard page처럼 보여야 합니다.",
    "- 단순 차트 하나만 배치한 SVG는 실패입니다.",
    "- 차트가 없는 대시보드는 실패입니다.",
    "- 중앙에 작은 그래프만 있는 SVG는 실패입니다.",
    "- 미리보기 카드 안에서도 핵심 구조와 핵심 숫자가 보이도록 큰 요소 중심으로 구성하세요.",
    "- 너무 작은 보조 텍스트를 과도하게 넣지 마세요.",
    "",
    "레이아웃 안전 규칙:",
    "- SVG는 width='1122' height='1402' viewBox='0 0 1122 1402' 기준으로 작성하세요.",
    "- SVG 루트에는 반드시 xmlns='http://www.w3.org/2000/svg'를 포함하세요.",
    "- 1122x1402 전체 캔버스를 적극적으로 사용하세요.",
    "- 텍스트가 캔버스 밖으로 나가지 않게 하세요.",
    "- 차트가 패널 또는 캔버스 밖으로 잘리면 실패입니다.",
    "- 차트 라벨이 겹치지 않도록 충분한 간격을 두세요.",
    "- 막대, 점, 선 등 차트 요소는 지정된 차트 영역 내부에만 배치하세요.",
    "- 긴 텍스트는 줄바꿈하거나 짧게 요약하세요.",
    "- 후보 미리보기에서 읽기 어려울 정도로 작은 글자를 남발하지 마세요.",
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
    "- XML 특수문자는 안전하게 이스케이프하세요.",
    "- 예: R&D는 R&amp;D로 작성하세요.",
    "- 텍스트 안의 &, <, > 문자는 XML 파싱 오류가 나지 않도록 처리하세요.",
    "",
    "데이터 규칙:",
    "- 입력 표에 없는 수치나 항목을 임의로 만들지 마세요.",
    "- 차트와 KPI 숫자는 입력 표 데이터에 기반해야 합니다.",
    "- 계산이 필요한 경우 입력 데이터로부터 직접 계산 가능한 값만 사용하세요.",
    "- 계산한 값은 notes에 계산 근거를 짧게 남기세요.",
    "- 불확실한 값은 만들지 말고 제외하세요.",
    "",
    "실패 후보 기준:",
    "- 차트가 잘리는 후보",
    "- 차트 의미가 불명확한 후보",
    "- 항목명, 단위, 범례 없이 도형만 배치한 후보",
    "- 데이터 필드에 없는 값을 만든 후보",
    "- 제목과 차트 내용이 맞지 않는 후보",
    "- 여러 분석 질문을 한 화면에 무리하게 섞은 후보",
    "- 데이터 맥락보다 장식이 우선된 후보",
    "- 값의 상대적 크기가 시각적으로 반대로 표현된 후보",
    "",
    "최종 점검:",
    "- 후보를 반환하기 전에 각 후보가 어떤 분석 질문에 답하는지 내부적으로 확인하세요.",
    "- 각 차트가 어떤 필드를 사용했는지 내부적으로 확인하세요.",
    "- 차트가 잘리지 않는지 확인하세요.",
    "- 항목명과 수치가 누락되지 않았는지 확인하세요.",
    "- 단, 내부 검토 과정은 JSON에 출력하지 마세요.",
    "",
    "[확정된 표 정보]",
    JSON.stringify(
      tables.map((table) => ({
        id: table.id,
        title: table.title,
        context: table.context,
        columns: table.columns,
        analysis: table.analysis,
        rows: table.rows,
      })),
      null,
      2,
    ),
  ].join("\n");
}

async function resolveTablesWithApi({ grid }: { grid: ParsedCsvGrid }): Promise<{ tables: ResolvedTable[] }> {
  const responseText = await generateJsonText({
    prompt: buildResolveTablesPrompt({ grid }),
    schemaName: "resolved_tables_response",
    responseJsonSchema: RESOLVED_TABLES_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include resolved tables output.");
  }

  const parsed = parseGeneratedJson(responseText);
  const tables = normalizeResolvedTablesResponse(
    typeof parsed === "object" && parsed !== null && "tables" in parsed ? (parsed as { tables: unknown }).tables : [],
    grid,
  );

  return {
    tables: buildResolvedTables({ grid, resolvedTables: tables }),
  };
}

async function generateDashboardCandidates({ tables }: { tables: ResolvedTable[] }): Promise<{ dashboardCandidates: DashboardCandidate[] }> {
  if (tables.length === 0) {
    throw new Error("표 정보를 찾지 못해 SVG 후보를 생성할 수 없습니다.");
  }

  const responseText = await generateJsonText({
    prompt: buildDashboardCandidatesPrompt({ tables }),
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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const logContext = createSceneApiLogForPost({ body });
    const grid = parseCsvGrid(csvText);
    const resolvedTablesResult = await resolveTablesWithApi({ grid });
    const candidateResult = await generateDashboardCandidates({ tables: resolvedTablesResult.tables });

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
