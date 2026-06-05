"use client";

import { useCallback, useState } from "react";
import { Stage } from "react-konva";

import { KonvaRenderer } from "@/components/editor/konva_renderer";
import {
  initialVisualScene,
  type VisualElement,
  type VisualScene,
} from "@/schema/visual_scene";

type PreviewStageProps = {
  initialScene?: VisualScene;
};

export function PreviewStage({ initialScene = initialVisualScene }: PreviewStageProps) {
  const [scene, setScene] = useState<VisualScene>(initialScene);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    initialScene.elements[0]?.id ?? null,
  );

  const handleChangeElement = useCallback((nextElement: VisualElement) => {
    setScene((currentScene) => ({
      ...currentScene,
      elements: currentScene.elements.map((element) =>
        element.id === nextElement.id ? nextElement : element,
      ),
    }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-auto rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="mx-auto w-max rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-neutral-soft)]">
          <Stage
            width={scene.width}
            height={scene.height}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedElementId(null);
              }
            }}
            onTouchStart={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedElementId(null);
              }
            }}
          >
            <KonvaRenderer
              scene={scene}
              selectedElementId={selectedElementId}
              onSelectElementAction={setSelectedElementId}
              onChangeElementAction={handleChangeElement}
              onClearSelectionAction={() => setSelectedElementId(null)}
            />
          </Stage>
        </div>
      </div>
    </div>
  );
}
