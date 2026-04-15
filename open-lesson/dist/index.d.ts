import { Action, Plugin } from '@elizaos/core';

declare const listKeysAction: Action;

declare const createKeyAction: Action;

declare const revokeKeyAction: Action;

declare const updateKeyScopesAction: Action;

declare const listPlansAction: Action;

declare const createPlanAction: Action;

declare const getPlanAction: Action;

declare const updatePlanAction: Action;

declare const deletePlanAction: Action;

declare const getPlanNodesAction: Action;

declare const adaptPlanAction: Action;

declare const createPlanFromVideoAction: Action;

declare const listSessionsAction: Action;

declare const startSessionAction: Action;

declare const getSessionAction: Action;

declare const analyzeHeartbeatAction: Action;

declare const pauseSessionAction: Action;

declare const resumeSessionAction: Action;

declare const restartSessionAction: Action;

declare const endSessionAction: Action;

declare const getSessionProbesAction: Action;

declare const getSessionPlanAction: Action;

declare const getSessionTranscriptAction: Action;

declare const askAssistantAction: Action;

declare const getConversationHistoryAction: Action;

declare const getUserAnalyticsAction: Action;

declare const getSessionAnalyticsAction: Action;

declare const getPlanAnalyticsAction: Action;

declare const listProofsAction: Action;

declare const getProofAction: Action;

declare const verifyProofAction: Action;

declare const anchorProofAction: Action;

declare const getSessionProofBatchAction: Action;

declare const openLessonPlugin: Plugin;

export { adaptPlanAction, analyzeHeartbeatAction, anchorProofAction, askAssistantAction, createKeyAction, createPlanAction, createPlanFromVideoAction, openLessonPlugin as default, deletePlanAction, endSessionAction, getConversationHistoryAction, getPlanAction, getPlanAnalyticsAction, getPlanNodesAction, getProofAction, getSessionAction, getSessionAnalyticsAction, getSessionPlanAction, getSessionProbesAction, getSessionProofBatchAction, getSessionTranscriptAction, getUserAnalyticsAction, listKeysAction, listPlansAction, listProofsAction, listSessionsAction, openLessonPlugin, pauseSessionAction, restartSessionAction, resumeSessionAction, revokeKeyAction, startSessionAction, updateKeyScopesAction, updatePlanAction, verifyProofAction };
