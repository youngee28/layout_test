const sidebarLabels = {
  title: "이전 작업 세션",
  action: "새 표 분석",
  empty: "저장된 대화 내역이 없습니다.",
} as const;

export function LandingSidebar() {
  return (
    <aside className="order-2 rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:order-1 lg:p-5">
      <div className="flex h-full flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-4 lg:p-5">
        <div className="space-y-2 border-b border-[var(--border-subtle)] pb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {sidebarLabels.title}
          </h2>
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:-translate-y-0.5"
          >
            <svg
              aria-hidden="true"
              className="mr-2 size-4"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4.16669V15.8334M4.16663 10H15.8333"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {sidebarLabels.action}
          </button>
        </div>

        <div className="flex min-h-48 flex-1 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] bg-[var(--surface-card)] text-[var(--text-muted)] shadow-[var(--shadow-neutral-soft)]">
              <svg
                aria-hidden="true"
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 9.5H16M8 13H13.5M7.8 19H16.2C17.8802 19 18.7202 19 19.362 18.673C19.9265 18.3854 20.3854 17.9265 20.673 17.362C21 16.7202 21 15.8802 21 14.2V9.8C21 8.11984 21 7.27976 20.673 6.63803C20.3854 6.07354 19.9265 5.6146 19.362 5.32698C18.7202 5 17.8802 5 16.2 5H7.8C6.11984 5 5.27976 5 4.63803 5.32698C4.07354 5.6146 3.6146 6.07354 3.32698 6.63803C3 7.27976 3 8.11984 3 9.8V14.2C3 15.8802 3 16.7202 3.32698 17.362C3.6146 17.9265 4.07354 18.3854 4.63803 18.673C5.27976 19 6.11984 19 7.8 19Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-sm font-medium leading-7 text-[var(--text-secondary)]">
              {sidebarLabels.empty}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
