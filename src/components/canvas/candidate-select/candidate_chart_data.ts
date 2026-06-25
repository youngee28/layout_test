import type { DashboardCandidateBlock } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

export function resolveCandidateTable(
  block: DashboardCandidateBlock,
  resolvedTables: ResolvedTable[],
): ResolvedTable | null {
  const tableId = block.dataBinding?.tableId;

  if (!tableId) {
    return null;
  }

  return resolvedTables.find((table) => table.id === tableId) ?? null;
}

export function parseNumericValue(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const numeric = Number(normalized);

  return Number.isFinite(numeric) ? numeric : null;
}

export function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export type ChartDatum = {
  label: string;
  value: number;
};

export type LineChartDatum = {
  label: string;
  value: number;
  sortValue: number;
};

export type ScatterDatum = {
  x: number;
  y: number;
  label: string;
  group?: string;
};

export function buildCandidatePieData(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
  options?: { maxItems?: number },
): ChartDatum[] {
  return buildCandidateBarData(block, table, { sortBy: "value", maxItems: options?.maxItems ?? 6 });
}

export function buildCandidateScatterData(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
): ScatterDatum[] {
  const xField = block.dataBinding?.categoryField;
  const yField = block.dataBinding?.valueField;
  const groupField = block.dataBinding?.groupField;

  if (!xField || !yField) {
    return [];
  }

  return table.rows
    .map((row, index) => {
      const x = parseNumericValue(row[xField]);
      const y = parseNumericValue(row[yField]);

      if (x === null || y === null) {
        return null;
      }

      const group = groupField ? (row[groupField] ?? "").trim() || undefined : undefined;

      return {
        x,
        y,
        label: (row[xField] ?? "").trim() || `Row ${index + 1}`,
        ...(group ? { group } : {}),
      } as ScatterDatum;
    })
    .filter((item): item is ScatterDatum => item !== null);
}

export function buildCandidateBarData(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
  options?: { sortBy?: "value" | "none"; maxItems?: number },
): ChartDatum[] {
  const categoryField = block.dataBinding?.categoryField;
  const valueField = block.dataBinding?.valueField;

  if (!categoryField || !valueField) {
    return [];
  }

  const grouped = new Map<string, number>();

  table.rows.forEach((row, index) => {
    const category = (row[categoryField] ?? "").trim() || `Row ${index + 1}`;
    const value = parseNumericValue(row[valueField]);

    if (value === null) {
      return;
    }

    grouped.set(category, (grouped.get(category) ?? 0) + value);
  });

  let items = Array.from(grouped.entries()).map(([label, value]) => ({ label, value }));

  if (options?.sortBy === "value") {
    items.sort((left, right) => right.value - left.value);
  }

  if (options?.maxItems && items.length > options.maxItems) {
    const othersSum = items.slice(options.maxItems - 1).reduce((sum, item) => sum + item.value, 0);
    items = items.slice(0, options.maxItems - 1);

    if (othersSum > 0) {
      items.push({ label: "Others", value: othersSum });
    }
  }

  return items;
}

export function buildCandidateLineData(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
): LineChartDatum[] {
  const valueField = block.dataBinding?.valueField;
  const dateField = block.dataBinding?.dateField;
  const categoryField = block.dataBinding?.categoryField;
  const labelField = dateField ?? categoryField;

  if (!valueField || !labelField) {
    return [];
  }

  const items = table.rows
    .map((row, index) => {
      const label = (row[labelField] ?? "").trim() || `Row ${index + 1}`;
      const value = parseNumericValue(row[valueField]);

      if (value === null) {
        return null;
      }

      const sortValue = dateField ? Date.parse(row[dateField] ?? "") : index;

      return {
        label,
        value,
        sortValue: Number.isFinite(sortValue) ? sortValue : index,
      } satisfies LineChartDatum;
    })
    .filter((item): item is LineChartDatum => item !== null);

  items.sort((left, right) => left.sortValue - right.sortValue);

  return items;
}

export type GroupedBarSeries = {
  name: string;
  items: ChartDatum[];
};

export type GroupedBarData = {
  categories: string[];
  series: GroupedBarSeries[];
};

export function buildCandidateGroupedBarData(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
): GroupedBarData {
  const categoryField = block.dataBinding?.categoryField;
  const valueField = block.dataBinding?.valueField;
  const groupField = block.dataBinding?.groupField;

  if (!categoryField || !valueField) {
    return { categories: [], series: [] };
  }

  if (!groupField) {
    const items = buildCandidateBarData(block, table, { sortBy: "none" });

    return {
      categories: items.map((item) => item.label),
      series: [{ name: valueField, items }],
    };
  }

  const categories = Array.from(
    new Set(table.rows.map((row) => (row[categoryField] ?? "").trim()).filter(Boolean)),
  );

  const seriesNames = Array.from(
    new Set(table.rows.map((row) => (row[groupField] ?? "").trim()).filter(Boolean)),
  );

  const series: GroupedBarSeries[] = seriesNames.map((seriesName) => ({
    name: seriesName,
    items: categories.map((category) => {
      const value = table.rows
        .filter((row) => (row[categoryField] ?? "").trim() === category && (row[groupField] ?? "").trim() === seriesName)
        .reduce((sum, row) => {
          const parsed = parseNumericValue(row[valueField]);
          return parsed === null ? sum : sum + parsed;
        }, 0);

      return { label: category, value };
    }),
  }));

  return { categories, series };
}

export function buildCandidateKpiValue(
  block: DashboardCandidateBlock,
  table: ResolvedTable,
): { value: number; label: string } | null {
  const valueField = block.dataBinding?.valueField;

  if (!valueField) {
    return null;
  }

  const values = table.rows
    .map((row) => parseNumericValue(row[valueField]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  const value = values.reduce((sum, current) => sum + current, 0);

  return {
    value,
    label: block.title || valueField,
  };
}
