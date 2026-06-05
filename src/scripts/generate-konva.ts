import { GoogleGenAI } from "@google/genai";
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const PROJECT_ROOT = process.cwd();
const INPUT_DIR = path.join(PROJECT_ROOT, "input");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");
const CSV_PATH = path.join(INPUT_DIR, "it_service_combined.csv");
const SYSTEM_PROMPT_PATH = path.join(INPUT_DIR, "system_prompt(konva).txt");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "generated_konva.tsx");
const DEFAULT_MODEL = "gemini-2.5-flash";

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
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY in .env.local or your shell.",
    );
  }

  return apiKey;
}

function buildUserPrompt(csvText: string): string {
  return [
    "당신은 원시 CSV 텍스트를 입력으로 받게 됩니다.",
    "CSV 내용을 기반으로 데이터 구조를 스스로 추론하세요.",
    "정확히 하나의 유효한 JSON 객체만 반환하세요.",
    "Markdown 코드 블록은 사용하지 마세요.",
    "출력은 반드시 아래와 같은 씬 구조를 따라야 합니다:",
    "{'width':1050,'height':1485,'background':'--surface-card','elements':[...]}",
    "각 요소의 type은 반드시 text, rect, line 중 하나여야 합니다.",
    "색상은 반드시 CSS 변수 토큰만 사용하세요. 예: --text-primary, --accent, --accent-soft, --border-strong, --surface-card.",
    "text 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, text, width, fontSize, fontFamily, fontStyle, fill.",
    "rect 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, width, height, fill (선택적으로 stroke, strokeWidth, cornerRadius 포함 가능).",
    "line 요소에는 다음 속성이 포함되어야 합니다: id, type, x, y, width, stroke, strokeWidth.",
    "CSV 데이터를 기반으로 대시보드 형태의 씬을 생성하세요.",
    "Raw CSV 입력:",
    "<csv>",
    csvText,
    "</csv>",
  ].join("\n");
}

function validateGeneratedCode(text: string): string {
  const normalized = text.trim();

  if (!normalized) {
    throw new Error("Gemini returned an empty response.");
  }

  if (normalized.includes("```")) {
    throw new Error("Gemini returned Markdown fences. Tighten the prompt and retry.");
  }

  if (!/export\s+default\s+function\s+GeneratedPreview\s*\(/.test(normalized)) {
    throw new Error(
      "Gemini did not return the expected default export `GeneratedPreview` component.",
    );
  }

  if (!/[<>][A-Za-z]|return\s*\(/.test(normalized)) {
    throw new Error("Gemini response does not appear to contain JSX/TSX markup.");
  }

  return `${normalized}\n`;
}

async function main(): Promise<void> {
  const csvText = await readRequiredFile(CSV_PATH, "CSV input file");
  const systemPrompt = await readRequiredFile(SYSTEM_PROMPT_PATH, "System prompt file");
  const apiKey = getApiKey();
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildUserPrompt(csvText),
    config: {
      systemInstruction: systemPrompt,
    },
  });

  const generatedText = response.text;

  if (!generatedText) {
    throw new Error("Gemini response did not include text output.");
  }

  const validatedCode = validateGeneratedCode(generatedText);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, validatedCode, "utf8");

  console.log(`Generated JSX written to ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`generate-konva failed: ${message}`);
  process.exitCode = 1;
});
