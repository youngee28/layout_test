"use client";

import { CandidateGrid } from "@/components/canvas/candidate-select/candidate_grid";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

type CandidateSelectLayoutProps = {
  resolvedTables: ResolvedTable[];
  dashboardCandidates: DashboardCandidate[];
};

export function CandidateSelectLayout({
  resolvedTables,
  dashboardCandidates,
}: CandidateSelectLayoutProps) {
  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-6">
      {/* <DataTablePanel resolvedTables={resolvedTables} /> */}
      <CandidateGrid
        candidates={dashboardCandidates}
        resolvedTables={resolvedTables}
      />
    </div>
  );
}
