import { PreviewStage } from "@/components/canvas/editor/preview_stage";
import { type VisualElement, type VisualScene } from "@/schema/visual_scene";

type CenterPanelProps = {
  scene: VisualScene | null;
  sceneKey: string;
  selectedElementId: string | null;
  pendingEditId: string | null;
  errorMessage: string | null;
  onSelectElement: (elementId: string) => void;
  onChangeElement: (element: VisualElement) => void;
  onClearSelection: () => void;
  onClearPendingEditAction: () => void;
};

export function CenterPanel({
  scene,
  sceneKey,
  selectedElementId,
  pendingEditId,
  errorMessage,
  onSelectElement,
  onChangeElement,
  onClearSelection,
  onClearPendingEditAction,
}: CenterPanelProps) {
  return (
    <section className="min-w-0">
      {scene ? (
        <PreviewStage
          key={sceneKey}
          scene={scene}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onChangeElement={onChangeElement}
          onClearSelection={onClearSelection}
          pendingEditId={pendingEditId}
          onClearPendingEditAction={onClearPendingEditAction}
        />
      ) : (
        <div className="rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-8 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <p className="font-semibold text-[var(--text-primary)]">Scene unavailable</p>
          <p className="mt-2 leading-7">
            {errorMessage ?? "The scene could not be generated from the uploaded CSV or input/data.csv."}
          </p>
        </div>
      )}
    </section>
  );
}
