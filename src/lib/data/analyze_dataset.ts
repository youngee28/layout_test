import type { ParsedDataset } from "@/lib/data/parse_csv";

export type ColumnAnalysis = {
  name: string;
  type: "number" | "date" | "category" | "text";
  sampleValues: string[];
};

export type DatasetAnalysis = {
  columns: ColumnAnalysis[];
  numericColumns: string[];
  categoryColumns: string[];
  dateColumns: string[];
};

function getSampleValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim()))).slice(0, 5);
}

function isNumericValue(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return false;
  }

  return Number.isFinite(Number(normalized));
}

function isDateValue(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function inferColumnType(values: string[]): ColumnAnalysis["type"] {
  const nonEmptyValues = values.filter((value) => value.trim());

  if (nonEmptyValues.length === 0) {
    return "text";
  }

  const numericCount = nonEmptyValues.filter(isNumericValue).length;
  const dateCount = nonEmptyValues.filter(isDateValue).length;
  const uniqueCount = new Set(nonEmptyValues).size;

  if (numericCount === nonEmptyValues.length) {
    return "number";
  }

  if (dateCount === nonEmptyValues.length) {
    return "date";
  }

  if (uniqueCount <= Math.max(12, Math.ceil(nonEmptyValues.length * 0.5))) {
    return "category";
  }

  return "text";
}

export function analyzeDataset(dataset: ParsedDataset): DatasetAnalysis {
  const columns = dataset.columns.map((columnName) => {
    const values = dataset.rows.map((row) => row[columnName] ?? "");
    const type = inferColumnType(values);

    return {
      name: columnName,
      type,
      sampleValues: getSampleValues(values),
    } satisfies ColumnAnalysis;
  });

  return {
    columns,
    numericColumns: columns.filter((column) => column.type === "number").map((column) => column.name),
    categoryColumns: columns.filter((column) => column.type === "category").map((column) => column.name),
    dateColumns: columns.filter((column) => column.type === "date").map((column) => column.name),
  };
}
