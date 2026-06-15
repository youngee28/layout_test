"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { readUploadedScene } from "@/schema/uploaded_scene_storage";
import {
  isVisualScene,
  type VisualElement,
  type VisualScene,
  type VisualTextElement,
} from "@/schema/visual_scene";

export function useCanvasState() {
  const [scene, setScene] = useState<VisualScene | null>(null);
  const [sceneHistory, setSceneHistory] = useState<VisualScene[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
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
        setSceneHistory([uploadedScene]);
        setHistoryIndex(0);
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
        setSceneHistory([data]);
        setHistoryIndex(0);
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
    sceneKey,
    selectedElementId,
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
