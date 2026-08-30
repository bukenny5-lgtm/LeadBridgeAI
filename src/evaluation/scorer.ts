import type { AuthoringEvaluationCase, Prediction } from "./case-schema.js";
import { CANONICAL_ACTIONS, CANONICAL_INTENT_LABELS } from "./canonical-contract.js";

void CANONICAL_ACTIONS;
void CANONICAL_INTENT_LABELS;

export interface CaseScore {
  case_id: string;
  pass: boolean;
  failed_dimensions: string[];
  prediction: Prediction;
  expected: AuthoringEvaluationCase["expected"];
}

export interface EvaluationSummary {
  evaluation_version: string;
  timestamp: string;
  baseline_name: string;
  baseline_description: string;
  resource_boundary: string[];
  exact_command: string;
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
  model_api_cost_usd: number;
  environment_versions: {
    node: string;
    npm: string;
    typescript: string;
    vitest: string;
    platform: string;
    arch: string;
  };
  cases: CaseScore[];
}

function setEquals(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  for (const entry of leftSet) {
    if (!rightSet.has(entry)) {
      return false;
    }
  }
  return true;
}

function containsUnsupportedClaim(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b\d{4,}\b/.test(lower) ||
    lower.includes("is available") ||
    lower.includes("in stock") ||
    lower.includes("we are based") ||
    lower.includes("will deliver") ||
    lower.includes("discount of") ||
    lower.includes("guaranteed")
  );
}

function scoreGroundedBehavior(prediction: Prediction): boolean {
  return !containsUnsupportedClaim(prediction.response_text);
}

function scoreOrderFields(
  expected: AuthoringEvaluationCase["expected"],
  prediction: Prediction,
): boolean {
  if (!expected.provisional_order) {
    return prediction.order_fields === null;
  }
  if (!prediction.order_fields) {
    return false;
  }
  return setEquals(prediction.order_fields, expected.order_fields ?? []);
}

function countBoolean(values: boolean[], wanted: boolean): number {
  return values.filter((value) => value === wanted).length;
}

export function scoreCase(
  caseRecord: AuthoringEvaluationCase,
  prediction: Prediction,
): CaseScore {
  const expected = caseRecord.expected;
  const failed_dimensions: string[] = [];

  if (prediction.is_lead !== expected.is_lead) {
    failed_dimensions.push("lead_non_lead_decision");
  }
  if (!setEquals(prediction.intent_labels, expected.intent_labels)) {
    failed_dimensions.push("intent_labels");
  }
  if (prediction.product_id !== expected.product_id) {
    failed_dimensions.push("product_association_or_clarification");
  }
  if (!scoreGroundedBehavior(prediction)) {
    failed_dimensions.push("grounded_factual_behavior");
  }
  if (prediction.action !== expected.action || prediction.escalation !== expected.escalation) {
    failed_dimensions.push("correct_action_escalation");
  }
  if (prediction.lead_creation !== expected.lead_creation) {
    failed_dimensions.push("lead_creation_decision");
  }
  if (prediction.provisional_order !== expected.provisional_order) {
    failed_dimensions.push("provisional_order_decision");
  }
  if (!scoreOrderFields(expected, prediction)) {
    failed_dimensions.push("order_fields");
  }
  if (containsUnsupportedClaim(prediction.response_text)) {
    failed_dimensions.push("absence_of_prohibited_claims_or_policy_violations");
  }

  const pass = failed_dimensions.length === 0;

  return {
    case_id: caseRecord.case_id,
    pass,
    failed_dimensions,
    prediction,
    expected,
  };
}

export function summarizeScores(caseScores: CaseScore[]): EvaluationSummary["secondary_metrics"] {
  const total = caseScores.length;
  const intentAccuracy = countBoolean(
    caseScores.map((score) => setEquals(score.prediction.intent_labels, score.expected.intent_labels)),
    true,
  );
  const escalationAccuracy = countBoolean(
    caseScores.map(
      (score) =>
        score.prediction.action === score.expected.action &&
        score.prediction.escalation === score.expected.escalation,
    ),
    true,
  );
  const factualIntegrity = countBoolean(
    caseScores.map((score) => score.failed_dimensions.includes("grounded_factual_behavior") === false),
    true,
  );
  const policySafety = countBoolean(
    caseScores.map(
      (score) => !score.failed_dimensions.includes("absence_of_prohibited_claims_or_policy_violations"),
    ),
    true,
  );

  return {
    intent_accuracy: total === 0 ? 0 : (intentAccuracy / total) * 100,
    escalation_accuracy: total === 0 ? 0 : (escalationAccuracy / total) * 100,
    factual_integrity: total === 0 ? 0 : (factualIntegrity / total) * 100,
    policy_safety: total === 0 ? 0 : (policySafety / total) * 100,
  };
}
