import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { SessionAnalyticsResponse } from "../types";

export const getSessionAnalyticsAction: Action = {
  name: "GET_SESSION_ANALYTICS",
  similes: [
    "SESSION_STATS",
    "SESSION_PERFORMANCE",
    "SHOW_SESSION_ANALYTICS",
    "SESSION_REPORT",
  ],
  description:
    "Get detailed analytics for a session — probes, gap timeline, plan progress, transcript stats",

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
        text: "Please provide a session ID. Example: 'Show analytics for session sess_abc123'.",
        action: "GET_SESSION_ANALYTICS",
      });
      return;
    }

    try {
      const data = await apiRequest<SessionAnalyticsResponse>(
        runtime,
        "GET",
        `/analytics/sessions/${sessionId}`
      );

      let responseText = `Session Analytics: ${data.session.problem} (${data.session.status})`;
      responseText += `\nProbes: ${data.probes.total} total (${data.probes.active} active, ${data.probes.archived} archived)`;
      responseText += `\nAvg gap score: ${data.probes.avg_gap_score.toFixed(2)}`;

      if (data.gap_timeline.length > 0) {
        const trend =
          data.gap_timeline[data.gap_timeline.length - 1] <
          data.gap_timeline[0]
            ? "improving"
            : "needs work";
        responseText += `\nGap trend: ${trend} (${data.gap_timeline.map((g) => g.toFixed(2)).join(" -> ")})`;
      }

      if (data.probes.by_type && Object.keys(data.probes.by_type).length > 0) {
        responseText += `\nProbe types: ${Object.entries(data.probes.by_type)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`;
      }

      callback?.({ text: responseText, action: "GET_SESSION_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get session analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_ANALYTICS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show analytics for session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session Analytics: gradient descent (completed)\nProbes: 8 total (0 active, 8 archived)\nAvg gap score: 0.32\nGap trend: improving (0.65 -> 0.45 -> 0.30 -> 0.22)\nProbe types: conceptual: 4, application: 3, synthesis: 1",
          action: "GET_SESSION_ANALYTICS",
        },
      },
    ],
  ],
};
