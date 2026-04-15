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
    state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId =
      sessionMatch?.[1] ??
      ((state as Record<string, unknown>)?.session_id as string | undefined);

    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID to pause.",
        action: "PAUSE_SESSION",
      });
      return;
    }

    // Extract optional parameters
    const reasonMatch = text.match(
      /(?:reason|because)[:\s]*["']?([^"']+)["']?/i
    );
    const resumeMatch = text.match(/(\d+)\s*min(?:ute)?s?/i);

    try {
      const body: Record<string, unknown> = {};
      if (reasonMatch) body.reason = reasonMatch[1].trim();
      if (resumeMatch)
        body.estimated_resume_minutes = parseInt(resumeMatch[1], 10);

      const data = await apiRequest<PauseSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/pause`,
        Object.keys(body).length > 0 ? body : undefined
      );

      const elapsed = Math.round(data.elapsed_ms / 1000 / 60);
      callback?.({
        text: `Session ${data.session.id} paused after ${elapsed} minutes. You can resume any time.`,
        action: "PAUSE_SESSION",
      });
    } catch (error) {
      callback?.({
        text: `Failed to pause session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "PAUSE_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Pause session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 paused after 12 minutes. You can resume any time.",
          action: "PAUSE_SESSION",
        },
      },
    ],
  ],
};
