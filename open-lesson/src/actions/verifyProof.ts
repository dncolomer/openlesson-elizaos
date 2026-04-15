import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { apiRequest } from "../client";
import type { VerifyProofResponse } from "../types";

export const verifyProofAction: Action = {
  name: "VERIFY_PROOF",
  similes: [
    "CHECK_PROOF",
    "VALIDATE_PROOF",
    "PROOF_INTEGRITY",
    "CONFIRM_PROOF",
  ],
  description:
    "Verify a proof's integrity — recalculates fingerprint, checks chain integrity and anchor validity",

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
        text: "Please provide a proof ID to verify.",
        action: "VERIFY_PROOF",
      });
      return;
    }

    try {
      const data = await apiRequest<VerifyProofResponse>(
        runtime,
        "GET",
        `/proofs/${proofId}/verify`
      );

      const fp = data.checks.fingerprint;
      const chain = data.checks.chain;
      const anchor = data.checks.anchor;

      let responseText = `Proof ${data.proof_id}: ${data.verified ? "VERIFIED" : "FAILED"}`;
      responseText += `\nFingerprint: ${fp.valid ? "valid" : "INVALID"} (stored: ${fp.stored.slice(0, 20)}...)`;
      responseText += `\nChain: ${chain.valid ? "valid" : "INVALID"}`;
      if (chain.details.previous_proof_id) {
        responseText += ` (prev: ${chain.details.previous_proof_id})`;
      }
      if (anchor.valid !== null) {
        responseText += `\nAnchor: ${anchor.valid ? "valid" : "INVALID"}`;
        if (anchor.tx_signature) {
          responseText += ` (tx: ${anchor.tx_signature.slice(0, 16)}...)`;
        }
      } else {
        responseText += `\nAnchor: not anchored`;
      }

      callback?.({ text: responseText, action: "VERIFY_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to verify proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "VERIFY_PROOF",
      });
    }

    return;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Verify proof proof_abc123" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof proof_abc123: VERIFIED\nFingerprint: valid (stored: sha256:a1b2c3d4e5f6...)\nChain: valid (prev: proof_xyz789)\nAnchor: not anchored",
          action: "VERIFY_PROOF",
        },
      },
    ],
  ],
};
