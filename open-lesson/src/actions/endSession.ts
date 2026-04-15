import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { EndSessionResponse } from "../types";

export const endSessionAction: Action = {
  name: "END_SESSION",
  similes: [
    "STOP_SESSION",
    "FINISH_SESSION",
    "CLOSE_SESSION",
    "COMPLETE_SESSION",
  ],
  description: "End an active tutoring session and trigger report generation",

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
        text: "Please provide a session ID to end.",
        action: "END_SESSION",
      });
      return true;
    }

    try {
      const data = await apiRequest<EndSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/end`
      );

      callback({
        text: `Session ${data.session_id} ended. ${data.message}`,
        action: "END_SESSION",
      });
    } catch (error) {
      callback({
        text: `Failed to end session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "END_SESSION",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "End session sess_abc123" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Session sess_abc123 ended. Your report is being generated.",
          action: "END_SESSION",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I'm done with this session" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Session ended. Your summary report will be available shortly.",
          action: "END_SESSION",
        },
      },
    ],
  ],
};
