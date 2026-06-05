import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const API_LOG_DIR = path.join(PROJECT_ROOT, "log", "api");

const isFileLoggingEnabled = process.env.VERCEL !== "1" && process.env.DISABLE_API_FILE_LOG !== "true";

type SceneApiLogArtifacts = {
  requestPayload: unknown;
  responseText: string;
};

type WriteSceneApiLogForGetInput = {
  source: string;
  csvText: string;
};

type WriteSceneApiLogForPostInput = {
  body: unknown;
};

type WriteSceneApiLogResponseJsonInput = {
  runId: string;
  responseJson: unknown;
};

type SceneApiLogContext = {
  runId: string;
  requestPayload: unknown;
};

function createRunId(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function ensureRunDirectory(runId: string): Promise<string> {
  const runDir = path.join(API_LOG_DIR, runId);

  await mkdir(runDir, { recursive: true });

  return runDir;
}

async function writeSceneApiArtifacts(runId: string, artifacts: SceneApiLogArtifacts): Promise<void> {
  if (!isFileLoggingEnabled) {
    return;
  }

  try {
    const runDir = await ensureRunDirectory(runId);

    await writeFile(
      path.join(runDir, "request.json"),
      `${JSON.stringify(artifacts.requestPayload, null, 2)}\n`,
      "utf8",
    );
    await writeFile(path.join(runDir, "response_raw.json"), `${artifacts.responseText}\n`, "utf8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[API_LOG] Failed to write artifacts for ${runId}: ${message}`);
  }
}

export function createSceneApiLogForGet({
  source,
  csvText,
}: WriteSceneApiLogForGetInput): SceneApiLogContext {
  return {
    runId: createRunId(),
    requestPayload: {
      method: "GET",
      source,
      csvText,
    },
  };
}

export function createSceneApiLogForPost({
  body,
}: WriteSceneApiLogForPostInput): SceneApiLogContext {
  return {
    runId: createRunId(),
    requestPayload: {
      method: "POST",
      body,
    },
  };
}

export async function writeSceneApiLogRequestAndText({
  runId,
  requestPayload,
  responseText,
}: SceneApiLogContext & { responseText: string }): Promise<void> {
  try {
    await writeSceneApiArtifacts(runId, {
      requestPayload,
      responseText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write scene API request/response text log: ${message}`);
  }
}

export async function writeSceneApiLogResponseJson({
  runId,
  responseJson,
}: WriteSceneApiLogResponseJsonInput): Promise<void> {
  if (!isFileLoggingEnabled) {
    return;
  }

  try {
    const runDir = await ensureRunDirectory(runId);

    await writeFile(
      path.join(runDir, "response.json"),
      `${JSON.stringify(responseJson, null, 2)}\n`,
      "utf8",
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[API_LOG] Failed to write response JSON for ${runId}: ${message}`);
  }
}
