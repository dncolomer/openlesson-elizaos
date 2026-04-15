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
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const apiKey = getApiKey(runtime);
  let url = `${BASE_URL}/api/${API_VERSION}/agent${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

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
