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
import { normalizeDashboardCandidates, type DashboardCandidate } from "@/schema/dashboard_candidate";
import {
  normalizeResolvedDocumentContext,
  normalizeResolvedTablesResponse,
  type ResolvedDocumentContext,
  type ResolvedTable,
} from "@/schema/resolved_table";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const RESOLVED_TABLES_SCHEMA = {
  type: "object",
  properties: {
    documentContext: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        tableContexts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tableId: { type: "string" },
              description: { type: "string" },
            },
            required: ["tableId", "description"],
          },
        },
        relationships: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tableIds: {
                type: "array",
                items: { type: "string" },
              },
              type: {
                type: "string",
                enum: ["cross_table", "supporting_context", "independent", "shared_subject", "breakdown"],
              },
              description: { type: "string" },
              confidence: { type: "number" },
              usableForCombinedDashboard: { type: "boolean" },
            },
            required: ["tableIds", "type", "description", "confidence", "usableForCombinedDashboard"],
          },
        },
      },
      required: ["tableContexts", "relationships"],
    },
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
  required: ["documentContext", "tables"],
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
          question: { type: "string" },
          viewpoint: { type: "string", enum: ["main_overview", "relationship", "detail_breakdown"] },
          sourceTableIds: {
            type: "array",
            items: { type: "string" },
          },
          mainTableId: { type: "string" },
          supportingTableIds: {
            type: "array",
            items: { type: "string" },
          },
          contextUsage: { type: "string" },
          visualizationPlan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                tableId: { type: "string" },
                chartType: {
                  type: "string",
                  enum: [
                    "kpi",
                    "bar",
                    "verticalBar",
                    "horizontalBar",
                    "groupedBar",
                    "rankingBar",
                    "line",
                    "pie",
                    "donut",
                    "scatter",
                    "matrix",
                    "funnel",
                    "area",
                    "tableSummary",
                  ],
                },
                intent: {
                  type: "string",
                  enum: ["comparison", "trend", "composition", "stage_change", "relationship", "ranking", "summary"],
                },
                fields: {
                  type: "object",
                  properties: {
                    categoryField: { type: "string" },
                    valueField: { type: "string" },
                    dateField: { type: "string" },
                    groupField: { type: "string" },
                    xField: { type: "string" },
                    yField: { type: "string" },
                  },
                },
                reason: { type: "string" },
                suitability: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["id", "tableId", "chartType", "intent", "fields", "reason"],
            },
          },
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
        required: [
          "id",
          "title",
          "summary",
          "designIntent",
          "question",
          "viewpoint",
          "sourceTableIds",
          "mainTableId",
          "supportingTableIds",
          "contextUsage",
          "visualizationPlan",
          "svgMarkup",
        ],
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
    "",
    "추가로 documentContext를 작성하세요.",
    "- title: 파일 전체 제목을 30자 이내로 추정하세요.",
    "- summary: 파일 전체 주제와 데이터 성격을 120자 이내로 요약하세요.",
    "- tableContexts: 각 table id가 파일 전체 맥락에서 무엇을 설명하는지 한 문장으로 작성하세요.",
    "- tableContexts에는 역할 분류나 중요도 판단을 넣지 마세요.",
    "- relationships: 진짜 표 간 관계가 있거나, 같은 파일 안의 독립 표라는 점을 후속 판단에 남겨야 할 때만 작성하세요.",
    "- relationship.type은 cross_table, supporting_context, independent, shared_subject, breakdown 중 하나입니다.",
    "- cross_table: 한 표의 값이 다른 표의 지표와 직접 결합/비교/계산될 수 있는 관계입니다.",
    "- supporting_context: 한 표가 다른 표의 해석 배경이나 보조 설명으로 쓰이는 관계입니다.",
    "- shared_subject: 같은 주제를 다루지만 직접 결합할 공통 key나 분석 축은 약한 관계입니다.",
    "- breakdown: 한 표가 다른 표의 하위 구성, 세부 분해, drill-down인 관계입니다.",
    "- independent: 같은 파일 안에 있지만 서로 다른 사업 지표를 보여주는 독립 표입니다.",
    "- usableForCombinedDashboard는 cross_table 또는 breakdown처럼 한 후보 안에서 같이 시각화해도 의미가 명확할 때만 true로 설정하세요.",
    "- independent 또는 shared_subject처럼 결합이 애매한 관계는 usableForCombinedDashboard=false로 설정하세요.",
    "- confidence는 0~1 사이 값입니다. 관계가 불확실하면 relationships에 넣지 말거나 confidence를 낮게 두고 usableForCombinedDashboard=false로 설정하세요.",
    "- documentContext는 후속 대시보드 후보 생성에서 파일 전체 주제, 표별 맥락, 표 간 결합 가능성을 판단하는 참고 정보로 사용됩니다.",
    "[Grid 정보]",
    JSON.stringify({
      rowCount: grid.rowCount,
      columnCount: grid.columnCount,
      rows: grid.rows.map((cells, row) => ({ row, cells })),
    }, null, 2),
  ].join("\n");
}

function buildDashboardCandidatesPrompt({
  documentContext,
  tables,
}: {
  documentContext: ResolvedDocumentContext;
  tables: ResolvedTable[];
}): string {
  return [
    "당신은 표 데이터를 분석하여 고품질 인포그래픽 대시보드를 SVG로 직접 설계하는 데이터 시각화 디자이너입니다.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요. Markdown 코드 블록은 사용하지 마세요.",
    "최상위 JSON 객체는 반드시 candidates 배열을 가져야 합니다.",
    "후보는 정확히 3개만 생성하세요.",
    "각 후보는 title, summary, designIntent, question, viewpoint, sourceTableIds, mainTableId, supportingTableIds, contextUsage, visualizationPlan, svgMarkup, usedFields, notes를 가져야 합니다.",
    "summary는 100자 이내로 작성하세요.",
    "",
    "반환 형식:",
    "{",
    '  "candidates": [',
    "    {",
    '      "id": "candidate-1",',
    '      "title": "string",',
    '      "summary": "string",',
    '      "designIntent": "string",',
    '      "question": "string",',
    '      "viewpoint": "main_overview | relationship | detail_breakdown",',
    '      "sourceTableIds": ["table id"],',
    '      "mainTableId": "table id",',
    '      "supportingTableIds": ["table id"],',
    '      "contextUsage": "string",',
    '      "visualizationPlan": [',
    "        {",
    '          "id": "viz-1",',
    '          "tableId": "table id",',
    '          "chartType": "kpi | bar | verticalBar | horizontalBar | groupedBar | rankingBar | line | pie | donut | scatter | matrix | funnel | area | tableSummary",',
    '          "intent": "comparison | trend | composition | stage_change | relationship | ranking | summary",',
    '          "fields": { "categoryField": "string", "valueField": "string" },',
    '          "reason": "string",',
    '          "suitability": "high | medium | low"',
    "        }",
    "      ],",
    '      "svgMarkup": "string",',
    '      "usedFields": ["string"],',
    '      "notes": ["string"]',
    "    }",
    "  ]",
    "}",
    "",
    "작업 순서:",
    "1. 먼저 [파일 전체 맥락]과 [확정된 표 정보]를 읽고 데이터 주제, 표별 맥락, 표 간 관계를 파악하세요.",
    "2. 각 표마다 가능한 시각화 유형을 2~4개 검토하세요.",
    "3. 데이터로 답할 수 있는 분석 질문 3개를 도출하세요.",
    "4. 각 질문에 맞춰 후보 3개의 viewpoint를 다르게 설정하세요.",
    "5. 각 후보마다 사용할 표, 필드, 차트 유형을 visualizationPlan에 먼저 기록하세요.",
    "6. 마지막에 visualizationPlan을 기준으로 svgMarkup을 생성하세요.",
    "",
    "작업 목표:",
    "- 입력된 표 데이터를 기반으로 서로 다른 관점의 인포그래픽 대시보드 후보 3개를 생성하세요.",
    "- 각 후보는 하나의 완성형 SVG 대시보드 페이지여야 합니다.",
    "- 데이터에 없는 수치, 항목명, 연도, 비율, 순위, 인사이트를 임의로 만들지 마세요.",
    "",
    "documentContext 사용 규칙:",
    "- documentContext.title과 summary를 후보의 전체 주제 판단 기준으로 사용하세요.",
    "- documentContext.tableContexts는 각 표가 무엇을 설명하는지 이해하는 참고 정보입니다.",
    "- mainTableId와 supportingTableIds는 tableContexts의 설명만으로 고정하지 말고, 실제 columns, rows, analysis, relationships를 함께 보고 선택하세요.",
    "- documentContext.relationships 중 usableForCombinedDashboard=true인 관계만 여러 표를 한 후보에 결합하는 근거로 사용하세요.",
    "- usableForCombinedDashboard=true인 관계가 있으면 후보 3개 중 최소 1개는 viewpoint=relationship으로 만들고 해당 관계의 tableIds를 sourceTableIds에 포함하세요.",
    "- type=independent 또는 usableForCombinedDashboard=false인 관계는 결합 후보 근거로 사용하지 마세요. 이 경우 표별 독립 질문이나 detail_breakdown 후보로 분리하세요.",
    "- type=shared_subject이지만 usableForCombinedDashboard=false이면 같은 주제의 독립 표로 보고, 한 화면에서 억지로 cross-table 메시지를 만들지 마세요.",
    "",
    "후보 3개 구성 규칙:",
    "- 후보 1은 가능하면 viewpoint=main_overview로 만들고 main 표 중심으로 전체 핵심 메시지를 보여주세요.",
    "- 후보 2는 표 간 관계가 유효하면 viewpoint=relationship으로 만들고, 그렇지 않으면 주요 표 내부의 지표 관계나 비교 질문으로 구성하세요.",
    "- 후보 3은 viewpoint=detail_breakdown으로 만들고 세부 구조, 순위, 구성비, 제품군/항목별 차이를 보여주세요.",
    "- 세 후보는 질문, 관점, 레이아웃, 정보 위계가 달라야 합니다.",
    "",
    // "후보 차별화 규칙:",
    // "- 후보 3개는 서로 다른 분석 관점을 가져야 합니다.",
    // "- 단순히 색상만 다른 후보를 만들지 마세요.",
    // "- 후보 3개는 서로 다른 레이아웃과 정보 위계를 가져야 합니다.",
    // "- 예: 후보 1은 퍼널 중심, 후보 2는 제품군 비교 중심, 후보 3은 이탈/성과 리더보드 중심처럼 관점이 달라야 합니다.",
    // "- 단, 데이터 성격상 적합하지 않은 관점은 억지로 만들지 마세요.",
    "",
    "시각화 설계 규칙:",
    "- 데이터가 말하는 핵심 메시지를 먼저 파악하세요.",
    "- 각 후보는 핵심 메시지를 가장 잘 전달하는 시각 표현을 선택하세요.",
    "- 수치의 크기 비교, 순위, 흐름, 구성비, 단계 변화, 격차, 집중도, 이상값 중 무엇을 보여줄지 판단하세요.",
    "- 표는 사용자가 한눈에 이해할 수 있도록 요약·비교·강조 구조로 재구성하세요.",
    "- 하나의 화면에 너무 많은 차트를 넣지 마세요.",
    // "- 핵심 차트 또는 핵심 시각 요소를 크게 배치하세요.",
    "- 모든 시각 요소는 입력 데이터에 근거해야 합니다.",
    // "",
    // "차트 품질 규칙:",
    // "- 모든 차트에는 차트 제목이 있어야 합니다.",
    // "- 모든 차트에는 항목명이 있어야 합니다.",
    // "- 수치 단위가 있는 경우 단위를 표시하세요.",
    // "- 차트가 무엇을 비교하는지 제목과 라벨만 보고 이해 가능해야 합니다.",
    // "- 하단 보조 그래프도 반드시 무엇을 나타내는지 제목, 항목명, 수치 의미를 표시하세요.",
    // "- 축/범례/항목명 없이 도형만 있는 차트는 실패입니다.",
    // "- 점만 배치된 그래프, 의미 불명확한 버블, 장식용 선 그래프는 실패입니다.",
    // "- 제목과 실제 차트 내용이 일치하지 않으면 실패입니다.",
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
    "- 동일한 차트로 구성된 후보",
    "- 항목명, 단위, 범례 없이 도형만 배치한 후보",
    "- 데이터 필드에 없는 값을 만든 후보",
    "- 제목과 차트 내용이 맞지 않는 후보",
    "- 여러 분석 질문을 한 화면에 무리하게 섞은 후보",
    "- 데이터 맥락보다 장식이 우선된 후보",
    "- 값의 상대적 크기가 시각적으로 반대로 표현된 후보",
    "",
    // "최종 점검:",
    // "- 후보를 반환하기 전에 각 후보가 어떤 분석 질문에 답하는지 내부적으로 확인하세요.",
    // "- 각 차트가 어떤 필드를 사용했는지 내부적으로 확인하세요.",
    // "- 차트가 잘리지 않는지 확인하세요.",
    // "- 항목명과 수치가 누락되지 않았는지 확인하세요.",
    // "- 단, 내부 검토 과정은 JSON에 출력하지 마세요.",
    "",
    "[파일 전체 맥락]",
    JSON.stringify(documentContext, null, 2),
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
        rows: table.rows,
      })),
      null,
      2,
    ),
  ].join("\n");
}

async function resolveTablesWithApi({
  grid,
  apiLogRunId,
}: {
  grid: ParsedCsvGrid;
  apiLogRunId?: string;
}): Promise<{ documentContext: ResolvedDocumentContext; tables: ResolvedTable[] }> {
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

async function generateDashboardCandidates({
  documentContext,
  tables,
}: {
  documentContext: ResolvedDocumentContext;
  tables: ResolvedTable[];
}): Promise<{ dashboardCandidates: DashboardCandidate[] }> {
  if (tables.length === 0) {
    throw new Error("표 정보를 찾지 못해 SVG 후보를 생성할 수 없습니다.");
  }

  const responseText = await generateJsonText({
    prompt: buildDashboardCandidatesPrompt({ documentContext, tables }),
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
    const resolvedTablesResult = await resolveTablesWithApi({ grid, apiLogRunId: logContext.runId });
    const candidateResult = await generateDashboardCandidates({
      documentContext: resolvedTablesResult.documentContext,
      tables: resolvedTablesResult.tables,
    });

    void writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: {
        documentContext: resolvedTablesResult.documentContext,
        resolvedTables: resolvedTablesResult.tables,
        dashboardCandidates: candidateResult.dashboardCandidates,
        generationStage: "candidates",
      },
    });

    return NextResponse.json({
      documentContext: resolvedTablesResult.documentContext,
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
