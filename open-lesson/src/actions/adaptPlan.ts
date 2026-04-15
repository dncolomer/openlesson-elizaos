import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AdaptPlanResponse } from "../types";

export const adaptPlanAction: Action = {
  name: "ADAPT_LEARNING_PLAN",
  similes: [
    "MODIFY_LEARNING_PLAN",
    "CHANGE_LEARNING_PLAN",
    "UPDATE_PLAN",
    "ADJUST_PLAN",
  ],
  description:
    "Adapt an existing learning plan by giving a natural-language instruction (e.g. skip intro, add practice)",

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

    // Try to extract plan_id from the message or recent state
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId =
      idMatch?.[1] ??
      ((state as Record<string, unknown>)?.plan_id as string | undefined);

    if (!planId) {
      callback?.({
        text: "Please provide a plan ID to adapt. Example: 'Adapt plan plan_abc123: skip the intro sessions'.",
        action: "ADAPT_LEARNING_PLAN",
      });
      return;
    }

    // The instruction is the rest of the message (or the whole text if no plan ID pattern)
    const instruction = text
      .replace(/plan[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "")
      .replace(/^[\s:,]+/, "")
      .trim() || text.trim();

    // Extract optional parameters
    const preserveMatch = text.match(
      /preserve[_\s]?completed[:\s]*(true|false)/i
    );
    const contextMatch = text.match(
      /(?:context|additional)[:\s]*["']?([^"']+)["']?$/i
    );

    try {
      const body: Record<string, unknown> = { instruction };
      if (preserveMatch)
        body.preserve_completed = preserveMatch[1].toLowerCase() === "true";
      if (contextMatch) body.context = contextMatch[1].trim();

      const data = await apiRequest<AdaptPlanResponse>(
        runtime,
        "POST",
        `/plans/${planId}/adapt`,
        body
      );

      callback?.({
        text: `Plan ${data.plan_id} adapted. ${data.explanation} Changes: ${data.changes.created} created, ${data.changes.updated} updated, ${data.changes.deleted} deleted, ${data.changes.kept} kept. Now has ${data.nodes.length} sessions.`,
        action: "ADAPT_LEARNING_PLAN",
      });
    } catch (error) {
      callback?.({
        text: `Failed to adapt plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ADAPT_LEARNING_PLAN",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Adapt plan plan_abc123: skip the intro sessions",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Plan plan_abc123 adapted. Removed introductory sessions as requested. Changes: 0 created, 2 updated, 2 deleted, 4 kept. Now has 6 sessions.',
          action: "ADAPT_LEARNING_PLAN",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Add more practice problems to plan plan_def456" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Plan plan_def456 adapted. Added practice sessions for each topic. Changes: 3 created, 0 updated, 0 deleted, 6 kept. Now has 9 sessions.',
          action: "ADAPT_LEARNING_PLAN",
        },
      },
    ],
  ],
};
