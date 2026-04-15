import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { UpdateKeyScopesResponse } from "../types";

export const updateKeyScopesAction: Action = {
  name: "UPDATE_KEY_SCOPES",
  similes: [
    "CHANGE_KEY_SCOPES",
    "SET_KEY_SCOPES",
    "MODIFY_KEY_SCOPES",
    "EDIT_KEY_SCOPES",
  ],
  description: "Update the scopes on an existing API key",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const idMatch = text.match(/key[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const keyId =
      idMatch?.[1] ??
      ((state as Record<string, unknown>)?.key_id as string | undefined);

    if (!keyId) {
      callback?.({
        text: "Please provide a key ID. Example: 'Update scopes for key key_abc123 to [plans:read, sessions:read]'.",
        action: "UPDATE_KEY_SCOPES",
      });
      return;
    }

    const scopesMatch = text.match(/scopes?[:\s]*\[([^\]]+)\]/i);
    if (!scopesMatch) {
      callback?.({
        text: "Please specify the scopes. Example: 'scopes: [plans:read, sessions:write]'.",
        action: "UPDATE_KEY_SCOPES",
      });
      return;
    }

    const scopes = scopesMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/["']/g, ""));

    try {
      const data = await apiRequest<UpdateKeyScopesResponse>(
        runtime,
        "PATCH",
        `/keys/${keyId}/scopes`,
        { scopes }
      );

      callback?.({
        text: `Key ${data.key.id} scopes updated to: [${data.key.scopes.join(", ")}].`,
        action: "UPDATE_KEY_SCOPES",
      });
    } catch (error) {
      callback?.({
        text: `Failed to update key scopes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "UPDATE_KEY_SCOPES",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Update scopes for key key_abc123 to [plans:read, sessions:read]",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Key key_abc123 scopes updated to: [plans:read, sessions:read].",
          action: "UPDATE_KEY_SCOPES",
        },
      },
    ],
  ],
};
