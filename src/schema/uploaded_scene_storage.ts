import { normalizeScene } from "@/schema/normalize_scene";
import type { VisualScene } from "@/schema/visual_scene";

const UPLOADED_SCENE_STORAGE_KEY = "uploaded-scene";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function stashUploadedScene(input: unknown): VisualScene {
  const scene = normalizeScene(input);
  const storage = getSessionStorage();

  storage?.setItem(UPLOADED_SCENE_STORAGE_KEY, JSON.stringify(scene));

  return scene;
}

export function takeUploadedScene(): VisualScene | null {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const rawScene = storage.getItem(UPLOADED_SCENE_STORAGE_KEY);

  if (!rawScene) {
    return null;
  }

  storage.removeItem(UPLOADED_SCENE_STORAGE_KEY);

  try {
    return normalizeScene(JSON.parse(rawScene));
  } catch {
    return null;
  }
}
