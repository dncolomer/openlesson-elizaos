import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ListSessionsResponse } from "../types";

export const listSessionsAction: Action = {
  name: "LIST_SESSIONS",
  similes: [
    "SHOW_SESSIONS",
    "MY_SESSIONS",
    "VIEW_SESSIONS",
    "GET_SESSIONS",
  ],
  description:
    "List tutoring sessions with optional status/plan_id filter and pagination",

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
      /(?:status|filter)[:\s]*(active|paused|completed|ended)/i
    );
    const planIdMatch = text.match(
      /plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);

    try {
      const query: Record<string, string | number | undefined> = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();
      if (planIdMatch) query.plan_id = planIdMatch[1];
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);

      const data = await apiRequest<ListSessionsResponse>(
        runtime,
        "GET",
        "/sessions",
        undefined,
        query
      );

      if (data.sessions.length === 0) {
        callback?.({
          text: "No sessions found.",
          action: "LIST_SESSIONS",
        });
        return;
      }

      let responseText = `Found ${data.pagination.total} sessions:`;
      data.sessions.forEach((s) => {
        responseText += `\n- ${s.problem} (${s.status}) — ID: ${s.id}`;
      });
      if (data.pagination.has_more) {
        responseText += `\n... and ${data.pagination.total - data.sessions.length} more.`;
      }

      callback?.({ text: responseText, action: "LIST_SESSIONS" });
    } catch (error) {
      callback?.({
        text: `Failed to list sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_SESSIONS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my sessions" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Found 5 sessions:\n- Gradient Descent (completed) — ID: sess_abc123\n- Linear Algebra (active) — ID: sess_def456',
          action: "LIST_SESSIONS",
        },
      },
    ],
  ],
};
