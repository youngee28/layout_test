import { PreviewStage } from "@/components/canvas/editor/preview_stage";
import { type VisualElement, type VisualScene } from "@/schema/visual_element";

type CenterPanelProps = {
  scene: VisualScene | null;
  sceneKey: string;
  selectedElementId: string | null;
  pendingEditId: string | null;
  errorMessage: string | null;
  generationStage: "candidates" | "ready";
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
  generationStage,
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
          <p className="font-semibold text-[var(--text-primary)]">
            {generationStage === "candidates" ? "캔버스 준비중" : "Scene unavailable"}
          </p>
          <p className="mt-2 leading-7">
            {generationStage === "candidates"
              ? "대시보드 탭에서 인포그래픽 후보를 먼저 비교해 주세요. 아직 최종 캔버스 장면을 생성하지 않습니다."
              : errorMessage ?? "Upload a CSV on the home page to generate a scene."}
          </p>
        </div>
      )}
    </section>
  );
}
