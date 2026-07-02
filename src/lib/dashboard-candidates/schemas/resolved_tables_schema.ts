export const RESOLVED_TABLES_SCHEMA = {
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
              tableIds: { type: "array", items: { type: "string" } },
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
