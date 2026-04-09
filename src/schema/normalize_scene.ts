import {
  type VisualCircleElement,
  type CssVariableToken,
  type VisualElement,
  type VisualLineElement,
  type VisualRectElement,
  type VisualScene,
  type VisualTextElement,
} from "@/schema/visual_scene";

type UnknownRecord = Record<string, unknown>;

let generatedId = 0;

function createId(prefix: VisualElement["type"]) {
  generatedId += 1;
  return `${prefix}-${generatedId}`;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asToken(value: unknown, fallback: CssVariableToken): CssVariableToken {
  if (typeof value === "string" && value.startsWith("--")) {
    return value as CssVariableToken;
  }

  return fallback;
}

function normalizeType(value: unknown): VisualElement["type"] | null {
  if (value === "text" || value === "textbox" || value === "label") {
    return "text";
  }

  if (value === "rect" || value === "rectangle" || value === "box") {
    return "rect";
  }

  if (value === "line" || value === "divider") {
    return "line";
  }

  if (value === "circle") {
    return "circle";
  }

  return null;
}

function normalizeText(raw: UnknownRecord): VisualTextElement {
  return {
    id: asString(raw.id, createId("text")),
    type: "text",
    x: asNumber(raw.x, 64),
    y: asNumber(raw.y, 64),
    text: asString(raw.text, "Untitled"),
    width: asNumber(raw.width ?? raw.w, 240),
    fontSize: asNumber(raw.fontSize, 18),
    fontFamily: asString(raw.fontFamily, "--font-geist-sans"),
    fontStyle: raw.fontStyle === "bold" ? "bold" : "normal",
    fill: asToken(raw.fill ?? raw.color, "--text-primary"),
  };
}

function normalizeRect(raw: UnknownRecord): VisualRectElement {
  return {
    id: asString(raw.id, createId("rect")),
    type: "rect",
    x: asNumber(raw.x, 64),
    y: asNumber(raw.y, 120),
    width: asNumber(raw.width ?? raw.w, 220),
    height: asNumber(raw.height ?? raw.h, 120),
    fill: asToken(raw.fill, "--accent-soft"),
    stroke: raw.stroke ? asToken(raw.stroke, "--border-strong") : undefined,
    strokeWidth: typeof raw.strokeWidth === "number" ? raw.strokeWidth : undefined,
    cornerRadius: typeof raw.cornerRadius === "number" ? raw.cornerRadius : undefined,
  };
}

function normalizeLine(raw: UnknownRecord): VisualLineElement {
  return {
    id: asString(raw.id, createId("line")),
    type: "line",
    x: asNumber(raw.x, 64),
    y: asNumber(raw.y, 260),
    width: asNumber(raw.width ?? raw.w ?? raw.length, 220),
    stroke: asToken(raw.stroke, "--accent"),
    strokeWidth: asNumber(raw.strokeWidth, 4),
  };
}

function normalizeCircle(raw: UnknownRecord): VisualCircleElement {
  return {
    id: asString(raw.id, createId("circle")),
    type: "circle",
    x: asNumber(raw.x, 720),
    y: asNumber(raw.y, 180),
    radius: asNumber(raw.radius ?? raw.r, 64),
    fill: asToken(raw.fill, "--accent-soft"),
    stroke: raw.stroke ? asToken(raw.stroke, "--accent") : undefined,
    strokeWidth: typeof raw.strokeWidth === "number" ? raw.strokeWidth : undefined,
  };
}

function normalizeElement(value: unknown): VisualElement | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const type = normalizeType(raw.type);

  if (type === "text") {
    return normalizeText(raw);
  }

  if (type === "rect") {
    return normalizeRect(raw);
  }

  if (type === "line") {
    return normalizeLine(raw);
  }

  if (type === "circle") {
    return normalizeCircle(raw);
  }

  return null;
}

export function normalizeScene(input: unknown): VisualScene {
  const rawScene = asRecord(input);

  if (!rawScene) {
    throw new Error("Scene payload must be an object.");
  }

  const rawElements = Array.isArray(rawScene?.elements) ? rawScene.elements : [];

  const elements = rawElements
    .map(normalizeElement)
    .filter((element): element is VisualElement => element !== null);

  if (elements.length === 0) {
    throw new Error("Scene payload did not contain any supported elements.");
  }

  return {
    width: asNumber(rawScene.width, 960),
    height: asNumber(rawScene.height, 560),
    background: asToken(rawScene.background, "--surface-card"),
    elements,
  };
}
