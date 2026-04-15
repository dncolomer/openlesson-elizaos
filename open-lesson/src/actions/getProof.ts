import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { GetProofResponse } from "../types";

export const getProofAction: Action = {
  name: "GET_PROOF",
  similes: ["VIEW_PROOF", "SHOW_PROOF", "PROOF_DETAILS", "PROOF_INFO"],
  description:
    "Get full proof details including chain context, related proofs, and batch membership",

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

    const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const proofId =
      idMatch?.[1] ??
      ((state as Record<string, unknown>)?.proof_id as string | undefined);

    if (!proofId) {
      callback?.({
        text: "Please provide a proof ID. Example: 'Show proof proof_abc123'.",
        action: "GET_PROOF",
      });
      return;
    }

    try {
      const data = await apiRequest<GetProofResponse>(
        runtime,
        "GET",
        `/proofs/${proofId}`
      );

      let responseText = `Proof: ${data.proof.proof_type}`;
      responseText += `\nFingerprint: ${data.verification.fingerprint}`;
      responseText += `\nAnchored: ${data.verification.anchored ? "yes" : "no"}`;
      responseText += `\nCreated: ${data.proof.created_at}`;

      if (data.chain.previous) {
        responseText += `\nPrevious proof: ${data.chain.previous.id}`;
      }
      if (data.chain.next) {
        responseText += `\nNext proof: ${data.chain.next.id}`;
      }

      responseText += `\nRelated proofs: ${data.related_proofs.length}`;

      callback?.({ text: responseText, action: "GET_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to get proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PROOF",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show proof proof_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof: session_started\nFingerprint: sha256:a1b2c3d4e5f6...\nAnchored: no\nCreated: 2025-01-15T10:00:00Z\nPrevious proof: proof_xyz789\nRelated proofs: 5",
          action: "GET_PROOF",
        },
      },
    ],
  ],
};
