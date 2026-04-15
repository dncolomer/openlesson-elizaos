import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AskAssistantResponse } from "../types";

export const askAssistantAction: Action = {
  name: "ASK_ASSISTANT",
  similes: [
    "ASK_TUTOR",
    "ASK_QUESTION",
    "SESSION_QUESTION",
    "HELP_ME",
  ],
  description:
    "Ask the teaching assistant a question within an active session",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: unknown,
    callback: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId =
      sessionMatch?.[1] ??
      (state as Record<string, unknown>)?.session_id as string | undefined;

    if (!sessionId) {
      callback({
        text: "Please provide a session ID. Example: 'Ask session sess_abc123: What is backpropagation?'",
        action: "ASK_ASSISTANT",
      });
      return true;
    }

    // Extract the question — everything after the session ID reference
    const question = text
      .replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "")
      .replace(/^[\s:,]+/, "")
      .trim() || text.trim();

    if (!question) {
      callback({
        text: "Please include a question to ask the assistant.",
        action: "ASK_ASSISTANT",
      });
      return true;
    }

    try {
      const data = await apiRequest<AskAssistantResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/ask`,
        { question }
      );

      callback({
        text: data.answer,
        action: "ASK_ASSISTANT",
      });
    } catch (error) {
      callback({
        text: `Failed to ask assistant: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ASK_ASSISTANT",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Ask session sess_abc123: What is backpropagation?",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Backpropagation is the algorithm used to compute gradients in a neural network by propagating errors backward from the output layer to the input layer.",
          action: "ASK_ASSISTANT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you explain the learning rate to me?",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The learning rate controls how large each update step is during optimization. A high rate may overshoot, while a low rate converges slowly.",
          action: "ASK_ASSISTANT",
        },
      },
    ],
  ],
};
