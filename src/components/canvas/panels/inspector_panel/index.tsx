"use client";

import { useMemo, useState } from "react";

import type { ChartRecommendation } from "@/schema/chart_recommendation";
import type { ResolvedTable } from "@/schema/resolved_table";
import { type VisualElement } from "@/schema/visual_scene";

type InspectorPanelProps = {
  selectedElement: VisualElement | null;
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
};

function renderValue(value: unknown): string {
  if (value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function getChartTypeLabel(chartType: ChartRecommendation["chartType"]): string {
  if (chartType === "rankingBar") {
    return "Ranking Bar";
  }

  if (chartType === "kpi") {
    return "KPI";
  }

  if (chartType === "line") {
    return "Line";
  }

  return "Bar";
}

function RecommendationCard({ recommendation }: { recommendation: ChartRecommendation }) {
  const fields = [
    recommendation.usedFields.categoryField ? `category: ${recommendation.usedFields.categoryField}` : null,
    recommendation.usedFields.valueField ? `value: ${recommendation.usedFields.valueField}` : null,
    recommendation.usedFields.dateField ? `date: ${recommendation.usedFields.dateField}` : null,
    recommendation.usedFields.groupField ? `group: ${recommendation.usedFields.groupField}` : null,
  ].filter((value): value is string => value !== null);

  return (
    <article className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3 text-xs text-[var(--text-secondary)]">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{recommendation.title ?? getChartTypeLabel(recommendation.chartType)}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-text)]">
          {getChartTypeLabel(recommendation.chartType)}
          {recommendation.intent ? ` · ${recommendation.intent}` : ""}
        </p>
      </div>

      <div className="mt-3 rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">사용 필드</p>
        <p className="mt-1 leading-5 text-[var(--text-primary)]">{fields.join(" / ") || "필드 정보 없음"}</p>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">전달 메시지</p>
        <p className="mt-1 leading-6 text-[var(--text-primary)]">{recommendation.message ?? "메시지 정보 없음"}</p>
      </div>
    </article>
  );
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
            className={`rounded-[calc(var(--radius-card)-0.5rem)] border px-3 py-2 text-xs font-semibold transition ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
            }`}
          >
            표 {index + 1}
          </button>
        );
      })}
    </div>
  );
}

function SelectionDebugPanel({ selectedElement }: { selectedElement: VisualElement | null }) {
  const isDataMark = selectedElement?.role === "dataMark";

  if (!selectedElement) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] px-4 text-center leading-6">
        요소를 선택하면 role, chartId, dataRef 같은 디버깅 정보를 여기서 확인할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">현재 선택</p>
        <p className="mt-1 break-all leading-6">{selectedElement.id}</p>
      </div>

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-xs leading-5">
        <dt className="text-[var(--text-muted)]">type</dt>
        <dd className="break-all text-[var(--text-primary)]">{selectedElement.type}</dd>

        <dt className="text-[var(--text-muted)]">role</dt>
        <dd className="break-all text-[var(--text-primary)]">{selectedElement.role ?? "-"}</dd>

        <dt className="text-[var(--text-muted)]">chartId</dt>
        <dd className="break-all text-[var(--text-primary)]">{selectedElement.chartId ?? "-"}</dd>

        <dt className="text-[var(--text-muted)]">groupId</dt>
        <dd className="break-all text-[var(--text-primary)]">{selectedElement.groupId ?? "-"}</dd>

        <dt className="text-[var(--text-muted)]">editable</dt>
        <dd className="text-[var(--text-primary)]">{renderValue(selectedElement.editable)}</dd>

        <dt className="text-[var(--text-muted)]">locked</dt>
        <dd className="text-[var(--text-primary)]">{renderValue(selectedElement.locked)}</dd>
      </dl>

      {isDataMark ? (
        <div className="rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            dataMark debug
          </p>
          <dl className="mt-3 grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-xs leading-5">
            <dt className="text-[var(--text-muted)]">rowKey</dt>
            <dd className="break-all text-[var(--text-primary)]">{selectedElement.dataRef?.rowKey ?? "-"}</dd>

            <dt className="text-[var(--text-muted)]">field</dt>
            <dd className="break-all text-[var(--text-primary)]">{selectedElement.dataRef?.field ?? "-"}</dd>

            <dt className="text-[var(--text-muted)]">value</dt>
            <dd className="break-all text-[var(--text-primary)]">{renderValue(selectedElement.dataRef?.value)}</dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function DataDebugPanel({ resolvedTables }: { resolvedTables: ResolvedTable[] }) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(resolvedTables[0]?.id ?? null);

  const selectedTable = useMemo(() => {
    if (resolvedTables.length === 0) {
      return null;
    }

    return resolvedTables.find((table) => table.id === selectedTableId) ?? resolvedTables[0] ?? null;
  }, [resolvedTables, selectedTableId]);

  if (resolvedTables.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] px-4 text-center leading-6">
        API가 확정한 표 데이터가 아직 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TableSelector resolvedTables={resolvedTables} selectedTableId={selectedTable?.id ?? null} onSelect={setSelectedTableId} />

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-2">
        {selectedTable ? (
          <table className="min-w-full border-collapse text-[11px] leading-5">
            <tbody>
              {selectedTable.gridRows.map((row, rowIndex) => {
                const absoluteRowIndex = selectedTable.range.startRow + rowIndex;
                const isHeaderRow = absoluteRowIndex === selectedTable.headerRow;

                return (
                  <tr
                    key={`${selectedTable.id}-row-${rowIndex}`}
                    className={`border-b border-[var(--border-subtle)] last:border-b-0 ${
                      isHeaderRow ? "bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${selectedTable.id}-cell-${rowIndex}-${cellIndex}`}
                        className={`px-2 py-1 align-top text-[var(--text-primary)] ${
                          isHeaderRow ? "font-semibold text-[var(--accent)]" : ""
                        }`}
                      >
                        {cell || "·"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

function ChartRecommendationPanel({
  resolvedTables,
  chartRecommendations,
}: {
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(resolvedTables[0]?.id ?? null);

  const selectedTable = useMemo(() => {
    if (resolvedTables.length === 0) {
      return null;
    }

    return resolvedTables.find((table) => table.id === selectedTableId) ?? resolvedTables[0] ?? null;
  }, [resolvedTables, selectedTableId]);

  const selectedRecommendations = useMemo(() => {
    if (!selectedTable) {
      return [] as ChartRecommendation[];
    }

    return chartRecommendations.filter((candidate) => candidate.tableId === selectedTable.id);
  }, [chartRecommendations, selectedTable]);

  if (resolvedTables.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] px-4 text-center leading-6">
        API가 확정한 표 데이터가 아직 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TableSelector resolvedTables={resolvedTables} selectedTableId={selectedTable?.id ?? null} onSelect={setSelectedTableId} />

      {selectedRecommendations.length > 0 ? (
        <div className="min-h-0 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {selectedRecommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      ) : (
        <div className="rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] px-4 py-6 text-center text-sm leading-6 text-[var(--text-secondary)]">
          이 표에 연결된 차트 추천 카드가 아직 없습니다.
        </div>
      )}
    </div>
  );
}

export function InspectorPanel({ selectedElement, resolvedTables, chartRecommendations }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"data" | "chart" | "elements">("data");

  return (
    <aside className="flex min-h-[400px] flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
          Inspector
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">
          데이터 / 차트 / 요소 확인
        </h2>
      </div>

      <div className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("data")}
          className={`rounded-[var(--radius-pill)] px-3 py-1.5 transition ${
            activeTab === "data"
              ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          데이터
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chart")}
          className={`rounded-[var(--radius-pill)] px-3 py-1.5 transition ${
            activeTab === "chart"
              ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          차트
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("elements")}
          className={`rounded-[var(--radius-pill)] px-3 py-1.5 transition ${
            activeTab === "elements"
              ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          요소
        </button>
      </div>

      <div className="min-h-0 flex-1 rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
        {activeTab === "data" ? (
          <DataDebugPanel resolvedTables={resolvedTables} />
        ) : activeTab === "chart" ? (
          <ChartRecommendationPanel resolvedTables={resolvedTables} chartRecommendations={chartRecommendations} />
        ) : (
          <SelectionDebugPanel selectedElement={selectedElement} />
        )}
      </div>
    </aside>
  );
}
