import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { DeletePlanResponse } from "../types";

export const deletePlanAction: Action = {
  name: "DELETE_PLAN",
  similes: ["REMOVE_PLAN", "DESTROY_PLAN"],
  description:
    "Delete a learning plan, its nodes, and unlink associated sessions",

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
        text: "Please provide a plan ID to delete.",
        action: "DELETE_PLAN",
      });
      return;
    }

    try {
      const data = await apiRequest<DeletePlanResponse>(
        runtime,
        "DELETE",
        `/plans/${planId}`
      );

      callback?.({
        text: `Plan ${data.plan_id} deleted. ${data.nodes_deleted} nodes removed.`,
        action: "DELETE_PLAN",
      });
    } catch (error) {
      callback?.({
        text: `Failed to delete plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "DELETE_PLAN",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Delete plan plan_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_abc123 deleted. 8 nodes removed.",
          action: "DELETE_PLAN",
        },
      },
    ],
  ],
};
