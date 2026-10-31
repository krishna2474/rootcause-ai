import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// The only place we pick an LLM. Every provider here speaks the OpenAI chat-completions format,
// so switching is a .env change: LLM_PROVIDER, LLM_API_KEY, LLM_MODEL (+ LLM_BASE_URL for paytm/custom).
const PRESETS: Record<string, { baseURL: string; model: string }> = {
  openai: { baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  sarvam: { baseURL: "https://api.sarvam.ai/v1", model: "sarvam-105b-conversations" },
  // Paytm Inference: base URL and model are given at the event, set LLM_BASE_URL and LLM_MODEL.
  paytm: { baseURL: "", model: "" },
  custom: { baseURL: "", model: "" },
};

export function llmInfo() {
  const provider = (process.env.LLM_PROVIDER || "").toLowerCase();
  const preset = PRESETS[provider];
  const baseURL = process.env.LLM_BASE_URL || preset?.baseURL || "";
  const model = process.env.LLM_MODEL || preset?.model || "";
  const apiKey = process.env.LLM_API_KEY || "";
  return { provider, baseURL, model, configured: Boolean(provider && baseURL && model && apiKey), apiKey };
}

/** Returns null when no LLM is configured; callers fall back to the scripted agent. */
export function getModel(): LanguageModel | null {
  const { provider, baseURL, model, configured, apiKey } = llmInfo();
  if (!configured) return null;
  const client = createOpenAICompatible({
    name: provider,
    baseURL,
    apiKey,
    // Sarvam accepts its own header as well as Bearer.
    headers: provider === "sarvam" ? { "api-subscription-key": apiKey } : undefined,
    // Lets generateObject send a JSON schema to providers that support it.
    supportsStructuredOutputs: provider === "openai" || provider === "gemini",
  });
  return client(model);
}
