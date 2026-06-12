/**
 * Smart AI — Auto Model Router
 *
 * Automatically selects the best available model for each task based on:
 *   - Task type (chat, edit, apply, agent/tools, autocomplete, embed, reasoning)
 *   - Available models from the configured provider pool
 *   - Model capabilities (tool calling, FIM, images, context length)
 *
 * Provider pools:
 *   "ollama"     — only local Ollama models (free, private)
 *   "anthropic"  — Anthropic Claude models (paid API key)
 *   "openai"     — OpenAI GPT models (paid API key)
 *   "mixed"      — all available models, best-of-breed selection
 *
 * Usage: The router is not an LLM itself — it's a selector that picks the
 * best ILLM instance from the pool for a given role. It's used at config
 * load time to populate `selectedModelByRole`.
 */

import type { ModelRole } from "@smartai/config-yaml";
import type { ILLM } from "..";

// ─── Provider pool types ────────────────────────────────────────────────────

export type AutoProviderPool = "ollama" | "anthropic" | "openai" | "mixed";

// ─── Model capability scoring ───────────────────────────────────────────────

/**
 * Known model families and their relative capability scores per role.
 * Higher = better for that role. These are rough heuristics.
 */
interface ModelScore {
  chat: number;
  edit: number;
  apply: number;
  agent: number; // tool calling / agentic
  autocomplete: number;
  embed: number;
  reasoning: number;
}

/**
 * Score table keyed by model name prefix (lowercase).
 * Order matters — first match wins, so put more specific prefixes first.
 */
const MODEL_SCORES: [string, Partial<ModelScore>][] = [
  // ── Ollama / local models ──────────────────────────────────────────
  // Large agent-capable models
  ["qwen3:32b", { chat: 88, edit: 85, apply: 85, agent: 90, reasoning: 80 }],
  ["qwen3.6:27b", { chat: 87, edit: 84, apply: 84, agent: 89, reasoning: 78 }],
  ["qwen3:14b", { chat: 82, edit: 80, apply: 80, agent: 85, reasoning: 72 }],
  ["qwen3:8b", { chat: 78, edit: 75, apply: 75, agent: 80, reasoning: 65 }],
  ["qwen3", { chat: 80, edit: 78, apply: 78, agent: 82, reasoning: 68 }],

  // Code-specialized models
  [
    "qwen2.5-coder:32b",
    { chat: 80, edit: 92, apply: 92, agent: 75, autocomplete: 70 },
  ],
  [
    "qwen2.5-coder:14b",
    { chat: 75, edit: 88, apply: 88, agent: 70, autocomplete: 65 },
  ],
  [
    "qwen2.5-coder:7b",
    { chat: 70, edit: 82, apply: 82, agent: 65, autocomplete: 60 },
  ],
  [
    "qwen2.5-coder:3b",
    { chat: 55, edit: 70, apply: 68, agent: 45, autocomplete: 75 },
  ],
  [
    "qwen2.5-coder:1.5b",
    { chat: 35, edit: 50, apply: 45, agent: 20, autocomplete: 90 },
  ],
  [
    "qwen2.5-coder:0.5b",
    { chat: 20, edit: 30, apply: 25, agent: 10, autocomplete: 80 },
  ],
  [
    "qwen2.5-coder",
    { chat: 70, edit: 82, apply: 82, agent: 65, autocomplete: 60 },
  ],

  // DeepSeek
  [
    "deepseek-coder-v2",
    { chat: 78, edit: 80, apply: 78, agent: 80, reasoning: 70 },
  ],
  [
    "deepseek-r1:70b",
    { chat: 85, edit: 80, apply: 78, agent: 75, reasoning: 95 },
  ],
  [
    "deepseek-r1:32b",
    { chat: 80, edit: 75, apply: 73, agent: 70, reasoning: 90 },
  ],
  [
    "deepseek-r1:14b",
    { chat: 75, edit: 70, apply: 68, agent: 65, reasoning: 85 },
  ],
  [
    "deepseek-r1:8b",
    { chat: 68, edit: 65, apply: 62, agent: 58, reasoning: 78 },
  ],
  ["deepseek-r1", { chat: 75, edit: 70, apply: 68, agent: 65, reasoning: 85 }],
  ["deepseek-coder", { chat: 65, edit: 75, apply: 72, agent: 60 }],

  // Llama
  ["llama3.3:70b", { chat: 85, edit: 78, apply: 78, agent: 82, reasoning: 72 }],
  ["llama3.2:3b", { chat: 55, edit: 50, apply: 48, agent: 45 }],
  ["llama3.2:1b", { chat: 40, edit: 35, apply: 30, agent: 25 }],
  ["llama3.2", { chat: 55, edit: 50, apply: 48, agent: 45 }],
  ["llama3.1:70b", { chat: 82, edit: 76, apply: 76, agent: 80, reasoning: 68 }],
  ["llama3.1:8b", { chat: 65, edit: 60, apply: 58, agent: 60 }],
  ["llama3.1", { chat: 65, edit: 60, apply: 58, agent: 60 }],

  // Gemma
  ["gemma3:27b", { chat: 80, edit: 72, apply: 70, agent: 68 }],
  ["gemma3:12b", { chat: 72, edit: 65, apply: 63, agent: 60 }],
  ["gemma3:4b", { chat: 58, edit: 52, apply: 50, agent: 42 }],
  ["gemma3", { chat: 72, edit: 65, apply: 63, agent: 60 }],

  // Mistral
  [
    "mistral-large",
    { chat: 82, edit: 78, apply: 76, agent: 80, reasoning: 70 },
  ],
  [
    "mixtral:8x22b",
    { chat: 80, edit: 75, apply: 73, agent: 78, reasoning: 65 },
  ],
  ["mixtral", { chat: 72, edit: 68, apply: 66, agent: 70 }],
  ["mistral", { chat: 68, edit: 64, apply: 62, agent: 65 }],

  // Phi
  ["phi4:14b", { chat: 75, edit: 72, apply: 70, agent: 68, reasoning: 65 }],
  ["phi4", { chat: 75, edit: 72, apply: 70, agent: 68, reasoning: 65 }],

  // Smarterp-coder (custom)
  ["smarterp-coder", { chat: 72, edit: 85, apply: 82, agent: 68 }],

  // Embedding models
  ["nomic-embed-text", { embed: 90 }],
  ["mxbai-embed-large", { embed: 88 }],
  ["all-minilm", { embed: 75 }],
  ["snowflake-arctic-embed", { embed: 85 }],
  ["bge-m3", { embed: 82 }],

  // ── Anthropic models ───────────────────────────────────────────────
  [
    "claude-sonnet-4",
    { chat: 95, edit: 95, apply: 95, agent: 97, reasoning: 92 },
  ],
  [
    "claude-opus-4",
    { chat: 95, edit: 93, apply: 93, agent: 95, reasoning: 97 },
  ],
  [
    "claude-3.5-sonnet",
    { chat: 92, edit: 92, apply: 92, agent: 95, reasoning: 88 },
  ],
  [
    "claude-3.5-haiku",
    { chat: 80, edit: 78, apply: 78, agent: 82, reasoning: 70 },
  ],
  [
    "claude-3-haiku",
    { chat: 72, edit: 70, apply: 68, agent: 72, reasoning: 60 },
  ],
  ["claude", { chat: 85, edit: 85, apply: 85, agent: 88, reasoning: 80 }],

  // ── OpenAI models ─────────────────────────────────────────────────
  ["o3", { chat: 90, edit: 88, apply: 88, agent: 90, reasoning: 98 }],
  ["o4-mini", { chat: 85, edit: 82, apply: 82, agent: 85, reasoning: 90 }],
  ["o1", { chat: 88, edit: 85, apply: 85, agent: 85, reasoning: 95 }],
  ["gpt-4.1", { chat: 92, edit: 90, apply: 90, agent: 93, reasoning: 82 }],
  ["gpt-4.1-mini", { chat: 82, edit: 80, apply: 80, agent: 82, reasoning: 72 }],
  ["gpt-4.1-nano", { chat: 70, edit: 68, apply: 66, agent: 68, reasoning: 55 }],
  ["gpt-4o", { chat: 90, edit: 88, apply: 88, agent: 92, reasoning: 80 }],
  ["gpt-4o-mini", { chat: 78, edit: 76, apply: 75, agent: 78, reasoning: 65 }],
  ["gpt-4-turbo", { chat: 85, edit: 83, apply: 83, agent: 88, reasoning: 75 }],
  ["gpt-4", { chat: 82, edit: 80, apply: 80, agent: 85, reasoning: 72 }],
  [
    "gpt-3.5-turbo",
    { chat: 60, edit: 55, apply: 52, agent: 50, reasoning: 40 },
  ],
];

const DEFAULT_SCORE: ModelScore = {
  chat: 30,
  edit: 30,
  apply: 30,
  agent: 30,
  autocomplete: 25,
  embed: 0,
  reasoning: 30,
};

function getModelScore(modelName: string): ModelScore {
  const lower = modelName.toLowerCase();

  // Strong guard: embedding-only models should never win chat/edit/apply routing.
  if (lower.includes("embed")) {
    return {
      chat: 0,
      edit: 0,
      apply: 0,
      agent: 0,
      autocomplete: 0,
      embed: 90,
      reasoning: 0,
    };
  }

  for (const [prefix, scores] of MODEL_SCORES) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) {
      return { ...DEFAULT_SCORE, ...scores };
    }
  }
  return { ...DEFAULT_SCORE };
}

// Map our internal role names to score keys
function roleToScoreKey(role: ModelRole | string): keyof ModelScore {
  switch (role) {
    case "chat":
      return "chat";
    case "edit":
      return "edit";
    case "apply":
      return "apply";
    case "autocomplete":
      return "autocomplete";
    case "embed":
      return "embed";
    case "rerank":
      return "embed"; // rerankers share embed score
    default:
      return "chat";
  }
}

// ─── Provider filtering ─────────────────────────────────────────────────────

const PROVIDER_POOL_MAP: Record<AutoProviderPool, Set<string> | null> = {
  ollama: new Set(["ollama"]),
  anthropic: new Set(["anthropic"]),
  openai: new Set(["openai"]),
  mixed: null, // null = accept all
};

function isModelInPool(model: ILLM, pool: AutoProviderPool): boolean {
  const allowed = PROVIDER_POOL_MAP[pool];
  if (!allowed) return true; // mixed
  return allowed.has(model.providerName);
}

// ─── Task analysis for agent routing ────────────────────────────────────────

/** Heuristic keywords to detect agent-heavy tasks */
const AGENT_KEYWORDS = [
  "create file",
  "run command",
  "terminal",
  "execute",
  "search the",
  "find and replace",
  "multi-step",
  "step by step",
  "implement",
  "refactor",
  "debug",
  "fix the bug",
  "write tests",
  "install",
  "deploy",
  "set up",
  "configure",
  "build",
];

const REASONING_KEYWORDS = [
  "explain why",
  "analyze",
  "algorithm",
  "complexity",
  "prove",
  "trade-off",
  "architecture",
  "design pattern",
  "compare",
  "optimize for",
  "mathematical",
  "logic",
];

/**
 * Analyze user input to detect what kind of task is being requested.
 * Returns the best score key to use for model selection.
 */
export function detectTaskType(
  input: string,
  hasTools: boolean,
): keyof ModelScore {
  const lower = input.toLowerCase();

  // If tools are available and the prompt looks agentic, use agent scoring
  if (hasTools) {
    for (const kw of AGENT_KEYWORDS) {
      if (lower.includes(kw)) return "agent";
    }
    // Default to agent when tools are present
    return "agent";
  }

  // Check for reasoning tasks
  for (const kw of REASONING_KEYWORDS) {
    if (lower.includes(kw)) return "reasoning";
  }

  return "chat";
}

// ─── Main router ────────────────────────────────────────────────────────────

export interface AutoRouterOptions {
  pool: AutoProviderPool;
}

/**
 * Select the best model from a list for a given role.
 *
 * @param models - All available ILLM instances
 * @param role   - The model role (chat, edit, apply, autocomplete, embed, rerank)
 * @param pool   - Which provider pool to restrict to
 * @returns The best model, or null if no suitable model found
 */
export function selectBestModel(
  models: ILLM[],
  role: ModelRole | string,
  pool: AutoProviderPool = "ollama",
): ILLM | null {
  const candidates = models.filter((m) => isModelInPool(m, pool));
  if (candidates.length === 0) return null;

  const scoreKey = roleToScoreKey(role);

  // Score each candidate
  const scored = candidates.map((m) => ({
    model: m,
    score: getModelScore(m.model)[scoreKey],
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Filter out models with 0 score (e.g., embedding models for chat)
  const best = scored.find((s) => s.score > 0);
  return best?.model ?? null;
}

/**
 * Given a user message and available models, pick the best model dynamically.
 * This is for "smart" routing mid-conversation (e.g., switching from a fast
 * chat model to a reasoning model when the user asks a complex question).
 *
 * @param models    - All ILLM instances in the pool
 * @param userInput - The latest user message text
 * @param hasTools  - Whether tools are available in this context
 * @param pool      - Provider pool restriction
 * @returns The best model for this specific message
 */
export function selectBestModelForMessage(
  models: ILLM[],
  userInput: string,
  hasTools: boolean,
  pool: AutoProviderPool = "ollama",
): ILLM | null {
  const taskType = detectTaskType(userInput, hasTools);
  const candidates = models.filter((m) => isModelInPool(m, pool));
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((m) => ({
      model: m,
      score: getModelScore(m.model)[taskType],
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.model ?? null;
}

/**
 * Auto-select the best model for each role from all available models.
 * Returns a map of role → best ILLM (or null).
 *
 * This is designed to be called at config load time to populate
 * `selectedModelByRole` when the user has "auto" mode enabled.
 */
export function autoSelectModelsForAllRoles(
  modelsByRole: Record<string, ILLM[]>,
  pool: AutoProviderPool = "ollama",
): Record<string, ILLM | null> {
  // Flatten all unique models across all roles
  const allModels = new Map<string, ILLM>();
  for (const models of Object.values(modelsByRole)) {
    for (const m of models) {
      const key = `${m.providerName}::${m.model}`;
      if (!allModels.has(key)) {
        allModels.set(key, m);
      }
    }
  }
  const flatModels = Array.from(allModels.values());

  const roles = Object.keys(modelsByRole);
  const result: Record<string, ILLM | null> = {};

  for (const role of roles) {
    // First try to select from the role-specific models
    const roleModels = modelsByRole[role] ?? [];
    const roleCandidates = roleModels.filter((m) => isModelInPool(m, pool));

    if (roleCandidates.length > 0) {
      result[role] = selectBestModel(roleCandidates, role, pool);
    } else {
      // Fall back to all available models
      result[role] = selectBestModel(flatModels, role, pool);
    }
  }

  return result;
}

/**
 * Get a human-readable description of why a model was selected for a role.
 */
export function explainSelection(
  model: ILLM,
  role: ModelRole | string,
): string {
  const score = getModelScore(model.model);
  const key = roleToScoreKey(role);
  return `${model.title ?? model.model} (${model.providerName}) — score ${score[key]}/100 for "${role}"`;
}
