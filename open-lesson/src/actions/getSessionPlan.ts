import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetSessionPlanResponse } from "../types";

export const getSessionPlanAction: Action = {
  name: "GET_SESSION_PLAN",
  similes: [
    "SHOW_SESSION_PLAN",
    "SESSION_STEPS",
    "VIEW_SESSION_PLAN",
    "TUTORING_PLAN",
  ],
  description:
    "Get the tutoring plan for a session with step statistics",

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
        text: "Please provide a session ID. Example: 'Show plan for session sess_abc123'.",
        action: "GET_SESSION_PLAN",
      });
      return;
    }

    try {
      const data = await apiRequest<GetSessionPlanResponse>(
        runtime,
        "GET",
        `/sessions/${sessionId}/plan`
      );

      const stats = data.step_statistics;
      let responseText = `Session Plan: ${data.plan.goal}`;
      responseText += `\nStrategy: ${data.plan.strategy}`;
      responseText += `\nSteps: ${stats.total} total — ${stats.completed} completed, ${stats.in_progress} in progress, ${stats.pending} pending, ${stats.skipped} skipped`;
      responseText += `\nCurrent step: ${data.plan.current_step_index + 1}`;

      if (data.plan.steps.length > 0) {
        responseText += `\n\nSteps:`;
        data.plan.steps.forEach((s, i) => {
          const marker = i === data.plan.current_step_index ? " <-" : "";
          responseText += `\n${i + 1}. ${s.title} (${s.status})${marker}`;
        });
      }

      callback?.({ text: responseText, action: "GET_SESSION_PLAN" });
    } catch (error) {
      callback?.({
        text: `Failed to get session plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PLAN",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show the plan for session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session Plan: Understand gradient descent fundamentals\nStrategy: Socratic questioning\nSteps: 5 total — 2 completed, 1 in progress, 2 pending, 0 skipped\nCurrent step: 3\n\nSteps:\n1. What is optimization? (completed)\n2. Derivatives and slopes (completed)\n3. The gradient descent algorithm (in_progress) <-\n4. Learning rate (pending)\n5. Convergence (pending)",
          action: "GET_SESSION_PLAN",
        },
      },
    ],
  ],
};
