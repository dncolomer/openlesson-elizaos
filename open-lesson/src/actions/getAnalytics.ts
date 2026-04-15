import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AnalyticsResponse } from "../types";

export const getAnalyticsAction: Action = {
  name: "GET_ANALYTICS",
  similes: [
    "SHOW_ANALYTICS",
    "VIEW_ANALYTICS",
    "MY_STATS",
    "LEARNING_STATS",
    "SHOW_PROGRESS",
  ],
  description:
    "Retrieve user analytics — total sessions, plans, average gap score, and per-session stats",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback
  ) => {
    try {
      const data = await apiRequest<AnalyticsResponse>(
        runtime,
        "GET",
        "/analytics/user"
      );

      let text = `Analytics: ${data.total_sessions} sessions, ${data.total_plans} plans, average gap score ${data.average_gap_score.toFixed(2)}.`;

      if (data.sessions.length > 0) {
        text += "\n\nRecent sessions:";
        data.sessions.slice(0, 5).forEach((s) => {
          text += `\n- ${s.topic} (${s.status}) — gap: ${s.average_gap_score.toFixed(2)}, heartbeats: ${s.heartbeat_count}`;
        });
        if (data.sessions.length > 5) {
          text += `\n... and ${data.sessions.length - 5} more.`;
        }
      }

      callback({ text, action: "GET_ANALYTICS" });
    } catch (error) {
      callback({
        text: `Failed to get analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_ANALYTICS",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me my learning analytics" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Analytics: 12 sessions, 3 plans, average gap score 0.42.\n\nRecent sessions:\n- Gradient Descent (completed) — gap: 0.35, heartbeats: 8\n- Linear Algebra (active) — gap: 0.50, heartbeats: 3",
          action: "GET_ANALYTICS",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "How am I doing with my studies?" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Analytics: 5 sessions, 1 plan, average gap score 0.28.",
          action: "GET_ANALYTICS",
        },
      },
    ],
  ],
};
