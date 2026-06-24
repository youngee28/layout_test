"use client";

import { useMemo, useState } from "react";

import type { ChartRecommendation } from "@/schema/chart_recommendation";
import type { ResolvedTable } from "@/schema/resolved_table";

type InspectorPanelProps = {
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
};

type DashboardCandidate = {
  id: string;
  title: string;
  summary: string;
  tableLabel: string;
  blockCount: number;
  chartTypes: string[];
  fields: string[];
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
  candidates: DashboardCandidate[];
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
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{candidate.summary}</p>
            <p className="mt-3 text-[11px] font-medium text-[var(--text-secondary)]">기준 데이터: {candidate.tableLabel}</p>
          </button>
        );
      })}
    </div>
  );
}

function DashboardSummaryPanel({ candidate }: { candidate: DashboardCandidate }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">선택된 대시보드 요약</p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-[var(--text-primary)]">{candidate.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{candidate.summary}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">주요 구성 블록</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{candidate.blocks.map((block) => block.title).join(", ") || "구성 블록 정보 없음"}</p>
          </div>
          <div className="rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">사용 차트 유형</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{candidate.chartTypes.join(", ") || "표시 가능한 차트 유형 없음"}</p>
          </div>
          <div className="rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-3 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">사용 데이터 필드</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{candidate.fields.join(", ") || "필드 정보 없음"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">생성된 블록 목록</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">현재 repo에서 안정적으로 지원하는 KPI, line chart, bar chart, rankingBar 유형만 표시합니다.</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {candidate.blocks.map((block) => (
            <article key={block.id} className="rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{block.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-text)]">{block.chartType}</p>
                </div>
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {block.fields.length} fields
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{block.message}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-primary)]">사용 데이터 필드: {block.fields.join(", ") || "필드 정보 없음"}</p>
            </article>
          ))}
        </div>
      </section>
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
        } satisfies DashboardCandidate;
      })
      .filter((candidate): candidate is DashboardCandidate => candidate !== null)
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

      {selectedCandidate ? <DashboardSummaryPanel candidate={selectedCandidate} /> : null}
    </div>
  );
}

export function InspectorPanel({ resolvedTables, chartRecommendations }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"finalData" | "dashboard">("finalData");

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
          <DashboardPanel resolvedTables={resolvedTables} chartRecommendations={chartRecommendations} />
        )}
      </div>
    </aside>
  );
}
