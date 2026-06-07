import { ConfigYaml } from "@smartai/config-yaml";
import {
    SMARTAI_OLLAMA_DEFAULTS
} from "./ollama.js";

export const LOCAL_ONBOARDING_PROVIDER_TITLE = "Ollama";

// Primary Smart AI models with fallbacks
export const LOCAL_ONBOARDING_CHAT_MODEL =
  SMARTAI_OLLAMA_DEFAULTS.chatModels[0]; // smarterp-coder (fallback: qwen2.5-coder:7b)
export const LOCAL_ONBOARDING_CHAT_TITLE = "Smart AI Coder";

export const LOCAL_ONBOARDING_EDIT_MODEL =
  SMARTAI_OLLAMA_DEFAULTS.chatModels[0]; // smarterp-coder
export const LOCAL_ONBOARDING_EDIT_TITLE = "Smart AI Coder (Edit)";

export const LOCAL_ONBOARDING_APPLY_MODEL =
  SMARTAI_OLLAMA_DEFAULTS.chatModels[0]; // smarterp-coder
export const LOCAL_ONBOARDING_APPLY_TITLE = "Smart AI Coder (Apply)";

export const LOCAL_ONBOARDING_FIM_MODEL =
  SMARTAI_OLLAMA_DEFAULTS.autocompleteModels[0]; // qwen2.5-coder:1.5b
export const LOCAL_ONBOARDING_FIM_TITLE = "Qwen2.5-Coder 1.5B";

export const LOCAL_ONBOARDING_EMBEDDINGS_MODEL =
  SMARTAI_OLLAMA_DEFAULTS.embeddingModels[0]; // nomic-embed-text
export const LOCAL_ONBOARDING_EMBEDDINGS_TITLE = "Nomic Embed";

const ANTHROPIC_MODEL_CONFIG = {
  slugs: ["anthropic/claude-sonnet-4-6", "anthropic/claude-opus-4-6"],
  apiKeyInputName: "ANTHROPIC_API_KEY",
};
const OPENAI_MODEL_CONFIG = {
  slugs: ["openai/gpt-4.1", "openai/o3", "openai/gpt-4.1-mini"],
  apiKeyInputName: "OPENAI_API_KEY",
};

// TODO: These need updating on the hub
const GEMINI_MODEL_CONFIG = {
  slugs: ["google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview"],
  apiKeyInputName: "GEMINI_API_KEY",
};

/**
 * We set the "best" chat + autocopmlete models by default
 * whenever a user doesn't have a config.json
 */
export function setupBestConfig(config: ConfigYaml): ConfigYaml {
  return {
    ...config,
    models: config.models,
  };
}

export function setupLocalConfig(config: ConfigYaml): ConfigYaml {
  return {
    ...config,
    models: [
      {
        name: LOCAL_ONBOARDING_CHAT_TITLE,
        provider: "ollama",
        model: LOCAL_ONBOARDING_CHAT_MODEL,
        roles: ["chat", "edit", "apply"],
        defaultCompletionOptions: {
          temperature: 0.3,
          maxTokens: 4096,
          topP: 0.9,
          topK: 20,
        },
        chatOptions: {
          baseSystemMessage:
            "You are Smart AI, a practical coding assistant. Write clean, modern code following the project's existing conventions. Prefer minimal, targeted changes. Explain reasoning briefly when asked, but default to concise answers.",
        },
      },
      {
        name: LOCAL_ONBOARDING_FIM_TITLE,
        provider: "ollama",
        model: LOCAL_ONBOARDING_FIM_MODEL,
        roles: ["autocomplete"],
        defaultCompletionOptions: {
          temperature: 0.2,
          maxTokens: 256,
          topP: 0.9,
        },
      },
      {
        name: LOCAL_ONBOARDING_EMBEDDINGS_TITLE,
        provider: "ollama",
        model: LOCAL_ONBOARDING_EMBEDDINGS_MODEL,
        roles: ["embed"],
      },
      ...(config.models ?? []),
    ],
  };
}

export function setupQuickstartConfig(config: ConfigYaml): ConfigYaml {
  return config;
}

export function setupProviderConfig(
  config: ConfigYaml,
  provider: string,
  apiKey: string,
): ConfigYaml {
  let newModels;

  switch (provider) {
    case "openai":
      newModels = OPENAI_MODEL_CONFIG.slugs.map((slug) => ({
        uses: slug,
        with: {
          [OPENAI_MODEL_CONFIG.apiKeyInputName]: apiKey,
        },
      }));
      break;
    case "anthropic":
      newModels = ANTHROPIC_MODEL_CONFIG.slugs.map((slug) => ({
        uses: slug,
        with: {
          [ANTHROPIC_MODEL_CONFIG.apiKeyInputName]: apiKey,
        },
      }));
      break;
    case "gemini":
      newModels = GEMINI_MODEL_CONFIG.slugs.map((slug) => ({
        uses: slug,
        with: {
          [GEMINI_MODEL_CONFIG.apiKeyInputName]: apiKey,
        },
      }));
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  const existingModels = config.models ?? [];

  // Update API key on existing models; add new entries for any missing slugs
  const updatedModels = existingModels.map((m) => {
    if (!("uses" in m)) return m;
    const match = newModels.find((n) => n.uses === m.uses);
    return match ? { ...m, with: { ...m.with, ...match.with } } : m;
  });
  const modelsToAdd = newModels.filter(
    (n) => !existingModels.some((m) => "uses" in m && m.uses === n.uses),
  );

  return { ...config, models: [...updatedModels, ...modelsToAdd] };
}
