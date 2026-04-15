import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { RestartSessionResponse } from "../types";

export const restartSessionAction: Action = {
  name: "RESTART_SESSION",
  similes: ["RESET_SESSION", "REDO_SESSION", "START_OVER_SESSION"],
  description:
    "Restart a session — archives probes, optionally clears transcript, generates a new plan and opening probe",

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
        text: "Please provide a session ID to restart.",
        action: "RESTART_SESSION",
      });
      return;
    }

    // Extract optional parameters
    const reasonMatch = text.match(
      /(?:reason|because)[:\s]*["']?([^"']+)["']?/i
    );
    const preserveMatch = text.match(
      /preserve[_\s]?transcript[:\s]*(true|false)/i
    );
    const strategyMatch = text.match(
      /(?:strategy|approach)[:\s]*["']?([^"']+)["']?/i
    );

    try {
      const body: Record<string, unknown> = {};
      if (reasonMatch) body.reason = reasonMatch[1].trim();
      if (preserveMatch)
        body.preserve_transcript = preserveMatch[1].toLowerCase() === "true";
      if (strategyMatch) body.new_strategy = strategyMatch[1].trim();

      const data = await apiRequest<RestartSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/restart`,
        Object.keys(body).length > 0 ? body : undefined
      );

      let responseText = `Session ${data.session.id} restarted. Transcript ${data.transcript_preserved ? "preserved" : "cleared"}.`;
      if (data.opening_probe) {
        responseText += `\n\nFirst question: ${data.opening_probe}`;
      }

      callback?.({
        text: responseText,
        action: "RESTART_SESSION",
      });
    } catch (error) {
      callback?.({
        text: `Failed to restart session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "RESTART_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Restart session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 restarted. Transcript cleared.\n\nFirst question: Let's start fresh — what do you already know about this topic?",
          action: "RESTART_SESSION",
        },
      },
    ],
  ],
};
