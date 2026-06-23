import type { DatasetAnalysis } from "@/lib/data/analyze_dataset";
import type { ParsedCsvGrid } from "@/lib/data/parse_csv";

type UnknownRecord = Record<string, unknown>;

export type ResolvedTableKind = "table" | "note" | "metadata" | "titleBlock";

export type ResolvedTableRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type ApiResolvedTable = {
  id: string;
  kind: ResolvedTableKind;
  title?: string;
  context?: string;
  range: ResolvedTableRange;
  headerRow: number | null;
  dataStartRow: number | null;
  dataEndRow: number | null;
  confidence: number;
  reason?: string;
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
