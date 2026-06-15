import { type CssVariableToken, type VisualTextElement } from "@/schema/visual_scene";

type TextEditorPanelProps = {
  element: VisualTextElement | null;
  onChange: (element: VisualTextElement) => void;
  onDelete?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onAddText?: () => void;
};

export function TextEditorPanel({ element, onChange, onDelete, onUndo, canUndo, onAddText }: TextEditorPanelProps) {
  const disabled = !element;

  return (
    <div className="flex flex-col gap-6">
      <button
        className="w-full rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
        onClick={() => {
          if (onAddText) onAddText();
        }}
      >
        + 텍스트 추가
      </button>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
          텍스트 속성
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">텍스트 내용</label>
        <textarea
          className="min-h-[100px] w-full resize-none rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
          placeholder="텍스트를 입력하세요"
          value={element?.text ?? ""}
          disabled={disabled}
          onChange={(e) => {
            if (element) onChange({ ...element, text: e.target.value });
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">정렬</label>
        <div className="flex gap-2">
          <button
            disabled={disabled}
            className={`flex h-10 flex-1 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !disabled && (!element?.align || element?.align === "left")
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
            }`}
            onClick={() => {
              if (element) onChange({ ...element, align: undefined });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="17" y1="18" x2="3" y2="18" />
            </svg>
          </button>
          <button
            disabled={disabled}
            className={`flex h-10 flex-1 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !disabled && element?.align === "center"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
            }`}
            onClick={() => {
              if (element) onChange({ ...element, align: "center" });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
          </button>
          <button
            disabled={disabled}
            className={`flex h-10 flex-1 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !disabled && element?.align === "right"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
            }`}
            onClick={() => {
              if (element) onChange({ ...element, align: "right" });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="10" x2="7" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="7" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">폰트</label>
        <div className="flex items-center gap-3">
          <select
            disabled={disabled}
            className="flex-1 rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
            value={element?.fontFamily ?? "--font-geist-sans"}
            onChange={(e) => {
              if (element) onChange({ ...element, fontFamily: e.target.value });
            }}
          >
            <option value="--font-geist-sans">Geist Sans</option>
            <option value="--font-geist-mono">Geist Mono</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              disabled={disabled}
              className={`flex h-10 w-10 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                !disabled && element?.fontStyle === "bold"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
              }`}
              onClick={() => {
                if (element)
                  onChange({
                    ...element,
                    fontStyle: element.fontStyle === "bold" ? "normal" : "bold",
                  });
              }}
            >
              B
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={disabled}
            className="flex h-10 w-10 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (element) onChange({ ...element, fontSize: Math.max(8, element.fontSize - 2) });
            }}
          >
            −
          </button>
          <input
            type="number"
            disabled={disabled}
            className="min-w-[3rem] rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-2 text-center text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
            value={element?.fontSize ?? ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!Number.isNaN(value) && value > 0 && element) {
                onChange({ ...element, fontSize: value });
              }
            }}
          />
          <button
            disabled={disabled}
            className="flex h-10 w-10 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (element) onChange({ ...element, fontSize: element.fontSize + 2 });
            }}
          >
            +
          </button>
          <span className="text-sm text-[var(--text-muted)]">px</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">색상</label>
        <div className="flex flex-wrap gap-2">
          {[
            "--text-primary",
            "--accent",
            "--accent-strong",
            "--text-secondary",
            "--text-muted",
          ].map((token) => (
            <button
              key={token}
              disabled={disabled}
              className={`h-8 w-8 rounded-full border-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                !disabled && element?.fill === token
                  ? "border-[var(--accent)] scale-110"
                  : "border-[var(--border-subtle)]"
              }`}
              style={{ background: `var(${token})` }}
              onClick={() => {
                if (element) onChange({ ...element, fill: token as CssVariableToken });
              }}
            />
          ))}
        </div>
      </div>

      {/* <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">레이아웃</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">X</span>
            <input
              type="number"
              disabled={disabled}
              className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
              value={element ? Math.round(element.x) : ""}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && element) {
                  onChange({ ...element, x: value });
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Y</span>
            <input
              type="number"
              disabled={disabled}
              className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
              value={element ? Math.round(element.y) : ""}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && element) {
                  onChange({ ...element, y: value });
                }
              }}
            />
          </div>
        </div>
      </div> */}

      <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex gap-2">
          <button
            disabled={disabled}
            className="flex-1 rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--accent-text)] hover:bg-[var(--accent-soft)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            삭제
          </button>
          <button
            disabled={!canUndo}
            className="flex-1 rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (onUndo) onUndo();
            }}
          >
            ↩ 되돌리기
          </button>
        </div>
      </div>
    </div>
  );
}
