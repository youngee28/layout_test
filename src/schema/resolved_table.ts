import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedCsvGrid } from "@/lib/data/parse_csv";

type UnknownRecord = Record<string, unknown>;

export type ResolvedTableKind = "table" | "note" | "metadata" | "titleBlock";
export type ResolvedTableShape =
  | "records"
  | "metricList"
  | "timeSeries"
  | "ranking"
  | "categoryBreakdown"
  | "crossTab"
  | "funnel"
  | "lookup";

export type ResolvedTableRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type ApiResolvedTable = {
  id: string;
  kind: ResolvedTableKind;
  tableShape: ResolvedTableShape | null;
  title?: string;
  context?: string;
  range: ResolvedTableRange;
  headerRow: number | null;
  dataStartRow: number | null;
  dataEndRow: number | null;
  confidence: number;
  reason?: string;
};

export type ResolvedDocumentTableContext = {
  tableId: string;
  description?: string;
};

export type ResolvedDocumentRelationshipType =
  | "cross_table"
  | "supporting_context"
  | "independent"
  | "shared_subject"
  | "breakdown";

export type ResolvedDocumentTableRelationship = {
  tableIds: string[];
  type: ResolvedDocumentRelationshipType;
  description: string;
  confidence: number;
  usableForCombinedDashboard: boolean;
};

export type ResolvedDocumentContext = {
  title?: string;
  summary?: string;
  tableContexts: ResolvedDocumentTableContext[];
  relationships: ResolvedDocumentTableRelationship[];
};

export type ResolvedTable = ApiResolvedTable & {
  columns: string[];
  rows: Array<Record<string, string>>;
  gridRows: string[][];
  analysis: DatasetAnalysis;
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0.5;
}

function asKind(value: unknown): ResolvedTableKind | null {
  return value === "table" || value === "note" || value === "metadata" || value === "titleBlock" ? value : null;
}

function asTableShape(value: unknown): ResolvedTableShape | null {
  return value === "records" ||
    value === "metricList" ||
    value === "timeSeries" ||
    value === "ranking" ||
    value === "categoryBreakdown" ||
    value === "crossTab" ||
    value === "funnel" ||
    value === "lookup"
    ? value
    : null;
}

function asRelationshipType(value: unknown): ResolvedDocumentRelationshipType {
  return value === "cross_table" ||
    value === "supporting_context" ||
    value === "independent" ||
    value === "shared_subject" ||
    value === "breakdown"
    ? value
    : "independent";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeRange(value: unknown, grid: ParsedCsvGrid): ResolvedTableRange | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const startRow = asInteger(raw.startRow);
  const endRow = asInteger(raw.endRow);
  const startCol = asInteger(raw.startCol);
  const endCol = asInteger(raw.endCol);

  if (
    startRow === null ||
    endRow === null ||
    startCol === null ||
    endCol === null ||
    startRow < 0 ||
    startCol < 0 ||
    endRow < startRow ||
    endCol < startCol ||
    endRow >= grid.rowCount ||
    endCol >= grid.columnCount
  ) {
    return null;
  }

  return {
    startRow,
    endRow,
    startCol,
    endCol,
  };
}

function normalizeOptionalRow(value: unknown, range: ResolvedTableRange): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const row = asInteger(value);

  if (row === null || row < range.startRow || row > range.endRow) {
    return null;
  }

  return row;
}

export function normalizeResolvedTablesResponse(input: unknown, grid: ParsedCsvGrid): ApiResolvedTable[] {
  if (!Array.isArray(input)) {
    throw new Error("Resolved tables payload must be an array.");
  }

  const tables: ApiResolvedTable[] = [];

  input.forEach((entry, index) => {
    const raw = asRecord(entry);

    if (!raw) {
      return;
    }

    const kind = asKind(raw.kind);
    const range = normalizeRange(raw.range, grid);

    if (!kind || !range) {
      return;
    }

    const headerRow = normalizeOptionalRow(raw.headerRow, range);
    const dataStartRow = normalizeOptionalRow(raw.dataStartRow, range);
    const dataEndRow = normalizeOptionalRow(raw.dataEndRow, range);

    if (kind === "table") {
      if (
        headerRow === null ||
        dataStartRow === null ||
        dataEndRow === null ||
        dataStartRow > dataEndRow ||
        headerRow >= dataStartRow
      ) {
        return;
      }
    }

    tables.push({
      id: asString(raw.id) ?? `table-${index + 1}`,
      kind,
      tableShape: kind === "table" ? (asTableShape(raw.tableShape) ?? "records") : null,
      title: asString(raw.title),
      context: asString(raw.context),
      range,
      headerRow,
      dataStartRow,
      dataEndRow,
      confidence: asConfidence(raw.confidence),
      reason: asString(raw.reason),
    });
  });

  return tables.sort(
    (left, right) => left.range.startRow - right.range.startRow || left.range.startCol - right.range.startCol,
  );
}

export function normalizeResolvedDocumentContext(input: unknown): ResolvedDocumentContext {
  const raw = asRecord(input);

  if (!raw) {
    return {
      tableContexts: [],
      relationships: [],
    };
  }

  const rawTableContexts = Array.isArray(raw.tableContexts) ? raw.tableContexts : [];
  const tableContexts = rawTableContexts.flatMap((entry): ResolvedDocumentTableContext[] => {
    const context = asRecord(entry);
    const tableId = context ? asString(context.tableId) : undefined;

    if (!context || !tableId) {
      return [];
    }

    return [
      {
        tableId,
        description: asString(context.description),
      },
    ];
  });

  const rawRelationships = Array.isArray(raw.relationships) ? raw.relationships : [];
  const relationships = rawRelationships.flatMap((entry): ResolvedDocumentTableRelationship[] => {
    const relationship = asRecord(entry);
    const tableIds = relationship ? asStringArray(relationship.tableIds) : [];
    const description = relationship ? asString(relationship.description) : undefined;

    if (!relationship || tableIds.length === 0 || !description) {
      return [];
    }

    return [
      {
        tableIds,
        type: asRelationshipType(relationship.type),
        description,
        confidence: asConfidence(relationship.confidence),
        usableForCombinedDashboard: relationship.usableForCombinedDashboard === true,
      },
    ];
  });

  return {
    title: asString(raw.title),
    summary: asString(raw.summary),
    tableContexts,
    relationships,
  };
}
