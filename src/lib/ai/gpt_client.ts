const DEFAULT_MODEL = "gpt-5.4-mini";

type JsonSchema = Record<string, unknown>;

type GenerateJsonTextParams = {
  prompt: string;
  schemaName: string;
  responseJsonSchema: JsonSchema;
};

type ChatCompletionMessage = {
  content?: unknown;
};

type ChatCompletionChoice = {
  message?: ChatCompletionMessage;
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
  error?: {
    message?: unknown;
  };
};

function getGptApiKey(): string {
  const apiKey = process.env.GPT_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GPT API key. Set GPT_API_KEY.");
  }

  return apiKey;
}

function getGptApiUrl(): string {
  const apiUrl = process.env.GPT_API_URL;

  if (!apiUrl) {
    throw new Error("Missing GPT API URL. Set GPT_API_URL to an OpenAI-compatible /v1 endpoint.");
  }

  return apiUrl;
}

function getGptModel(): string {
  return process.env.GPT_MODEL ?? DEFAULT_MODEL;
}

function buildChatCompletionsUrl(apiUrl: string): string {
  const normalizedUrl = apiUrl.trim().replace(/\/+$/, "");

  if (normalizedUrl.endsWith("/chat/completions")) {
    return normalizedUrl;
  }

  return `${normalizedUrl}/chat/completions`;
}

function extractMessageContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item === "object" && item !== null && "text" in item) {
          const { text } = item as { text: unknown };

          return typeof text === "string" ? text : "";
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export async function generateJsonText({
  prompt,
  schemaName,
  responseJsonSchema,
}: GenerateJsonTextParams): Promise<string> {
  const response = await fetch(buildChatCompletionsUrl(getGptApiUrl()), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGptApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGptModel(),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          schema: responseJsonSchema,
          strict: false,
        },
      },
    }),
  });

  const responseJson = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    const message = typeof responseJson.error?.message === "string" ? responseJson.error.message : response.statusText;

    throw new Error(`GPT request failed: ${message}`);
  }

  const responseText = extractMessageContent(responseJson);

  if (!responseText) {
    throw new Error("GPT response did not include generated output.");
  }

  return responseText;
}
