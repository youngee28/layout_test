import { GoogleGenAI } from "@google/genai";
import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const PROJECT_ROOT = process.cwd();
const INPUT_DIR = path.join(PROJECT_ROOT, "input");
const CSV_PATH = path.join(INPUT_DIR, "data.csv");
const DEFAULT_MODEL = "gemini-2.5-flash";

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
    "You will receive raw CSV text.",
    "Infer the dataset structure from the CSV itself.",
    "Return exactly one valid JSON object.",
    "**Do not use Markdown fences.**",
    "Output must match this scene shape:",
    '{"width":210,"height":297,"background":"--surface-card","elements":[...]}',
    "Each element must have a type of text, rect, or line.",
    "Use only CSS variable tokens for colors, for example --text-primary, --accent, --accent-soft, --border-strong, --surface-card.",
    "For text elements include: id, type, x, y, text, width, fontSize, fontFamily, fontStyle, fill.",
    "For rect elements include: id, type, x, y, width, height, fill, optional stroke, strokeWidth, cornerRadius.",
    "For line elements include: id, type, x, y, width, stroke, strokeWidth.",
    "Create a bubble chart from the CSV.",
    "Raw CSV input:",
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

  if (normalized.includes("```")) {
    throw new Error("Gemini returned Markdown fences instead of plain JSON.");
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

async function generateSceneFromCsv(csvText: string) {
  const apiKey = getApiKey();
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: buildScenePrompt(csvText),
  });

  const generatedText = response.text;

  if (!generatedText) {
    throw new Error("Gemini response did not include text output.");
  }

  return parseGeneratedScene(generatedText);
}

export async function GET() {
  try {
    const csvText = await readRequiredFile(CSV_PATH, "CSV input file");
    const scene = await generateSceneFromCsv(csvText);

    return NextResponse.json(scene);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const csvText = getCsvTextFromBody(body);
    const scene = await generateSceneFromCsv(csvText);

    return NextResponse.json(scene);
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
