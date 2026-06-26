"use client";

import { useMemo } from "react";

import { CandidateBlockRenderer } from "@/components/canvas/candidate-select/candidate_block_renderer";
import { sanitizeSvg } from "@/lib/svg/sanitize_svg";
import type { DashboardCandidate, DashboardCandidateBlock } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

type DashboardCandidateCardProps = {
  candidate: DashboardCandidate;
  index: number;
  resolvedTables: ResolvedTable[];
};

export function DashboardCandidateCard({
  candidate,
  index,
  resolvedTables,
}: DashboardCandidateCardProps) {
  const sanitizedSvgMarkup = useMemo(() => {
    return candidate.svgPreview?.markup ? sanitizeSvg(candidate.svgPreview.markup) : null;
  }, [candidate.svgPreview?.markup]);

  const fallbackBlocks = candidate.blocks ?? [];

  return (
    <article className="flex h-full min-h-0 flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-soft)]">
      <header className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-text)]">
              대시보드 {index + 1}
            </p>
            <h3 className="truncate text-lg font-bold tracking-tight text-[var(--text-primary)]">{candidate.title}</h3>
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{candidate.summary}</p>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
        {sanitizedSvgMarkup && candidate.svgPreview ? (
          <div className="relative h-full w-full overflow-hidden rounded-[calc(var(--radius-card)-0.75rem)] bg-[var(--surface-panel)] p-2">
            <div
              className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
              style={{ aspectRatio: `${candidate.svgPreview.width} / ${candidate.svgPreview.height}` }}
              dangerouslySetInnerHTML={{ __html: sanitizedSvgMarkup }}
            />
          </div>
        ) : (
          <div className="relative h-full w-full rounded-[calc(var(--radius-card)-0.75rem)] bg-[var(--surface-panel)]">
            {fallbackBlocks.map((block) => (
              <CandidateBlock
                key={block.id}
                block={block}
                resolvedTables={resolvedTables}
              />
            ))}
          </div>
        )}
      </div>

      {candidate.usedFields && candidate.usedFields.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
          {candidate.usedFields.map((field) => (
            <span key={field} className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-1">
              {field}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CandidateBlock({
  block,
  resolvedTables,
}: {
  block: DashboardCandidateBlock;
  resolvedTables: ResolvedTable[];
}) {
  const { x, y, width, height } = block.layout;

  return (
    <div
      className="absolute overflow-hidden rounded-[calc(var(--radius-card)-1rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-2 shadow-[var(--shadow-neutral-soft)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      <CandidateBlockRenderer block={block} resolvedTables={resolvedTables} />
    </div>
  );
}
