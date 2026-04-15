import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetTranscriptResponse } from "../types";

export const getSessionTranscriptAction: Action = {
  name: "GET_SESSION_TRANSCRIPT",
  similes: [
    "SHOW_TRANSCRIPT",
    "SESSION_TRANSCRIPT",
    "VIEW_TRANSCRIPT",
    "READ_TRANSCRIPT",
  ],
  description:
    "Get the transcript for a session in full, summary, or chunks format",

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
        text: "Please provide a session ID. Example: 'Show transcript for session sess_abc123'.",
        action: "GET_SESSION_TRANSCRIPT",
      });
      return;
    }

    const formatMatch = text.match(
      /(?:format)[:\s]*(full|summary|chunks)/i
    );

    try {
      const query: Record<string, string | undefined> = {};
      if (formatMatch) query.format = formatMatch[1].toLowerCase();

      const data = await apiRequest<GetTranscriptResponse>(
        runtime,
        "GET",
        `/sessions/${sessionId}/transcript`,
        undefined,
        query
      );

      let responseText = `Transcript (${data.metadata.format}): ${data.metadata.chunk_count} chunks, ${data.metadata.total_words} words.`;

      if (data.transcript) {
        const preview =
          data.transcript.length > 500
            ? data.transcript.slice(0, 500) + "..."
            : data.transcript;
        responseText += `\n\n${preview}`;
      } else if (data.chunks && data.chunks.length > 0) {
        responseText += `\n\nChunks:`;
        data.chunks.slice(0, 10).forEach((c) => {
          responseText += `\n- [${c.timestamp_ms}ms] ${c.word_count} words`;
          if (c.content) {
            const preview =
              c.content.length > 100 ? c.content.slice(0, 100) + "..." : c.content;
            responseText += `: ${preview}`;
          }
        });
      }

      callback?.({ text: responseText, action: "GET_SESSION_TRANSCRIPT" });
    } catch (error) {
      callback?.({
        text: `Failed to get transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_TRANSCRIPT",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show transcript for session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Transcript (full): 5 chunks, 450 words.\n\nGradient descent works by computing the gradient of the loss function with respect to the model parameters...",
          action: "GET_SESSION_TRANSCRIPT",
        },
      },
    ],
  ],
};
