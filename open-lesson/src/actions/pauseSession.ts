import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { PauseSessionResponse } from "../types";

export const pauseSessionAction: Action = {
  name: "PAUSE_SESSION",
  similes: ["HOLD_SESSION", "SUSPEND_SESSION", "BREAK_SESSION"],
  description: "Pause an active tutoring session",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: unknown,
    callback: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId =
      sessionMatch?.[1] ??
      (state as Record<string, unknown>)?.session_id as string | undefined;

    if (!sessionId) {
      callback({
        text: "Please provide a session ID to pause.",
        action: "PAUSE_SESSION",
      });
      return true;
    }

    try {
      const data = await apiRequest<PauseSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/pause`
      );

      callback({
        text: `Session ${data.session_id} paused. ${data.message}`,
        action: "PAUSE_SESSION",
      });
    } catch (error) {
      callback({
        text: `Failed to pause session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "PAUSE_SESSION",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Pause session sess_abc123" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Session sess_abc123 paused. You can resume any time.",
          action: "PAUSE_SESSION",
        },
      },
    ],
  ],
};
