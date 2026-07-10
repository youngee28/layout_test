import type {
  DashboardCandidateVisualizationChartType,
  DashboardCandidateVisualizationIntent,
} from "@/schema/dashboard_candidate";
import type {
  TableChartOptionFields,
  TableChartOptionPriority,
  TableChartOptionSuitability,
} from "@/schema/table_chart_option";

export type DashboardBriefPurposeType =
  | "executive_overview"
  | "performance_monitoring"
  | "diagnostic_analysis"
  | "segment_comparison"
  | "trend_monitoring"
  | "detail_breakdown"
  | "relationship_analysis";

export type DashboardBriefKpiRole = "primary" | "supporting" | "diagnostic" | "context";

export type DashboardBriefKpiAggregation = "sum" | "average" | "count" | "min" | "max" | "latest" | "ratio" | "none";

export type DashboardBriefChartRoleType =
  | "summary"
  | "trend"
  | "breakdown"
  | "ranking"
  | "composition"
  | "diagnostic"
  | "detail"
  | "relationship";

export type DashboardBriefInsight = {
  readonly id: string;
  readonly statement: string;
  readonly evidence: string;
  readonly tableIds: readonly string[];
  readonly priority: TableChartOptionPriority;
};

export type DashboardBriefKpi = {
  readonly id: string;
  readonly name: string;
  readonly role: DashboardBriefKpiRole;
  readonly tableId: string;
  readonly field?: string;
  readonly aggregation: DashboardBriefKpiAggregation;
  readonly calculation: string;
  readonly reason: string;
  readonly unit?: string;
};

export type DashboardBriefChartCandidate = {
  readonly id: string;
  readonly tableId: string;
  readonly chartType: DashboardCandidateVisualizationChartType;
  readonly intent: DashboardCandidateVisualizationIntent;
  readonly suitability: TableChartOptionSuitability;
  readonly fields: TableChartOptionFields;
  readonly reason: string;
  readonly risks?: readonly string[];
};

export type DashboardBriefChartRole = {
  readonly id: string;
  readonly role: DashboardBriefChartRoleType;
  readonly title: string;
  readonly purpose: string;
  readonly question?: string;
  readonly priority: TableChartOptionPriority;
  readonly tableIds: readonly string[];
  readonly requiredKpis: readonly string[];
  readonly chartCandidates: readonly DashboardBriefChartCandidate[];
};

export type DashboardBrief = {
  readonly id: string;
  readonly title: string;
  readonly purposeType: DashboardBriefPurposeType;
  readonly purpose: string;
  readonly audienceOrUseCase: string;
  readonly primaryQuestion?: string;
  readonly summary: string;
  readonly sourceTableIds: readonly string[];
  readonly mainTableId: string;
  readonly supportingTableIds: readonly string[];
  readonly insights: readonly DashboardBriefInsight[];
  readonly kpis: readonly DashboardBriefKpi[];
  readonly chartRoles: readonly DashboardBriefChartRole[];
  readonly candidateStrategy: string;
};
