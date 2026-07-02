export function parseGeneratedJson(text: string): unknown {
  let normalized = text.trim();

  if (!normalized) {
    throw new Error("GPT returned an empty response.");
  }

  if (normalized.startsWith("```")) {
    normalized = normalized.replace(/^```json?\s*/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(normalized);
}
