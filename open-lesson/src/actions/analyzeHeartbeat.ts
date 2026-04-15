import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AnalyzeHeartbeatResponse, HeartbeatInput } from "../types";

function interpretGapScore(score: number): string {
  if (score < 0.3) {
    return "Strong understanding — solid reasoning demonstrated";
  } else if (score < 0.6) {
    return "Moderate understanding — some reasoning gaps identified";
  }
  return "Significant reasoning gaps — follow-up recommended";
}

export const analyzeHeartbeatAction: Action = {
  name: "ANALYZE_HEARTBEAT",
  similes: [
    "SUBMIT_HEARTBEAT",
    "ANALYZE_RESPONSE",
    "CHECK_UNDERSTANDING",
    "SEND_HEARTBEAT",
  ],
  description:
    "Submit a heartbeat (text, audio, or image input) for analysis during an active session. Returns gap score and probing questions.",

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

    // Extract session_id from message or state
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId =
      sessionMatch?.[1] ??
      (state as Record<string, unknown>)?.session_id as string | undefined;

    if (!sessionId) {
      callback({
        text: "Please provide a session ID. Example: 'Analyze session sess_abc123: my explanation is...'",
        action: "ANALYZE_HEARTBEAT",
      });
      return true;
    }

    // Build inputs — default to text content from the message
    const contentText = text
      .replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "")
      .replace(/^[\s:,]+/, "")
      .trim();

    const inputs: HeartbeatInput[] = [];
    if (contentText) {
      inputs.push({ type: "text", content: contentText });
    }

    if (inputs.length === 0) {
      callback({
        text: "Please provide some content (text, audio, or image) to analyze.",
        action: "ANALYZE_HEARTBEAT",
      });
      return true;
    }

    try {
      const data = await apiRequest<AnalyzeHeartbeatResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/analyze`,
        { inputs }
      );

      const interpretation = interpretGapScore(data.gap_score);
      let responseText = `Analysis complete (gap score: ${data.gap_score.toFixed(2)}). ${interpretation}.`;

      if (data.probes.length > 0) {
        responseText += "\n\nProbing questions:";
        data.probes.forEach((p, i) => {
          responseText += `\n${i + 1}. ${p.question}`;
        });
      }

      callback({
        text: responseText,
        action: "ANALYZE_HEARTBEAT",
      });
    } catch (error) {
      callback({
        text: `Failed to analyze heartbeat: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ANALYZE_HEARTBEAT",
      });
    }

    return true;
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Analyze session sess_abc123: I think gradient descent works by following the slope downhill",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Analysis complete (gap score: 0.35). Moderate understanding — some reasoning gaps identified.\n\nProbing questions:\n1. What determines the size of each step?",
          action: "ANALYZE_HEARTBEAT",
        },
      },
    ],
  ],
};
