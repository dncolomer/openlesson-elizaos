import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { UpdatePlanResponse } from "../types";

export const updatePlanAction: Action = {
  name: "UPDATE_PLAN",
  similes: [
    "EDIT_PLAN",
    "RENAME_PLAN",
    "SET_PLAN_STATUS",
    "PLAN_NOTES",
  ],
  description:
    "Update a learning plan's metadata — title, notes, or status (active, paused, completed, archived)",

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
        text: "Please provide a plan ID to update.",
        action: "UPDATE_PLAN",
      });
      return;
    }

    const titleMatch = text.match(/title[:\s]*["']([^"']+)["']/i);
    const notesMatch = text.match(/notes?[:\s]*["']([^"']+)["']/i);
    const statusMatch = text.match(
      /status[:\s]*(active|paused|completed|archived)/i
    );

    const body: Record<string, unknown> = {};
    if (titleMatch) body.title = titleMatch[1].trim();
    if (notesMatch) body.notes = notesMatch[1].trim();
    if (statusMatch) body.status = statusMatch[1].toLowerCase();

    if (Object.keys(body).length === 0) {
      callback?.({
        text: 'Please specify what to update: title, notes, or status. Example: \'Update plan plan_abc123 title: "New Title"\'.',
        action: "UPDATE_PLAN",
      });
      return;
    }

    try {
      const data = await apiRequest<UpdatePlanResponse>(
        runtime,
        "PATCH",
        `/plans/${planId}`,
        body
      );

      const changedFields = Object.keys(data.changes).join(", ");
      callback?.({
        text: `Plan ${data.plan.id} updated. Changed: ${changedFields}.`,
        action: "UPDATE_PLAN",
      });
    } catch (error) {
      callback?.({
        text: `Failed to update plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "UPDATE_PLAN",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: 'Update plan plan_abc123 title: "Advanced Quantum Computing"',
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_abc123 updated. Changed: title.",
          action: "UPDATE_PLAN",
        },
      },
    ],
  ],
};
