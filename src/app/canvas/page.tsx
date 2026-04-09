"use client";

import { useEffect, useMemo, useState } from "react";
import { PreviewStage } from "@/components/editor/preview_stage";
import { normalizeScene } from "@/schema/normalize_scene";
import { takeUploadedScene } from "@/schema/uploaded_scene_storage";
import type { VisualScene } from "@/schema/visual_scene";

export default function CanvasPage() {
  const [scene, setScene] = useState<VisualScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sceneSource, setSceneSource] = useState<"upload" | "development" | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadScene() {
      const uploadedScene = takeUploadedScene();

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

        setScene(normalizeScene(data));
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
      return "Scene loaded from the uploaded CSV and normalized before rendering.";
    }
  }, [errorMessage, sceneSource, status]);

  const sceneKey = useMemo(() => (scene ? JSON.stringify(scene) : "empty-scene"), [scene]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-20 right-0 w-72 bg-[radial-gradient(circle,var(--glow-side),transparent_66%)] blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl items-center justify-center">
        <main className="flex w-full max-w-6xl flex-col gap-8 rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:p-6">
          <header className="rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] px-5 py-8 sm:px-8">
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

          {scene ? (
            <PreviewStage key={sceneKey} initialScene={scene} />
          ) : (
            <div className="rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-8 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
              <p className="font-semibold text-[var(--text-primary)]">Scene unavailable</p>
              <p className="mt-2 leading-7">
                {errorMessage ?? "The scene could not be generated from the uploaded CSV or input/data.csv."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
