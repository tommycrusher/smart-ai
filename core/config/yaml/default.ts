import { AssistantUnrolled } from "@smartai/config-yaml";

import { SMARTAI_OLLAMA_DEFAULTS } from "../ollama.js";

/**
 * Smart AI - Default YAML Configuration
 *
 * DEFAULT non-pay local setup (Local Balanced profile).
 * Optional advanced profiles are available in modelProfiles.ts but NOT loaded here.
 */
const defaultOllamaModels: AssistantUnrolled["models"] = [
  {
    name: SMARTAI_OLLAMA_DEFAULTS.titles.chat,
    provider: SMARTAI_OLLAMA_DEFAULTS.provider,
    model: SMARTAI_OLLAMA_DEFAULTS.chatModels[0],
    roles: ["chat", "edit", "apply"],
    defaultCompletionOptions: SMARTAI_OLLAMA_DEFAULTS.completionOptions,
  },
  {
    name: "Qwen2.5-Coder 7B",
    provider: SMARTAI_OLLAMA_DEFAULTS.provider,
    model: SMARTAI_OLLAMA_DEFAULTS.chatModels[1],
    roles: ["chat", "edit", "apply"],
    defaultCompletionOptions: SMARTAI_OLLAMA_DEFAULTS.completionOptions,
  },
  {
    name: SMARTAI_OLLAMA_DEFAULTS.titles.autocomplete,
    provider: SMARTAI_OLLAMA_DEFAULTS.provider,
    model: SMARTAI_OLLAMA_DEFAULTS.autocompleteModels[0],
    roles: ["autocomplete"],
    defaultCompletionOptions: SMARTAI_OLLAMA_DEFAULTS.autocompleteOptions,
  },
  {
    name: SMARTAI_OLLAMA_DEFAULTS.titles.embeddings,
    provider: SMARTAI_OLLAMA_DEFAULTS.provider,
    model: SMARTAI_OLLAMA_DEFAULTS.embeddingModels[0],
    roles: ["embed"],
  },
];

const defaultContext: AssistantUnrolled["context"] = [
  { provider: "file" },
  { provider: "currentFile" },
  { provider: "open" },
  { provider: "codebase" },
  { provider: "folder" },
  { provider: "diff" },
  { provider: "terminal" },
  { provider: "problems" },
  { provider: "rules" },
];

const defaultRules: AssistantUnrolled["rules"] = [
  {
    name: "Smart AI Copilot Behavior",
    rule:
      "You are Smart AI, a practical coding assistant. " +
      "Write clean, modern code following the project's existing conventions. " +
      "Prefer minimal, targeted changes. " +
      "Explain reasoning briefly when asked, but default to concise answers. " +
      "When editing code, preserve existing style and formatting. " +
      "Always respect .gitignore and security best practices.",
    alwaysApply: true,
  },
];

export const defaultConfigYaml: AssistantUnrolled = {
  models: defaultOllamaModels,
  context: defaultContext,
  rules: defaultRules,
  name: "Smart AI - Ollama",
  version: "1.0.0",
  schema: "v1",
};

export const defaultConfigYamlJetBrains: AssistantUnrolled = {
  models: defaultOllamaModels,
  context: defaultContext,
  rules: defaultRules,
  name: "Smart AI - Ollama",
  version: "1.0.0",
  schema: "v1",
};
