import type { ResolvedTable } from "@/schema/resolved_table";

export type TableProfile = {
  rowCount: number;
  columnCount: number;
  columns: string[];
  numericColumns: string[];
  hasEmptyValues: boolean;
  hasUnits: boolean;
  unitSignals: string[];
};

const UNIT_PATTERNS: RegExp[] = [
  /%/,
  /\b(?:krw|usd|eur|jpy)\b/i,
  /[₩$€¥]/,
  /\b(?:kg|g|mg|lb|oz|ton|t)\b/i,
  /\b(?:km|m|cm|mm)\b/i,
  /\b(?:l|ml)\b/i,
  /\b(?:°c|℃|°f)\b/i,
  /\b(?:h|hr|min|sec)\b/i,
  /(?:원|만원|억원|달러|유로|엔|명|건|개|잔|시간|분|초|톤|kg|km|m²|㎡)/i,
];

function normalizeSignal(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasUnitSignal(value: string): boolean {
  return UNIT_PATTERNS.some((pattern) => pattern.test(value));
}

function collectUnitSignals(table: ResolvedTable): string[] {
  const signals = new Set<string>();

  table.columns.forEach((column) => {
    if (hasUnitSignal(column)) {
      signals.add(normalizeSignal(column));
    }
  });

  table.rows.forEach((row) => {
    table.columns.forEach((column) => {
      const value = row[column]?.trim();

      if (value && hasUnitSignal(value) && signals.size < 4) {
        signals.add(normalizeSignal(value));
      }
    });
  });

  return Array.from(signals).slice(0, 4);
}

export function createTableProfile(table: ResolvedTable): TableProfile {
  const unitSignals = collectUnitSignals(table);

  return {
    rowCount: table.rows.length,
    columnCount: table.columns.length,
    columns: table.columns,
    numericColumns: table.analysis.numericColumns,
    hasEmptyValues: table.rows.some((row) => table.columns.some((column) => !(row[column] ?? "").trim())),
    hasUnits: unitSignals.length > 0,
    unitSignals,
  };
}
