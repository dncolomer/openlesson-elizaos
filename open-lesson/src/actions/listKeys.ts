import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ListKeysResponse } from "../types";

export const listKeysAction: Action = {
  name: "LIST_API_KEYS",
  similes: ["SHOW_KEYS", "MY_KEYS", "VIEW_API_KEYS", "GET_KEYS"],
  description: "List all API keys for the authenticated user",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    try {
      const data = await apiRequest<ListKeysResponse>(
        runtime,
        "GET",
        "/keys"
      );

      if (data.keys.length === 0) {
        callback?.({ text: "No API keys found.", action: "LIST_API_KEYS" });
        return;
      }

      let responseText = `Found ${data.keys.length} API keys:`;
      data.keys.forEach((k) => {
        const status = k.is_active ? "active" : "revoked";
        const expiry = k.expires_at ? `, expires: ${k.expires_at}` : "";
        responseText += `\n- ${k.key_prefix}... (${status}) — scopes: [${k.scopes.join(", ")}]${expiry}`;
        if (k.label) responseText += ` — "${k.label}"`;
      });

      callback?.({ text: responseText, action: "LIST_API_KEYS" });
    } catch (error) {
      callback?.({
        text: `Failed to list API keys: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_API_KEYS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my API keys" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Found 2 API keys:\n- sk_abc... (active) — scopes: [*] — "Production"\n- sk_def... (revoked) — scopes: [plans:read, sessions:read]',
          action: "LIST_API_KEYS",
        },
      },
    ],
  ],
};
