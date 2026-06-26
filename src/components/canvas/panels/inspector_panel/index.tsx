"use client";

import { useMemo, useState } from "react";

import type { ChartRecommendation } from "@/schema/chart_recommendation";
import type {
  DashboardCandidate as DashboardPlanningCandidate,
  DashboardCandidateBlock,
  DashboardCandidatePreviewBlock,
  DashboardCandidatePreviewIcon,
} from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

type InspectorPanelProps = {
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
  dashboardCandidates?: DashboardPlanningCandidate[];
};

type DashboardCandidateCard = {
  id: string;
  title: string;
  summary: string;
  tableLabel: string;
  blockCount: number;
  chartTypes: string[];
  fields: string[];
  goal?: string;
  narrative?: string;
  layoutStrategy?: string;
  viewpoints?: string[];
  thumbnailCandidate?: DashboardPlanningCandidate;
  blocks: Array<{
    id: string;
    title: string;
    chartType: string;
    message: string;
    fields: string[];
  }>;
};

function getChartTypeLabel(chartType: ChartRecommendation["chartType"]): string {
  if (chartType === "rankingBar") {
    return "rankingBar";
  }

  if (chartType === "kpi") {
    return "KPI";
  }

  if (chartType === "line") {
    return "line chart";
  }

  return "bar chart";
}

function getTableLabel(table: ResolvedTable, index: number): string {
  return table.title?.trim() || `표 ${index + 1}`;
}

function getRecommendationFields(recommendation: ChartRecommendation): string[] {
  return [
    recommendation.usedFields.categoryField,
    recommendation.usedFields.valueField,
    recommendation.usedFields.dateField,
    recommendation.usedFields.groupField,
  ].filter((field): field is string => Boolean(field));
}

function TableSelector({
  resolvedTables,
  selectedTableId,
  onSelect,
}: {
  resolvedTables: ResolvedTable[];
  selectedTableId: string | null;
  onSelect: (tableId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {resolvedTables.map((table, index) => {
        const isActive = (selectedTableId ?? resolvedTables[0]?.id) === table.id;

        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect(table.id)}
            className={`rounded-[calc(var(--radius-card)-0.5rem)] border px-3 py-2 text-left text-xs font-semibold transition ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
            }`}
          >
            <span className="block">표 {index + 1}</span>
            {/* <span className="mt-1 block text-[10px] font-medium text-[var(--text-secondary)]">{getTableLabel(table, index)}</span> */}
          </button>
        );
      })}
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-panel)] px-5 text-center">
      <div className="max-w-sm space-y-2">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function FinalDataPanel({ resolvedTables }: { resolvedTables: ResolvedTable[] }) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(resolvedTables[0]?.id ?? null);

  const selectedTable = useMemo(() => {
    if (resolvedTables.length === 0) {
      return null;
    }

    return resolvedTables.find((table) => table.id === selectedTableId) ?? resolvedTables[0] ?? null;
  }, [resolvedTables, selectedTableId]);

  const selectedTableIndex = useMemo(() => {
    if (!selectedTable) {
      return -1;
    }

    return resolvedTables.findIndex((table) => table.id === selectedTable.id);
  }, [resolvedTables, selectedTable]);

  if (resolvedTables.length === 0) {
    return (
      <EmptyPanel
        title="업로드된 최종 데이터가 없습니다"
        description="파일 업로드 전에는 표 미리보기와 해석 정보가 비어 있습니다. CSV 업로드가 완료되면 여기서 파싱된 표를 바로 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TableSelector resolvedTables={resolvedTables} selectedTableId={selectedTable?.id ?? null} onSelect={setSelectedTableId} />

      <div className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          {selectedTable && selectedTableIndex >= 0 ? (
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {getTableLabel(selectedTable, selectedTableIndex)}</p>
          ) : null}
        </div>
      

        <div className="mt-3 max-h-[260px] overflow-x-auto overflow-y-auto">
          {selectedTable ? (
            <table className="min-w-full border-separate border-spacing-0 text-left text-[12px] leading-5">
              <thead>
                <tr>
                  {selectedTable.columns.map((column) => (
                    <th
                      key={`${selectedTable.id}-${column}`}
                      className="sticky top-0 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedTable.rows.map((row, rowIndex) => (
                  <tr key={`${selectedTable.id}-preview-row-${rowIndex}`} className="odd:bg-[var(--surface-panel)] even:bg-[var(--surface-muted)]/60">
                    {selectedTable.columns.map((column) => (
                      <td key={`${selectedTable.id}-${rowIndex}-${column}`} className="border-b border-[var(--border-subtle)] px-3 py-2 align-top text-[var(--text-primary)] last:border-r-0">
                        {row[column]?.trim() ? row[column] : "·"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

    </div>
  );
}

function DashboardCandidateSelector({
  candidates,
  selectedCandidateId,
  onSelect,
}: {
  candidates: DashboardCandidateCard[];
  selectedCandidateId: string | null;
  onSelect: (candidateId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-1">
      {candidates.map((candidate, index) => {
        const isActive = candidate.id === selectedCandidateId;

        return (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate.id)}
            className={`rounded-[calc(var(--radius-card)-0.5rem)] border p-4 text-left transition ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-soft)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-panel)] hover:bg-[var(--surface-accent)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-text)]">대시보드 {index + 1}</p>
                <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{candidate.title}</h3>
              </div>
              <span className="rounded-full border border-[var(--border-subtle)] bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] dark:bg-slate-900/50">
                {candidate.blockCount} blocks
              </span>
            </div>
            {candidate.thumbnailCandidate ? <DashboardCandidateThumbnail candidate={candidate.thumbnailCandidate} /> : null}
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{candidate.summary}</p>
          </button>
        );
      })}
    </div>
  );
}

function getPreviewIcon(block: DashboardCandidateBlock): DashboardCandidatePreviewIcon {
  if (block.type === "metric" || block.chartType === "kpi") return "kpi";
  if (block.chartType === "line") return "line";
  if (block.chartType === "pie") return "pie";
  if (block.chartType === "donut") return "donut";
  if (block.chartType === "scatter") return "scatter";
  if (block.chartType === "rankingBar") return "rankingBar";
  if (block.chartType === "horizontalBar") return "horizontalBar";
  if (block.chartType === "groupedBar") return "groupedBar";
  if (block.chartType === "verticalBar") return "verticalBar";
  return "bar";
}

function getPreviewLabel(block: DashboardCandidateBlock): string {
  return block.title.trim().slice(0, 12) || "블록";
}

function getPreviewBlocks(candidate: DashboardPlanningCandidate): DashboardCandidatePreviewBlock[] {
  const previewBlocks = candidate.preview?.blocks ?? [];
  const blocks = candidate.blocks ?? [];

  if (previewBlocks.length > 0) {
    return previewBlocks;
  }

  return blocks.map((block) => ({
    id: block.id,
    previewLabel: getPreviewLabel(block),
    previewIcon: getPreviewIcon(block),
    role: block.role,
    x: block.layout.x,
    y: block.layout.y,
    width: block.layout.width,
    height: block.layout.height,
  }));
}

function getPreviewPalette(previewIcon: DashboardCandidatePreviewIcon, role: DashboardCandidatePreviewBlock["role"]) {
  if (role === "hero") {
    return {
      panel: "bg-[linear-gradient(180deg,var(--accent-soft),var(--surface-panel))]",
      accent: "bg-[var(--accent)]/80",
      text: "text-[var(--accent)]",
    };
  }

  if (previewIcon === "kpi") {
    return {
      panel: "bg-[var(--surface-panel)]",
      accent: "bg-emerald-500/70",
      text: "text-emerald-700 dark:text-emerald-300",
    };
  }

  if (previewIcon === "line") {
    return {
      panel: "bg-sky-500/8",
      accent: "bg-sky-500/70",
      text: "text-sky-700 dark:text-sky-300",
    };
  }

  if (previewIcon === "scatter") {
    return {
      panel: "bg-violet-500/8",
      accent: "bg-violet-500/70",
      text: "text-violet-700 dark:text-violet-300",
    };
  }

  if (previewIcon === "pie" || previewIcon === "donut") {
    return {
      panel: "bg-fuchsia-500/8",
      accent: "bg-fuchsia-500/70",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
    };
  }

  if (previewIcon === "horizontalBar" || previewIcon === "groupedBar") {
    return {
      panel: "bg-amber-500/8",
      accent: "bg-amber-500/70",
      text: "text-amber-700 dark:text-amber-300",
    };
  }

  return {
    panel: "bg-indigo-500/8",
    accent: "bg-indigo-500/70",
    text: "text-indigo-700 dark:text-indigo-300",
  };
}

function PreviewGlyph({ previewIcon }: { previewIcon: DashboardCandidatePreviewIcon }) {
  if (previewIcon === "kpi") {
    return <div className="flex gap-1"><div className="h-2 w-2 rounded-full bg-current" /><div className="h-2 w-6 rounded-full bg-current/70" /></div>;
  }

  if (previewIcon === "line") {
    return <div className="flex h-5 items-end gap-[3px]">{[35, 60, 45, 80, 55].map((height, index) => <div key={`${previewIcon}-${index}`} className="w-1 rounded-full bg-current" style={{ height: `${height}%` }} />)}</div>;
  }

  if (previewIcon === "scatter") {
    return <div className="relative h-5 w-6">{[[2, 14], [8, 8], [14, 12], [18, 4]].map(([left, top], index) => <span key={`scatter-${index}`} className="absolute h-1.5 w-1.5 rounded-full bg-current" style={{ left, top }} />)}</div>;
  }

  if (previewIcon === "pie" || previewIcon === "donut") {
    return <div className="h-5 w-5 rounded-full border-[4px] border-current/35 border-r-current" />;
  }

  if (previewIcon === "horizontalBar" || previewIcon === "groupedBar") {
    return <div className="flex flex-col gap-[3px] w-full max-w-[3rem]">{[70, 50, 85, 40].map((width, index) => <div key={`${previewIcon}-${index}`} className="h-1.5 rounded-full bg-current" style={{ width: `${width}%` }} />)}</div>;
  }

  return <div className="flex h-5 items-end gap-[3px]">{[50, 80, 45, 65].map((height, index) => <div key={`${previewIcon}-${index}`} className="w-1.5 rounded-t-sm bg-current" style={{ height: `${height}%` }} />)}</div>;
}

function DashboardCandidateThumbnail({ candidate }: { candidate: DashboardPlanningCandidate }) {
  const previewBlocks = getPreviewBlocks(candidate);

  return (
    <div className="relative mt-4 overflow-hidden rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3 shadow-[var(--shadow-neutral-soft)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_70%)] opacity-60" />
      <div className="relative aspect-[3/4] rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2">
        <div className="h-full rounded-[calc(var(--radius-card)-0.875rem)] bg-[var(--surface-panel)] p-2">
          <div className="mb-2 rounded-[calc(var(--radius-card)-1rem)] border border-[var(--border-subtle)] bg-[var(--accent-soft)]/70 px-3 py-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{candidate.title}</p>
          </div>
          <div className="relative h-[calc(100%-2.25rem)]">
            {previewBlocks.map((block) => {
              const palette = getPreviewPalette(block.previewIcon, block.role);

              return (
              <div
                key={block.id}
                className={`absolute overflow-hidden rounded-[0.7rem] border border-[var(--border-subtle)] ${palette.panel}`}
                style={{
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  width: `${block.width}%`,
                  height: `${block.height}%`,
                }}
              >
                <div className="flex h-full flex-col justify-between p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`min-w-0 ${palette.text}`}>
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em]">{block.previewIcon}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-[var(--text-primary)]">{block.previewLabel}</p>
                    </div>
                  </div>
                  <div className={`mt-2 flex min-h-0 flex-1 items-end justify-start ${palette.text}`}>
                    <PreviewGlyph previewIcon={block.previewIcon} />
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({ resolvedTables, chartRecommendations }: { resolvedTables: ResolvedTable[]; chartRecommendations: ChartRecommendation[] }) {
  const candidates = useMemo(() => {
    return resolvedTables
      .map((table, index) => {
        const recommendations = chartRecommendations.filter((candidate) => candidate.tableId === table.id);

        if (recommendations.length === 0) {
          return null;
        }

        const blocks = recommendations.map((recommendation) => ({
          id: recommendation.id,
          title: recommendation.title ?? `${getChartTypeLabel(recommendation.chartType)} 블록`,
          chartType: getChartTypeLabel(recommendation.chartType),
          message: recommendation.message ?? "요약 메시지가 아직 없습니다.",
          fields: getRecommendationFields(recommendation),
        }));
        const chartTypes = Array.from(new Set(blocks.map((block) => block.chartType)));
        const fields = Array.from(new Set(blocks.flatMap((block) => block.fields)));

        return {
          id: `dashboard-${table.id}`,
          title: `${getTableLabel(table, index)} 기반 대시보드`,
          summary: `${recommendations.length}개의 추천 블록을 바탕으로 현재 생성 가능한 대시보드 구성을 요약했습니다.`,
          tableLabel: getTableLabel(table, index),
          blockCount: blocks.length,
          chartTypes,
          fields,
          blocks,
        } satisfies DashboardCandidateCard;
      })
      .filter((candidate): candidate is DashboardCandidateCard => candidate !== null)
      .slice(0, 3);
  }, [chartRecommendations, resolvedTables]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidates[0]?.id ?? null);

  const selectedCandidate = useMemo(() => {
    if (candidates.length === 0) {
      return null;
    }

    return candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null;
  }, [candidates, selectedCandidateId]);

  if (candidates.length === 0) {
    return (
      <EmptyPanel
        title="생성된 대시보드 후보가 없습니다"
        description={resolvedTables.length === 0
          ? "아직 업로드된 표 데이터가 없어 대시보드 후보를 만들 수 없습니다. 먼저 CSV를 업로드해 주세요."
          : "현재 chartRecommendations 또는 dashboardSpec 기반 후보 정보가 없어 빈 상태로 표시합니다."}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">대시보드 후보 목록</p>
      </div>

      <DashboardCandidateSelector candidates={candidates} selectedCandidateId={selectedCandidate?.id ?? null} onSelect={setSelectedCandidateId} />
    </div>
  );
}

function DashboardCandidatePanel({ dashboardCandidates }: { dashboardCandidates: DashboardPlanningCandidate[] }) {
  const candidates = useMemo(() => {
    return dashboardCandidates.map((candidate) => {
      const blocks = candidate.blocks ?? [];
      const fields = Array.from(
        new Set(
          blocks.flatMap((block) => [
            block.dataBinding?.categoryField,
            block.dataBinding?.valueField,
            block.dataBinding?.dateField,
            block.dataBinding?.groupField,
          ].filter((field): field is string => Boolean(field))),
        ),
      );
      const chartTypes = Array.from(new Set(blocks.flatMap((block) => (block.chartType ? [block.chartType] : []))));

        return {
          id: candidate.id,
          title: candidate.title,
          summary: candidate.summary,
          tableLabel: candidate.sourceTableIds?.join(", ") || "연결 표 정보 없음",
          blockCount: blocks.length,
        chartTypes,
        fields,
        blocks: blocks.map((block) => ({
          id: block.id,
          title: block.title,
          chartType: block.chartType ?? block.type,
          message: block.description ?? `${block.role} · ${block.priority}`,
          fields: [
            block.dataBinding?.categoryField,
            block.dataBinding?.valueField,
            block.dataBinding?.dateField,
            block.dataBinding?.groupField,
          ].filter((field): field is string => Boolean(field)),
        })),
        goal: candidate.goal,
        narrative: candidate.narrative,
        layoutStrategy: candidate.layoutStrategy,
        viewpoints: candidate.viewpoints,
        thumbnailCandidate: candidate,
      } satisfies DashboardCandidateCard;
    });
  }, [dashboardCandidates]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidates[0]?.id ?? null);

  const selectedCandidate = useMemo(() => {
    if (candidates.length === 0) {
      return null;
    }

    return candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null;
  }, [candidates, selectedCandidateId]);

  if (candidates.length === 0) {
    return (
      <EmptyPanel
        title="생성된 대시보드 후보가 없습니다"
        description="인포그래픽 방향 후보를 아직 만들지 못했습니다. 다시 업로드하거나 데이터를 확인해 주세요."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">대시보드 후보</p>
      </div>

      <DashboardCandidateSelector candidates={candidates} selectedCandidateId={selectedCandidate?.id ?? null} onSelect={setSelectedCandidateId} />
    </div>
  );
}

export function InspectorPanel({ resolvedTables, chartRecommendations, dashboardCandidates }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"finalData" | "dashboard">(
    dashboardCandidates && dashboardCandidates.length > 0 ? "dashboard" : "finalData",
  );

  return (
    <aside className="flex min-h-[400px] flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">Inspector</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">데이터 확인</h2>
      </div>

      <div className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("finalData")}
          className={`rounded-[var(--radius-pill)] px-3 py-1.5 transition ${
            activeTab === "finalData"
              ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          데이터 테이블
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`rounded-[var(--radius-pill)] px-3 py-1.5 transition ${
            activeTab === "dashboard"
              ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          대시보드
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
        {activeTab === "finalData" ? (
          <FinalDataPanel resolvedTables={resolvedTables} />
        ) : (
          dashboardCandidates && dashboardCandidates.length > 0
            ? <DashboardCandidatePanel dashboardCandidates={dashboardCandidates} />
            : <DashboardPanel resolvedTables={resolvedTables} chartRecommendations={chartRecommendations} />
        )}
      </div>
    </aside>
  );
}
