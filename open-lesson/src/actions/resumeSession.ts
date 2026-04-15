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
  similes: ["CONTINUE_SESSION", "UNPAUSE_SESSION"],
  description:
    "Resume a previously paused tutoring session — returns a reorientation probe",

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
        text: "Please provide a session ID to resume.",
        action: "RESUME_SESSION",
      });
      return;
    }

    // Extract optional continuation context
    const contextMatch = text
      .replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "")
      .replace(/^[\s:,]+/, "")
      .trim();

    try {
      const body: Record<string, unknown> = {};
      if (contextMatch) body.continuation_context = contextMatch;

      const data = await apiRequest<ResumeSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/resume`,
        Object.keys(body).length > 0 ? body : undefined
      );

      const pauseDuration = Math.round(
        data.current_context.pause_duration_ms / 1000 / 60
      );
      let responseText = `Session ${data.session.id} resumed after ${pauseDuration} minutes.`;
      if (data.reorientation_probe) {
        responseText += `\n\nLet's pick up: ${data.reorientation_probe}`;
      }

      callback?.({
        text: responseText,
        action: "RESUME_SESSION",
      });
    } catch (error) {
      callback?.({
        text: `Failed to resume session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "RESUME_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Resume session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 resumed after 15 minutes.\n\nLet's pick up: Before the break, we were discussing gradient descent. Can you recall what determines the step size?",
          action: "RESUME_SESSION",
        },
      },
    ],
  ],
};
