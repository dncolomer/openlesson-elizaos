// src/actions/generateLearningPlan.ts
import {
  logger
} from "@elizaos/core";
var generateLearningPlanAction = {
  name: "GENERATE_LEARNING_PLAN",
  description: "Generate a personalized learning plan as a directed graph of guided tutoring sessions for a given topic",
  validate: async (runtime, message, _state) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, message, _state, params, _callback) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    const baseUrl = runtime.getSetting("OPENLESSON_BASE_URL") || "https://www.openlesson.academy";
    if (!apiKey) {
      throw new Error("OPENLESSON_API_KEY not configured. Please set it in your character settings.");
    }
    const parsedParams = params;
    const { topic, days = 30 } = parsedParams;
    if (!topic) {
      throw new Error("Topic is required for generating a learning plan.");
    }
    logger.info(`Generating learning plan for topic: ${topic}, days: ${days}`);
    try {
      const response = await fetch(`${baseUrl}/api/agent/plan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic, days })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const startNode = data.nodes.find((n) => n.is_start);
      return {
        success: true,
        text: `Learning plan generated for "${data.topic}" spanning ${data.days} days with ${data.nodes.length} tutoring nodes. The first session is "${startNode?.title}".`,
        values: {
          plan_id: data.planId,
          topic: data.topic,
          days: data.days,
          node_count: data.nodes.length,
          first_session_node_id: startNode?.id
        },
        data: {
          planId: data.planId,
          topic: data.topic,
          days: data.days,
          nodes: data.nodes.map((n) => ({
            id: n.id,
            title: n.title,
            description: n.description,
            is_start: n.is_start,
            next_node_ids: n.next_node_ids,
            status: n.status
          }))
        }
      };
    } catch (error) {
      logger.error("Failed to generate learning plan:", String(error));
      throw new Error(`Failed to generate learning plan: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Create a learning plan for Machine Learning"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will generate a learning plan for Machine Learning using openLesson."
        }
      },
      {
        name: "user",
        content: {
          text: "Yes, I want a 14-day learning plan for Python programming"
        }
      }
    ]
  ]
};

// src/actions/startSession.ts
import {
  logger as logger2
} from "@elizaos/core";
var startSessionAction = {
  name: "START_SESSION",
  description: "Start a new guided tutoring session. Returns session ID and audio submission instructions.",
  validate: async (runtime, message, _state) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, message, _state, params, _callback) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    const baseUrl = runtime.getSetting("OPENLESSON_BASE_URL") || "https://www.openlesson.academy";
    if (!apiKey) {
      throw new Error("OPENLESSON_API_KEY not configured. Please set it in your character settings.");
    }
    const parsedParams = params;
    const { problem, plan_node_id } = parsedParams;
    if (!problem) {
      throw new Error("Problem/topic is required to start a session.");
    }
    logger2.info(`Starting session for problem: ${problem}`);
    try {
      const body = { problem };
      if (plan_node_id) {
        body.plan_node_id = plan_node_id;
      }
      const response = await fetch(`${baseUrl}/api/agent/session/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      return {
        success: true,
        text: `Tutoring session started for "${data.problem}". Session ID: ${data.sessionId}. Please record your audio response to begin the guided dialogue.`,
        values: {
          session_id: data.sessionId,
          problem: data.problem
        },
        data: {
          sessionId: data.sessionId,
          problem: data.problem,
          nodeTitle: data.nodeTitle,
          planId: data.planId,
          status: data.status,
          audio_format: data.instructions?.audioFormat || "webm",
          max_chunk_duration_ms: data.instructions?.maxChunkDuration || 6e4
        }
      };
    } catch (error) {
      logger2.error("Failed to start session:", String(error));
      throw new Error(`Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Start a tutoring session about gradient descent"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will start a guided tutoring session about gradient descent."
        }
      }
    ],
    [
      {
        name: "user",
        content: {
          text: "Let's study for the first node in my learning plan"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will start the first tutoring session from your learning plan."
        }
      }
    ]
  ]
};

// src/actions/analyzeAudio.ts
import {
  logger as logger3
} from "@elizaos/core";
function interpretGapScore(score) {
  if (score < 0.3) {
    return "Strong understanding - user demonstrates solid reasoning";
  } else if (score < 0.6) {
    return "Moderate understanding - some reasoning gaps identified";
  } else {
    return "Significant reasoning gaps - follow-up recommended";
  }
}
var analyzeAudioAction = {
  name: "ANALYZE_AUDIO",
  description: "Submit an audio chunk for analysis. Returns reasoning gap score and follow-up questions. IMPORTANT: This endpoint only accepts audio input, NOT text.",
  validate: async (runtime, message, _state) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, message, _state, params, _callback) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    const baseUrl = runtime.getSetting("OPENLESSON_BASE_URL") || "https://www.openlesson.academy";
    if (!apiKey) {
      throw new Error("OPENLESSON_API_KEY not configured. Please set it in your character settings.");
    }
    const parsedParams = params;
    const { session_id, audio_base64, audio_format = "webm" } = parsedParams;
    if (!session_id) {
      throw new Error("Session ID is required for audio analysis.");
    }
    if (!audio_base64) {
      throw new Error("Audio data (base64) is required for analysis. This endpoint only accepts audio, not text.");
    }
    logger3.info(`Analyzing audio for session: ${session_id}`);
    try {
      const response = await fetch(`${baseUrl}/api/agent/session/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id,
          audio_base64,
          audio_format
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const interpretation = interpretGapScore(data.gapScore);
      let responseText = `Analysis complete. ${interpretation}`;
      if (data.requiresFollowUp && data.followUpQuestion) {
        responseText += `

Follow-up question: ${data.followUpQuestion}`;
      }
      return {
        success: true,
        text: responseText,
        values: {
          session_id: data.sessionId,
          gap_score: data.gapScore,
          requires_follow_up: data.requiresFollowUp,
          interpretation
        },
        data: {
          sessionId: data.sessionId,
          gapScore: data.gapScore,
          signals: data.signals,
          transcript: data.transcript,
          followUpQuestion: data.followUpQuestion,
          requiresFollowUp: data.requiresFollowUp,
          interpretation
        }
      };
    } catch (error) {
      logger3.error("Failed to analyze audio:", String(error));
      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Here is my audio response for analysis"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will analyze your audio response using guided questioning."
        }
      }
    ]
  ]
};

// src/actions/endSession.ts
import {
  logger as logger4
} from "@elizaos/core";
var endSessionAction = {
  name: "END_SESSION",
  description: "End an active tutoring session and generate a summary report",
  validate: async (runtime, message, _state) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, message, _state, params, _callback) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    const baseUrl = runtime.getSetting("OPENLESSON_BASE_URL") || "https://www.openlesson.academy";
    if (!apiKey) {
      throw new Error("OPENLESSON_API_KEY not configured. Please set it in your character settings.");
    }
    const parsedParams = params;
    const { session_id } = parsedParams;
    if (!session_id) {
      throw new Error("Session ID is required to end a session.");
    }
    logger4.info(`Ending session: ${session_id}`);
    try {
      const response = await fetch(`${baseUrl}/api/agent/session/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ session_id })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      return {
        success: true,
        text: `Session ended successfully. ${data.message} Analyzed ${data.chunkCount} audio chunks with ${data.wordCount} words. The summary report is now available.`,
        values: {
          session_id: data.sessionId,
          chunk_count: data.chunkCount,
          word_count: data.wordCount,
          summary_available: true
        },
        data: {
          success: data.success,
          sessionId: data.sessionId,
          message: data.message,
          chunkCount: data.chunkCount,
          wordCount: data.wordCount,
          summary_available: true,
          summary_endpoint: `/api/agent/session/summary?session_id=${session_id}`
        }
      };
    } catch (error) {
      logger4.error("Failed to end session:", String(error));
      throw new Error(`Failed to end session: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
  examples: [
    [
      {
        name: "user",
        content: {
          text: "I'm done with this session"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will end the tutoring session and generate your summary report."
        }
      }
    ],
    [
      {
        name: "user",
        content: {
          text: "End this learning session"
        }
      },
      {
        name: "assistant",
        content: {
          text: "Ending your session now. You can retrieve the summary report afterwards."
        }
      }
    ]
  ]
};

// src/actions/getSessionSummary.ts
import {
  logger as logger5
} from "@elizaos/core";
var getSessionSummaryAction = {
  name: "GET_SESSION_SUMMARY",
  description: "Retrieve the summary report of a completed tutoring session",
  validate: async (runtime, message, _state) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, message, _state, params, _callback) => {
    const apiKey = runtime.getSetting("OPENLESSON_API_KEY");
    const baseUrl = runtime.getSetting("OPENLESSON_BASE_URL") || "https://www.openlesson.academy";
    if (!apiKey) {
      throw new Error("OPENLESSON_API_KEY not configured. Please set it in your character settings.");
    }
    const parsedParams = params;
    const { session_id } = parsedParams;
    if (!session_id) {
      throw new Error("Session ID is required to retrieve the summary.");
    }
    logger5.info(`Getting summary for session: ${session_id}`);
    try {
      const response = await fetch(`${baseUrl}/api/agent/session/summary?session_id=${session_id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.ready) {
        return {
          success: true,
          text: data.message || "Session report not ready yet. Please call end_session first to generate the report.",
          values: {
            session_id: data.sessionId,
            ready: false,
            status: data.status
          },
          data: {
            ready: false,
            sessionId: data.sessionId,
            status: data.status,
            message: data.message
          }
        };
      }
      return {
        success: true,
        text: `Session summary ready for session ${session_id}.`,
        values: {
          session_id: data.sessionId,
          ready: true,
          created_at: data.createdAt
        },
        data: {
          ready: true,
          sessionId: data.sessionId,
          report: data.report,
          createdAt: data.createdAt,
          status: data.status
        }
      };
    } catch (error) {
      logger5.error("Failed to get session summary:", String(error));
      throw new Error(`Failed to get session summary: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Show me the session report"
        }
      },
      {
        name: "assistant",
        content: {
          text: "I will retrieve your session summary report."
        }
      }
    ],
    [
      {
        name: "user",
        content: {
          text: "What did we cover in this session?"
        }
      },
      {
        name: "assistant",
        content: {
          text: "Let me get the summary of what was covered in this tutoring session."
        }
      }
    ]
  ]
};

// src/index.ts
var openLessonPlugin = {
  name: "open-lesson",
  description: "openLesson tutoring platform integration - generate learning plans, start guided tutoring sessions, and analyze audio for reasoning gaps",
  actions: [
    generateLearningPlanAction,
    startSessionAction,
    analyzeAudioAction,
    endSessionAction,
    getSessionSummaryAction
  ],
  providers: [],
  services: [],
  evaluators: []
};
var index_default = openLessonPlugin;
export {
  analyzeAudioAction,
  index_default as default,
  endSessionAction,
  generateLearningPlanAction,
  getSessionSummaryAction,
  openLessonPlugin,
  startSessionAction
};
//# sourceMappingURL=index.js.map