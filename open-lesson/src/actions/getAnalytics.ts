import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { UserAnalyticsResponse } from "../types";

export const getUserAnalyticsAction: Action = {
  name: "GET_USER_ANALYTICS",
  similes: [
    "SHOW_ANALYTICS",
    "VIEW_ANALYTICS",
    "MY_STATS",
    "LEARNING_STATS",
    "SHOW_PROGRESS",
  ],
  description:
    "Retrieve user-wide analytics — overview, performance trends, learning history, and achievements",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    try {
      const data = await apiRequest<UserAnalyticsResponse>(
        runtime,
        "GET",
        "/analytics/user"
      );

      let text = `Analytics Overview: ${data.overview.total_sessions} sessions, ${data.overview.total_plans} plans.`;
      text += `\nCompletion rates — plans: ${(data.overview.plan_completion_rate * 100).toFixed(0)}%, sessions: ${(data.overview.session_completion_rate * 100).toFixed(0)}%.`;
      text += `\nPerformance: gap score ${data.performance.overall_gap_score.toFixed(2)} (${data.performance.trend}).`;

      if (data.achievements.streaks.current_days > 0) {
        text += `\nStreak: ${data.achievements.streaks.current_days} days (best: ${data.achievements.streaks.longest_days}).`;
      }

      if (data.learning_history.recent_topics.length > 0) {
        text += `\nRecent topics: ${data.learning_history.recent_topics.slice(0, 5).join(", ")}.`;
      }

      callback?.({ text, action: "GET_USER_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_USER_ANALYTICS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my learning analytics" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Analytics Overview: 12 sessions, 3 plans.\nCompletion rates — plans: 67%, sessions: 83%.\nPerformance: gap score 0.42 (improving).\nStreak: 5 days (best: 12).\nRecent topics: Gradient Descent, Linear Algebra, Neural Networks.",
          action: "GET_USER_ANALYTICS",
        },
      },
    ],
  ],
};
