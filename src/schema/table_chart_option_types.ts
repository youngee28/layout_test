import type { DashboardCandidateVisualizationChartType, DashboardCandidateVisualizationIntent } from "@/schema/dashboard_candidate";

export type TableChartOptionTableRole = "primary" | "supporting" | "lookup" | "context";

export type TableAnalysisLensFocus =
  | "overview"
  | "trend"
  | "ranking"
  | "composition"
  | "comparison"
  | "relationship"
  | "outlier"
  | "kpi"
  | "stage_change";

export type TableChartOptionPriority = "high" | "medium" | "low";
export type TableChartOptionSuitability = "high" | "medium" | "low";
export type TableChartRenderSupport = "stable" | "preview_only" | "unsupported";
export type TableChartOptionCellRole =
  | "max"
  | "min"
  | "latest"
  | "total"
  | "label"
  | "comparison_base"
  | "notable";

export type TableChartOptionFields = {
  readonly primaryMeasure?: string;
  readonly secondaryMeasure?: string;
  readonly category?: string;
  readonly date?: string;
  readonly group?: string;
  readonly x?: string;
  readonly y?: string;
};

export type TableChartOptionEvidence = {
  readonly rowScope: "all_rows" | "top_n" | "latest" | "filtered" | "specific_rows";
  readonly rowIndexes?: readonly number[];
  readonly filterDescription?: string;
  readonly importantCells?: readonly {
    readonly rowIndex: number;
    readonly field: string;
    readonly role: TableChartOptionCellRole;
    readonly reason: string;
  }[];
};

export type TableChartOption = {
  readonly id: string;
  readonly chartType: DashboardCandidateVisualizationChartType;
  readonly intent: DashboardCandidateVisualizationIntent;
  readonly suitability: TableChartOptionSuitability;
  readonly renderSupport: TableChartRenderSupport;
  readonly reason: string;
  readonly fields: TableChartOptionFields;
  readonly risks?: readonly string[];
};

export type TableAnalysisLens = {
  readonly id: string;
  readonly question: string;
  readonly focus: TableAnalysisLensFocus;
  readonly subject: string;
  readonly priority: TableChartOptionPriority;
  readonly fields: TableChartOptionFields;
  readonly evidence: TableChartOptionEvidence;
  readonly chartOptions: readonly TableChartOption[];
};

export type TableChartOptionGroup = {
  readonly tableId: string;
  readonly tableRole: TableChartOptionTableRole;
  readonly tableSummary: string;
  readonly lenses: readonly TableAnalysisLens[];
};
