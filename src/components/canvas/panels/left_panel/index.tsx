import { type VisualTextElement } from "@/schema/visual_scene";
import { TextEditorPanel } from "./text_editor_panel";

type LeftPanelProps = {
  selectedTextElement: VisualTextElement | null;
  onChange: (element: VisualTextElement) => void;
  onDelete: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onAddText: () => void;
};

export function LeftPanel({
  selectedTextElement,
  onChange,
  onDelete,
  onUndo,
  canUndo,
  onAddText,
}: LeftPanelProps) {
  return (
    <section className="flex min-h-[400px] flex-col gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
          Editor
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">
          편집 패널
        </h2>
      </div>

      <div className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <TextEditorPanel
          element={selectedTextElement}
          onChange={onChange}
          onDelete={onDelete}
          onUndo={onUndo}
          canUndo={canUndo}
          onAddText={onAddText}
        />
      </div>
    </section>
  );
}
