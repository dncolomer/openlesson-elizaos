import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetPlanResponse } from "../types";

export const getPlanAction: Action = {
  name: "GET_PLAN",
  similes: ["VIEW_PLAN", "SHOW_PLAN", "PLAN_DETAILS", "PLAN_INFO"],
  description:
    "Get a learning plan with its nodes and statistics",

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
        text: "Please provide a plan ID. Example: 'Show plan plan_abc123'.",
        action: "GET_PLAN",
      });
      return;
    }

    try {
      const data = await apiRequest<GetPlanResponse>(
        runtime,
        "GET",
        `/plans/${planId}`
      );

      let responseText = `Plan: ${data.plan.title} (${data.plan.status})`;
      responseText += `\nTopic: ${data.plan.topic}, Duration: ${data.plan.duration_days} days`;
      responseText += `\nProgress: ${data.statistics.progress_percent}% — ${data.statistics.completed_nodes}/${data.statistics.total_nodes} nodes completed`;
      responseText += `\n\nNodes:`;
      data.nodes.forEach((n) => {
        const marker = n.is_start ? " [START]" : "";
        responseText += `\n- ${n.title} (${n.status})${marker}`;
      });

      callback?.({ text: responseText, action: "GET_PLAN" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show plan plan_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Plan: Quantum Computing (active)\nTopic: quantum computing, Duration: 30 days\nProgress: 25% — 2/8 nodes completed\n\nNodes:\n- Introduction to Qubits (completed) [START]\n- Quantum Gates (in_progress)\n- Quantum Entanglement (pending)',
          action: "GET_PLAN",
        },
      },
    ],
  ],
};
