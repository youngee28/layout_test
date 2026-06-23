"use client";

import { useMemo, useState } from "react";

import type { ChartRecommendation } from "@/schema/chart_recommendation";
import type { ResolvedTable } from "@/schema/resolved_table";

type DataSectionProps = {
  resolvedTables: ResolvedTable[];
  chartRecommendations: ChartRecommendation[];
};

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{recommendation.title ?? getChartTypeLabel(recommendation.chartType)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-text)]">
            {getChartTypeLabel(recommendation.chartType)}
            {recommendation.intent ? ` · ${recommendation.intent}` : ""}
          </p>
        </div>
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

export function DataSection({ resolvedTables, chartRecommendations }: DataSectionProps) {
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  const selectedTable = useMemo(() => {
    if (resolvedTables.length === 0) {
      return null;
    }

    return resolvedTables[selectedTableIndex] ?? resolvedTables[0] ?? null;
  }, [resolvedTables, selectedTableIndex]);

  const selectedRecommendations = useMemo(() => {
    if (!selectedTable) {
      return [] as ChartRecommendation[];
    }

    return chartRecommendations.filter((candidate) => candidate.tableId === selectedTable.id);
  }, [chartRecommendations, selectedTable]);

  return (
    <section className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">Data</p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-[var(--text-primary)]">데이터 섹션</h3>
      </div>

      {resolvedTables.length === 0 ? (
        <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] px-4 text-center text-sm leading-6 text-[var(--text-secondary)]">
          API가 확정한 표 데이터가 아직 없습니다.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {resolvedTables.map((table, index) => {
              const isActive = (selectedTable?.id ?? resolvedTables[0]?.id) === table.id;

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setSelectedTableIndex(index)}
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

          <div className="max-h-[240px] overflow-x-auto overflow-y-auto rounded-[calc(var(--radius-card)-0.75rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-2">
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

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">추천 차트</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">이 표를 기준으로 API가 추천한 차트 유형입니다.</p>
            </div>

            {selectedRecommendations.length > 0 ? (
              <div className="flex flex-col gap-3">
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
        </div>
      )}
    </section>
  );
}
