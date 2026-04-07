const fileTypes = ["CSV", "XLSX"] as const;

export function UploadCard() {
  return (
    <button
      type="button"
      className="group relative block w-full overflow-hidden rounded-[var(--radius-shell)] border border-[var(--border-strong)] bg-[var(--surface-card)] p-4 text-left shadow-[var(--shadow-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-accent-hover)] sm:p-6"
    >
      <div className="absolute inset-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-dashed border-[var(--border-strong)] bg-[image:var(--upload-card-gradient)]" />

      <div className="relative flex min-h-[20rem] flex-col items-center justify-center gap-6 px-4 py-8 text-center sm:px-10">
        <div className="flex size-20 items-center justify-center rounded-[var(--radius-card)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[var(--shadow-card)] group-hover:-translate-y-1">
          <svg
            aria-hidden="true"
            className="size-9"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 16V8M12 8L8.75 11.25M12 8L15.25 11.25"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.25 19.25H16.75C18.5449 19.25 20 17.7949 20 16V15.7C20 14.307 18.893 13.2 17.5 13.2C17.4527 13.2 17.4061 13.202 17.3602 13.2058C16.8074 10.5677 14.4684 8.58331 11.6667 8.58331C8.45501 8.58331 5.83337 11.205 5.83337 14.4166C5.83337 14.5313 5.83671 14.6452 5.84335 14.7581C4.76185 15.1661 4 16.2107 4 17.4333C4 19.0135 5.27647 20.2899 6.85671 20.2899"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            CSV, XLSX 파일을 업로드하세요
          </p>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            드래그 앤 드롭하거나 클릭해서 파일을 선택하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {fileTypes.map((fileType) => (
            <span
              key={fileType}
              className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold tracking-[0.18em] text-[var(--text-secondary)]"
            >
              {fileType}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
