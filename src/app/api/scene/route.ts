import { GoogleGenAI } from "@google/genai";
import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  createSceneApiLogForGet,
  createSceneApiLogForPost,
  writeSceneApiLogRequestAndText,
  writeSceneApiLogResponseJson,
} from "@/app/api/scene/api_log";
import { normalizeScene } from "@/schema/normalize_scene";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const PROJECT_ROOT = process.cwd();
const INPUT_DIR = path.join(PROJECT_ROOT, "input");
const CSV_PATH = path.join(INPUT_DIR, "data.csv");
const DEFAULT_MODEL = "gemini-2.5-flash";
const GENERATED_SCENE_SCHEMA = {
  type: "object",
  properties: {
    width: { type: "number" },
    height: { type: "number" },
    background: { type: "string" },
    elements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["text", "textbox", "label", "rect", "rectangle", "box", "line", "divider", "circle"] },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          radius: { type: "number" },
          text: { type: "string" },
          fontSize: { type: "number" },
          fontFamily: { type: "string" },
          fontStyle: { type: "string", enum: ["normal", "bold"] },
          fill: { type: "string" },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
          cornerRadius: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
          r: { type: "number" },
          length: { type: "number" },
          color: { type: "string" },
        },
        required: ["id", "type", "x", "y"],
      },
    },
  },
  required: ["width", "height", "background", "elements"],
} as const;

export const dynamic = "force-dynamic";

async function readRequiredFile(filePath: string, label: string): Promise<string> {
  try {
    const value = await readFile(filePath, "utf8");

    if (!value.trim()) {
      throw new Error(`${label} is empty: ${filePath}`);
    }

    return value;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`${label} not found: ${filePath}`);
    }

    throw error;
  }
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  return apiKey;
}

function buildScenePrompt(csvText: string): string {
  return [
    "당신은 원시 CSV 텍스트를 입력으로 받게 됩니다.",
    "CSV 내용을 기반으로 데이터 구조를 스스로 추론하세요.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요.",
    "Markdown 코드 블록은 사용하지 마세요.",
    "출력은 반드시 아래와 같은 씬 구조를 따라야 합니다:",
    "{'width':1050,'height':1485,'background':'--surface-card','elements':[...]}",
    "모든 요소는 'width':1050,'height':1485 영역을 벗어나면 안됩니다.",
    "각 요소의 type은 반드시 text, rect, line, circle 중 하나여야 합니다.",
    "색상은 반드시 CSS 변수 토큰만 사용하세요. 예: --text-primary, --accent, --accent-soft, --border-strong, --surface-card.",
    "text 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, text, width, fontSize, fontFamily, fontStyle, fill.",
    "rect 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, width, height, fill (선택적으로 stroke, strokeWidth, cornerRadius 포함 가능).",
    "line 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, width, stroke, strokeWidth.",
    "circle 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, r, stroke, strokeWidth.",
    "CSV 데이터를 기반으로 간결한 인포그래픽 형태의 씬을 생성하세요.",
    "Raw CSV 입력:",
    "<csv>",
    csvText,
    "</csv>",
  ].join("\n");
}

function parseGeneratedScene(text: string): unknown {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(normalized);
}

function getCsvTextFromBody(body: unknown): string {
  if (typeof body !== "object" || body === null || !("csvText" in body)) {
    throw new Error("Request body must include a csvText string.");
  }

  const { csvText } = body as { csvText: unknown };

  if (typeof csvText !== "string") {
    throw new Error("Request body must include a csvText string.");
  }

  if (!csvText.trim()) {
    throw new Error("Request body csvText must not be empty.");
  }

  return csvText;
}

type GeneratedSceneResult = {
  responseText: string;
};

async function generateSceneFromCsv(csvText: string): Promise<GeneratedSceneResult> {
  const apiKey = getApiKey();
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: buildScenePrompt(csvText),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: GENERATED_SCENE_SCHEMA,
    },
  });

  const generatedText = response.text;

  if (!generatedText) {
    throw new Error("Gemini response did not include text output.");
  }

  return {
    responseText: generatedText,
  };
}

export async function GET() {
  try {
    const csvText = await readRequiredFile(CSV_PATH, "CSV input file");
    const logContext = createSceneApiLogForGet({
      source: path.relative(PROJECT_ROOT, CSV_PATH),
      csvText,
    });
    const { responseText } = await generateSceneFromCsv(csvText);

    await writeSceneApiLogRequestAndText({
      ...logContext,
      responseText,
    });

    const responseJson = parseGeneratedScene(responseText);
    const normalizedScene = normalizeScene(responseJson);

    await writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: normalizedScene,
    });

    return NextResponse.json(normalizedScene);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const logContext = createSceneApiLogForPost({ body });
    const { responseText } = await generateSceneFromCsv(csvText);

    await writeSceneApiLogRequestAndText({
      ...logContext,
      responseText,
    });

    const responseJson = parseGeneratedScene(responseText);
    const normalizedScene = normalizeScene(responseJson);

    await writeSceneApiLogResponseJson({
      runId: logContext.runId,
      responseJson: normalizedScene,
    });

    return NextResponse.json(normalizedScene);
  } catch (error: unknown) {
    const message =
      error instanceof SyntaxError
        ? "Request body must be valid JSON."
        : error instanceof Error
          ? error.message
          : String(error);
    const status = message.startsWith("Request body") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
