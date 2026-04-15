import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ListPlansResponse } from "../types";

export const listPlansAction: Action = {
  name: "LIST_PLANS",
  similes: ["SHOW_PLANS", "MY_PLANS", "VIEW_PLANS", "GET_PLANS"],
  description:
    "List learning plans with optional status filter and pagination",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const statusMatch = text.match(
      /(?:status|filter)[:\s]*(active|paused|completed|archived)/i
    );
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);

    try {
      const query: Record<string, string | number | undefined> = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);

      const data = await apiRequest<ListPlansResponse>(
        runtime,
        "GET",
        "/plans",
        undefined,
        query
      );

      if (data.plans.length === 0) {
        callback?.({
          text: "No learning plans found.",
          action: "LIST_PLANS",
        });
        return;
      }

      let responseText = `Found ${data.pagination.total} plans:`;
      data.plans.forEach((p) => {
        responseText += `\n- ${p.title} (${p.status}) — ${p.topic}, ${p.duration_days} days. ID: ${p.id}`;
      });
      if (data.pagination.has_more) {
        responseText += `\n... and ${data.pagination.total - data.plans.length} more.`;
      }

      callback?.({ text: responseText, action: "LIST_PLANS" });
    } catch (error) {
      callback?.({
        text: `Failed to list plans: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_PLANS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my learning plans" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Found 3 plans:\n- Quantum Computing (active) — quantum computing, 30 days. ID: plan_abc123\n- Python Basics (completed) — Python, 14 days. ID: plan_def456',
          action: "LIST_PLANS",
        },
      },
    ],
  ],
};
