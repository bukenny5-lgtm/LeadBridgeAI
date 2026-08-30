import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Channel, ConversationMessage } from "../shared/types.js";
import { GENERIC_BUSINESS_DESCRIPTION } from "../shared/types.js";
import type { ActionLabel, IntentLabel, OrderField } from "./canonical-contract.js";

export interface AuthoringExpected {
  is_lead: boolean;
  intent_labels: IntentLabel[];
  product_id: string | null;
  action: ActionLabel;
  escalation: boolean;
  lead_creation: boolean;
  provisional_order: boolean;
  order_fields: OrderField[] | null;
}

export interface AuthoringEvaluationCase {
  case_id: string;
  title: string;
  channel: Channel;
  post_id: string | null;
  conversation: ConversationMessage[];
  context: Record<string, unknown>;
  expected: AuthoringExpected;
  prohibited: string[];
  rationale: string;
  difficulty: string;
  tags: string[];
}

export interface EvaluationDataset {
  dataset_name: string;
  version: string;
  case_count: number;
  cases: AuthoringEvaluationCase[];
}

export interface RunnableEvaluationCase {
  channel: Channel;
  post_id: string | null;
  conversation: ConversationMessage[];
  business_description: string;
}

export interface Prediction {
  response_text: string;
  is_lead: boolean;
  intent_labels: IntentLabel[];
  product_id: string | null;
  action: ActionLabel;
  escalation: boolean;
  lead_creation: boolean;
  provisional_order: boolean;
  order_fields: OrderField[] | null;
}

export interface LoadedEvaluationCase {
  case_id: string;
  authoring: AuthoringEvaluationCase;
  runnable: RunnableEvaluationCase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readString(value: unknown, fieldName: string): string {
  assert(typeof value === "string", `Expected ${fieldName} to be a string`);
  return value;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  assert(
    typeof value === "string" || value === null,
    `Expected ${fieldName} to be a string or null`,
  );
  return value;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  assert(typeof value === "boolean", `Expected ${fieldName} to be a boolean`);
  return value;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  assert(Array.isArray(value), `Expected ${fieldName} to be an array`);
  value.forEach((entry, index) => {
    assert(
      typeof entry === "string",
      `Expected ${fieldName}[${index}] to be a string`,
    );
  });
  return value;
}

function readNullableStringArray(
  value: unknown,
  fieldName: string,
): string[] | null {
  if (value === null) {
    return null;
  }
  return readStringArray(value, fieldName);
}

function readConversationMessage(value: unknown, index: number): ConversationMessage {
  assert(isRecord(value), `Expected conversation[${index}] to be an object`);
  const role = readString(value.role, `conversation[${index}].role`);
  assert(
    role === "customer" || role === "agent",
    `Expected conversation[${index}].role to be customer or agent`,
  );
  return {
    role,
    text: readString(value.text, `conversation[${index}].text`),
    timestamp: readString(value.timestamp, `conversation[${index}].timestamp`),
  };
}

function readExpected(value: unknown): AuthoringExpected {
  assert(isRecord(value), "Expected expected to be an object");
  return {
    is_lead: readBoolean(value.is_lead, "expected.is_lead"),
    intent_labels: readStringArray(value.intent_labels, "expected.intent_labels") as IntentLabel[],
    product_id: readNullableString(value.product_id, "expected.product_id"),
    action: readString(value.action, "expected.action") as ActionLabel,
    escalation: readBoolean(value.escalation, "expected.escalation"),
    lead_creation: readBoolean(value.lead_creation, "expected.lead_creation"),
    provisional_order: readBoolean(
      value.provisional_order,
      "expected.provisional_order",
    ),
    order_fields: readNullableStringArray(
      value.order_fields,
      "expected.order_fields",
    ) as OrderField[] | null,
  };
}

export function validateAuthoringEvaluationCase(
  value: unknown,
  index: number,
): AuthoringEvaluationCase {
  assert(isRecord(value), `Expected case ${index} to be an object`);
  return {
    case_id: readString(value.case_id, `cases[${index}].case_id`),
    title: readString(value.title, `cases[${index}].title`),
    channel: readString(value.channel, `cases[${index}].channel`) as Channel,
    post_id: readNullableString(value.post_id, `cases[${index}].post_id`),
    conversation: (() => {
      assert(
        Array.isArray(value.conversation),
        `Expected cases[${index}].conversation to be an array`,
      );
      return value.conversation.map((message, messageIndex) =>
        readConversationMessage(message, messageIndex),
      );
    })(),
    context: (() => {
      assert(isRecord(value.context), `Expected cases[${index}].context to be an object`);
      return value.context;
    })(),
    expected: readExpected(value.expected),
    prohibited: readStringArray(value.prohibited, `cases[${index}].prohibited`),
    rationale: readString(value.rationale, `cases[${index}].rationale`),
    difficulty: readString(value.difficulty, `cases[${index}].difficulty`),
    tags: readStringArray(value.tags, `cases[${index}].tags`),
  };
}

export function validateDataset(value: unknown): EvaluationDataset {
  assert(isRecord(value), "Expected dataset root to be an object");
  const dataset = {
    dataset_name: readString(value.dataset_name, "dataset_name"),
    version: readString(value.version, "version"),
    case_count: Number(value.case_count),
    cases: (() => {
      assert(Array.isArray(value.cases), "Expected cases to be an array");
      return value.cases.map((entry, index) => validateAuthoringEvaluationCase(entry, index));
    })(),
  };
  assert(Number.isInteger(dataset.case_count), "Expected case_count to be an integer");
  assert(
    dataset.case_count === dataset.cases.length,
    "case_count must match the number of cases",
  );
  assert(dataset.cases.length === 20, "Expected exactly 20 cases");
  return dataset;
}

export function loadEvaluationDataset(): EvaluationDataset {
  const datasetPath = fileURLToPath(
    new URL("../../evaluation/cases/cases.json", import.meta.url),
  );
  const raw = readFileSync(datasetPath, "utf8");
  return validateDataset(JSON.parse(raw) as unknown);
}

export function toRunnableCase(
  caseRecord: AuthoringEvaluationCase,
): RunnableEvaluationCase {
  return {
    channel: caseRecord.channel,
    post_id: caseRecord.post_id,
    conversation: caseRecord.conversation.map((message) => ({
      role: message.role,
      text: message.text,
      timestamp: message.timestamp,
    })),
    business_description: GENERIC_BUSINESS_DESCRIPTION,
  };
}
