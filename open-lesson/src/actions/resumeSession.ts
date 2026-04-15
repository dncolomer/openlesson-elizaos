import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ResumeSessionResponse } from "../types";

export const resumeSessionAction: Action = {
  name: "RESUME_SESSION",
  similes: ["CONTINUE_SESSION", "UNPAUSE_SESSION", "RESTART_SESSION"],
  description: "Resume a previously paused tutoring session",

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
        text: "Please provide a session ID to resume.",
        action: "RESUME_SESSION",
      });
      return true;
    }

    try {
      const data = await apiRequest<ResumeSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/resume`
      );

      callback({
        text: `Session ${data.session_id} resumed. ${data.message}`,
        action: "RESUME_SESSION",
      });
    } catch (error) {
      callback({
        text: `Failed to resume session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "RESUME_SESSION",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Resume session sess_abc123" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Session sess_abc123 resumed. Pick up where you left off.",
          action: "RESUME_SESSION",
        },
      },
    ],
  ],
};
