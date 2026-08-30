import type { AgentModelUsage } from "./types.js";

export interface PricingMetadata {
  model: string;
  currency: "USD";
  input_per_million: number;
  cached_input_per_million: number;
  output_per_million: number;
  effective_date: string;
  source_note: string;
}

export const LUNA_PRICING: PricingMetadata = {
  model: "gpt-5.6-luna",
  currency: "USD",
  input_per_million: 0.2,
  cached_input_per_million: 0.02,
  output_per_million: 1.2,
  effective_date: "2026-08-29",
  source_note: "User-specified current documented rates for GPT-5.6 Luna in the phase-4 task.",
};

export function getPricingMetadata(model: string): PricingMetadata | null {
  return model.toLowerCase().includes("luna") ? LUNA_PRICING : null;
}

export function estimateUsageCostUsd(usage: AgentModelUsage | null | undefined, model: string): number {
  const pricing = getPricingMetadata(model);
  if (!pricing || !usage) {
    return 0;
  }
  const inputTokens = usage.input_tokens ?? 0;
  const cachedInputTokens = usage.cached_input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const inputCost = ((inputTokens - cachedInputTokens) / 1_000_000) * pricing.input_per_million;
  const cachedCost = (cachedInputTokens / 1_000_000) * pricing.cached_input_per_million;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_per_million;
  return Math.max(0, inputCost + cachedCost + outputCost);
}
