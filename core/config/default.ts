import { ConfigYaml } from "@smartai/config-yaml";

import { SMARTAI_OLLAMA_DEFAULTS } from "./ollama.js";

const OLLAMA_CHAT_SYSTEM_MESSAGE = `\
You are Smart AI, a practical coding assistant. \
You write clean, modern code following the project's existing conventions. \
You prefer minimal, targeted changes. \
You explain your reasoning briefly when asked, but default to concise answers. \
When editing code, preserve existing style and formatting.

IMPORTANT: When tools are available, use them DIRECTLY to perform actions. \
Do not ask the user for confirmation before using tools. \
Call the appropriate tool immediately and proceed with the task.`;

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
      chatOptions: {
        baseSystemMessage: OLLAMA_CHAT_SYSTEM_MESSAGE,
      },
    },
    {
      name: "Qwen2.5-Coder 7B",
      provider: SMARTAI_OLLAMA_DEFAULTS.provider,
      model: SMARTAI_OLLAMA_DEFAULTS.chatModels[1],
      roles: ["chat", "edit", "apply"],
      capabilities: ["tool_use"],
      defaultCompletionOptions: SMARTAI_OLLAMA_DEFAULTS.completionOptions,
      chatOptions: {
        baseSystemMessage: OLLAMA_CHAT_SYSTEM_MESSAGE,
      },
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
