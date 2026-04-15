import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetPlanNodesResponse } from "../types";

export const getPlanNodesAction: Action = {
  name: "GET_PLAN_NODES",
  similes: [
    "SHOW_PLAN_NODES",
    "PLAN_GRAPH",
    "VIEW_PLAN_NODES",
    "PLAN_STRUCTURE",
  ],
  description:
    "Get all nodes of a learning plan with edges and graph info",

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

    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId =
      idMatch?.[1] ??
      ((state as Record<string, unknown>)?.plan_id as string | undefined);

    if (!planId) {
      callback?.({
        text: "Please provide a plan ID. Example: 'Show nodes for plan plan_abc123'.",
        action: "GET_PLAN_NODES",
      });
      return;
    }

    try {
      const data = await apiRequest<GetPlanNodesResponse>(
        runtime,
        "GET",
        `/plans/${planId}/nodes`
      );

      let responseText = `Plan graph: ${data.graph_info.total_nodes} nodes, ${data.graph_info.total_edges} edges.`;
      responseText += `\nStart nodes: ${data.graph_info.start_nodes.length}, Leaf nodes: ${data.graph_info.leaf_nodes.length}`;
      responseText += `\n\nNodes:`;
      data.nodes.forEach((n) => {
        const connections = n.next_node_ids.length > 0
          ? ` -> [${n.next_node_ids.join(", ")}]`
          : " (leaf)";
        responseText += `\n- ${n.title} (${n.status})${connections}`;
      });

      callback?.({ text: responseText, action: "GET_PLAN_NODES" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan nodes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN_NODES",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show the graph for plan plan_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan graph: 8 nodes, 10 edges.\nStart nodes: 1, Leaf nodes: 2\n\nNodes:\n- Introduction to Qubits (completed) -> [node_2, node_3]\n- Quantum Gates (in_progress) -> [node_4]",
          action: "GET_PLAN_NODES",
        },
      },
    ],
  ],
};
