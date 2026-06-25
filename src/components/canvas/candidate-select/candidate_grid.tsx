"use client";

import { DashboardCandidateCard } from "@/components/canvas/candidate-select/dashboard_candidate_card";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

type CandidateGridProps = {
  candidates: DashboardCandidate[];
  resolvedTables: ResolvedTable[];
};

export function CandidateGrid({ candidates, resolvedTables }: CandidateGridProps) {
  if (candidates.length === 0) {
    return (
      <section className="flex min-h-[400px] items-center justify-center rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-8 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">생성된 대시보드 후보가 없습니다</p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            CSV 업로드 후 AI가 분석한 대시보드 후보가 여기에 표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-3 gap-4 overflow-y-auto">
      {candidates.map((candidate, index) => (
        <DashboardCandidateCard
          key={candidate.id}
          index={index}
          candidate={candidate}
          resolvedTables={resolvedTables}
        />
      ))}
    </section>
  );
}
