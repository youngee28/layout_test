import { analyzeDataset } from "@/lib/data/analyze_dataset";
import type { ParsedCsvGrid, ParsedDataset } from "@/lib/data/parse_csv";
import type { ApiResolvedTable, ResolvedTable } from "@/schema/resolved_table";

function normalizeColumnName(value: string, index: number): string {
  return value.trim() || `column_${index + 1}`;
}

function buildDatasetFromResolvedTable(grid: ParsedCsvGrid, table: ApiResolvedTable): ParsedDataset {
  if (table.headerRow === null || table.dataStartRow === null || table.dataEndRow === null) {
    throw new Error(`Resolved table ${table.id} is missing required row coordinates.`);
  }

  const headerSlice = grid.rows[table.headerRow].slice(table.range.startCol, table.range.endCol + 1);
  const columns = headerSlice.map((value, index) => normalizeColumnName(value, index));
  const rows = grid.rows.slice(table.dataStartRow, table.dataEndRow + 1).map((row) => {
    const record: Record<string, string> = {};
    const slice = row.slice(table.range.startCol, table.range.endCol + 1);

    columns.forEach((column, index) => {
      record[column] = slice[index] ?? "";
    });

    return record;
  });

  return {
    columns,
    rows,
  };
}

export function buildResolvedTables({
  grid,
  resolvedTables,
}: {
  grid: ParsedCsvGrid;
  resolvedTables: ApiResolvedTable[];
}): ResolvedTable[] {
  return resolvedTables
    .filter((table) => table.kind === "table")
    .map((table) => {
      const dataset = buildDatasetFromResolvedTable(grid, table);
      const gridRows = grid.rows
        .slice(table.range.startRow, table.range.endRow + 1)
        .map((row) => row.slice(table.range.startCol, table.range.endCol + 1));

      return {
        ...table,
        columns: dataset.columns,
        rows: dataset.rows,
        gridRows,
        analysis: analyzeDataset(dataset),
      } satisfies ResolvedTable;
    })
    .filter((table) => table.columns.length > 0 && table.rows.length > 0);
}
