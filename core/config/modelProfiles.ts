/**
 * Smart AI - Model Profile Registry
 *
 * Architecture:
 * - Default profiles are fully non-pay, local/self-hosted via Ollama
 * - Optional open cloud/open-weight profiles are available as advanced opt-ins
 * - No paid provider is used as a default
 *
 * Profile tiers:
 *   A. DEFAULT (local, non-pay, self-hosted)
 *      1. Local Balanced  → qwen2.5-coder:7b + qwen2.5-coder:1.5b + nomic-embed-text
 *      2. Local Pro       → qwen3.6:27b + qwen2.5-coder:1.5b + nomic-embed-text
 *      3. Local Reasoning → deepseek-r1:14b (optional local reasoning)
 *
 *   B. OPTIONAL ADVANCED (open cloud / open-weight)
 *      4. Cloud Advanced  → kimi-k2.6, glm-5.1, minimax-m3, deepseek-v4
 *      These are NOT defaults. They must be explicitly enabled by the user.
 */

export type ModelProfileId =
  | "local-balanced"
  | "local-pro"
  | "local-reasoning"
  | "cloud-kimi-k2.6"
  | "cloud-glm-5.1"
  | "cloud-minimax-m3"
  | "cloud-deepseek-v4";

export interface ModelRoleConfig {
  model: string;
  provider: string;
  apiBase?: string;
  title: string;
  description: string;
}

export interface ModelProfile {
  id: ModelProfileId;
  name: string;
  tier: "default" | "optional";
  description: string;
  roles: {
    chat?: ModelRoleConfig;
    edit?: ModelRoleConfig;
    apply?: ModelRoleConfig;
    autocomplete?: ModelRoleConfig;
    embed?: ModelRoleConfig;
    agent?: ModelRoleConfig;
    reasoning?: ModelRoleConfig;
  };
  /** Completion defaults for chat/edit/apply */
  completionOptions?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  };
  /** Autocomplete/FIM specific options */
  autocompleteOptions?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

// ---------------------------------------------------------------------------
// A. DEFAULT LOCAL NON-PAY PROFILES
// ---------------------------------------------------------------------------

export const LOCAL_BALANCED_PROFILE: ModelProfile = {
  id: "local-balanced",
  name: "Local Balanced",
  tier: "default",
  description:
    "Fully local, non-pay setup. Balanced quality and speed for everyday coding. " +
    "Runs entirely on your machine via Ollama. No API keys, no network calls.",
  roles: {
    chat: {
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      title: "Qwen2.5-Coder 7B (Chat)",
      description: "Fast, capable code model for chat and general assistance.",
    },
    edit: {
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      title: "Qwen2.5-Coder 7B (Edit)",
      description: "Targeted code edits with minimal, precise changes.",
    },
    apply: {
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      title: "Qwen2.5-Coder 7B (Apply)",
      description: "Applies generated code patches from chat context.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Lightning-fast FIM autocomplete. Runs on CPU or GPU.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Small, efficient embedding model for codebase indexing.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 4096,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
  autocompleteOptions: {
    temperature: 0.2,
    maxTokens: 256,
    topP: 0.9,
  },
};

export const LOCAL_PRO_PROFILE: ModelProfile = {
  id: "local-pro",
  name: "Local Pro",
  tier: "default",
  description:
    "Higher-quality local setup for users with more GPU memory. " +
    "Uses a 27B parameter model for chat/edit/apply/agent. Still fully local and non-pay.",
  roles: {
    chat: {
      model: "qwen3.6:27b",
      provider: "ollama",
      title: "Qwen 3.6 27B (Chat)",
      description: "Large local code model with superior reasoning and generation quality.",
    },
    edit: {
      model: "qwen3.6:27b",
      provider: "ollama",
      title: "Qwen 3.6 27B (Edit)",
      description: "High-quality targeted edits with deeper codebase understanding.",
    },
    apply: {
      model: "qwen3.6:27b",
      provider: "ollama",
      title: "Qwen 3.6 27B (Apply)",
      description: "Applies complex multi-file patches from chat context.",
    },
    agent: {
      model: "qwen3.6:27b",
      provider: "ollama",
      title: "Qwen 3.6 27B (Agent)",
      description: "Agent-mode planning and tool use for multi-step coding tasks.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Lightning-fast FIM autocomplete. Shared with Local Balanced.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Small, efficient embedding model for codebase indexing.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
  autocompleteOptions: {
    temperature: 0.2,
    maxTokens: 256,
    topP: 0.9,
  },
};

export const LOCAL_REASONING_PROFILE: ModelProfile = {
  id: "local-reasoning",
  name: "Local Reasoning",
  tier: "default",
  description:
    "Optional local reasoning profile. Adds a reasoning model for complex problem-solving, " +
    "algorithm design, and deep analysis. Requires ~10-20 GB VRAM.",
  roles: {
    reasoning: {
      model: "deepseek-r1:14b",
      provider: "ollama",
      title: "DeepSeek-R1 14B (Reasoning)",
      description: "Chain-of-thought reasoning model for complex tasks.",
    },
    chat: {
      model: "deepseek-r1:14b",
      provider: "ollama",
      title: "DeepSeek-R1 14B (Chat)",
      description: "Reasoning-capable chat for math, algorithms, and logic.",
    },
  },
  completionOptions: {
    temperature: 0.6,
    maxTokens: 8192,
    topP: 0.95,
    topK: 40,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
};

// ---------------------------------------------------------------------------
// B. OPTIONAL OPEN CLOUD / OPEN-WEIGHT ADVANCED PROFILES
// ---------------------------------------------------------------------------
// These are NOT defaults. They require explicit user opt-in and may use
// external API endpoints or larger local models that exceed typical consumer
// GPU memory. They are provided for power users who need frontier capability.
// ---------------------------------------------------------------------------

export const CLOUD_KIMI_K26_PROFILE: ModelProfile = {
  id: "cloud-kimi-k2.6",
  name: "Cloud Advanced — Kimi K2.6",
  tier: "optional",
  description:
    "OPTIONAL advanced profile. Kimi K2.6 (Moonshot AI) — frontier open-weight " +
    "model with exceptional long-context and coding capability. " +
    "Requires external API endpoint or self-hosted deployment.",
  roles: {
    chat: {
      model: "kimi-k2.6",
      provider: "openai", // via compatible endpoint
      apiBase: "https://api.moonshot.cn/v1",
      title: "Kimi K2.6 (Chat)",
      description: "Frontier open-weight model. 1M+ token context window.",
    },
    edit: {
      model: "kimi-k2.6",
      provider: "openai",
      apiBase: "https://api.moonshot.cn/v1",
      title: "Kimi K2.6 (Edit)",
      description: "High-precision code edits with long-context awareness.",
    },
    apply: {
      model: "kimi-k2.6",
      provider: "openai",
      apiBase: "https://api.moonshot.cn/v1",
      title: "Kimi K2.6 (Apply)",
      description: "Applies multi-file patches across large repositories.",
    },
    agent: {
      model: "kimi-k2.6",
      provider: "openai",
      apiBase: "https://api.moonshot.cn/v1",
      title: "Kimi K2.6 (Agent)",
      description: "Agent-mode with tool use and autonomous planning.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Local autocomplete remains unchanged for low latency.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Local embeddings remain unchanged.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
};

export const CLOUD_GLM_51_PROFILE: ModelProfile = {
  id: "cloud-glm-5.1",
  name: "Cloud Advanced — GLM 5.1",
  tier: "optional",
  description:
    "OPTIONAL advanced profile. GLM 5.1 (Zhipu AI) — open-weight bilingual " +
    "model with strong code and reasoning capabilities. " +
    "Requires external API endpoint or self-hosted deployment.",
  roles: {
    chat: {
      model: "glm-5.1",
      provider: "openai",
      apiBase: "https://open.bigmodel.cn/api/paas/v4",
      title: "GLM 5.1 (Chat)",
      description: "Bilingual frontier model with strong Chinese/English coding.",
    },
    edit: {
      model: "glm-5.1",
      provider: "openai",
      apiBase: "https://open.bigmodel.cn/api/paas/v4",
      title: "GLM 5.1 (Edit)",
      description: "Precise code edits with bilingual understanding.",
    },
    apply: {
      model: "glm-5.1",
      provider: "openai",
      apiBase: "https://open.bigmodel.cn/api/paas/v4",
      title: "GLM 5.1 (Apply)",
      description: "Applies patches with bilingual codebase awareness.",
    },
    agent: {
      model: "glm-5.1",
      provider: "openai",
      apiBase: "https://open.bigmodel.cn/api/paas/v4",
      title: "GLM 5.1 (Agent)",
      description: "Agent-mode for complex multi-step tasks.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Local autocomplete remains unchanged.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Local embeddings remain unchanged.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
};

export const CLOUD_MINIMAX_M3_PROFILE: ModelProfile = {
  id: "cloud-minimax-m3",
  name: "Cloud Advanced — MiniMax M3",
  tier: "optional",
  description:
    "OPTIONAL advanced profile. MiniMax M3 — open-weight model with " +
    "state-of-the-art agentic capabilities and tool use. " +
    "Requires external API endpoint or self-hosted deployment.",
  roles: {
    chat: {
      model: "minimax-m3",
      provider: "openai",
      apiBase: "https://api.minimaxi.chat/v1",
      title: "MiniMax M3 (Chat)",
      description: "Frontier agentic model with advanced tool use.",
    },
    edit: {
      model: "minimax-m3",
      provider: "openai",
      apiBase: "https://api.minimaxi.chat/v1",
      title: "MiniMax M3 (Edit)",
      description: "High-quality edits with agentic reasoning.",
    },
    apply: {
      model: "minimax-m3",
      provider: "openai",
      apiBase: "https://api.minimaxi.chat/v1",
      title: "MiniMax M3 (Apply)",
      description: "Applies complex patches with autonomous validation.",
    },
    agent: {
      model: "minimax-m3",
      provider: "openai",
      apiBase: "https://api.minimaxi.chat/v1",
      title: "MiniMax M3 (Agent)",
      description: "Full agent mode with planning, tool use, and reflection.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Local autocomplete remains unchanged.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Local embeddings remain unchanged.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
};

export const CLOUD_DEEPSEEK_V4_PROFILE: ModelProfile = {
  id: "cloud-deepseek-v4",
  name: "Cloud Advanced — DeepSeek V4",
  tier: "optional",
  description:
    "OPTIONAL advanced profile. DeepSeek V4 — frontier open-weight model " +
    "with exceptional coding and reasoning performance. " +
    "Requires external API endpoint or self-hosted deployment (very large).",
  roles: {
    chat: {
      model: "deepseek-v4",
      provider: "openai",
      apiBase: "https://api.deepseek.com/v1",
      title: "DeepSeek V4 (Chat)",
      description: "Frontier coding model with top-tier benchmark scores.",
    },
    edit: {
      model: "deepseek-v4",
      provider: "openai",
      apiBase: "https://api.deepseek.com/v1",
      title: "DeepSeek V4 (Edit)",
      description: "Surgical code edits with deep semantic understanding.",
    },
    apply: {
      model: "deepseek-v4",
      provider: "openai",
      apiBase: "https://api.deepseek.com/v1",
      title: "DeepSeek V4 (Apply)",
      description: "Applies large-scale refactoring patches.",
    },
    agent: {
      model: "deepseek-v4",
      provider: "openai",
      apiBase: "https://api.deepseek.com/v1",
      title: "DeepSeek V4 (Agent)",
      description: "Agent mode with advanced planning and execution.",
    },
    reasoning: {
      model: "deepseek-v4",
      provider: "openai",
      apiBase: "https://api.deepseek.com/v1",
      title: "DeepSeek V4 (Reasoning)",
      description: "Chain-of-thought reasoning for the hardest problems.",
    },
    autocomplete: {
      model: "qwen2.5-coder:1.5b",
      provider: "ollama",
      title: "Qwen2.5-Coder 1.5B (Autocomplete)",
      description: "Local autocomplete remains unchanged.",
    },
    embed: {
      model: "nomic-embed-text",
      provider: "ollama",
      title: "Nomic Embed (Embeddings)",
      description: "Local embeddings remain unchanged.",
    },
  },
  completionOptions: {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
};

// ---------------------------------------------------------------------------
// REGISTRY
// ---------------------------------------------------------------------------

export const ALL_MODEL_PROFILES: ModelProfile[] = [
  LOCAL_BALANCED_PROFILE,
  LOCAL_PRO_PROFILE,
  LOCAL_REASONING_PROFILE,
  CLOUD_KIMI_K26_PROFILE,
  CLOUD_GLM_51_PROFILE,
  CLOUD_MINIMAX_M3_PROFILE,
  CLOUD_DEEPSEEK_V4_PROFILE,
];

/** Default profile used when no user preference is set */
export const DEFAULT_PROFILE_ID: ModelProfileId = "local-balanced";

export function getProfileById(id: ModelProfileId): ModelProfile | undefined {
  return ALL_MODEL_PROFILES.find((p) => p.id === id);
}

export function getDefaultProfiles(): ModelProfile[] {
  return ALL_MODEL_PROFILES.filter((p) => p.tier === "default");
}

export function getOptionalProfiles(): ModelProfile[] {
  return ALL_MODEL_PROFILES.filter((p) => p.tier === "optional");
}

/**
 * Resolve the active profile.
 * - If SMARTAI_MODEL_PROFILE env var is set and valid, use it.
 * - Otherwise fall back to DEFAULT_PROFILE_ID.
 */
export function resolveActiveProfile(): ModelProfile {
  const envProfile =
    typeof process !== "undefined" && process.env
      ? process.env.SMARTAI_MODEL_PROFILE
      : undefined;
  if (envProfile) {
    const found = getProfileById(envProfile as ModelProfileId);
    if (found) return found;
  }
  return getProfileById(DEFAULT_PROFILE_ID)!;
}
