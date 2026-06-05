import { isVisualScene, type VisualScene } from "@/schema/visual_scene";

const UPLOADED_SCENE_STORAGE_KEY = "uploaded-scene";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function stashUploadedScene(input: unknown): VisualScene {
  if (!isVisualScene(input)) {
    throw new Error("Uploaded scene payload is not a valid VisualScene.");
  }

  const scene = input;
  const storage = getSessionStorage();

  storage?.setItem(UPLOADED_SCENE_STORAGE_KEY, JSON.stringify(scene));

  return scene;
}

export function readUploadedScene(): VisualScene | null {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const rawScene = storage.getItem(UPLOADED_SCENE_STORAGE_KEY);

  if (!rawScene) {
    return null;
  }

  try {
    const parsedScene: unknown = JSON.parse(rawScene);

    if (isVisualScene(parsedScene)) {
      return parsedScene;
    }

    storage.removeItem(UPLOADED_SCENE_STORAGE_KEY);

    return null;
  } catch {
    storage.removeItem(UPLOADED_SCENE_STORAGE_KEY);

    return null;
  }
}
