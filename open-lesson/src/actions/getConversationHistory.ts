import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetConversationResponse } from "../types";

export const getConversationHistoryAction: Action = {
  name: "GET_CONVERSATION_HISTORY",
  similes: [
    "SHOW_CONVERSATION",
    "VIEW_CONVERSATION",
    "CONVERSATION_MESSAGES",
    "CHAT_HISTORY",
  ],
  description:
    "Get the full message history for a teaching assistant conversation within a session",

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

    const convMatch = text.match(
      /conversation[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const conversationId =
      convMatch?.[1] ??
      ((state as Record<string, unknown>)?.conversation_id as
        | string
        | undefined);

    if (!sessionId || !conversationId) {
      callback?.({
        text: "Please provide both a session ID and conversation ID. Example: 'Show conversation conv_abc123 for session sess_def456'.",
        action: "GET_CONVERSATION_HISTORY",
      });
      return;
    }

    try {
      const data = await apiRequest<GetConversationResponse>(
        runtime,
        "GET",
        `/sessions/${sessionId}/assistant/conversations/${conversationId}`
      );

      const msgs = data.conversation.messages;
      let responseText = `Conversation ${data.conversation.id} (${msgs.length} messages):`;
      msgs.forEach((m) => {
        const preview =
          m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content;
        responseText += `\n[${m.role}]: ${preview}`;
      });

      callback?.({ text: responseText, action: "GET_CONVERSATION_HISTORY" });
    } catch (error) {
      callback?.({
        text: `Failed to get conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_CONVERSATION_HISTORY",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Show conversation conv_abc123 for session sess_def456",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Conversation conv_abc123 (4 messages):\n[user]: What is backpropagation?\n[assistant]: Backpropagation is the algorithm used to compute gradients...\n[user]: How does the chain rule apply?\n[assistant]: The chain rule allows us to compute the derivative of a composite function...",
          action: "GET_CONVERSATION_HISTORY",
        },
      },
    ],
  ],
};
