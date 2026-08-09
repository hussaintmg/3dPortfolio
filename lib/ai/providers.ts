import { decryptSecret } from "@/lib/secretBox";

/**
 * A single request shape that every provider is adapted to.
 *
 * OpenRouter, Groq and most self-hosted endpoints already speak the OpenAI
 * chat-completions dialect; Gemini does not, so it gets its own translation.
 * Everything above this file works in terms of `ChatMessage` only.
 */

export type ProviderKind = "openrouter" | "gemini" | "groq" | "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  kind: ProviderKind;
  apiKey: string;
  model: string;
  baseUrl?: string;
  label?: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Hard ceiling per attempt so one hung provider can't stall a reply. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  model: string;
  latencyMs: number;
}

/** Sensible defaults per provider, offered in the UI. */
export const PROVIDER_PRESETS: Record<
  ProviderKind,
  { label: string; models: string[]; needsBaseUrl: boolean; keyHint: string; docs: string }
> = {
  openrouter: {
    label: "OpenRouter",
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemma-3-27b-it:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ],
    needsBaseUrl: false,
    keyHint: "sk-or-v1-…",
    docs: "https://openrouter.ai/keys",
  },
  gemini: {
    label: "Google Gemini",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"],
    needsBaseUrl: false,
    keyHint: "AIza…",
    docs: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ],
    needsBaseUrl: false,
    keyHint: "gsk_…",
    docs: "https://console.groq.com/keys",
  },
  openai: {
    label: "Custom (OpenAI-compatible)",
    models: ["gpt-4o-mini"],
    needsBaseUrl: true,
    keyHint: "sk-…",
    docs: "",
  },
};

const DEFAULT_TIMEOUT = 25000;

/** Runs `fn` with an abort signal that fires after `ms`. */
async function withTimeout<T>(
  ms: number,
  external: AbortSignal | undefined,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  external?.addEventListener("abort", onAbort);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

function baseUrlFor(config: ProviderConfig): string {
  switch (config.kind) {
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "openai":
      return (config.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    default:
      return "";
  }
}

/**
 * Turns a hybrid reasoning model's thinking off at the prompt level.
 *
 * Nemotron and Qwen3 ignore the API's `reasoning` switch — their chat
 * template is driven by a magic phrase in the system message instead. Without
 * it these models answer every request with several thousand tokens of "we
 * need to… let's count the words…" and never reach the actual reply, which
 * reaches the client verbatim.
 */
function quietenReasoning(model: string, messages: ChatMessage[]): ChatMessage[] {
  const m = model.toLowerCase();
  const directive = m.includes("nemotron")
    ? "detailed thinking off"
    : /qwen3|qwq/.test(m)
      ? "/no_think"
      : null;

  if (!directive) return messages;

  const first = messages[0];
  if (first?.role === "system") {
    return [{ ...first, content: `${directive}\n\n${first.content}` }, ...messages.slice(1)];
  }
  return [{ role: "system", content: directive }, ...messages];
}

/** OpenAI-dialect providers: OpenRouter, Groq and anything compatible. */
async function callOpenAiStyle(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: CompletionOptions,
  signal: AbortSignal,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.kind === "openrouter") {
    // OpenRouter asks callers to identify themselves; it also unlocks free tiers
    headers["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    headers["X-Title"] = "Portfolio Assistant";
  }

  const res = await fetch(`${baseUrlFor(config)}/chat/completions`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: config.model,
      messages: quietenReasoning(config.model, messages),
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 400,
      /**
       * Keep reasoning out of the answer.
       *
       * Several of the free models on OpenRouter are reasoning models, and by
       * default their chain of thought arrives inside `message.content` —
       * so the assistant replies to a client with "The user says… let's draft
       * a subject line…" instead of the actual message. Unknown fields are
       * ignored by providers that don't reason, so this is safe everywhere.
       */
      ...(config.kind === "openrouter"
        ? {
            reasoning: { exclude: true },
            include_reasoning: false,
            /**
             * Hybrid reasoning models (Nemotron, Qwen3) don't use the
             * `reasoning` field at all — they think in plain content unless
             * the chat template is told not to. This is the switch for them.
             */
            chat_template_kwargs: { thinking: false },
          }
        : {}),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(shortError(res.status, body));
  }

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error("Provider returned a non-JSON response");
  }

  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(json?.error?.message || "Provider returned an empty reply");
  }
  return stripThinking(text);
}

/**
 * Last line of defence against leaked chain-of-thought.
 *
 * `reasoning: { exclude: true }` covers OpenRouter, but a self-hosted or
 * Groq-served reasoning model can still emit `<think>…</think>` inline. It is
 * never part of an answer, so it never reaches the caller.
 */
function stripThinking(text: string) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

/** Gemini's generateContent shape: system prompt is separate, roles differ. */
async function callGemini(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: CompletionOptions,
  signal: AbortSignal,
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.model,
    )}:generateContent`,
    {
      method: "POST",
      // Header auth keeps the key out of the URL (and out of any proxy log)
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      signal,
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          temperature: opts.temperature ?? 0.6,
          maxOutputTokens: opts.maxTokens ?? 400,
        },
      }),
    },
  );

  const body = await res.text();
  if (!res.ok) throw new Error(shortError(res.status, body));

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error("Provider returned a non-JSON response");
  }

  const text = json?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text || "")
    .join("")
    .trim();

  if (!text) {
    const blocked = json?.promptFeedback?.blockReason;
    throw new Error(
      blocked ? `Blocked by safety filter (${blocked})` : "Empty reply",
    );
  }
  return text;
}

/** Turns a provider error body into one readable line. */
function shortError(status: number, body: string): string {
  let detail = "";
  try {
    const json = JSON.parse(body);
    detail = json?.error?.message || json?.message || "";
  } catch {
    detail = body.slice(0, 160);
  }
  const prefix =
    status === 401 || status === 403
      ? "Key rejected"
      : status === 429
        ? "Rate limited"
        : status >= 500
          ? "Provider unavailable"
          : `HTTP ${status}`;
  return detail ? `${prefix}: ${detail.slice(0, 200)}` : prefix;
}

/** One attempt against one provider. Throws on any failure. */
export async function callProvider(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: CompletionOptions = {},
): Promise<CompletionResult> {
  const started = Date.now();
  const text = await withTimeout(
    opts.timeoutMs ?? DEFAULT_TIMEOUT,
    opts.signal,
    (signal) =>
      config.kind === "gemini"
        ? callGemini(config, messages, opts, signal)
        : callOpenAiStyle(config, messages, opts, signal),
  );
  return { text, model: config.model, latencyMs: Date.now() - started };
}

/** Reads a stored document into a usable config, decrypting the key. */
export function toConfig(doc: any): ProviderConfig {
  return {
    kind: doc.kind,
    apiKey: decryptSecret(doc.apiKey),
    model: doc.model,
    baseUrl: doc.baseUrl,
    label: doc.label,
  };
}
