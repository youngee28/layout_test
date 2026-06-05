"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviewStage } from "@/components/editor/preview_stage";
import { TextEditorPanel } from "@/components/editor/text_editor_panel";
import { readUploadedScene } from "@/schema/uploaded_scene_storage";
import { type VisualElement, type VisualTextElement, isVisualScene, type VisualScene } from "@/schema/visual_scene";

export default function CanvasPage() {
  const [scene, setScene] = useState<VisualScene | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sceneSource, setSceneSource] = useState<"upload" | "development" | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadScene() {
      const uploadedScene = readUploadedScene();

      if (uploadedScene) {
        if (!isMounted) {
          return;
        }

        setScene(uploadedScene);
        setStatus("ready");
        setErrorMessage(null);
        setSceneSource("upload");
        return;
      }

      try {
        const response = await fetch("/api/scene", { cache: "no-store" });
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load scene.";

          throw new Error(message);
        }

        if (!isMounted) {
          return;
        }

        if (!isVisualScene(data)) {
          throw new Error("Scene response was not a valid VisualScene.");
        }

        setScene(data);
        setStatus("ready");
        setErrorMessage(null);
        setSceneSource("development");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load scene.";

        setScene(null);
        setStatus("error");
        setErrorMessage(message);
        setSceneSource(null);
      }
    }

    void loadScene();

    return () => {
      isMounted = false;
    };
  }, []);

  const helperText = useMemo(() => {
    if (status === "loading") {
      return "Checking for an uploaded scene first, then falling back to /api/scene using input/data.csv.";
    }

    if (status === "error") {
      return errorMessage ?? "Scene loading failed.";
    }

    if (sceneSource === "upload") {
      return "Scene loaded from the uploaded CSV response and validated before rendering.";
    }
  }, [errorMessage, sceneSource, status]);

  const sceneKey = useMemo(() => (scene ? JSON.stringify(scene) : "empty-scene"), [scene]);

  const handleChangeElement = useCallback((nextElement: VisualElement) => {
    setScene((currentScene) => {
      if (!currentScene) return currentScene;
      return {
        ...currentScene,
        elements: currentScene.elements.map((element) =>
          element.id === nextElement.id ? nextElement : element,
        ),
      };
    });
  }, []);

  const selectedElement = scene?.elements.find((el) => el.id === selectedElementId) ?? null;
  const selectedTextElement = selectedElement?.type === "text" ? selectedElement : null;

  const handleTextChange = useCallback(
    (nextElement: VisualTextElement) => {
      handleChangeElement(nextElement);
    },
    [handleChangeElement],
  );

  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId || !scene) return;
    setScene((currentScene) => {
      if (!currentScene) return currentScene;
      return {
        ...currentScene,
        elements: currentScene.elements.filter((el) => el.id !== selectedElementId),
      };
    });
    setSelectedElementId(null);
  }, [selectedElementId, scene]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-1 lg:py-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-20 right-0 w-72 bg-[radial-gradient(circle,var(--glow-side),transparent_66%)] blur-3xl" />

      <div className="relative flex min-h-screen items-stretch justify-stretch">
        <main className="flex w-full flex-col gap-8 rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-8">
              <header className="rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] px-4 py-6 sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
                  Canvas
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  캔버스 편집 테스트
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {helperText}
                </p>
              </header>

              <div className="flex flex-col gap-4 flex-1 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] p-5 min-h-[400px]">
                <div className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 w-[280px]">
                  <TextEditorPanel
                    element={selectedTextElement}
                    onChange={handleTextChange}
                    onDelete={handleDeleteElement}
                  />
                </div>
              </div>
            </div>

            <div>
              {scene ? (
                <PreviewStage
                  key={sceneKey}
                  scene={scene}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onChangeElement={handleChangeElement}
                  onClearSelection={() => setSelectedElementId(null)}
                />
              ) : (
                <div className="rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-8 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
                  <p className="font-semibold text-[var(--text-primary)]">Scene unavailable</p>
                  <p className="mt-2 leading-7">
                    {errorMessage ?? "The scene could not be generated from the uploaded CSV or input/data.csv."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
