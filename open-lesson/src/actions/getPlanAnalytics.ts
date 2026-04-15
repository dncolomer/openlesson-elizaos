import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { PlanAnalyticsResponse } from "../types";

export const getPlanAnalyticsAction: Action = {
  name: "GET_PLAN_ANALYTICS",
  similes: [
    "PLAN_STATS",
    "PLAN_PERFORMANCE",
    "PLAN_PROGRESS",
    "SHOW_PLAN_ANALYTICS",
  ],
  description:
    "Get detailed analytics for a learning plan — progress, sessions, performance, strongest/weakest topics, recommendations",

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

    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId =
      idMatch?.[1] ??
      ((state as Record<string, unknown>)?.plan_id as string | undefined);

    if (!planId) {
      callback?.({
        text: "Please provide a plan ID. Example: 'Show analytics for plan plan_abc123'.",
        action: "GET_PLAN_ANALYTICS",
      });
      return;
    }

    try {
      const data = await apiRequest<PlanAnalyticsResponse>(
        runtime,
        "GET",
        `/analytics/plans/${planId}`
      );

      let responseText = `Plan Analytics: ${data.plan.title}`;
      responseText += `\nProgress: ${data.progress.progress_percent}% — ${data.progress.completed_nodes}/${data.progress.total_nodes} nodes`;
      responseText += `\nSessions: ${data.sessions.total} total, ${data.sessions.completed} completed`;
      responseText += `\nPerformance: avg gap ${data.performance.avg_gap_score.toFixed(2)} (${data.performance.trend})`;

      if (data.performance.strongest_topics.length > 0) {
        responseText += `\nStrongest: ${data.performance.strongest_topics.join(", ")}`;
      }
      if (data.performance.weakest_topics.length > 0) {
        responseText += `\nWeakest: ${data.performance.weakest_topics.join(", ")}`;
      }
      if (data.recommendations.length > 0) {
        responseText += `\n\nRecommendations:`;
        data.recommendations.forEach((r, i) => {
          responseText += `\n${i + 1}. ${r}`;
        });
      }

      callback?.({ text: responseText, action: "GET_PLAN_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN_ANALYTICS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show analytics for plan plan_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan Analytics: Quantum Computing\nProgress: 50% — 4/8 nodes\nSessions: 6 total, 4 completed\nPerformance: avg gap 0.38 (improving)\nStrongest: Qubits, Quantum Gates\nWeakest: Entanglement\n\nRecommendations:\n1. Review entanglement concepts before proceeding\n2. Try more practice problems on quantum circuits",
          action: "GET_PLAN_ANALYTICS",
        },
      },
    ],
  ],
};
