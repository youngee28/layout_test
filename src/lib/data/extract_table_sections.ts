import { analyzeDataset, type DatasetAnalysis } from "@/lib/data/analyze_dataset";
import { parseCsvGrid, type ParsedCsvGrid, type ParsedDataset } from "@/lib/data/parse_csv";

export type TableRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type TableSection = {
  id: string;
  title?: string;
  range: TableRange;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  repeatedHeaderRows: number[];
  columns: string[];
  dataset: ParsedDataset;
  analysis: DatasetAnalysis;
  previewRows: string[][];
};

export type TableSectionAnalysis = {
  grid: ParsedCsvGrid;
  tables: TableSection[];
};

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => !cell.trim());
}

function getNonEmptyCellIndices(row: string[]): number[] {
  return row.flatMap((cell, index) => (cell.trim() ? [index] : []));
}

function normalizeHeaderValue(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHeaderRow(row: string[]): string[] {
  return row.map(normalizeHeaderValue);
}

function rowsMatchHeader(left: string[], right: string[]): boolean {
  const leftValues = normalizeHeaderRow(left);
  const rightValues = normalizeHeaderRow(right);
  const leftNonEmptyCount = leftValues.filter(Boolean).length;
  const rightNonEmptyCount = rightValues.filter(Boolean).length;

  if (leftNonEmptyCount < 2 || rightNonEmptyCount != leftNonEmptyCount || rightValues.length != leftValues.length) {
    return false;
  }

  return leftValues.every((value, index) => value === rightValues[index]);
}

function normalizeColumnName(value: string, index: number): string {
  return value.trim() || `column_${index + 1}`;
}

function detectCoarseRanges(grid: ParsedCsvGrid): Array<{ startRow: number; endRow: number }> {
  const ranges: Array<{ startRow: number; endRow: number }> = [];
  let startRow: number | null = null;

  grid.rows.forEach((row, rowIndex) => {
    if (isRowEmpty(row)) {
      if (startRow !== null) {
        ranges.push({ startRow, endRow: rowIndex - 1 });
        startRow = null;
      }

      return;
    }

    if (startRow === null) {
      startRow = rowIndex;
    }
  });

  if (startRow !== null) {
    ranges.push({ startRow, endRow: grid.rowCount - 1 });
  }

  return ranges;
}

function resolveHeaderAndTitle(rows: string[][], startRow: number, endRow: number): { title?: string; headerRow: number } {
  if (startRow >= endRow) {
    return { headerRow: startRow };
  }

  const currentRow = rows[startRow];
  const nextRow = rows[startRow + 1];
  const currentNonEmpty = getNonEmptyCellIndices(currentRow);
  const nextNonEmpty = getNonEmptyCellIndices(nextRow);

  if (currentNonEmpty.length === 1 && nextNonEmpty.length >= 2) {
    return {
      title: currentRow[currentNonEmpty[0]],
      headerRow: startRow + 1,
    };
  }

  return { headerRow: startRow };
}

function extractSegmentRows(grid: ParsedCsvGrid, range: TableRange): string[][] {
  return grid.rows.slice(range.startRow, range.endRow + 1).map((row) => row.slice(range.startCol, range.endCol + 1));
}

function buildDatasetFromRange(grid: ParsedCsvGrid, headerRow: number, dataStartRow: number, dataEndRow: number, startCol: number, endCol: number): ParsedDataset {
  const headerSlice = grid.rows[headerRow].slice(startCol, endCol + 1);
  const columns = headerSlice.map((value, index) => normalizeColumnName(value, index));
  const rows = grid.rows.slice(dataStartRow, dataEndRow + 1).map((row) => {
    const record: Record<string, string> = {};
    const slice = row.slice(startCol, endCol + 1);

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

function buildTableSectionsForRange(grid: ParsedCsvGrid, startRow: number, endRow: number, offset = 0): TableSection[] {
  const sections: TableSection[] = [];
  let cursor = startRow;
  let sectionIndex = offset;

  while (cursor <= endRow) {
    const { title, headerRow } = resolveHeaderAndTitle(grid.rows, cursor, endRow);
    const headerValues = grid.rows[headerRow];
    const repeatedHeaderRows: number[] = [];
    let nextSplit = endRow + 1;

    for (let rowIndex = headerRow + 1; rowIndex <= endRow; rowIndex += 1) {
      if (rowsMatchHeader(headerValues, grid.rows[rowIndex])) {
        repeatedHeaderRows.push(rowIndex);
        nextSplit = rowIndex;
        break;
      }
    }

    const segmentEndRow = nextSplit - 1;
    const rangeRows = grid.rows.slice(cursor, segmentEndRow + 1);
    const nonEmptyIndices = rangeRows.flatMap((row) => getNonEmptyCellIndices(row));

    if (nonEmptyIndices.length === 0) {
      cursor = nextSplit;
      continue;
    }

    const startCol = Math.min(...nonEmptyIndices);
    const endCol = Math.max(...nonEmptyIndices);
    const dataStartRow = headerRow + 1;
    const dataEndRow = segmentEndRow;

    if (dataStartRow > dataEndRow) {
      cursor = nextSplit;
      continue;
    }

    const dataset = buildDatasetFromRange(grid, headerRow, dataStartRow, dataEndRow, startCol, endCol);

    if (dataset.columns.length >= 2 && dataset.rows.length >= 1) {
      const sectionRange = {
        startRow: cursor,
        endRow: segmentEndRow,
        startCol,
        endCol,
      } satisfies TableRange;

      sections.push({
        id: `table-${sectionIndex + 1}`,
        title,
        range: sectionRange,
        headerRow,
        dataStartRow,
        dataEndRow,
        repeatedHeaderRows,
        columns: dataset.columns,
        dataset,
        analysis: analyzeDataset(dataset),
        previewRows: extractSegmentRows(grid, sectionRange).slice(0, 8),
      });
      sectionIndex += 1;
    }

    cursor = nextSplit;
  }

  return sections;
}

export function extractTableSectionsFromCsv(csvText: string): TableSectionAnalysis {
  const grid = parseCsvGrid(csvText);
  const coarseRanges = detectCoarseRanges(grid);
  const tables: TableSection[] = [];

  coarseRanges.forEach((range) => {
    const sections = buildTableSectionsForRange(grid, range.startRow, range.endRow, tables.length);
    tables.push(...sections);
  });

  return {
    grid,
    tables,
  };
}
