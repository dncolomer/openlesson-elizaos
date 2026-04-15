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
    "Ask the teaching assistant a question within an active session. Supports conversation threading.",

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
        text: "Please provide a session ID. Example: 'Ask session sess_abc123: What is backpropagation?'",
        action: "ASK_ASSISTANT",
      });
      return;
    }

    // Extract the question — everything after the session ID reference
    const question = text
      .replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "")
      .replace(/^[\s:,]+/, "")
      .trim() || text.trim();

    if (!question) {
      callback?.({
        text: "Please include a question to ask the assistant.",
        action: "ASK_ASSISTANT",
      });
      return;
    }

    // Optional conversation threading from state
    const stateObj = state as Record<string, unknown>;
    const conversationId = stateObj?.conversation_id as string | undefined;

    try {
      const body: Record<string, unknown> = { question };
      if (conversationId) body.conversation_id = conversationId;

      const data = await apiRequest<AskAssistantResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/ask`,
        body
      );

      let responseText = data.response.content;
      if (
        data.response.suggested_follow_up &&
        data.response.suggested_follow_up.length > 0
      ) {
        responseText += "\n\nSuggested follow-ups:";
        data.response.suggested_follow_up.forEach((q, i) => {
          responseText += `\n${i + 1}. ${q}`;
        });
      }

      callback?.({
        text: responseText,
        action: "ASK_ASSISTANT",
      });
    } catch (error) {
      callback?.({
        text: `Failed to ask assistant: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ASK_ASSISTANT",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Ask session sess_abc123: What is backpropagation?",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Backpropagation is the algorithm used to compute gradients in a neural network by propagating errors backward from the output layer to the input layer.\n\nSuggested follow-ups:\n1. How does the chain rule apply here?\n2. What is the vanishing gradient problem?",
          action: "ASK_ASSISTANT",
        },
      },
    ],
  ],
};
