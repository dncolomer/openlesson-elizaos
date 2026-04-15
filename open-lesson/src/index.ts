import type { Plugin } from '@elizaos/core';

// ── Key Management ──────────────────────────────────────────────────────────
import { listKeysAction } from './actions/listKeys';
import { createKeyAction } from './actions/createKey';
import { revokeKeyAction } from './actions/revokeKey';
import { updateKeyScopesAction } from './actions/updateKeyScopes';

// ── Learning Plans ──────────────────────────────────────────────────────────
import { listPlansAction } from './actions/listPlans';
import { createPlanAction } from './actions/createPlan';
import { getPlanAction } from './actions/getPlan';
import { updatePlanAction } from './actions/updatePlan';
import { deletePlanAction } from './actions/deletePlan';
import { getPlanNodesAction } from './actions/getPlanNodes';
import { adaptPlanAction } from './actions/adaptPlan';
import { createPlanFromVideoAction } from './actions/createPlanFromVideo';

// ── Sessions ────────────────────────────────────────────────────────────────
import { listSessionsAction } from './actions/listSessions';
import { startSessionAction } from './actions/startSession';
import { getSessionAction } from './actions/getSession';
import { analyzeHeartbeatAction } from './actions/analyzeHeartbeat';
import { pauseSessionAction } from './actions/pauseSession';
import { resumeSessionAction } from './actions/resumeSession';
import { restartSessionAction } from './actions/restartSession';
import { endSessionAction } from './actions/endSession';
import { getSessionProbesAction } from './actions/getSessionProbes';
import { getSessionPlanAction } from './actions/getSessionPlan';
import { getSessionTranscriptAction } from './actions/getSessionTranscript';

// ── Teaching Assistant ──────────────────────────────────────────────────────
import { askAssistantAction } from './actions/askAssistant';
import { getConversationHistoryAction } from './actions/getConversationHistory';

// ── Analytics ───────────────────────────────────────────────────────────────
import { getUserAnalyticsAction } from './actions/getAnalytics';
import { getSessionAnalyticsAction } from './actions/getSessionAnalytics';
import { getPlanAnalyticsAction } from './actions/getPlanAnalytics';

// ── Proofs ──────────────────────────────────────────────────────────────────
import { listProofsAction } from './actions/listProofs';
import { getProofAction } from './actions/getProof';
import { verifyProofAction } from './actions/verifyProof';
import { anchorProofAction } from './actions/anchorProof';
import { getSessionProofBatchAction } from './actions/getSessionProofBatch';

export const openLessonPlugin: Plugin = {
  name: 'open-lesson',
  description:
    'openLesson v2 tutoring platform — learning plans, multimodal sessions, teaching assistant, cryptographic proofs, analytics, and API key management',
  actions: [
    // Key Management (4)
    listKeysAction,
    createKeyAction,
    revokeKeyAction,
    updateKeyScopesAction,
    // Learning Plans (8)
    listPlansAction,
    createPlanAction,
    getPlanAction,
    updatePlanAction,
    deletePlanAction,
    getPlanNodesAction,
    adaptPlanAction,
    createPlanFromVideoAction,
    // Sessions (11)
    listSessionsAction,
    startSessionAction,
    getSessionAction,
    analyzeHeartbeatAction,
    pauseSessionAction,
    resumeSessionAction,
    restartSessionAction,
    endSessionAction,
    getSessionProbesAction,
    getSessionPlanAction,
    getSessionTranscriptAction,
    // Teaching Assistant (2)
    askAssistantAction,
    getConversationHistoryAction,
    // Analytics (3)
    getUserAnalyticsAction,
    getSessionAnalyticsAction,
    getPlanAnalyticsAction,
    // Proofs (5)
    listProofsAction,
    getProofAction,
    verifyProofAction,
    anchorProofAction,
    getSessionProofBatchAction,
  ],
  providers: [],
  services: [],
  evaluators: [],
};

export default openLessonPlugin;

// ── Key Management exports ──────────────────────────────────────────────────
export { listKeysAction } from './actions/listKeys';
export { createKeyAction } from './actions/createKey';
export { revokeKeyAction } from './actions/revokeKey';
export { updateKeyScopesAction } from './actions/updateKeyScopes';

// ── Learning Plans exports ──────────────────────────────────────────────────
export { listPlansAction } from './actions/listPlans';
export { createPlanAction } from './actions/createPlan';
export { getPlanAction } from './actions/getPlan';
export { updatePlanAction } from './actions/updatePlan';
export { deletePlanAction } from './actions/deletePlan';
export { getPlanNodesAction } from './actions/getPlanNodes';
export { adaptPlanAction } from './actions/adaptPlan';
export { createPlanFromVideoAction } from './actions/createPlanFromVideo';

// ── Sessions exports ────────────────────────────────────────────────────────
export { listSessionsAction } from './actions/listSessions';
export { startSessionAction } from './actions/startSession';
export { getSessionAction } from './actions/getSession';
export { analyzeHeartbeatAction } from './actions/analyzeHeartbeat';
export { pauseSessionAction } from './actions/pauseSession';
export { resumeSessionAction } from './actions/resumeSession';
export { restartSessionAction } from './actions/restartSession';
export { endSessionAction } from './actions/endSession';
export { getSessionProbesAction } from './actions/getSessionProbes';
export { getSessionPlanAction } from './actions/getSessionPlan';
export { getSessionTranscriptAction } from './actions/getSessionTranscript';

// ── Teaching Assistant exports ──────────────────────────────────────────────
export { askAssistantAction } from './actions/askAssistant';
export { getConversationHistoryAction } from './actions/getConversationHistory';

// ── Analytics exports ───────────────────────────────────────────────────────
export { getUserAnalyticsAction } from './actions/getAnalytics';
export { getSessionAnalyticsAction } from './actions/getSessionAnalytics';
export { getPlanAnalyticsAction } from './actions/getPlanAnalytics';

// ── Proofs exports ──────────────────────────────────────────────────────────
export { listProofsAction } from './actions/listProofs';
export { getProofAction } from './actions/getProof';
export { verifyProofAction } from './actions/verifyProof';
export { anchorProofAction } from './actions/anchorProof';
export { getSessionProofBatchAction } from './actions/getSessionProofBatch';
