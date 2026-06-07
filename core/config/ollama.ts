/**
 * Smart AI - Ollama Provider Configuration
 * 
 * This file contains default configurations for Ollama provider,
 * supporting both local and remote tunnel modes.
 * 
 * Usage:
 * - Local mode (default):  http://localhost:11434
 * - Remote tunnel mode:    http://localhost:11435
 * 
 * To switch modes:
 * - Set environment variable: SMARTAI_OLLAMA_MODE=remote
 * - Or modify: getOllamaConfig() at runtime
 */

export type OllamaMode = "local" | "remote";

export interface OllamaConfig {
  mode: OllamaMode;
  apiBase: string;
  models: {
    chat: string;
    edit: string;
    apply: string;
    autocomplete: string;
    embeddings: string;
  };
}

/**
 * Get current Ollama mode from environment or default to local
 */
export function getOllamaMode(): OllamaMode {
  if (typeof process !== "undefined" && process.env) {
    const envMode = process.env.SMARTAI_OLLAMA_MODE;
    if (envMode === "remote") {
      return "remote";
    }
  }
  return "local";
}

/**
 * Get Ollama configuration based on current mode
 */
export function getOllamaConfig(): OllamaConfig {
  const mode = getOllamaMode();

  const baseConfig = {
    local: {
      mode: "local" as const,
      apiBase: "http://localhost:11434",
      models: {
        chat: "smarterp-coder",
        edit: "smarterp-coder",
        apply: "smarterp-coder",
        autocomplete: "qwen2.5-coder:1.5b",
        embeddings: "nomic-embed-text",
      },
    },
    remote: {
      mode: "remote" as const,
      apiBase: "http://localhost:11435",
      models: {
        chat: "smarterp-coder",
        edit: "smarterp-coder",
        apply: "smarterp-coder",
        autocomplete: "qwen2.5-coder:1.5b",
        embeddings: "nomic-embed-text",
      },
    },
  };

  return baseConfig[mode];
}

/**
 * Smart AI Ollama Model Defaults
 * 
 * Primary models (fallback priority):
 * 1. smarterp-coder - Smart AI custom code model (local build)
 * 2. qwen2.5-coder:7b - Qwen2.5-Coder 7B (chat, edit, apply)
 * 
 * Autocomplete models:
 * 1. qwen2.5-coder:1.5b - Lightweight FIM model
 * 
 * Embeddings:
 * 1. nomic-embed-text - Small, efficient embedding model
 */

export const SMARTAI_OLLAMA_DEFAULTS = {
  // Primary chat/code models (in priority order)
  chatModels: [
    "smarterp-coder",
    "qwen2.5-coder:7b",
    "qwen2.5-coder:32b",
    "llama3.1:8b",
    "llama3.1:70b",
  ],

  // Autocomplete/FIM models
  autocompleteModels: [
    "qwen2.5-coder:1.5b",
    "qwen2.5-coder:7b",
    "llama3.1:8b",
  ],

  // Embedding models
  embeddingModels: [
    "nomic-embed-text",
    "mistral-embed",
  ],

  // Model titles for UI
  titles: {
    chat: "Smart AI Coder (Ollama)",
    edit: "Smart AI Coder (Ollama)",
    apply: "Smart AI Coder (Ollama)",
    autocomplete: "Qwen2.5-Coder 1.5B (Autocomplete)",
    embeddings: "Nomic Embed (Embeddings)",
  },

  // Provider name
  provider: "ollama",

  // Completion options (chat / edit / apply)
  // Lower temperature for more deterministic code generation
  completionOptions: {
    temperature: 0.3,
    maxTokens: 4096,
    topP: 0.9,
    topK: 20,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },

  // Autocomplete specific options (FIM - fast, deterministic)
  autocompleteOptions: {
    temperature: 0.2,
    maxTokens: 256,
    topP: 0.9,
  },

  // System message for smarterp-coder to behave like a Copilot-style assistant
  systemMessage:
    "You are Smart AI, a practical coding assistant. " +
    "You write clean, modern code following the project's existing conventions. " +
    "You prefer minimal, targeted changes. " +
    "You explain your reasoning briefly when asked, but default to concise answers. " +
    "When editing code, preserve existing style and formatting.",
};
