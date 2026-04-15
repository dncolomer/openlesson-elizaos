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
  description:
    "End an active tutoring session — generates a report and batch proof",

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
        text: "Please provide a session ID to end.",
        action: "END_SESSION",
      });
      return;
    }

    // Extract optional parameters
    const feedbackMatch = text.match(
      /(?:feedback|comment)[:\s]*["']?([^"']+)["']?/i
    );

    try {
      const body: Record<string, unknown> = {};
      if (feedbackMatch) body.user_feedback = feedbackMatch[1].trim();

      const data = await apiRequest<EndSessionResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/end`,
        Object.keys(body).length > 0 ? body : undefined
      );

      const durationMin = Math.round(data.statistics.duration_ms / 1000 / 60);
      let responseText = `Session ${data.session.id} ended. Duration: ${durationMin} min, ${data.statistics.total_probes} probes, avg gap score: ${data.statistics.avg_gap_score.toFixed(2)}.`;
      responseText += `\nBatch proof: ${data.batch_proof.merkle_root.slice(0, 16)}...`;

      callback?.({
        text: responseText,
        action: "END_SESSION",
      });
    } catch (error) {
      callback?.({
        text: `Failed to end session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "END_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "End session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 ended. Duration: 25 min, 8 probes, avg gap score: 0.32.\nBatch proof: sha256:a1b2c3d4...",
          action: "END_SESSION",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I'm done with this session" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session ended. Duration: 18 min, 5 probes, avg gap score: 0.45.\nBatch proof: sha256:e5f6a7b8...",
          action: "END_SESSION",
        },
      },
    ],
  ],
};
