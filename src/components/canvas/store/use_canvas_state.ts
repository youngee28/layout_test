"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChartRecommendation } from "@/schema/chart_recommendation";
import type { DashboardCandidate } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";
import { readUploadedScenePayload } from "@/schema/uploaded_scene_storage";
import {
  type VisualElement,
  type VisualScene,
  type VisualTextElement,
} from "@/schema/visual_element";

export function useCanvasState() {
  const [scene, setScene] = useState<VisualScene | null>(null);
  const [resolvedTables, setResolvedTables] = useState<ResolvedTable[]>([]);
  const [chartRecommendations, setChartRecommendations] = useState<ChartRecommendation[]>([]);
  const [dashboardCandidates, setDashboardCandidates] = useState<DashboardCandidate[]>([]);
  const [sceneHistory, setSceneHistory] = useState<VisualScene[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sceneSource, setSceneSource] = useState<"upload" | null>(null);
  const [generationStage, setGenerationStage] = useState<"candidates" | "ready">("ready");

  useEffect(() => {
    let isMounted = true;

    async function loadScene() {
      const uploadedPayload = readUploadedScenePayload();

      if (uploadedPayload) {
        if (!isMounted) {
          return;
        }

        setScene(uploadedPayload.scene ?? null);
        setResolvedTables(uploadedPayload.resolvedTables ?? []);
        setChartRecommendations(uploadedPayload.chartRecommendations ?? []);
        setDashboardCandidates(uploadedPayload.dashboardCandidates ?? []);
        setSceneHistory(uploadedPayload.scene ? [uploadedPayload.scene] : []);
        setHistoryIndex(uploadedPayload.scene ? 0 : -1);
        setStatus("ready");
        setErrorMessage(null);
        setSceneSource("upload");
        setGenerationStage(uploadedPayload.generationStage ?? (uploadedPayload.scene ? "ready" : "candidates"));
        return;
      }

      if (!isMounted) {
        return;
      }

      setScene(null);
      setResolvedTables([]);
      setChartRecommendations([]);
      setDashboardCandidates([]);
      setSceneHistory([]);
      setHistoryIndex(-1);
      setStatus("error");
      setErrorMessage("Upload a CSV from the home page to generate a canvas scene.");
      setSceneSource(null);
      setGenerationStage("ready");
    }

    void loadScene();

    return () => {
      isMounted = false;
    };
  }, []);

  const helperText = useMemo(() => {
    if (status === "loading") {
      return "Checking for the uploaded scene payload.";
    }

    if (status === "error") {
      return errorMessage ?? "Scene loading failed.";
    }

    if (generationStage === "candidates") {
      return "Infographic-oriented dashboard candidates loaded. Pick a direction before generating the final canvas scene.";
    }

    if (sceneSource === "upload") {
      return "Scene loaded from the uploaded CSV response and validated before rendering.";
    }

    return "Upload a CSV from the home page to generate a scene.";
  }, [errorMessage, generationStage, sceneSource, status]);

  const sceneKey = useMemo(() => (scene ? JSON.stringify(scene) : "empty-scene"), [scene]);

  const handleChangeElement = useCallback((nextElement: VisualElement) => {
    setScene((currentScene) => {
      if (!currentScene) return currentScene;
      const nextScene = {
        ...currentScene,
        elements: currentScene.elements.map((element) =>
          element.id === nextElement.id ? nextElement : element,
        ),
      };
      setSceneHistory((prev) => {
        const nextHistory = prev.slice(0, historyIndex + 1);
        nextHistory.push(nextScene);
        return nextHistory;
      });
      setHistoryIndex((prev) => prev + 1);
      return nextScene;
    });
  }, [historyIndex]);

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
      const nextScene = {
        ...currentScene,
        elements: currentScene.elements.filter((el) => el.id !== selectedElementId),
      };
      setSceneHistory((prev) => {
        const nextHistory = prev.slice(0, historyIndex + 1);
        nextHistory.push(nextScene);
        return nextHistory;
      });
      setHistoryIndex((prev) => prev + 1);
      return nextScene;
    });
    setSelectedElementId(null);
  }, [selectedElementId, scene, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setScene(sceneHistory[prevIndex]);
    }
  }, [historyIndex, sceneHistory]);

  const handleAddText = useCallback(() => {
    if (!scene) return;
    const newId = `text-${Date.now()}`;
    const newText: VisualTextElement = {
      id: newId,
      type: "text",
      x: Math.round(scene.width / 2 - 100),
      y: Math.round(scene.height / 2 - 20),
      text: "새 텍스트",
      width: 200,
      fontSize: 18,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-primary",
    };
    const nextScene = {
      ...scene,
      elements: [...scene.elements, newText],
    };
    setScene(nextScene);
    setSceneHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(nextScene);
      return nextHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setSelectedElementId(newId);
    setPendingEditId(newId);
  }, [scene, historyIndex]);

  const handleClearPendingEdit = useCallback(() => {
    setPendingEditId(null);
  }, []);

  return {
    scene,
    resolvedTables,
    chartRecommendations,
    dashboardCandidates,
    generationStage,
    sceneKey,
    selectedElementId,
    selectedElement,
    selectedTextElement,
    pendingEditId,
    errorMessage,
    helperText,
    canUndo: historyIndex > 0,
    setSelectedElementId,
    handleTextChange,
    handleDeleteElement,
    handleUndo,
    handleAddText,
    handleChangeElement,
    handleClearPendingEdit,
  };
}
