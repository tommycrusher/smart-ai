import { AssistantUnrolled } from "@continuedev/config-yaml";

import { SMARTAI_OLLAMA_DEFAULTS } from "../ollama.js";

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

export const defaultConfigYaml: AssistantUnrolled = {
  models: defaultOllamaModels,
  context: [],
  name: "Smart AI - Ollama",
  version: "1.0.0",
  schema: "v1",
};

export const defaultConfigYamlJetBrains: AssistantUnrolled = {
  models: defaultOllamaModels,
  context: [],
  name: "Smart AI - Ollama",
  version: "1.0.0",
  schema: "v1",
};
