import type { IAgentRuntime } from "@elizaos/core";

const BASE_URL = "https://www.openlesson.academy";
const API_VERSION = "v2";

export function getApiKey(runtime: IAgentRuntime): string {
  const key = runtime.getSetting("OPENLESSON_API_KEY");
  if (!key) {
    throw new Error(
      "OPENLESSON_API_KEY not configured. Set it in your character settings."
    );
  }
  return key as string;
}

export async function apiRequest<T>(
  runtime: IAgentRuntime,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = getApiKey(runtime);
  const url = `${BASE_URL}/api/${API_VERSION}/agent${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
}
