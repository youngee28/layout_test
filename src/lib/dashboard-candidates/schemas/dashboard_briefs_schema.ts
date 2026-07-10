const DASHBOARD_BRIEF_FIELDS_SCHEMA = {
  type: "object",
  properties: {
    primaryMeasure: { type: "string" },
    secondaryMeasure: { type: "string" },
    category: { type: "string" },
    date: { type: "string" },
    group: { type: "string" },
    x: { type: "string" },
    y: { type: "string" },
  },
} as const;

const DASHBOARD_BRIEF_CHART_TYPES = [
  "kpi",
  "bar",
  "verticalBar",
  "horizontalBar",
  "groupedBar",
  "rankingBar",
  "line",
  "pie",
  "donut",
  "comboBarLine",
  "scatter",
  "matrix",
  "funnel",
  "area",
  "tableSummary",
] as const;

export const DASHBOARD_BRIEFS_SCHEMA = {
  type: "object",
  properties: {
    dashboardBriefs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          purposeType: {
            type: "string",
            enum: [
              "executive_overview",
              "performance_monitoring",
              "diagnostic_analysis",
              "segment_comparison",
              "trend_monitoring",
              "detail_breakdown",
              "relationship_analysis",
            ],
          },
          purpose: { type: "string" },
          audienceOrUseCase: { type: "string" },
          primaryQuestion: { type: "string" },
          summary: { type: "string" },
          sourceTableIds: { type: "array", items: { type: "string" } },
          mainTableId: { type: "string" },
          supportingTableIds: { type: "array", items: { type: "string" } },
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                statement: { type: "string" },
                evidence: { type: "string" },
                tableIds: { type: "array", items: { type: "string" } },
                priority: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["id", "statement", "evidence", "tableIds", "priority"],
            },
          },
          kpis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                role: { type: "string", enum: ["primary", "supporting", "diagnostic", "context"] },
                tableId: { type: "string" },
                field: { type: "string" },
                aggregation: {
                  type: "string",
                  enum: ["sum", "average", "count", "min", "max", "latest", "ratio", "none"],
                },
                calculation: { type: "string" },
                reason: { type: "string" },
                unit: { type: "string" },
              },
              required: ["id", "name", "role", "tableId", "aggregation", "calculation", "reason"],
            },
          },
          chartRoles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                role: {
                  type: "string",
                  enum: ["summary", "trend", "breakdown", "ranking", "composition", "diagnostic", "detail", "relationship"],
                },
                title: { type: "string" },
                purpose: { type: "string" },
                question: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                tableIds: { type: "array", items: { type: "string" } },
                requiredKpis: { type: "array", items: { type: "string" } },
                chartCandidates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      tableId: { type: "string" },
                      chartType: { type: "string", enum: DASHBOARD_BRIEF_CHART_TYPES },
                      intent: {
                        type: "string",
                        enum: ["comparison", "trend", "composition", "stage_change", "relationship", "ranking", "summary"],
                      },
                      suitability: { type: "string", enum: ["high", "medium", "low"] },
                      fields: DASHBOARD_BRIEF_FIELDS_SCHEMA,
                      reason: { type: "string" },
                      risks: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "tableId", "chartType", "intent", "suitability", "fields", "reason"],
                  },
                },
              },
              required: ["id", "role", "title", "purpose", "priority", "tableIds", "requiredKpis", "chartCandidates"],
            },
          },
          candidateStrategy: { type: "string" },
        },
        required: [
          "id",
          "title",
          "purposeType",
          "purpose",
          "audienceOrUseCase",
          "summary",
          "sourceTableIds",
          "mainTableId",
          "supportingTableIds",
          "insights",
          "kpis",
          "chartRoles",
          "candidateStrategy",
        ],
      },
    },
  },
  required: ["dashboardBriefs"],
} as const;
