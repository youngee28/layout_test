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
const SYSTEM_PROMPT_PATH = path.join(INPUT_DIR, "system-prompt.txt");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "generated.tsx");
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
    "You will receive raw CSV text.",
    "Infer the dataset structure from the CSV itself. Do not explain your reasoning.",
    "Return exactly one valid TSX module that can be saved as generated.tsx.",
    "Output requirements:",
    "- Return code only.",
    "- Do not use Markdown fences.",
    "- Use `export default function GeneratedPreview()`.",
    "- Use inline mock styling or simple className values only.",
    "- Do not import local project files.",
    "- Do not reference external assets, APIs, or runtime-only browser features.",
    "- The component should render a useful visual based on the CSV data.",
    "- Embed any derived data needed by the component directly inside the file.",
    "",
    "Raw CSV input:",
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
  console.error(`generate-jsx failed: ${message}`);
  process.exitCode = 1;
});
