import { config as loadEnv } from "dotenv";
import { NextResponse } from "next/server";
import {
  createSceneApiLogForPost,
  writeSceneApiLogResponseJson,
  writeSceneApiLogStage,
} from "@/app/api/scene/api_log";
import { buildResolvedTables } from "@/lib/data/build_resolved_tables";
import { parseCsvGrid, type ParsedCsvGrid } from "@/lib/data/parse_csv";
import { generateJsonText } from "@/lib/ai/gpt_client";
import { renderDashboardSpecToScene } from "@/lib/render/render_dashboard_spec_to_scene";
import { createChartRecommendations, type ChartRecommendation } from "@/schema/chart_recommendation";
import { normalizeDashboardSpec, type DashboardSpec } from "@/schema/dashboard_spec";
import { normalizeScene } from "@/schema/normalize_scene";
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
          tableShape: {
            type: ["string", "null"],
            enum: [
              "records",
              "metricList",
              "timeSeries",
              "ranking",
              "categoryBreakdown",
              "crossTab",
              "funnel",
              "lookup",
              null,
            ],
          },
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
        required: ["id", "kind", "tableShape", "range", "confidence"],
      },
    },
  },
  required: ["tables"],
} as const;

const GENERATED_DASHBOARD_SPEC_SCHEMA = {
  type: "object",
  properties: {
    width: { type: "number" },
    height: { type: "number" },
    background: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    theme: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["text", "kpi", "chart", "note"] },
          role: { type: "string", enum: ["title", "summary", "mainChart", "supportChart", "highlight", "insight"] },
          title: { type: "string" },
          message: { type: "string" },
          chartType: { type: "string", enum: ["bar", "line", "donut", "pie", "kpi", "rankingBar"] },
          intent: { type: "string", enum: ["trend", "comparison", "share", "ranking", "highlight", "summary"] },
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
          highlightRules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target: { type: "string", enum: ["max", "min", "negative", "latest", "custom"] },
                field: { type: "string" },
                label: { type: "string" },
                style: { type: "string", enum: ["emphasis", "warning", "muted"] },
              },
              required: ["target"],
            },
          },
        },
        required: ["id", "type", "role", "layout"],
      },
    },
  },
  required: ["width", "height", "background", "blocks"],
} as const;

export const dynamic = "force-dynamic";

function buildResolveTablesPrompt({ grid }: { grid: ParsedCsvGrid }): string {
  return [
    "당신은 CSV grid를 읽고 표/메모/메타데이터 영역을 분리하는 문서 구조 해석기입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "모든 row/col 좌표는 0-based 인덱스입니다.",
    "셀 값 자체를 복사/변형하지 말고, 영역 좌표와 의미만 판정하세요.",
    "kind는 table, note, metadata, titleBlock 중 하나여야 합니다.",
    "실제 데이터 표만 kind=table로 반환하세요.",
    "kind=table이면 tableShape를 반드시 지정하세요.",
    "kind가 table이 아니면 tableShape는 null로 반환하세요.",
    "tableShape는 records, metricList, timeSeries, ranking, categoryBreakdown, crossTab, funnel, lookup 중 하나입니다.",
    "records: 일반 행 단위 데이터입니다.",
    "metricList: 지표명-값 형태의 KPI 목록입니다.",
    "timeSeries: 날짜/기간 축이 명확한 시계열입니다.",
    "ranking: 순위 또는 Top-N 구조입니다.",
    "categoryBreakdown: 하나의 전체를 범주별로 분해한 구조입니다.",
    "crossTab: 행/열 양쪽이 의미 있는 피벗형 표입니다.",
    "funnel: 단계별 전환/감소 흐름입니다.",
    "lookup: 코드/명칭/설명 매핑용 보조 표입니다.",
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

function buildDashboardSpecPrompt({ tables }: { tables: ResolvedTable[] }): string {
  return [
    "당신은 확정된 표 배열을 읽고 DashboardSpec을 설계하는 데이터 시각화 전략가입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "최종 scene elements(text/rect/circle)는 생성하지 마세요.",
    "당신의 역할은 table 의미 해석, 인사이트 생성, 블록 구성, chartType/intent/dataBinding/highlightRules 제안입니다.",
    "차트 좌표와 실제 레이어 생성은 코드가 계산합니다.",
    "반드시 DashboardSpec 구조만 반환하세요.",
    "width는 525, height는 742.5로 고정하세요.",
    "background는 CSS 변수 토큰을 사용하세요. 예: --surface-card, --accent-soft.",
    "현재 안정적으로 렌더링 가능한 chartType은 bar, rankingBar, line입니다.",
    "pie, donut은 현재 단계에서는 생성하지 마세요.",
    "모든 chart 또는 kpi block의 dataBinding에는 반드시 tableId를 포함하세요.",
    "field명은 반드시 해당 table의 columns 안에서만 선택하세요.",
    "서로 다른 table의 field를 섞지 마세요.",
    "line chart는 추세(trend) 또는 순서형 변화가 명확한 경우에만 사용하세요.",
    "line chart block은 반드시 dataBinding.tableId, valueField, 그리고 dateField 또는 categoryField 중 하나를 포함해야 합니다.",
    "date 성격의 컬럼이 있으면 line chart의 x축은 dateField를 우선 사용하세요.",
    "단순 카테고리 비교라면 line보다 bar 또는 rankingBar를 우선 사용하세요.",
    "x축 값이 불명확하거나 값 포인트가 너무 적으면 line을 만들지 말고 bar/rankingBar 또는 note를 사용하세요.",
    "차트화할 적절한 표가 없으면 note와 text 중심으로 구성하세요.",
    "카테고리가 많거나 라벨이 길면 rankingBar를 우선 고려하세요.",
    "title은 28자 이내, summary는 80자 이내, note message는 80자 이내로 작성하세요.",
    "",
    "[확정된 표 정보]",
    JSON.stringify(
      tables.map((table) => ({
        id: table.id,
        tableShape: table.tableShape,
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

  if (typeof csvText !== "string") {
    throw new Error("Request body must include a csvText string.");
  }

  if (!csvText.trim()) {
    throw new Error("Request body csvText must not be empty.");
  }

  return csvText;
}

type ResolveTablesResult = {
  tables: ResolvedTable[];
};

type DashboardSpecResult = {
  dashboardSpec: DashboardSpec;
};

async function resolveTablesWithApi({
  grid,
  apiLogRunId,
}: {
  grid: ParsedCsvGrid;
  apiLogRunId?: string;
}): Promise<ResolveTablesResult> {
  const prompt = buildResolveTablesPrompt({ grid });
  const responseText = await generateJsonText({
    prompt,
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
  const resolvedTables = buildResolvedTables({ grid, resolvedTables: tables });

  if (apiLogRunId) {
    await writeSceneApiLogStage({
      runId: apiLogRunId,
      stageName: "01",
      responseJson: {
        resolvedTables,
      },
    });
  }

  return {
    tables: resolvedTables,
  };
}

function buildFallbackDashboardSpec(resolvedTables: ResolvedTable[]): DashboardSpec {
  const tableMessage =
    resolvedTables.length > 0
      ? "표는 감지되었지만 현재 렌더링에 적합한 data binding을 만들지 못했습니다."
      : "차트로 해석할 수 있는 표를 찾지 못했습니다. 데이터 탭에서 확정된 표를 먼저 확인하세요.";

  return {
    width: 525,
    height: 742.5,
    background: "--surface-card",
    title: "Data review needed",
    summary: "표 구조를 먼저 확인한 뒤 차트 블록을 생성해야 합니다.",
    blocks: [
      {
        id: "fallback-title",
        type: "text",
        role: "title",
        title: "Data review needed",
        message: "Data review needed",
        layout: {
          x: 28,
          y: 28,
          width: 469,
          height: 54,
        },
      },
      {
        id: "fallback-note",
        type: "note",
        role: "insight",
        title: "표 확인 필요",
        message: tableMessage,
        layout: {
          x: 28,
          y: 110,
          width: 469,
          height: 140,
        },
      },
    ],
  };
}

async function generateDashboardSpec({ tables }: { tables: ResolvedTable[] }): Promise<DashboardSpecResult> {
  if (tables.length === 0) {
    const dashboardSpec = buildFallbackDashboardSpec(tables);

    return {
      dashboardSpec,
    };
  }

  const responseText = await generateJsonText({
    prompt: buildDashboardSpecPrompt({ tables }),
    schemaName: "dashboard_spec_response",
    responseJsonSchema: GENERATED_DASHBOARD_SPEC_SCHEMA,
  });

  if (!responseText) {
    throw new Error("GPT response did not include dashboard spec output.");
  }

  const responseJson = parseGeneratedJson(responseText);

  return {
    dashboardSpec: normalizeDashboardSpec(responseJson),
  };
}

async function buildSceneFromCsv({
  csvText,
  apiLogRunId,
}: {
  csvText: string;
  apiLogRunId?: string;
}): Promise<{
  dashboardSpec: DashboardSpec;
  normalizedScene: ReturnType<typeof normalizeScene>;
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
}> {
  const grid = parseCsvGrid(csvText);
  const resolvedTablesResult = await resolveTablesWithApi({ grid, apiLogRunId });
  const dashboardSpecResult = await generateDashboardSpec({ tables: resolvedTablesResult.tables });
  const scene = renderDashboardSpecToScene({
    spec: dashboardSpecResult.dashboardSpec,
    tables: resolvedTablesResult.tables,
  });
  const normalizedScene = normalizeScene(scene);
  const chartRecommendations = createChartRecommendations(dashboardSpecResult.dashboardSpec);

  return {
    dashboardSpec: dashboardSpecResult.dashboardSpec,
    normalizedScene,
    resolvedTables: resolvedTablesResult.tables,
    chartRecommendations,
  };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const logContext = createSceneApiLogForPost({ body });
    const { dashboardSpec, normalizedScene, resolvedTables, chartRecommendations } = await buildSceneFromCsv({
      csvText,
      apiLogRunId: logContext.runId,
    });

    void writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: {
        dashboardSpec,
        resolvedTables,
        chartRecommendations,
        scene: normalizedScene,
      },
    });

    return NextResponse.json({
      scene: normalizedScene,
      resolvedTables,
      chartRecommendations,
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
