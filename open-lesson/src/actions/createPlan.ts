import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { CreatePlanResponse } from "../types";

export const createPlanAction: Action = {
  name: "CREATE_LEARNING_PLAN",
  similes: [
    "GENERATE_LEARNING_PLAN",
    "MAKE_LEARNING_PLAN",
    "BUILD_STUDY_PLAN",
    "CREATE_STUDY_PLAN",
  ],
  description:
    "Create a personalized learning plan as a directed graph of tutoring sessions for a given topic",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    // Extract topic — everything after common trigger phrases
    const topicMatch = text.match(
      /(?:learning plan (?:for|about|on)|learn|study|plan for)\s+(.+?)(?:\s+in\s+(\d+)\s*(days?|weeks?))?$/i
    );
    const topic = topicMatch ? topicMatch[1].replace(/\s+in\s+\d+\s*(days?|weeks?)$/i, "").trim() : text.trim();
    let duration_days: number | undefined;

    const durationMatch = text.match(/(\d+)\s*(days?|weeks?)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      duration_days = unit.startsWith("week") ? num * 7 : num;
    }

    if (!topic) {
      callback({
        text: "Please specify a topic for the learning plan.",
        action: "CREATE_LEARNING_PLAN",
      });
      return true;
    }

    try {
      const body: Record<string, unknown> = { topic };
      if (duration_days) body.duration_days = duration_days;

      const data = await apiRequest<CreatePlanResponse>(
        runtime,
        "POST",
        "/plans",
        body
      );

      const startNode = data.nodes.find((n) => n.is_start);

      callback({
        text: `Learning plan created for "${data.topic}" spanning ${data.duration_days} days with ${data.nodes.length} sessions. Plan ID: ${data.plan_id}. First session: "${startNode?.title ?? "N/A"}".`,
        action: "CREATE_LEARNING_PLAN",
      });
    } catch (error) {
      callback({
        text: `Failed to create learning plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_LEARNING_PLAN",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Create a learning plan for quantum computing" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: 'Learning plan created for "quantum computing" spanning 30 days with 8 sessions. Plan ID: plan_abc123. First session: "Introduction to Qubits".',
          action: "CREATE_LEARNING_PLAN",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I want to learn Python in 2 weeks" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: 'Learning plan created for "Python" spanning 14 days with 6 sessions. Plan ID: plan_def456. First session: "Python Basics".',
          action: "CREATE_LEARNING_PLAN",
        },
      },
    ],
  ],
};
