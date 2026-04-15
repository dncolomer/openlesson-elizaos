import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ListProofsResponse } from "../types";

export const listProofsAction: Action = {
  name: "LIST_PROOFS",
  similes: ["SHOW_PROOFS", "MY_PROOFS", "VIEW_PROOFS", "GET_PROOFS"],
  description:
    "List cryptographic proofs with optional filters (session_id, plan_id, type, anchored)",

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

    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const planMatch = text.match(
      /plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const typeMatch = text.match(
      /type[:\s]*(plan_created|plan_adapted|session_started|session_paused|session_resumed|session_ended|analysis_heartbeat|assistant_query|session_batch)/i
    );
    const anchoredMatch = text.match(/anchored[:\s]*(true|false)/i);
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);

    try {
      const query: Record<string, string | number | boolean | undefined> = {};
      if (sessionMatch) query.session_id = sessionMatch[1];
      if (planMatch) query.plan_id = planMatch[1];
      if (typeMatch) query.type = typeMatch[1].toLowerCase();
      if (anchoredMatch) query.anchored = anchoredMatch[1].toLowerCase();
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);

      const data = await apiRequest<ListProofsResponse>(
        runtime,
        "GET",
        "/proofs",
        undefined,
        query
      );

      if (data.proofs.length === 0) {
        callback?.({ text: "No proofs found.", action: "LIST_PROOFS" });
        return;
      }

      let responseText = `Found ${data.pagination.total} proofs:`;
      data.proofs.forEach((p) => {
        const anchor = p.anchored ? " [anchored]" : "";
        responseText += `\n- ${p.proof_type} (${p.fingerprint.slice(0, 16)}...)${anchor} — ${p.created_at}`;
      });
      if (data.pagination.has_more) {
        responseText += `\n... and ${data.pagination.total - data.proofs.length} more.`;
      }

      callback?.({ text: responseText, action: "LIST_PROOFS" });
    } catch (error) {
      callback?.({
        text: `Failed to list proofs: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_PROOFS",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my proofs" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Found 12 proofs:\n- session_started (sha256:a1b2c3d4...) — 2025-01-15T10:00:00Z\n- analysis_heartbeat (sha256:e5f6a7b8...) [anchored] — 2025-01-15T10:05:00Z",
          action: "LIST_PROOFS",
        },
      },
    ],
  ],
};
