const CHART_OPTION_FIELDS_SCHEMA = {
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

export const TABLE_CHART_OPTIONS_SCHEMA = {
  type: "object",
  properties: {
    chartOptionsByTable: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tableId: { type: "string" },
          tableRole: { type: "string", enum: ["primary", "supporting", "lookup", "context"] },
          tableSummary: { type: "string" },
          lenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                question: { type: "string" },
                focus: {
                  type: "string",
                  enum: [
                    "overview",
                    "trend",
                    "ranking",
                    "composition",
                    "comparison",
                    "relationship",
                    "outlier",
                    "kpi",
                    "stage_change",
                  ],
                },
                subject: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                fields: CHART_OPTION_FIELDS_SCHEMA,
                evidence: {
                  type: "object",
                  properties: {
                    rowScope: {
                      type: "string",
                      enum: ["all_rows", "top_n", "latest", "filtered", "specific_rows"],
                    },
                    rowIndexes: { type: "array", items: { type: "number" } },
                    filterDescription: { type: "string" },
                    importantCells: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          rowIndex: { type: "number" },
                          field: { type: "string" },
                          role: {
                            type: "string",
                            enum: ["max", "min", "latest", "total", "label", "comparison_base", "notable"],
                          },
                          reason: { type: "string" },
                        },
                        required: ["rowIndex", "field", "role", "reason"],
                      },
                    },
                  },
                  required: ["rowScope"],
                },
                chartOptions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
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
                          "comboBarLine",
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
                      suitability: { type: "string", enum: ["high", "medium", "low"] },
                      fields: CHART_OPTION_FIELDS_SCHEMA,
                      reason: { type: "string" },
                      risks: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "chartType", "intent", "suitability", "fields", "reason"],
                  },
                },
              },
              required: ["id", "question", "focus", "subject", "priority", "fields", "evidence", "chartOptions"],
            },
          },
        },
        required: ["tableId", "tableRole", "tableSummary", "lenses"],
      },
    },
  },
  required: ["chartOptionsByTable"],
} as const;
