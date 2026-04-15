import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { StartSessionResponse } from "../types";

export const startSessionAction: Action = {
  name: "START_SESSION",
  similes: [
    "BEGIN_SESSION",
    "START_TUTORING",
    "NEW_SESSION",
    "OPEN_SESSION",
  ],
  description:
    "Start a new tutoring session. Requires a topic; optionally linked to a plan via plan_id/plan_node_id. Sessions can be standalone.",

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

    // Extract topic — after common trigger words
    const topicMatch = text.match(
      /(?:session (?:about|on|for)|tutor(?:ing)? (?:on|about|for)|study|learn about)\s+(.+)/i
    );
    const topic = topicMatch ? topicMatch[1].trim() : text.trim();

    if (!topic) {
      callback?.({
        text: "Please specify a topic for the session.",
        action: "START_SESSION",
      });
      return;
    }

    // Optional plan linkage from state or message
    const planIdMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId =
      planIdMatch?.[1] ??
      ((state as Record<string, unknown>)?.plan_id as string | undefined);

    const nodeIdMatch = text.match(
      /node[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const planNodeId =
      nodeIdMatch?.[1] ??
      ((state as Record<string, unknown>)?.plan_node_id as string | undefined);

    // Optional tutoring language
    const langMatch = text.match(
      /(?:language|lang|in)\s+(english|spanish|french|german|portuguese|chinese|japanese|korean|arabic|hindi|italian|dutch|russian|turkish)/i
    );

    try {
      const body: Record<string, unknown> = { topic };
      if (planId) body.plan_id = planId;
      if (planNodeId) body.plan_node_id = planNodeId;
      if (langMatch) body.tutoring_language = langMatch[1].toLowerCase();

      const data = await apiRequest<StartSessionResponse>(
        runtime,
        "POST",
        "/sessions",
        body
      );

      let responseText = `Tutoring session started for "${data.session.problem}". Session ID: ${data.session.id}. Status: ${data.session.status}.`;
      if (data.opening_probe) {
        responseText += `\n\nFirst question: ${data.opening_probe}`;
      }

      callback?.({
        text: responseText,
        action: "START_SESSION",
      });
    } catch (error) {
      callback?.({
        text: `Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "START_SESSION",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Start a tutoring session about gradient descent" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Tutoring session started for "gradient descent". Session ID: sess_abc123. Status: active.\n\nFirst question: What do you already know about optimization?',
          action: "START_SESSION",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I want to study linear algebra" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Tutoring session started for "linear algebra". Session ID: sess_def456. Status: active.',
          action: "START_SESSION",
        },
      },
    ],
  ],
};
