"use client";

import { useMemo, useState } from "react";

import type { ResolvedTable } from "@/schema/resolved_table";

type DataTablePanelProps = {
  resolvedTables: ResolvedTable[];
};

function getTableLabel(table: ResolvedTable, index: number): string {
  return table.title?.trim() || `표 ${index + 1}`;
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
      {resolvedTables.map((table) => {
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
            <span className="block">{getTableLabel(table, resolvedTables.findIndex((t) => t.id === table.id))}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DataTablePanel({ resolvedTables }: DataTablePanelProps) {
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
        title="업로드된 데이터가 없습니다"
        description="CSV 업로드가 완료되면 여기서 파싱된 표를 확인할 수 있습니다."
      />
    );
  }

  return (
    <section className="flex min-h-0 flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">Data</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">데이터 테이블</h2>
      </div>

      <TableSelector
        resolvedTables={resolvedTables}
        selectedTableId={selectedTable?.id ?? null}
        onSelect={setSelectedTableId}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3">
        {selectedTable && selectedTableIndex >= 0 ? (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {getTableLabel(selectedTable, selectedTableIndex)}
            </p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
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
                  <tr
                    key={`${selectedTable.id}-preview-row-${rowIndex}`}
                    className="odd:bg-[var(--surface-panel)] even:bg-[var(--surface-muted)]/60"
                  >
                    {selectedTable.columns.map((column) => (
                      <td
                        key={`${selectedTable.id}-${rowIndex}-${column}`}
                        className="border-b border-[var(--border-subtle)] px-3 py-2 align-top text-[var(--text-primary)] last:border-r-0"
                      >
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
    </section>
  );
}
