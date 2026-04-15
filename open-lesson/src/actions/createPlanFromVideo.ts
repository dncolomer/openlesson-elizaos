import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { CreatePlanFromVideoResponse } from "../types";

export const createPlanFromVideoAction: Action = {
  name: "CREATE_PLAN_FROM_VIDEO",
  similes: [
    "PLAN_FROM_YOUTUBE",
    "VIDEO_LEARNING_PLAN",
    "YOUTUBE_PLAN",
    "LEARN_FROM_VIDEO",
  ],
  description: "Create a learning plan derived from a YouTube video URL",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> | undefined,
    callback?: HandlerCallback
  ) => {
    const text = (message.content as { text?: string }).text ?? "";

    const urlMatch = text.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/i
    );
    const youtubeUrl = urlMatch?.[0];

    if (!youtubeUrl) {
      callback?.({
        text: "Please provide a YouTube URL. Example: 'Create a plan from this video: https://youtube.com/watch?v=...'",
        action: "CREATE_PLAN_FROM_VIDEO",
      });
      return;
    }

    // Extract optional duration
    const durationMatch = text.match(/(\d+)\s*(days?|weeks?)/i);
    let duration_days: number | undefined;
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      duration_days = unit.startsWith("week") ? num * 7 : num;
    }

    try {
      const body: Record<string, unknown> = { youtube_url: youtubeUrl };
      if (duration_days) body.duration_days = duration_days;

      const data = await apiRequest<CreatePlanFromVideoResponse>(
        runtime,
        "POST",
        "/plans/from-video",
        body
      );

      const startNode = data.nodes.find((n) => n.is_start);

      callback?.({
        text: `Learning plan created from video for "${data.plan.topic}" spanning ${data.plan.duration_days} days with ${data.node_count} sessions. Plan ID: ${data.plan.id}. First session: "${startNode?.title ?? "N/A"}".`,
        action: "CREATE_PLAN_FROM_VIDEO",
      });
    } catch (error) {
      callback?.({
        text: `Failed to create plan from video: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_PLAN_FROM_VIDEO",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Create a plan from this video: https://youtube.com/watch?v=dQw4w9WgXcQ",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Learning plan created from video for "Music Theory Basics" spanning 14 days with 5 sessions. Plan ID: plan_vid789. First session: "Melody and Harmony".',
          action: "CREATE_PLAN_FROM_VIDEO",
        },
      },
    ],
  ],
};
