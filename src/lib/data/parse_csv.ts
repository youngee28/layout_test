export type ParsedDataset = {
  columns: string[];
  rows: Array<Record<string, string>>;
};

export type ParsedCsvGrid = {
  rows: string[][];
  rowCount: number;
  columnCount: number;
};

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

function normalizeHeader(header: string, index: number): string {
  return header.trim() || `column_${index + 1}`;
}

export function parseCsvGrid(csvText: string): ParsedCsvGrid {
  const rawRows = parseCsvRows(csvText);
  const columnCount = rawRows.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = rawRows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));

  return {
    rows,
    rowCount: rows.length,
    columnCount,
  };
}

export function parseCsv(csvText: string): ParsedDataset {
  const grid = parseCsvGrid(csvText);

  if (grid.rowCount === 0) {
    return {
      columns: [],
      rows: [],
    };
  }

  const columns = grid.rows[0].map((header, index) => normalizeHeader(header, index));
  const dataRows = grid.rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};

    columns.forEach((column, index) => {
      row[column] = cells[index] ?? "";
    });

    return row;
  });

  return {
    columns,
    rows: dataRows,
  };
}
