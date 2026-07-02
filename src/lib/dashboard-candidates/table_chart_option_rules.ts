import type { DashboardCandidateVisualizationChartType } from "@/schema/dashboard_candidate";
import type {
  TableAnalysisLens,
  TableChartOption,
  TableChartOptionFields,
  TableChartOptionGroup,
  TableChartRenderSupport,
} from "@/schema/table_chart_option";
import type { ResolvedTable } from "@/schema/resolved_table";

function hasField(field: string | undefined, fields: readonly string[]): field is string {
  return Boolean(field && fields.includes(field));
}

function isNumericField(field: string | undefined, table: ResolvedTable): field is string {
  return Boolean(field && table.analysis.numericColumns.includes(field));
}

function isCategoryField(field: string | undefined, table: ResolvedTable): field is string {
  return Boolean(field && table.analysis.categoryColumns.includes(field));
}

function isDateField(field: string | undefined, table: ResolvedTable): field is string {
  return Boolean(field && table.analysis.dateColumns.includes(field));
}

function getRenderSupport(chartType: DashboardCandidateVisualizationChartType): TableChartRenderSupport {
  if (chartType === "kpi" || chartType === "bar" || chartType === "rankingBar" || chartType === "line" || chartType === "comboBarLine") {
    return "stable";
  }

  if (chartType === "verticalBar" || chartType === "horizontalBar" || chartType === "pie" || chartType === "donut") {
    return "preview_only";
  }

  return "unsupported";
}

function hasEnoughLinePoints(table: ResolvedTable, xField: string, valueField: string): boolean {
  const validPointCount = table.rows.filter((row) => {
    const rawX = row[xField];
    const rawValue = row[valueField];

    return typeof rawX === "string" && rawX.trim() && typeof rawValue === "string" && rawValue.trim();
  }).length;

  return validPointCount >= 2;
}

function hasEnoughComboPoints(table: ResolvedTable, xField: string, barValueField: string, lineValueField: string): boolean {
  const validPointCount = table.rows.filter((row) => {
    const rawX = row[xField];
    const rawBarValue = row[barValueField];
    const rawLineValue = row[lineValueField];

    return typeof rawX === "string" && rawX.trim() && typeof rawBarValue === "string" && rawBarValue.trim() && typeof rawLineValue === "string" && rawLineValue.trim();
  }).length;

  return validPointCount >= 2;
}

function normalizeBarLikeFields(fields: TableChartOptionFields, table: ResolvedTable): TableChartOptionFields | null {
  const category = fields.category ?? fields.x;
  const primaryMeasure = fields.primaryMeasure ?? fields.y;

  if (!isCategoryField(category, table) || !isNumericField(primaryMeasure, table)) {
    return null;
  }

  return {
    ...fields,
    category,
    primaryMeasure,
  };
}

function normalizeLineFields(fields: TableChartOptionFields, table: ResolvedTable): TableChartOptionFields | null {
  const x = fields.date ?? fields.x ?? fields.category;
  const primaryMeasure = fields.primaryMeasure ?? fields.y;

  if (!hasField(x, table.columns) || !isNumericField(primaryMeasure, table)) {
    return null;
  }

  if (!isDateField(x, table) && !isCategoryField(x, table)) {
    return null;
  }

  if (!hasEnoughLinePoints(table, x, primaryMeasure)) {
    return null;
  }

  return {
    ...fields,
    ...(isDateField(x, table) ? { date: x } : { category: x }),
    primaryMeasure,
    x,
  };
}

function normalizeKpiFields(fields: TableChartOptionFields, table: ResolvedTable): TableChartOptionFields | null {
  const primaryMeasure = fields.primaryMeasure ?? fields.y ?? table.analysis.numericColumns[0];

  if (!isNumericField(primaryMeasure, table)) {
    return null;
  }

  return {
    ...fields,
    primaryMeasure,
  };
}

function normalizeComboBarLineFields(fields: TableChartOptionFields, table: ResolvedTable): TableChartOptionFields | null {
  const x = fields.date ?? fields.x ?? fields.category;
  const primaryMeasure = fields.primaryMeasure ?? fields.y;
  const secondaryMeasure = fields.secondaryMeasure;

  if (!hasField(x, table.columns) || !isNumericField(primaryMeasure, table) || !isNumericField(secondaryMeasure, table)) {
    return null;
  }

  if (primaryMeasure === secondaryMeasure || (!isDateField(x, table) && !isCategoryField(x, table))) {
    return null;
  }

  if (!hasEnoughComboPoints(table, x, primaryMeasure, secondaryMeasure)) {
    return null;
  }

  return {
    ...fields,
    ...(isDateField(x, table) ? { date: x } : { category: x }),
    primaryMeasure,
    secondaryMeasure,
    x,
  };
}

function normalizePieLikeFields(fields: TableChartOptionFields, table: ResolvedTable): TableChartOptionFields | null {
  const normalizedFields = normalizeBarLikeFields(fields, table);

  if (!normalizedFields || table.rows.length > 8) {
    return null;
  }

  return normalizedFields;
}

function normalizeOptionFields(option: TableChartOption, table: ResolvedTable): TableChartOptionFields | null {
  if (
    option.chartType === "bar" ||
    option.chartType === "verticalBar" ||
    option.chartType === "horizontalBar" ||
    option.chartType === "rankingBar" ||
    option.chartType === "groupedBar"
  ) {
    return normalizeBarLikeFields(option.fields, table);
  }

  if (option.chartType === "line" || option.chartType === "area") {
    return normalizeLineFields(option.fields, table);
  }

  if (option.chartType === "kpi") {
    return normalizeKpiFields(option.fields, table);
  }

  if (option.chartType === "comboBarLine") {
    if (!(option.intent === "trend" || option.intent === "relationship" || option.intent === "comparison")) {
      return null;
    }

    return normalizeComboBarLineFields(option.fields, table);
  }

  if (option.chartType === "pie" || option.chartType === "donut") {
    return normalizePieLikeFields(option.fields, table);
  }

  if (option.chartType === "funnel") {
    return table.tableShape === "funnel" ? normalizeBarLikeFields(option.fields, table) : null;
  }

  return null;
}

function normalizeLensChartOptions(lens: TableAnalysisLens, table: ResolvedTable): TableChartOption[] {
  return lens.chartOptions.flatMap((option) => {
    const normalizedFields = normalizeOptionFields(option, table);

    if (!normalizedFields) {
      return [];
    }

    return [
      {
        ...option,
        renderSupport: getRenderSupport(option.chartType),
        fields: normalizedFields,
      },
    ];
  });
}

export function applyTableChartOptionRules({
  chartOptionsByTable,
  tables,
}: {
  readonly chartOptionsByTable: readonly TableChartOptionGroup[];
  readonly tables: readonly ResolvedTable[];
}): TableChartOptionGroup[] {
  return chartOptionsByTable.flatMap((group): TableChartOptionGroup[] => {
    const table = tables.find((candidate) => candidate.id === group.tableId);

    if (!table) {
      return [];
    }

    const lenses = group.lenses.flatMap((lens): TableAnalysisLens[] => {
      const chartOptions = normalizeLensChartOptions(lens, table);

      if (chartOptions.length === 0) {
        return [];
      }

      return [
        {
          ...lens,
          chartOptions,
        },
      ];
    });

    if (lenses.length === 0) {
      return [];
    }

    return [
      {
        ...group,
        lenses,
      },
    ];
  });
}
