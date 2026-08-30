import type { RunnableEvaluationCase, Prediction } from "../evaluation/case-schema.js";
import type {
  ApprovalQueue,
  ConfidenceCategory,
  LeadDecision,
  ProvisionalOrderDecision,
  ProductAssociationStatus,
  IntentLabel,
  OrderField,
} from "../evaluation/canonical-contract.js";
import type {
  ClaimValidationResult,
  EvidenceBundle,
  ModelProposal,
  PolicyDecision,
  PolicyOverride,
} from "./policy.js";

export interface ProductAssociationDecision {
  status: ProductAssociationStatus;
  product_id: string | null;
  clarification_question: string | null;
}

export interface AgentFinalOutput {
  response_draft: string;
  approval_required: true;
  approval_queue: ApprovalQueue;
  escalation_required: boolean;
  escalation_reason: string | null;
  evidence_refs: string[];
  confidence: ConfidenceCategory;
  lead_decision: LeadDecision;
  provisional_order_decision: ProvisionalOrderDecision;
  extracted_order_fields: OrderField[] | null;
  missing_order_fields: OrderField[] | null;
  intents: IntentLabel[];
  product_association: ProductAssociationDecision;
  prediction: Prediction;
}

export interface AgentToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentModelUsage {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  total_tokens?: number;
}

export interface AgentModelResponse {
  response_id: string;
  model: string;
  output_text: string | null;
  tool_calls: AgentToolCall[];
  usage: AgentModelUsage | null;
  latency_ms: number;
  retries: number;
  raw: unknown;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentToolEvent {
  tool_name: string;
  call_id: string;
  sanitized_args: Record<string, unknown>;
  outcome: string;
  evidence_refs: string[];
  duration_ms: number;
  error_category?: string;
}

export interface AgentToolObservation {
  tool_name: string;
  call_id: string;
  outcome: string;
  evidence_refs: string[];
  data: unknown;
}

export interface AgentValidationEvent {
  kind: "structured_output_validation" | "repair_attempt" | "tool_argument_validation" | "tool_rejection" | "safety_fallback";
  passed: boolean;
  detail: string;
}

export interface AgentTurnTrace {
  turn_index: number;
  response_id: string | null;
  model: string;
  output_text: string | null;
  tool_calls: AgentToolCall[];
  validation: AgentValidationEvent[];
  usage: AgentModelUsage | null;
  latency_ms: number;
  retries: number;
}

export interface AgentCaseResult {
  case_id: string;
  prompt_version: string;
  model: string;
  reasoning_effort: string | null;
  execution_mode: "model-led" | "verified-tools-backed";
  verified_tools_prediction: Prediction;
  model_proposal: ModelProposal;
  evidence_bundle: EvidenceBundle;
  policy_decision: PolicyDecision;
  policy_overrides: PolicyOverride[];
  claim_validation: ClaimValidationResult[];
  final_output: AgentFinalOutput;
  prediction: Prediction;
  pass: boolean;
  failed_dimensions: string[];
  tool_events: AgentToolEvent[];
  turns: AgentTurnTrace[];
  approval_required: true;
  approval_queue: ApprovalQueue;
  escalation_required: boolean;
  escalation_reason: string | null;
  total_tool_calls: number;
  total_model_turns: number;
  validation_failures: string[];
  retries: number;
  runtime_ms: number;
  api_cost_usd: number;
  usage: AgentModelUsage | null;
  usage_source: "api" | "simulated" | "estimated" | "none";
  safety_violations: string[];
  evidence_refs: string[];
  trace_path: string;
}

export interface AgentEvaluationSummary {
  evaluation_version: string;
  timestamp: string;
  prompt_version: string;
  baseline_reference: {
    evaluation_file: string;
    primary_score: number;
    passed_cases: number;
    total_cases: number;
  };
  tool_assisted_reference: {
    evaluation_file: string;
    primary_score: number;
    passed_cases: number;
    total_cases: number;
  };
  comparison: {
    absolute_change_points: number;
    relative_change_percent: number | null;
    tool_absolute_change_points: number;
    tool_relative_change_percent: number | null;
  };
  model_name: string;
  reasoning_effort: string | null;
  pricing: {
    model: string;
    currency: string;
    input_per_million: number;
    cached_input_per_million: number;
    output_per_million: number;
    effective_date: string;
    source_note: string;
  };
  case_count: number;
  primary_metric: {
    name: string;
    score: number;
    passed_cases: number;
    total_cases: number;
  };
  secondary_metrics: {
    intent_accuracy: number;
    escalation_accuracy: number;
    factual_integrity: number;
    policy_safety: number;
  };
  aggregate_counts: {
    passing_cases: number;
    failing_cases: number;
  };
  runtime_ms: number;
  total_api_cost_usd: number;
  average_cost_usd: number;
  average_latency_ms: number;
  retries: number;
  environment_versions: {
    node: string;
    npm: string;
    typescript: string;
    vitest: string;
    platform: string;
    arch: string;
  };
  cases: AgentCaseResult[];
}

export interface AgentRunOptions {
  mode: "mock" | "live";
  limit?: number;
  caseIds?: string[];
  promptVersion: string;
  model: string;
  reasoningEffort: string | null;
}

export interface AgentExecutionContext {
  caseRecord: RunnableEvaluationCase;
  promptVersion: string;
  model: string;
  reasoningEffort: string | null;
  turnIndex: number;
  toolEvents: AgentToolEvent[];
  toolObservations: AgentToolObservation[];
  turns: AgentTurnTrace[];
  evidenceRefs: string[];
  repairErrors: string[];
  mode: "mock" | "live";
  outputSchemaName: string;
}
