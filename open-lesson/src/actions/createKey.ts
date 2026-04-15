import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { CreateKeyResponse } from "../types";

export const createKeyAction: Action = {
  name: "CREATE_API_KEY",
  similes: ["NEW_KEY", "GENERATE_KEY", "MAKE_KEY", "ADD_KEY"],
  description:
    "Create a new API key with optional label, scopes, and expiration",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const labelMatch = text.match(/label[:\s]*["']([^"']+)["']/i);
    const expiryMatch = text.match(/(?:expires?|expiry)[:\s]*(\d+)\s*days?/i);
    const scopesMatch = text.match(
      /scopes?[:\s]*\[([^\]]+)\]/i
    );

    try {
      const body: Record<string, unknown> = {};
      if (labelMatch) body.label = labelMatch[1].trim();
      if (expiryMatch)
        body.expires_in_days = parseInt(expiryMatch[1], 10);
      if (scopesMatch) {
        body.scopes = scopesMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/["']/g, ""));
      }

      const data = await apiRequest<CreateKeyResponse>(
        runtime,
        "POST",
        "/keys",
        Object.keys(body).length > 0 ? body : undefined
      );

      let responseText = `API key created: ${data.api_key}`;
      responseText += `\nKey ID: ${data.key.id}`;
      responseText += `\nScopes: [${data.key.scopes.join(", ")}]`;
      if (data.key.expires_at) {
        responseText += `\nExpires: ${data.key.expires_at}`;
      }
      responseText +=
        "\n\nIMPORTANT: Save this key now — it will not be shown again.";

      callback?.({ text: responseText, action: "CREATE_API_KEY" });
    } catch (error) {
      callback?.({
        text: `Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_API_KEY",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: 'Create an API key label: "My Agent" expires 30 days',
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'API key created: sk_abc123def456...\nKey ID: key_xyz789\nScopes: [*]\nExpires: 2025-02-15T00:00:00Z\n\nIMPORTANT: Save this key now — it will not be shown again.',
          action: "CREATE_API_KEY",
        },
      },
    ],
  ],
};
