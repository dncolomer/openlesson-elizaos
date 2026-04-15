import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { AnchorProofResponse } from "../types";

export const anchorProofAction: Action = {
  name: "ANCHOR_PROOF",
  similes: [
    "ANCHOR_ON_CHAIN",
    "BLOCKCHAIN_PROOF",
    "SUBMIT_PROOF",
    "ONCHAIN_PROOF",
  ],
  description:
    "Anchor a proof on Solana blockchain (currently simulated). Submits the proof fingerprint on-chain.",

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
        text: "Please provide a proof ID to anchor.",
        action: "ANCHOR_PROOF",
      });
      return;
    }

    try {
      const data = await apiRequest<AnchorProofResponse>(
        runtime,
        "POST",
        `/proofs/${proofId}/anchor`
      );

      let responseText = `Proof ${data.proof.id}: ${data.status}. ${data.message}`;
      responseText += `\nTx: ${data.anchor.tx_signature}`;
      responseText += `\nSlot: ${data.anchor.slot}`;
      if (data.anchor.simulated) {
        responseText += ` (simulated)`;
      }

      callback?.({ text: responseText, action: "ANCHOR_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to anchor proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ANCHOR_PROOF",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Anchor proof proof_abc123 on chain" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof proof_abc123: anchored. Proof anchored to Solana.\nTx: 5Kd8...a3Fb\nSlot: 123456789 (simulated)",
          action: "ANCHOR_PROOF",
        },
      },
    ],
  ],
};
