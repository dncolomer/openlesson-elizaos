import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetSessionResponse } from "../types";

export const getSessionAction: Action = {
  name: "GET_SESSION",
  similes: [
    "VIEW_SESSION",
    "SHOW_SESSION",
    "SESSION_DETAILS",
    "SESSION_INFO",
  ],
  description:
    "Get full session details including plan, statistics, and active probes",

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
        text: "Please provide a session ID. Example: 'Show session sess_abc123'.",
        action: "GET_SESSION",
      });
      return;
    }

    try {
      const data = await apiRequest<GetSessionResponse>(
        runtime,
        "GET",
        `/sessions/${sessionId}`
      );

      const stats = data.statistics;
      const durationMin = Math.round(stats.duration_ms / 1000 / 60);

      let responseText = `Session: ${data.session.problem} (${data.session.status})`;
      responseText += `\nDuration: ${durationMin} min, ${stats.total_words} words, ${stats.transcript_chunks} chunks`;
      responseText += `\nProbes: ${stats.total_probes} total (${stats.active_probes} active, ${stats.archived_probes} archived)`;
      responseText += `\nAvg gap score: ${stats.avg_gap_score.toFixed(2)}`;

      if (data.active_probes.length > 0) {
        responseText += `\n\nActive probes:`;
        data.active_probes.forEach((p) => {
          responseText += `\n- ${p.text}`;
        });
      }

      callback?.({ text: responseText, action: "GET_SESSION" });
    } catch (error) {
      callback?.({
        text: `Failed to get session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session: gradient descent (active)\nDuration: 12 min, 450 words, 5 chunks\nProbes: 8 total (2 active, 6 archived)\nAvg gap score: 0.35\n\nActive probes:\n- What determines the size of each step?\n- How does momentum affect convergence?",
          action: "GET_SESSION",
        },
      },
    ],
  ],
};
