import { Smart AI, ContinueClient } from "@smartai/sdk";
import chalk from "chalk";

import { env } from "./env.js";

/**
 * Initialize the Smart AI SDK with the given parameters
 * @param apiKey - API key to use for authentication
 * @param assistantSlug - Slug of the assistant to use
 * @param organizationId - Optional organization ID
 * @returns Promise resolving to the Smart AI SDK instance
 */
export async function initializeContinueSDK(
  apiKey: string | undefined,
  assistantSlug: string,
  organizationId?: string,
): Promise<ContinueClient> {
  if (!apiKey) {
    console.error(chalk.red("Error: No API key provided for Smart AI SDK"));
    throw new Error("No API key provided for Smart AI SDK");
  }

  try {
    return await SmartAi.from({
      apiKey,
      assistant: assistantSlug,
      organizationId,
      baseURL: env.apiBase,
    });
  } catch (error) {
    console.error(
      chalk.red("Error initializing Smart AI SDK:"),
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
