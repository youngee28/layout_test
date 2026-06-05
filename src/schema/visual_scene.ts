export type CssVariableToken = `--${string}`;

type VisualElementBase = {
  id: string;
  x: number;
  y: number;
};

export type VisualTextElement = VisualElementBase & {
  type: "text";
  text: string;
  width: number;
  fontSize: number;
  fontFamily: CssVariableToken | string;
  fontStyle?: "normal" | "bold";
  fill: CssVariableToken;
  align?: "left" | "center" | "right";
};

export type VisualRectElement = VisualElementBase & {
  type: "rect";
  width: number;
  height: number;
  fill: CssVariableToken;
  stroke?: CssVariableToken;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type VisualLineElement = VisualElementBase & {
  type: "line";
  width: number;
  stroke: CssVariableToken;
  strokeWidth: number;
};

export type VisualCircleElement = VisualElementBase & {
  type: "circle";
  radius: number;
  fill: CssVariableToken;
  stroke?: CssVariableToken;
  strokeWidth?: number;
};

export type VisualElement =
  | VisualTextElement
  | VisualRectElement
  | VisualLineElement
  | VisualCircleElement;

export type VisualScene = {
  width: number;
  height: number;
  background: CssVariableToken;
  elements: VisualElement[];
};

function isCssVariableToken(value: unknown): value is CssVariableToken {
  return typeof value === "string" && value.startsWith("--");
}

function isVisualElement(value: unknown): value is VisualElement {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const element = value as Record<string, unknown>;

  if (typeof element.id !== "string" || typeof element.x !== "number" || typeof element.y !== "number") {
    return false;
  }

  if (element.type === "text") {
    return (
      typeof element.text === "string" &&
      typeof element.width === "number" &&
      typeof element.fontSize === "number" &&
      typeof element.fontFamily === "string" &&
      isCssVariableToken(element.fill) &&
      (element.fontStyle === undefined || element.fontStyle === "normal" || element.fontStyle === "bold") &&
      (element.align === undefined || element.align === "left" || element.align === "center" || element.align === "right")
    );
  }

  if (element.type === "rect") {
    return (
      typeof element.width === "number" &&
      typeof element.height === "number" &&
      isCssVariableToken(element.fill) &&
      (element.stroke === undefined || isCssVariableToken(element.stroke)) &&
      (element.strokeWidth === undefined || typeof element.strokeWidth === "number") &&
      (element.cornerRadius === undefined || typeof element.cornerRadius === "number")
    );
  }

  if (element.type === "line") {
    return (
      typeof element.width === "number" &&
      isCssVariableToken(element.stroke) &&
      typeof element.strokeWidth === "number"
    );
  }

  if (element.type === "circle") {
    return (
      typeof element.radius === "number" &&
      isCssVariableToken(element.fill) &&
      (element.stroke === undefined || isCssVariableToken(element.stroke)) &&
      (element.strokeWidth === undefined || typeof element.strokeWidth === "number")
    );
  }

  return false;
}

export function isVisualScene(value: unknown): value is VisualScene {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const scene = value as Record<string, unknown>;

  return (
    typeof scene.width === "number" &&
    typeof scene.height === "number" &&
    isCssVariableToken(scene.background) &&
    Array.isArray(scene.elements) &&
    scene.elements.every(isVisualElement)
  );
}

export const initialVisualScene = {
  width: 960,
  height: 560,
  background: "--surface-card",
  elements: [
    {
      id: "headline",
      type: "text",
      x: 64,
      y: 56,
      text: "Phase 1 Canvas Editor",
      width: 340,
      fontSize: 36,
      fontFamily: "--font-geist-sans",
      fontStyle: "bold",
      fill: "--text-primary",
    },
    {
      id: "card",
      type: "rect",
      x: 64,
      y: 156,
      width: 280,
      height: 164,
      fill: "--accent-soft",
      stroke: "--border-strong",
      strokeWidth: 1,
      cornerRadius: 24,
    },
    {
      id: "divider",
      type: "line",
      x: 408,
      y: 244,
      width: 236,
      stroke: "--accent",
      strokeWidth: 6,
    },
    {
      id: "badge",
      type: "circle",
      x: 764,
      y: 190,
      radius: 72,
      fill: "--accent-soft",
      stroke: "--accent",
      strokeWidth: 4,
    },
  ],
} satisfies VisualScene;

export function resolveThemeValue(value: string, fallback = value): string {
  if (!value.startsWith("--") || typeof window === "undefined") {
    return fallback;
  }

  const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(value).trim();

  return resolved || fallback;
}
