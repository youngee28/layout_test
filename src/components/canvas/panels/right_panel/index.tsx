export function RightPanel() {
  return (
    <aside className="flex min-h-[400px] flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
          System Prompt
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">
          시스템 프롬프트
        </h2>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-center text-sm leading-6 text-[var(--text-secondary)]">
        시스템 프롬프트 영역
      </div>
    </aside>
  );
}
