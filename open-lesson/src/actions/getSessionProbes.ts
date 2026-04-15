import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ListProbesResponse } from "../types";

export const getSessionProbesAction: Action = {
  name: "GET_SESSION_PROBES",
  similes: [
    "SHOW_PROBES",
    "LIST_PROBES",
    "SESSION_PROBES",
    "VIEW_PROBES",
  ],
  description:
    "List probes for a session with optional status filter (active, archived, all)",

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
        text: "Please provide a session ID. Example: 'Show probes for session sess_abc123'.",
        action: "GET_SESSION_PROBES",
      });
      return;
    }

    const statusMatch = text.match(
      /(?:status|filter)[:\s]*(active|archived|all)/i
    );

    try {
      const query: Record<string, string | undefined> = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();

      const data = await apiRequest<ListProbesResponse>(
        runtime,
        "GET",
        `/sessions/${sessionId}/probes`,
        undefined,
        query
      );

      if (data.probes.length === 0) {
        callback?.({
          text: `No probes found for session ${sessionId}.`,
          action: "GET_SESSION_PROBES",
        });
        return;
      }

      let responseText = `Probes for session: ${data.summary.total} total (${data.summary.active} active, ${data.summary.archived} archived)`;
      data.probes.forEach((p) => {
        responseText += `\n- [${p.status}] ${p.text}`;
      });

      callback?.({ text: responseText, action: "GET_SESSION_PROBES" });
    } catch (error) {
      callback?.({
        text: `Failed to get probes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PROBES",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show probes for session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Probes for session: 8 total (2 active, 6 archived)\n- [active] What determines the size of each step?\n- [active] How does momentum affect convergence?\n- [archived] What is the gradient?",
          action: "GET_SESSION_PROBES",
        },
      },
    ],
  ],
};
