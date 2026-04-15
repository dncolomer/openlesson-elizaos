import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { DeleteKeyResponse } from "../types";

export const revokeKeyAction: Action = {
  name: "REVOKE_API_KEY",
  similes: ["DELETE_KEY", "REMOVE_KEY", "DISABLE_KEY", "DEACTIVATE_KEY"],
  description: "Revoke (soft-delete) an API key",

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
        text: "Please provide a key ID to revoke. Example: 'Revoke key key_abc123'.",
        action: "REVOKE_API_KEY",
      });
      return;
    }

    try {
      const data = await apiRequest<DeleteKeyResponse>(
        runtime,
        "DELETE",
        `/keys/${keyId}`
      );

      callback?.({
        text: `API key ${data.key_id} revoked.`,
        action: "REVOKE_API_KEY",
      });
    } catch (error) {
      callback?.({
        text: `Failed to revoke API key: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "REVOKE_API_KEY",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Revoke key key_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "API key key_abc123 revoked.",
          action: "REVOKE_API_KEY",
        },
      },
    ],
  ],
};
