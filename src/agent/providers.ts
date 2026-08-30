import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { AGENT_MODEL_PROPOSAL_JSON_SCHEMA } from "./validation.js";
import type {
  AgentExecutionContext,
  AgentModelResponse,
  AgentModelUsage,
  AgentToolCall,
  AgentToolDefinition,
} from "./types.js";
import { planToolCalls } from "./heuristics.js";
import { inferPolicyFromConversation } from "./policy.js";

export interface AgentGenerationRequest {
  caseRecord: AgentExecutionContext["caseRecord"];
  promptVersion: string;
  instructions: string;
  toolDefinitions: AgentToolDefinition[];
  turnIndex: number;
  previousResponseId: string | null;
  repairErrors: string[];
  toolObservations: AgentExecutionContext["toolObservations"];
  toolEvents: AgentExecutionContext["toolEvents"];
  model: string;
  reasoningEffort: string | null;
  maxOutputTokens: number;
  responseSchemaName: string;
  mode: "mock" | "live";
}

export interface MockProviderStep {
  kind: "tool_calls" | "final_output" | "invalid_output";
  response_id?: string;
  model?: string;
  tool_calls?: AgentToolCall[];
  output_text?: string;
  output?: unknown;
  usage?: AgentModelUsage | null;
}

export interface AgentProvider {
  generate(request: AgentGenerationRequest): Promise<AgentModelResponse>;
}

function makeSyntheticResponseId(model: string, turnIndex: number): string {
  return `${model.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mock-${String(turnIndex).padStart(2, "0")}`;
}

function toUsage(value: AgentModelUsage | null | undefined): AgentModelUsage | null {
  return value
    ? {
        input_tokens: value.input_tokens,
        cached_input_tokens: value.cached_input_tokens,
        output_tokens: value.output_tokens,
        reasoning_tokens: value.reasoning_tokens,
        total_tokens: value.total_tokens,
      }
    : null;
}

function extractTextFromOutput(raw: unknown): string | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const parts: string[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "type" in item) {
      const record = item as Record<string, unknown>;
      if (record.type === "message" && Array.isArray(record.content)) {
        for (const contentItem of record.content) {
          if (contentItem && typeof contentItem === "object" && (contentItem as Record<string, unknown>).type === "output_text") {
            const outputText = (contentItem as Record<string, unknown>).text;
            if (typeof outputText === "string") {
              parts.push(outputText);
            }
          }
        }
      }
    }
  }
  return parts.length ? parts.join("\n") : null;
}

function extractToolCallsFromOutput(raw: unknown): AgentToolCall[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const toolCalls: AgentToolCall[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (record.type !== "function_call") {
      continue;
    }
    const callId = typeof record.call_id === "string" ? record.call_id : typeof record.id === "string" ? record.id : "call";
    const name = typeof record.name === "string" ? record.name : "";
    const rawArguments = typeof record.arguments === "string" ? record.arguments : "{}";
    let parsedArguments: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(rawArguments) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedArguments = parsed as Record<string, unknown>;
      }
    } catch {
      parsedArguments = {};
    }
    toolCalls.push({ call_id: callId, name, arguments: parsedArguments });
  }
  return toolCalls;
}

function extractUsage(raw: any): AgentModelUsage | null {
  if (!raw || typeof raw !== "object" || !raw.usage) {
    return null;
  }
  const usage = raw.usage as Record<string, unknown>;
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  const cachedTokens = typeof usage.cached_input_tokens === "number"
    ? usage.cached_input_tokens
    : typeof (usage.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens === "number"
      ? (usage.input_tokens_details as Record<string, unknown>).cached_tokens as number
      : undefined;
  const reasoningTokens = typeof usage.reasoning_tokens === "number"
    ? usage.reasoning_tokens
    : typeof (usage.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens === "number"
      ? (usage.output_tokens_details as Record<string, unknown>).reasoning_tokens as number
      : undefined;
  return {
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    output_tokens: outputTokens,
    reasoning_tokens: reasoningTokens,
    total_tokens: totalTokens,
  };
}

function sanitizeInputContext(request: AgentGenerationRequest): Record<string, unknown> {
  return {
    prompt_version: request.promptVersion,
    mode: request.mode,
    turn_index: request.turnIndex,
    repair_errors: request.repairErrors,
    case_input: request.caseRecord,
    tool_history: request.toolObservations.map((observation) => ({
      tool_name: observation.tool_name,
      call_id: observation.call_id,
      outcome: observation.outcome,
      evidence_refs: observation.evidence_refs,
      data: observation.data,
    })),
    executed_tools: request.toolEvents.map((event) => ({
      tool_name: event.tool_name,
      outcome: event.outcome,
      evidence_refs: event.evidence_refs,
      error_category: event.error_category ?? null,
    })),
  };
}

export class MockAgentProvider implements AgentProvider {
  private readonly script: MockProviderStep[];
  private readonly model: string;
  private readonly reasoningEffort: string | null;
  private stepIndex = 0;

  constructor(options?: { script?: MockProviderStep[]; model?: string; reasoningEffort?: string | null }) {
    this.script = options?.script ? [...options.script] : [];
    this.model = options?.model ?? "mock-agent";
    this.reasoningEffort = options?.reasoningEffort ?? null;
  }

  async generate(request: AgentGenerationRequest): Promise<AgentModelResponse> {
    const startedAt = performance.now();
    const scripted = this.script[this.stepIndex];
    this.stepIndex += 1;

    if (scripted) {
      return this.buildResponseFromScript(request, scripted, performance.now() - startedAt);
    }

    if (request.repairErrors.length > 0) {
      const finalOutput = inferPolicyFromConversation(request.caseRecord, request.toolObservations);
      return {
        response_id: makeSyntheticResponseId(this.model, request.turnIndex),
        model: this.model,
        output_text: JSON.stringify(finalOutput),
        tool_calls: [],
        usage: toUsage({ input_tokens: 300, output_tokens: 220, total_tokens: 520, reasoning_tokens: 50 }),
        latency_ms: Math.max(0, Math.round(performance.now() - startedAt)),
        retries: 0,
        raw: { kind: "mock_repair", context: sanitizeInputContext(request) },
      };
    }

    const plannedTools = planToolCalls(request.caseRecord, request.toolObservations);
    if (plannedTools.length > 0) {
      return {
        response_id: makeSyntheticResponseId(this.model, request.turnIndex),
        model: this.model,
        output_text: null,
        tool_calls: plannedTools.map((tool) => ({
          call_id: `${tool.name}-${request.turnIndex}-${this.stepIndex}`,
          name: tool.name,
          arguments: tool.arguments,
        })),
        usage: toUsage({ input_tokens: 260, output_tokens: 40, total_tokens: 300, reasoning_tokens: 18 }),
        latency_ms: Math.max(0, Math.round(performance.now() - startedAt)),
        retries: 0,
        raw: { kind: "mock_tool_plan", context: sanitizeInputContext(request) },
      };
    }

    const finalOutput = inferPolicyFromConversation(request.caseRecord, request.toolObservations);
    return {
      response_id: makeSyntheticResponseId(this.model, request.turnIndex),
      model: this.model,
      output_text: JSON.stringify(finalOutput),
      tool_calls: [],
      usage: toUsage({ input_tokens: 280, output_tokens: 210, total_tokens: 490, reasoning_tokens: 40 }),
      latency_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      retries: 0,
      raw: { kind: "mock_final", context: sanitizeInputContext(request) },
    };
  }

  private buildResponseFromScript(
    request: AgentGenerationRequest,
    step: MockProviderStep,
    latencyMs: number,
  ): AgentModelResponse {
    if (step.kind === "tool_calls") {
      return {
        response_id: step.response_id ?? makeSyntheticResponseId(step.model ?? this.model, request.turnIndex),
        model: step.model ?? this.model,
        output_text: step.output_text ?? null,
        tool_calls: step.tool_calls ?? [],
        usage: toUsage(step.usage ?? { input_tokens: 10, output_tokens: 5, total_tokens: 15 }),
        latency_ms: Math.max(0, Math.round(latencyMs)),
        retries: 0,
        raw: { scripted: true, step, context: sanitizeInputContext(request) },
      };
    }
    if (step.kind === "invalid_output") {
      return {
        response_id: step.response_id ?? makeSyntheticResponseId(step.model ?? this.model, request.turnIndex),
        model: step.model ?? this.model,
        output_text: step.output_text ?? "not valid json",
        tool_calls: [],
        usage: toUsage(step.usage ?? { input_tokens: 10, output_tokens: 5, total_tokens: 15 }),
        latency_ms: Math.max(0, Math.round(latencyMs)),
        retries: 0,
        raw: { scripted: true, step, context: sanitizeInputContext(request) },
      };
    }
    const output = step.output ?? inferPolicyFromConversation(request.caseRecord, request.toolObservations);
    let outputText: string;
    try {
      outputText = typeof output === "string" ? output : JSON.stringify(output);
    } catch {
      outputText = "{}";
    }
    return {
      response_id: step.response_id ?? makeSyntheticResponseId(step.model ?? this.model, request.turnIndex),
      model: step.model ?? this.model,
      output_text: outputText,
      tool_calls: [],
      usage: toUsage(step.usage ?? { input_tokens: 10, output_tokens: 5, total_tokens: 15 }),
      latency_ms: Math.max(0, Math.round(latencyMs)),
      retries: 0,
      raw: { scripted: true, step, context: sanitizeInputContext(request) },
    };
  }
}

export class OpenAIResponsesProvider implements AgentProvider {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly reasoningEffort: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    reasoningEffort?: string | null;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options?.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
    this.reasoningEffort = options?.reasoningEffort ?? "low";
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.timeoutMs = options?.timeoutMs ?? 45_000;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  async generate(request: AgentGenerationRequest): Promise<AgentModelResponse> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new Error("OPENAI_API_KEY is required for live agent runs");
    }

    const payload = {
      model: this.model,
      instructions: request.instructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(sanitizeInputContext(request), null, 2),
            },
          ],
        },
      ],
      tools: request.toolDefinitions.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: true,
      })),
      text: {
        format: {
          type: "json_schema",
          name: request.responseSchemaName,
          schema: AGENT_MODEL_PROPOSAL_JSON_SCHEMA,
          strict: true,
        },
      },
      max_output_tokens: request.maxOutputTokens,
      reasoning: this.reasoningEffort ? { effort: this.reasoningEffort } : undefined,
      store: false,
      metadata: {
        prompt_version: request.promptVersion,
        mode: request.mode,
        turn_index: String(request.turnIndex),
      },
    };

    const startedAt = performance.now();
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const rawText = await response.text();
        if (!response.ok) {
          const status = response.status;
          const retryable = [408, 429, 500, 502, 503, 504].includes(status);
          if (retryable && attempt < this.maxRetries) {
            attempt += 1;
            lastError = new Error(`OpenAI Responses request failed with status ${status}`);
            continue;
          }
          throw new Error(`OpenAI Responses request failed with status ${status}: ${rawText.slice(0, 500)}`);
        }
        const raw = JSON.parse(rawText) as any;
        return {
          response_id: typeof raw.id === "string" ? raw.id : `response-${Date.now()}`,
          model: typeof raw.model === "string" ? raw.model : this.model,
          output_text: typeof raw.output_text === "string" ? raw.output_text : extractTextFromOutput(raw.output) ?? null,
          tool_calls: extractToolCallsFromOutput(raw.output),
          usage: extractUsage(raw),
          latency_ms: Math.max(0, Math.round(performance.now() - startedAt)),
          retries: attempt,
          raw,
        };
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxRetries) {
          throw error;
        }
        attempt += 1;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("OpenAI Responses request failed");
  }
}

export function loadPromptFile(promptVersion: string): string {
  const promptPath = fileURLToPath(new URL(`../../prompts/${promptVersion}.md`, import.meta.url));
  return readFileSync(promptPath, "utf8");
}
