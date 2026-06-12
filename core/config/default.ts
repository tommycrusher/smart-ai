import { ConfigYaml } from "@smartai/config-yaml";

import { SMARTAI_OLLAMA_DEFAULTS } from "./ollama.js";

/**
 * Smart AI - Default Configuration
 *
 * This is the DEFAULT non-pay local setup (Local Balanced profile).
 * - chat/edit/apply: qwen2.5-coder:7b via Ollama
 * - autocomplete:    qwen2.5-coder:1.5b via Ollama
 * - embeddings:      nomic-embed-text via Ollama
 *
 * Optional advanced profiles (open cloud / open-weight) are available in
 * modelProfiles.ts but are NOT loaded by default. Users must opt-in.
 */
export const defaultConfig: ConfigYaml = {
  name: "Smart AI - Ollama",
  version: "1.0.0",
  schema: "v1",
  models: [
    {
      name: SMARTAI_OLLAMA_DEFAULTS.titles.chat,
      provider: SMARTAI_OLLAMA_DEFAULTS.provider,
      model: SMARTAI_OLLAMA_DEFAULTS.chatModels[0],
      roles: ["chat", "edit", "apply"],
      capabilities: ["tool_use"],
      defaultCompletionOptions: SMARTAI_OLLAMA_DEFAULTS.completionOptions,
    },
    {
      name: "Qwen2.5-Coder 7B",
      provider: SMARTAI_OLLAMA_DEFAULTS.provider,
      model: SMARTAI_OLLAMA_DEFAULTS.chatModels[1],
      roles: ["chat", "edit", "apply"],
      capabilities: ["tool_use"],
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
  ],
};
