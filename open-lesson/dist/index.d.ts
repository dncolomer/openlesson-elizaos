import { Action, Plugin } from '@elizaos/core';

declare const generateLearningPlanAction: Action;

declare const startSessionAction: Action;

declare const analyzeAudioAction: Action;

declare const endSessionAction: Action;

declare const getSessionSummaryAction: Action;

declare const openLessonPlugin: Plugin;

export { analyzeAudioAction, openLessonPlugin as default, endSessionAction, generateLearningPlanAction, getSessionSummaryAction, openLessonPlugin, startSessionAction };
