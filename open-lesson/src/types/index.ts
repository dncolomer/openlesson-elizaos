// ── Common types ────────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface Proof {
  id: string;
  fingerprint: string;
  data_hash: string;
  proof_type: string;
  session_id?: string;
  plan_id?: string;
  user_id: string;
  previous_proof_id?: string;
  anchored: boolean;
  anchor_tx_signature?: string;
  anchor_slot?: number;
  anchor_timestamp?: string;
  batch_id?: string;
  created_at: string;
}

// ── API Key types ───────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  label?: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

export interface ListKeysResponse {
  keys: ApiKey[];
}

export interface CreateKeyResponse {
  key: ApiKey;
  api_key: string;
}

export interface DeleteKeyResponse {
  deleted: boolean;
  key_id: string;
}

export interface UpdateKeyScopesResponse {
  key: {
    id: string;
    scopes: string[];
    updated_at: string;
  };
}

// ── Plan types ──────────────────────────────────────────────────────────────

export interface PlanNode {
  id: string;
  title: string;
  description: string;
  is_start: boolean;
  next_node_ids: string[];
  status: string;
}

export interface Plan {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  status: string;
  notes?: string | null;
  duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface PlanStatistics {
  total_nodes: number;
  completed_nodes: number;
  available_nodes: number;
  in_progress_nodes: number;
  progress_percent: number;
}

export interface ListPlansResponse {
  plans: Plan[];
  pagination: Pagination;
}

export interface CreatePlanResponse {
  plan: Plan;
  nodes: PlanNode[];
  node_count: number;
  proof: Proof;
}

export interface GetPlanResponse {
  plan: Plan;
  nodes: PlanNode[];
  statistics: PlanStatistics;
}

export interface UpdatePlanResponse {
  plan: Plan;
  changes: Record<string, unknown>;
  proof: Proof;
}

export interface DeletePlanResponse {
  deleted: boolean;
  plan_id: string;
  nodes_deleted: number;
}

export interface PlanEdge {
  source: string;
  target: string;
}

export interface GraphInfo {
  total_nodes: number;
  total_edges: number;
  start_nodes: string[];
  leaf_nodes: string[];
}

export interface GetPlanNodesResponse {
  nodes: PlanNode[];
  edges: PlanEdge[];
  graph_info: GraphInfo;
}

export interface AdaptPlanResponse {
  explanation: string;
  plan_id: string;
  nodes: PlanNode[];
  changes: {
    created: number;
    updated: number;
    deleted: number;
    kept: number;
  };
  proof: Proof;
}

export interface CreatePlanFromVideoResponse {
  plan: Plan;
  nodes: PlanNode[];
  node_count: number;
  proof: Proof;
}

// ── Session types ───────────────────────────────────────────────────────────

export interface Session {
  id: string;
  user_id: string;
  problem: string;
  status: string;
  is_agent_session: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SessionPlan {
  id: string;
  session_id?: string;
  user_id?: string;
  goal: string;
  strategy: string;
  description: string;
  steps: SessionPlanStep[];
  current_step_index: number;
  current_step?: SessionPlanStep;
}

export interface SessionPlanStep {
  id: string;
  title: string;
  description: string;
  status: string;
}

export interface ListSessionsResponse {
  sessions: Session[];
  pagination: Pagination;
}

export interface StartSessionResponse {
  session: Session;
  session_plan: SessionPlan | null;
  opening_probe: string | null;
  instructions: {
    audio_format: string;
    analyze_endpoint: string;
    pause_endpoint: string;
    resume_endpoint: string;
    end_endpoint: string;
    max_chunk_duration_ms: number;
  };
  proof: Proof;
}

export interface GetSessionResponse {
  session: Session;
  plan: SessionPlan | null;
  statistics: {
    total_probes: number;
    active_probes: number;
    archived_probes: number;
    avg_gap_score: number;
    transcript_chunks: number;
    total_words: number;
    duration_ms: number;
  };
  active_probes: SessionProbe[];
}

// ── Analysis / heartbeat types ──────────────────────────────────────────────

export interface HeartbeatInput {
  type: "audio" | "text" | "image";
  content?: string;
  data?: string;
  format?: string;
  mime_type?: string;
  description?: string;
  duration_ms?: number;
}

export interface AnalysisContext {
  active_probe_ids?: string[];
  focused_probe_id?: string;
  tools_in_use?: string[];
  user_actions_since_last?: Record<string, unknown>[];
}

export interface AnalyzeHeartbeatResponse {
  analysis: {
    gap_score: number;
    signals: string[];
    transcript?: string;
    understanding_summary: string;
  };
  session_plan_update: {
    changed: boolean;
    current_step_index: number;
    current_step?: SessionPlanStep;
    steps_completed: number;
    steps_added: number;
    steps_modified: number;
    can_auto_advance: boolean;
    advance_reasoning?: string;
  };
  guidance: {
    next_probe: {
      id: string;
      text: string;
      type: string;
      gap_addressed: string;
      suggested_tools?: string[];
      plan_step_id?: string;
    } | null;
    probes_to_archive: string[];
    requires_follow_up: boolean;
    recommended_wait_ms: number;
  };
  proof: Proof;
}

// ── Pause / Resume / End / Restart types ────────────────────────────────────

export interface PauseSessionResponse {
  session: Session;
  paused_at: string;
  elapsed_ms: number;
  proof: Proof;
}

export interface ResumeSessionResponse {
  session: Session;
  reorientation_probe: string | null;
  current_context: {
    plan: SessionPlan | null;
    active_probes: SessionProbe[];
    pause_duration_ms: number;
  };
  proof: Proof;
}

export interface RestartSessionResponse {
  session: Session;
  session_plan: SessionPlan | null;
  opening_probe: string | null;
  transcript_preserved: boolean;
  proof: Proof;
}

export interface EndSessionResponse {
  session: Session;
  report: Record<string, unknown>;
  statistics: {
    duration_ms: number;
    total_probes: number;
    active_probes: number;
    archived_probes: number;
    avg_gap_score: number;
    transcript_chunks: number;
    total_words: number;
    gap_score_trend: number[];
  };
  plan_updates?: Record<string, unknown>;
  proof: Proof;
  batch_proof: {
    batch_id: string;
    merkle_root: string;
  };
}

// ── Probes types ────────────────────────────────────────────────────────────

export interface SessionProbe {
  id: string;
  text: string;
  type: string;
  status: string;
  gap_addressed?: string;
  created_at: string;
}

export interface ListProbesResponse {
  probes: SessionProbe[];
  summary: {
    total: number;
    active: number;
    archived: number;
    filter: string;
  };
}

// ── Session plan types ──────────────────────────────────────────────────────

export interface GetSessionPlanResponse {
  plan: SessionPlan;
  step_statistics: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    skipped: number;
  };
}

// ── Transcript types ────────────────────────────────────────────────────────

export interface TranscriptChunk {
  id: string;
  content?: string;
  timestamp_ms: number;
  word_count: number;
}

export interface GetTranscriptResponse {
  transcript?: string;
  chunks?: TranscriptChunk[];
  metadata: {
    session_id: string;
    format: string;
    chunk_count: number;
    total_words: number;
    since_ms: number;
  };
}

// ── Ask assistant types ─────────────────────────────────────────────────────

export interface AskAssistantResponse {
  response: {
    id: string;
    content: string;
    suggested_follow_up: string[];
  };
  conversation: {
    id: string;
    message_count: number;
  };
  proof: Proof;
}

// ── Conversation history types ──────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

export interface GetConversationResponse {
  conversation: {
    id: string;
    session_id: string;
    messages: ConversationMessage[];
    created_at: string;
    updated_at: string;
  };
}

// ── Analytics types ─────────────────────────────────────────────────────────

export interface UserAnalyticsResponse {
  overview: {
    total_plans: number;
    total_sessions: number;
    plan_completion_rate: number;
    session_completion_rate: number;
    node_completion_rate: number;
    total_time_ms: number;
  };
  performance: {
    overall_gap_score: number;
    trend: "improving" | "declining" | "stable";
    gap_trend: number[];
  };
  learning_history: {
    recent_topics: string[];
    time_per_topic: Record<string, number>;
  };
  achievements: {
    total_plans: number;
    completed_plans: number;
    total_sessions: number;
    completed_sessions: number;
    total_probes: number;
    total_nodes: number;
    completed_nodes: number;
    streaks: {
      current_days: number;
      longest_days: number;
    };
  };
}

export interface SessionAnalyticsResponse {
  session: Session;
  probes: {
    total: number;
    active: number;
    archived: number;
    focused: number;
    by_type: Record<string, number>;
    avg_gap_score: number;
  };
  gap_timeline: number[];
  plan_progress: Record<string, unknown> | null;
  transcript: Record<string, unknown>;
  report: Record<string, unknown> | null;
}

export interface PlanAnalyticsResponse {
  plan: Plan;
  progress: {
    total_nodes: number;
    completed_nodes: number;
    progress_percent: number;
  };
  sessions: {
    total: number;
    completed: number;
    avg_duration_ms: number;
  };
  performance: {
    avg_gap_score: number;
    total_probes: number;
    trend: "improving" | "declining" | "stable";
    session_trend: number[];
    strongest_topics: string[];
    weakest_topics: string[];
  };
  nodes_detail: Record<string, unknown>[];
  recommendations: string[];
}

// ── Proof types ─────────────────────────────────────────────────────────────

export interface ListProofsResponse {
  proofs: Proof[];
  pagination: Pagination;
}

export interface GetProofResponse {
  proof: Proof;
  verification: {
    fingerprint: string;
    data_hash: string;
    anchored: boolean;
  };
  chain: {
    previous: Proof | null;
    next: Proof | null;
  };
  related_proofs: Proof[];
  batch: Record<string, unknown> | null;
}

export interface VerifyProofResponse {
  verified: boolean;
  proof_id: string;
  checks: {
    fingerprint: {
      valid: boolean;
      stored: string;
      recalculated: string;
    };
    chain: {
      valid: boolean;
      details: {
        previous_proof_id: string | null;
        previous_proof_exists: boolean;
      };
    };
    anchor: {
      valid: boolean | null;
      tx_signature?: string;
      slot?: number;
      timestamp?: string;
    };
  };
}

export interface AnchorProofResponse {
  status: "anchored" | "already_anchored";
  message: string;
  proof: Proof;
  anchor: {
    tx_signature: string;
    slot: number;
    timestamp: string;
    simulated: boolean;
  };
}

export interface ProofBatchResponse {
  batch: {
    id: string;
    session_id: string;
    merkle_root: string;
    proof_count: number;
    anchored: boolean;
  };
  proofs: Proof[];
  merkle_tree: {
    root: string;
    leaf_count: number;
    leaves: { proof_id: string; fingerprint: string }[];
  };
}
