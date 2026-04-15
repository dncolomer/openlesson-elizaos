import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AnalyzeHeartbeatResponse, HeartbeatInput, AnalysisContext } from "../types";

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
    "Submit a multimodal heartbeat (text, audio, or image input) for analysis during an active session. Returns gap score, plan updates, and probing questions.",

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

    // Extract session_id from message or state
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId =
      sessionMatch?.[1] ??
      ((state as Record<string, unknown>)?.session_id as string | undefined);

    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Analyze session sess_abc123: my explanation is...'",
        action: "ANALYZE_HEARTBEAT",
      });
      return;
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
      callback?.({
        text: "Please provide some content (text, audio, or image) to analyze.",
        action: "ANALYZE_HEARTBEAT",
      });
      return;
    }

    // Build optional context from state
    const stateObj = state as Record<string, unknown>;
    const context: AnalysisContext = {};
    if (stateObj?.active_probe_ids)
      context.active_probe_ids = stateObj.active_probe_ids as string[];
    if (stateObj?.focused_probe_id)
      context.focused_probe_id = stateObj.focused_probe_id as string;

    try {
      const body: Record<string, unknown> = { inputs };
      if (Object.keys(context).length > 0) body.context = context;

      const data = await apiRequest<AnalyzeHeartbeatResponse>(
        runtime,
        "POST",
        `/sessions/${sessionId}/analyze`,
        body
      );

      const gapScore = data.analysis.gap_score;
      const interpretation = interpretGapScore(gapScore);
      let responseText = `Analysis complete (gap score: ${gapScore.toFixed(2)}). ${interpretation}.`;

      if (data.analysis.understanding_summary) {
        responseText += `\n\n${data.analysis.understanding_summary}`;
      }

      if (data.guidance.next_probe) {
        responseText += `\n\nNext question: ${data.guidance.next_probe.text}`;
      }

      if (data.session_plan_update.changed) {
        responseText += `\n\nPlan updated: step ${data.session_plan_update.current_step_index + 1}`;
        if (data.session_plan_update.current_step) {
          responseText += ` — ${data.session_plan_update.current_step.title}`;
        }
      }

      callback?.({
        text: responseText,
        action: "ANALYZE_HEARTBEAT",
      });
    } catch (error) {
      callback?.({
        text: `Failed to analyze heartbeat: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ANALYZE_HEARTBEAT",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Analyze session sess_abc123: I think gradient descent works by following the slope downhill",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Analysis complete (gap score: 0.35). Moderate understanding — some reasoning gaps identified.\n\nYou understand the basic intuition but missed the role of the learning rate.\n\nNext question: What determines the size of each step?",
          action: "ANALYZE_HEARTBEAT",
        },
      },
    ],
  ],
};
