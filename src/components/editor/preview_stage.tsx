"use client";

import { Stage } from "react-konva";

import { KonvaRenderer } from "@/components/editor/konva_renderer";
import {
  type VisualElement,
  type VisualScene,
} from "@/schema/visual_scene";

type PreviewStageProps = {
  scene: VisualScene;
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
  onChangeElement: (element: VisualElement) => void;
  onClearSelection: () => void;
};

export function PreviewStage({
  scene,
  selectedElementId,
  onSelectElement,
  onChangeElement,
  onClearSelection,
}: PreviewStageProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-auto rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="mx-auto w-max rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-neutral-soft)]">
          <Stage
            width={scene.width}
            height={scene.height}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) {
                onClearSelection();
              }
            }}
            onTouchStart={(event) => {
              if (event.target === event.target.getStage()) {
                onClearSelection();
              }
            }}
          >
            <KonvaRenderer
              scene={scene}
              selectedElementId={selectedElementId}
              onSelectElementAction={onSelectElement}
              onChangeElementAction={onChangeElement}
              onClearSelectionAction={onClearSelection}
            />
          </Stage>
        </div>
      </div>
    </div>
  );
}
