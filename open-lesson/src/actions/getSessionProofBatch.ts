import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { ProofBatchResponse } from "../types";

export const getSessionProofBatchAction: Action = {
  name: "GET_SESSION_PROOF_BATCH",
  similes: [
    "SHOW_PROOF_BATCH",
    "MERKLE_BATCH",
    "SESSION_BATCH",
    "VIEW_PROOF_BATCH",
  ],
  description:
    "Get the Merkle tree proof batch for a session — created when a session ends",

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
        text: "Please provide a session ID. Example: 'Show proof batch for session sess_abc123'.",
        action: "GET_SESSION_PROOF_BATCH",
      });
      return;
    }

    try {
      const data = await apiRequest<ProofBatchResponse>(
        runtime,
        "GET",
        `/proofs/session/${sessionId}/batch`
      );

      let responseText = `Proof Batch: ${data.batch.id}`;
      responseText += `\nMerkle root: ${data.batch.merkle_root}`;
      responseText += `\nProofs: ${data.batch.proof_count}`;
      responseText += `\nAnchored: ${data.batch.anchored ? "yes" : "no"}`;
      responseText += `\nLeaves: ${data.merkle_tree.leaf_count}`;

      if (data.proofs.length > 0) {
        responseText += `\n\nProofs in batch:`;
        data.proofs.slice(0, 10).forEach((p) => {
          responseText += `\n- ${p.proof_type} (${p.fingerprint.slice(0, 16)}...)`;
        });
        if (data.proofs.length > 10) {
          responseText += `\n... and ${data.proofs.length - 10} more.`;
        }
      }

      callback?.({ text: responseText, action: "GET_SESSION_PROOF_BATCH" });
    } catch (error) {
      callback?.({
        text: `Failed to get proof batch: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PROOF_BATCH",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show proof batch for session sess_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof Batch: batch_xyz789\nMerkle root: sha256:root123...\nProofs: 8\nAnchored: no\nLeaves: 8\n\nProofs in batch:\n- session_started (sha256:a1b2c3d4...)\n- analysis_heartbeat (sha256:e5f6a7b8...)\n- session_ended (sha256:c9d0e1f2...)",
          action: "GET_SESSION_PROOF_BATCH",
        },
      },
    ],
  ],
};
