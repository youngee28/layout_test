"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const selectedElement = useMemo(
    () => scene.elements.find((element) => element.id === selectedElementId) ?? null,
    [scene.elements, selectedElementId],
  );

  const handleChangeElement = useCallback((nextElement: VisualElement) => {
    setScene((currentScene) => ({
      ...currentScene,
      elements: currentScene.elements.map((element) =>
        element.id === nextElement.id ? nextElement : element,
      ),
    }));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setScene((currentScene) => {
      if (!selectedElementId) {
        return currentScene;
      }

      return {
        ...currentScene,
        elements: currentScene.elements.filter((element) => element.id !== selectedElementId),
      };
    });
    setSelectedElementId(null);
  }, [selectedElementId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedElementId) {
        return;
      }

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelected, selectedElementId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Canvas editor</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Select, drag, resize, and double click the text to edit it.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            {selectedElement ? `${selectedElement.type} selected` : "No selection"}
          </span>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedElement}
            className="rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete selected
          </button>
        </div>
      </div>

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
