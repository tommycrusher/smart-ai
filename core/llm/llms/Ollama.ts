import { Mutex } from "async-mutex";
import { JSONSchema7, JSONSchema7Object } from "json-schema";
import { v4 as uuidv4 } from "uuid";

import { streamResponse } from "@smartai/fetch";
import { getOllamaConfig } from "../../config/ollama.js";
import type {
  LLMFullCompletionOptions,
  MessageOption,
  PromptLog,
} from "../../index.d.ts";
import {
  ChatMessage,
  ChatMessageRole,
  CompletionOptions,
  LLMOptions,
  ModelInstaller,
  ThinkingChatMessage,
} from "../../index.js";
import { renderChatMessage } from "../../util/messageContent.js";
import { getRemoteModelInfo } from "../../util/ollamaHelper.js";
import { extractBase64FromDataUrl } from "../../util/url.js";
import { BaseLLM } from "../index.js";

type OllamaChatMessage = {
  role: ChatMessageRole;
  content: string;
  images?: string[] | null;
  thinking?: string;
  tool_calls?: {
    function: {
      name: string;
      arguments: JSONSchema7Object;
    };
  }[];
};

// See https://github.com/ollama/ollama/blob/main/docs/modelfile.md for details on each parameter
interface OllamaModelFileParams {
  mirostat?: number;
  mirostat_eta?: number;
  mirostat_tau?: number;
  num_ctx?: number;
  repeat_last_n?: number;
  repeat_penalty?: number;
  temperature?: number;
  seed?: number;
  stop?: string | string[];
  tfs_z?: number;
  num_predict?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
  num_gpu?: number;

  // Deprecated or not directly supported here:
  num_thread?: number;
  use_mmap?: boolean;
  num_gqa?: number;
  num_keep?: number;
  typical_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  penalize_newline?: boolean;
  numa?: boolean;
  num_batch?: number;
  main_gpu?: number;
  low_vram?: boolean;
  vocab_only?: boolean;
  use_mlock?: boolean;
}

// See https://github.com/ollama/ollama/blob/main/docs/api.md
interface OllamaBaseOptions {
  model: string; // the model name
  options?: OllamaModelFileParams; // additional model parameters listed in the documentation for the Modelfile such as temperature
  format?: "json"; // the format to return a response in. Currently, the only accepted value is json
  stream?: boolean; // if false the response will be returned as a single response object, rather than a stream of objects
  keep_alive?: number; // controls how long the model will stay loaded into memory following the request (default: 5m)
}

interface OllamaRawOptions extends OllamaBaseOptions {
  prompt: string; // the prompt to generate a response for
  suffix?: string; // the text after the model response
  images?: string[]; // a list of base64-encoded images (for multimodal models such as llava)
  system?: string; // system message to (overrides what is defined in the Modelfile)
  template?: string; // the prompt template to use (overrides what is defined in the Modelfile)
  context?: string; // the context parameter returned from a previous request to /generate, this can be used to keep a short conversational memory
  raw?: boolean; // if true no formatting will be applied to the prompt. You may choose to use the raw parameter if you are specifying a full templated prompt in your request to the API
}

interface OllamaChatOptions extends OllamaBaseOptions {
  messages: OllamaChatMessage[]; // the messages of the chat, this can be used to keep a chat memory
  tools?: OllamaTool[]; // the tools of the chat, this can be used to keep a tool memory
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } }; // controls whether the model should use a tool
  think?: boolean; // if true the model will be prompted to think about the response before generating it
}

type OllamaBaseResponse = {
  model: string;
  created_at: string;
} & (
  | {
      done: false;
    }
  | {
      done: true;
      done_reason: string;
      total_duration: number; // Time spent generating the response in nanoseconds
      load_duration: number; // Time spent loading the model in nanoseconds
      prompt_eval_count: number; // Number of tokens in the prompt
      prompt_eval_duration: number; // Time spent evaluating the prompt in nanoseconds
      eval_count: number; // Number of tokens in the response
      eval_duration: number; // Time spent generating the response in nanoseconds
      context: number[]; // An encoding of the conversation used in this response; can be sent in the next request to keep conversational memory
    }
);

type OllamaErrorResponse = {
  error: string;
};

type N8nChatReponse = {
  type: string;
  content?: string;
  metadata: {
    nodeId: string;
    nodeName: string;
    itemIndex: number;
    runIndex: number;
    timestamps: number;
  };
};

type OllamaRawResponse =
  | OllamaErrorResponse
  | (OllamaBaseResponse & {
      response: string; // the generated response
    });

type OllamaChatResponse =
  | OllamaErrorResponse
  | (OllamaBaseResponse & {
      message: OllamaChatMessage;
    })
  | N8nChatReponse;

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: JSONSchema7;
  };
}

interface ParsedOllamaToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Some Ollama models (notably the qwen2.5-coder family and deepseek-coder)
 * emit tool calls as raw JSON in the message content instead of using the
 * native tool_calls field. The JSON may be bare, wrapped in
 * <tool_call></tool_call> tags, or fenced in a ```json code block.
 *
 * This parses such content into structured tool calls so that all Ollama
 * models behave consistently for agentic/tool use. Returns the parsed tool
 * calls plus any remaining (non-tool) text content.
 */
export function parseToolCallsFromOllamaContent(content: string): {
  toolCalls: ParsedOllamaToolCall[];
  remainingContent: string;
} {
  const toolCalls: ParsedOllamaToolCall[] = [];
  if (!content || !content.trim()) {
    return { toolCalls, remainingContent: content };
  }

  const isValidToolCall = (obj: any): obj is ParsedOllamaToolCall =>
    !!obj &&
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    "arguments" in obj &&
    typeof obj.arguments === "object" &&
    obj.arguments !== null &&
    !Array.isArray(obj.arguments);

  let remainingContent = content;

  // 1. Extract any <tool_call>...</tool_call> blocks
  const tagRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  let tagMatch: RegExpExecArray | null;
  let foundTagged = false;
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    foundTagged = true;
    try {
      const parsed = JSON.parse(tagMatch[1].trim());
      if (isValidToolCall(parsed)) {
        toolCalls.push(parsed);
      }
    } catch {
      // ignore unparseable block
    }
  }
  if (foundTagged) {
    remainingContent = content.replace(tagRegex, "").trim();
    return { toolCalls, remainingContent };
  }

  // 2. Try fenced ```tool ... ``` codeblocks (system message tool framework)
  const toolFenceRegex = /```tool\s*([\s\S]*?)```/g;
  let toolFenceMatch: RegExpExecArray | null;
  let foundToolFenced = false;
  while ((toolFenceMatch = toolFenceRegex.exec(content)) !== null) {
    try {
      const block = toolFenceMatch[1].trim();
      // Try parsing the block content directly as JSON first
      const parsed = JSON.parse(block);
      if (isValidToolCall(parsed)) {
        foundToolFenced = true;
        toolCalls.push(parsed);
        continue;
      }
    } catch {
      // not direct JSON, ignore for now
    }
  }
  if (foundToolFenced) {
    remainingContent = content.replace(toolFenceRegex, "").trim();
    return { toolCalls, remainingContent };
  }

  // 3. Try fenced ```json ... ``` blocks
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let fenceMatch: RegExpExecArray | null;
  let foundFenced = false;
  while ((fenceMatch = fenceRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (isValidToolCall(parsed)) {
        foundFenced = true;
        toolCalls.push(parsed);
      }
    } catch {
      // ignore
    }
  }
  if (foundFenced) {
    remainingContent = content.replace(fenceRegex, "").trim();
    return { toolCalls, remainingContent };
  }

  // 4. Try parsing the entire trimmed content as a single bare JSON object
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (isValidToolCall(parsed)) {
        toolCalls.push(parsed);
        return { toolCalls, remainingContent: "" };
      }
    } catch {
      // not a single JSON object
    }
  }

  // 5. Scan for JSON objects embedded anywhere in the text.
  //    This catches models that output prose followed by a tool call JSON.
  //    We scan for balanced { ... } blocks that parse as valid tool calls.
  const extractedToolCalls = extractJsonToolCallsFromText(content);
  if (extractedToolCalls.length > 0) {
    for (const tc of extractedToolCalls) {
      if (isValidToolCall(tc)) {
        toolCalls.push(tc);
      }
    }
    if (toolCalls.length > 0) {
      // Rebuild remaining content by removing the matched JSON blocks
      remainingContent = removeMatchedJsonBlocks(content, extractedToolCalls);
      return { toolCalls, remainingContent };
    }
  }

  return { toolCalls, remainingContent: content };
}

/**
 * Scans text for JSON objects that look like tool calls.
 * Uses a brace-depth tracker to find balanced JSON objects.
 */
function extractJsonToolCallsFromText(text: string): any[] {
  const results: any[] = [];
  let i = 0;
  while (i < text.length) {
    const braceIdx = text.indexOf("{", i);
    if (braceIdx === -1) break;

    // Try to find a balanced JSON object starting at this brace
    let depth = 1;
    let j = braceIdx + 1;
    let inString = false;
    let escapeNext = false;

    while (j < text.length && depth > 0) {
      const ch = text[j];
      if (escapeNext) {
        escapeNext = false;
      } else if (ch === "\\") {
        escapeNext = true;
      } else if (ch === '"') {
        inString = !inString;
      } else if (!inString) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      j++;
    }

    if (depth === 0) {
      const candidate = text.slice(braceIdx, j);
      try {
        const parsed = JSON.parse(candidate);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.name === "string" &&
          parsed.name.length > 0 &&
          "arguments" in parsed
        ) {
          results.push(parsed);
          i = j;
          continue;
        }
      } catch {
        // not valid JSON, continue scanning
      }
    }

    i = braceIdx + 1;
  }

  return results;
}

/**
 * Removes matched JSON object strings from text to produce clean remaining content.
 */
function removeMatchedJsonBlocks(text: string, jsonObjects: any[]): string {
  let result = text;
  for (const obj of jsonObjects) {
    const jsonStr = JSON.stringify(obj);
    // Try to find an exact match, or a pretty-printed variant
    result = result.replace(jsonStr, "");
    // Also try to replace with normalized whitespace
    const normalized = JSON.stringify(JSON.parse(jsonStr));
    result = result.replace(normalized, "");
  }
  // Clean up extra whitespace/newlines left behind
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

class Ollama extends BaseLLM implements ModelInstaller {
  static providerName = "ollama";
  static defaultOptions: Partial<LLMOptions> = {
    apiBase: "http://localhost:11434/",
    model: "codellama-7b",
    maxEmbeddingBatchSize: 64,
  };

  private static modelsBeingInstalled: Set<string> = new Set();
  private static modelsBeingInstalledMutex = new Mutex();

  private fimSupported: boolean = false;

  private modelInfoPromise: Promise<void> | undefined = undefined;
  private explicitContextLength: boolean;

  constructor(options: LLMOptions) {
    // Use Ollama config for apiBase if not explicitly provided
    if (!options.apiBase) {
      const ollamaConfig = getOllamaConfig();
      options.apiBase = ollamaConfig.apiBase;
    }

    super(options);
    this.explicitContextLength = options.contextLength !== undefined;
  }

  async *streamChat(
    _messages: ChatMessage[],
    signal: AbortSignal,
    options: LLMFullCompletionOptions = {},
    messageOptions?: MessageOption,
  ): AsyncGenerator<ChatMessage, PromptLog> {
    // Ollama supports tools only through the native /api/chat endpoint.
    // BaseLLM.streamChat falls back to _streamComplete when templateMessages
    // is set, which uses /api/generate and strips tools. Force the chat path.
    const savedTemplateMessages = this.templateMessages;
    this.templateMessages = undefined;
    try {
      return yield* super.streamChat(
        _messages,
        signal,
        options,
        messageOptions,
      );
    } finally {
      this.templateMessages = savedTemplateMessages;
    }
  }

  private ensureModelInfo(): Promise<void> {
    if (this.modelInfoPromise) {
      return this.modelInfoPromise;
    }

    if (this.model === "AUTODETECT") {
      return Promise.resolve();
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    this.modelInfoPromise = this.fetch(this.getEndpoint("api/show"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ name: this._getModel() }),
    })
      .then(async (response) => {
        if (response?.status !== 200) {
          // console.warn(
          //   "Error calling Ollama /api/show endpoint: ",
          //   await response.text(),
          // );
          return;
        }
        const body = await response.json();
        if (body.parameters) {
          const params = [];
          for (const line of body.parameters.split("\n")) {
            let parts = line.match(/^(\S+)\s+((?:".*")|\S+)$/);
            if (!parts || parts.length < 2) {
              continue;
            }
            let key = parts[1];
            let value = parts[2];
            switch (key) {
              case "num_ctx":
                if (!this.explicitContextLength) {
                  this._contextLength = Number.parseInt(value);
                }
                break;
              case "stop":
                if (!this.completionOptions.stop) {
                  this.completionOptions.stop = [];
                }
                try {
                  const stopValue = JSON.parse(value);
                  // Skip very short/common stop tokens that cause premature truncation
                  // (e.g. "Oh" is a common English word and stops generation mid-sentence)
                  if (typeof stopValue === "string" && stopValue.length >= 3) {
                    this.completionOptions.stop.push(stopValue);
                  }
                } catch (e) {
                  console.warn(
                    `Error parsing stop parameter value "{value}: ${e}`,
                  );
                }
                break;
              default:
                break;
            }
          }
        }

        /**
         * There is no API to get the model's FIM capabilities, so we have to
         * make an educated guess. If a ".Suffix" variable appears in the template
         * it's a good indication the model supports FIM.
         */
        this.fimSupported = !!body?.template?.includes(".Suffix");
      })
      .catch((e) => {
        // console.warn("Error calling the Ollama /api/show endpoint: ", e);
      });

    return this.modelInfoPromise;
  }

  /**
   * Models known to support native tool calling via Ollama's /api/chat.
   * These models can stream tool call responses. Models not in this list
   * will fall back to content-based tool call parsing.
   */
  private static readonly NATIVE_TOOL_MODELS = new Set([
    "qwen3",
    "qwen2.5",
    // Note: qwen2.5-coder is excluded because it often emits tool calls as raw
    // JSON in content instead of using Ollama's native tool_calls field.
    // Falling back to non-streaming mode ensures reliable content-based parsing.
    // "qwen2.5-coder",
    "qwen2",
    "llama3.1",
    "llama3.2",
    "llama3.3",
    "mistral",
    "mixtral",
    "ministral",
    "deepseek-coder-v2",
    "deepseek-v2",
    "deepseek-v3",
    "command-r",
    "command-r-plus",
    "firefunction",
    "gemma3",
    "phi4",
    "qwen3.6",
    // smarterp-coder excluded for same reason as qwen2.5-coder
    // "smarterp-coder",
  ]);

  /**
   * Check if the current model supports native tool calling.
   * This determines whether we can stream with tools or need to fall back
   * to non-streaming mode.
   */
  private _supportsNativeTools(): boolean {
    const model = this._getModel().toLowerCase();
    for (const prefix of Ollama.NATIVE_TOOL_MODELS) {
      if (model.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  // Map of "Smart AI model name" to Ollama actual model name
  private modelMap: Record<string, string> = {
    "mistral-7b": "mistral:7b",
    "mixtral-8x7b": "mixtral:8x7b",
    "llama2-7b": "llama2:7b",
    "llama2-13b": "llama2:13b",
    "codellama-7b": "codellama:7b",
    "codellama-13b": "codellama:13b",
    "codellama-34b": "codellama:34b",
    "codellama-70b": "codellama:70b",
    "llama3-8b": "llama3:8b",
    "llama3-70b": "llama3:70b",
    "llama3.1-8b": "llama3.1:8b",
    "llama3.1-70b": "llama3.1:70b",
    "llama3.1-405b": "llama3.1:405b",
    "llama3.2-1b": "llama3.2:1b",
    "llama3.2-3b": "llama3.2:3b",
    "llama3.2-11b": "llama3.2:11b",
    "llama3.2-90b": "llama3.2:90b",
    "phi-2": "phi:2.7b",
    "phind-codellama-34b": "phind-codellama:34b-v2",
    "qwen2.5-coder-0.5b": "qwen2.5-coder:0.5b",
    "qwen2.5-coder-1.5b": "qwen2.5-coder:1.5b",
    "qwen2.5-coder-3b": "qwen2.5-coder:3b",
    "qwen2.5-coder-7b": "qwen2.5-coder:7b",
    "qwen2.5-coder-14b": "qwen2.5-coder:14b",
    "qwen2.5-coder-32b": "qwen2.5-coder:32b",
    "wizardcoder-7b": "wizardcoder:7b-python",
    "wizardcoder-13b": "wizardcoder:13b-python",
    "wizardcoder-34b": "wizardcoder:34b-python",
    "zephyr-7b": "zephyr:7b",
    "codeup-13b": "codeup:13b",
    "deepseek-1b": "deepseek-coder:1.3b",
    "deepseek-7b": "deepseek-coder:6.7b",
    "deepseek-33b": "deepseek-coder:33b",
    "neural-chat-7b": "neural-chat:7b-v3.3",
    "starcoder-1b": "starcoder:1b",
    "starcoder-3b": "starcoder:3b",
    "starcoder2-3b": "starcoder2:3b",
    "stable-code-3b": "stable-code:3b",
    "granite-code-3b": "granite-code:3b",
    "granite-code-8b": "granite-code:8b",
    "granite-code-20b": "granite-code:20b",
    "granite-code-34b": "granite-code:34b",
  };

  private _getModel() {
    return this.modelMap[this.model] ?? this.model;
  }

  get contextLength() {
    const DEFAULT_OLLAMA_CONTEXT_LENGTH = 8192; // twice of https://github.com/ollama/ollama/blob/29ddfc2cab7f5a83a96c3133094f67b22e4f27d1/envconfig/config.go#L185
    return this._contextLength ?? DEFAULT_OLLAMA_CONTEXT_LENGTH;
  }

  private _getModelFileParams(
    options: CompletionOptions,
  ): OllamaModelFileParams {
    return {
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      num_predict: options.maxTokens,
      stop: options.stop,
      num_ctx: this.contextLength,
      mirostat: options.mirostat,
      num_thread: options.numThreads,
      use_mmap: options.useMmap,
      min_p: options.minP,
      num_gpu: options.numGpu,
    };
  }

  private _convertToOllamaMessage(message: ChatMessage): OllamaChatMessage {
    const ollamaMessage: OllamaChatMessage = {
      role: message.role,
      content: "",
    };

    ollamaMessage.content = renderChatMessage(message);

    // Convert assistant tool calls to Ollama format, stripping unsupported
    // fields like `index` (which causes errors on Gemma3 models).
    if (
      message.role === "assistant" &&
      "toolCalls" in message &&
      message.toolCalls?.length
    ) {
      ollamaMessage.tool_calls = message.toolCalls
        .filter((tc) => tc.function?.name)
        .map((tc) => {
          let args: JSONSchema7Object;
          if (typeof tc.function!.arguments === "string") {
            try {
              args = JSON.parse(tc.function!.arguments!);
            } catch (e) {
              console.warn(
                `Failed to parse tool call arguments for "${tc.function!.name}": ${e}`,
              );
              args = {};
            }
          } else {
            args = tc.function!.arguments
              ? (tc.function!.arguments as unknown as JSONSchema7Object)
              : {};
          }
          return {
            function: {
              name: tc.function!.name!,
              arguments: args,
            },
          };
        });
    }

    if (Array.isArray(message.content)) {
      const images: string[] = [];
      message.content.forEach((part) => {
        if (part.type === "imageUrl" && part.imageUrl) {
          const image = part.imageUrl?.url
            ? extractBase64FromDataUrl(part.imageUrl.url)
            : undefined;
          if (image) {
            images.push(image);
          } else if (part.imageUrl?.url) {
            console.warn(
              "Ollama: skipping image with invalid data URL format",
              part.imageUrl.url,
            );
          }
        }
      });
      if (images.length > 0) {
        ollamaMessage.images = images;
      }
    }

    return ollamaMessage;
  }

  private _getGenerateOptions(
    options: CompletionOptions,
    prompt: string,
    suffix?: string,
  ): OllamaRawOptions {
    return {
      model: this._getModel(),
      prompt,
      suffix,
      raw: options.raw,
      options: this._getModelFileParams(options),
      keep_alive: options.keepAlive ?? 60 * 30, // 30 minutes
      stream: options.stream,
      // Not supported yet: context, images, system, template, format
    };
  }

  private getEndpoint(endpoint: string): URL {
    let base = this.apiBase;
    if (process.env.IS_BINARY) {
      base = base?.replace("localhost", "127.0.0.1");
    }

    return new URL(endpoint, base);
  }

  protected async *_streamComplete(
    prompt: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    await this.ensureModelInfo();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const response = await this.fetch(this.getEndpoint("api/generate"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(this._getGenerateOptions(options, prompt)),
      signal,
    });

    let buffer = "";
    for await (const value of streamResponse(response)) {
      // Append the received chunk to the buffer
      buffer += value;
      // Split the buffer into individual JSON chunks
      const chunks = buffer.split("\n");
      buffer = chunks.pop() ?? "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim() !== "") {
          try {
            const j = JSON.parse(chunk) as OllamaRawResponse;
            if ("error" in j) {
              throw new Error(j.error);
            }
            j.response ??= "";
            yield j.response;
          } catch (e) {
            throw new Error(`Error parsing Ollama response: ${e} ${chunk}`);
          }
        }
      }
    }
  }

  /**
   * Reorder messages so that system messages never appear directly after tool
   * messages. Some Ollama models (Mistral, Ministral) reject the sequence
   * `tool → system` with "Unexpected role 'system' after role 'tool'".
   * This moves such system messages to just before the preceding
   * assistant+tool block.
   */
  private _reorderMessagesForToolCompat(
    messages: OllamaChatMessage[],
  ): OllamaChatMessage[] {
    const result: OllamaChatMessage[] = [...messages];

    for (let i = 1; i < result.length; i++) {
      if (result[i].role === "system" && result[i - 1].role === "tool") {
        // Find the start of the tool block (assistant tool_call + tool results)
        let insertIdx = i - 1;
        while (insertIdx > 0 && result[insertIdx - 1].role === "tool") {
          insertIdx--;
        }
        // Also skip past the assistant message that triggered the tool calls
        if (insertIdx > 0 && result[insertIdx - 1].role === "assistant") {
          insertIdx--;
        }

        const [sysMsg] = result.splice(i, 1);
        result.splice(insertIdx, 0, sysMsg);
        // Don't increment i — re-check current position after splice
      }
    }

    return result;
  }

  protected async *_streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    await this.ensureModelInfo();
    const ollamaMessages = this._reorderMessagesForToolCompat(
      messages.map(this._convertToOllamaMessage),
    );
    const chatOptions: OllamaChatOptions = {
      model: this._getModel(),
      messages: ollamaMessages,
      options: this._getModelFileParams(options),
      think: options.reasoning,
      keep_alive: options.keepAlive ?? 60 * 30, // 30 minutes
      // Enable streaming even with tools for models that support native tool
      // calling. For models without native support, fall back to non-streaming
      // so we can parse tool calls from the complete response content.
      stream: options.tools?.length
        ? this._supportsNativeTools()
          ? options.stream
          : false
        : options.stream,
      // format: options.format, // Not currently in base completion options
    };
    // Always send tools if they are defined. Ollama requires them on every
    // request in a multi-turn tool conversation — not just when the last
    // message is from the user (tool results have role "tool").
    if (options.tools?.length) {
      chatOptions.tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));
      chatOptions.tool_choice = "auto";
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const response = await this.fetch(this.getEndpoint("api/chat"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(chatOptions),
      signal,
    });
    let isThinking: boolean = false;

    function convertChatMessage(res: OllamaChatResponse): ChatMessage[] {
      if ("error" in res) {
        throw new Error(res.error);
      }

      if ("type" in res) {
        const { content } = res;

        if (content === "<think>") {
          isThinking = true;
        }

        if (isThinking && content) {
          // TODO better support for streaming thinking chunks, or remove this and depend on redux <think/> parsing logic
          const thinkingMessage: ThinkingChatMessage = {
            role: "thinking",
            content: content,
          };

          if (thinkingMessage) {
            // could cause issues with termination if chunk doesn't match this exactly
            if (content === "</think>") {
              isThinking = false;
            }
            // When Streaming you can't have both thinking and content
            return [thinkingMessage];
          }
        }

        if (content) {
          const chatMessage: ChatMessage = {
            role: "assistant",
            content: content,
          };
          return [chatMessage];
        }
        return [];
      }

      // Guard against responses with no message (e.g. final done chunk)
      if (!res.message) {
        return [];
      }

      const { role, content, thinking, tool_calls: toolCalls } = res.message;

      if (role === "tool") {
        throw new Error(
          "Unexpected message received from Ollama with role = tool",
        );
      }

      if (role === "assistant") {
        const thinkingMessage: ThinkingChatMessage | null = thinking
          ? { role: "thinking", content: thinking }
          : null;

        if (thinkingMessage && !content && !toolCalls?.length) {
          // When Streaming you can't have both thinking and content
          return [thinkingMessage];
        }
        // Either not thinking, or not streaming
        const chatMessage: ChatMessage = { role: "assistant", content };

        if (toolCalls?.length) {
          // Smart AI handles the response as a tool call delta but
          // But ollama returns the full object in one response with no streaming
          chatMessage.toolCalls = toolCalls.map((tc) => ({
            type: "function",
            id: `tc_${uuidv4()}`, // Generate a proper UUID with a prefix
            function: {
              name: tc.function.name,
              arguments: JSON.stringify(tc.function.arguments),
            },
          }));
        } else if (content) {
          // Fallback: some models (qwen2.5-coder, deepseek-coder) emit tool
          // calls as raw JSON in content instead of the native tool_calls
          // field. Parse them so all Ollama models support tool use.
          // We check content regardless of whether tools were sent to the API,
          // because the GUI may use SystemMessageToolCodeblocksFramework
          // (tools only in system message, not in API options).
          const { toolCalls: parsedToolCalls, remainingContent } =
            parseToolCallsFromOllamaContent(content);
          if (parsedToolCalls.length) {
            chatMessage.content = remainingContent;
            chatMessage.toolCalls = parsedToolCalls.map((tc) => ({
              type: "function",
              id: `tc_${uuidv4()}`,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            }));
          }
        }

        // Return both thinking and chat messages if applicable
        return thinkingMessage ? [thinkingMessage, chatMessage] : [chatMessage];
      }

      // Fallback for all other roles
      return [{ role, content }];
    }

    if (chatOptions.stream === false) {
      if (response.status === 499) {
        return; // Aborted by user
      }
      const json = (await response.json()) as OllamaChatResponse;
      for (const msg of convertChatMessage(json)) {
        yield msg;
      }
    } else {
      // When streaming with tools, Ollama sends tool call data across
      // multiple chunks. We accumulate the full content and tool_calls
      // from the streaming chunks, then emit a single final message
      // with the complete tool calls once the stream ends.
      let buffer = "";
      let accumulatedContent = "";
      let accumulatedThinking = "";
      let accumulatedToolCalls: OllamaChatMessage["tool_calls"] = [];
      let hasToolCallsInStream = false;

      for await (const value of streamResponse(response)) {
        // Append the received chunk to the buffer
        buffer += value;
        // Split the buffer into individual JSON chunks
        const chunks = buffer.split("\n");
        buffer = chunks.pop() ?? "";

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (chunk.trim() !== "") {
            try {
              const j = JSON.parse(chunk) as OllamaChatResponse;

              // Check if this chunk contains tool calls (native Ollama streaming)
              if (
                !("error" in j) &&
                !("type" in j) &&
                "message" in j &&
                j.message?.tool_calls?.length
              ) {
                hasToolCallsInStream = true;
                // Deduplicate tool calls in case Ollama repeats them across chunks
                const seen = new Set<string>();
                for (const tc of accumulatedToolCalls) {
                  seen.add(JSON.stringify(tc));
                }
                for (const tc of j.message.tool_calls) {
                  const key = JSON.stringify(tc);
                  if (!seen.has(key)) {
                    seen.add(key);
                    accumulatedToolCalls.push(tc);
                  }
                }
                if (j.message.content) {
                  accumulatedContent += j.message.content;
                }
                if (j.message.thinking) {
                  accumulatedThinking += j.message.thinking;
                }
                // Don't yield yet — accumulate until stream is done
                continue;
              }

              // If we've seen tool calls in previous chunks, keep accumulating
              if (
                hasToolCallsInStream &&
                !("error" in j) &&
                !("type" in j) &&
                "message" in j
              ) {
                if (j.message?.content) {
                  accumulatedContent += j.message.content;
                }
                if (j.message?.thinking) {
                  accumulatedThinking += j.message.thinking;
                }
                if (j.message?.tool_calls?.length) {
                  const seen = new Set(
                    accumulatedToolCalls.map((tc) => JSON.stringify(tc)),
                  );
                  for (const tc of j.message.tool_calls) {
                    const key = JSON.stringify(tc);
                    if (!seen.has(key)) {
                      seen.add(key);
                      accumulatedToolCalls.push(tc);
                    }
                  }
                }
                continue;
              }

              // Normal streaming (no tool calls) — yield immediately
              for (const msg of convertChatMessage(j)) {
                yield msg;
              }
            } catch (e) {
              throw new Error(`Error parsing Ollama response: ${e} ${chunk}`);
            }
          }
        }
      }

      // If we accumulated tool calls during streaming, emit them now
      if (hasToolCallsInStream && accumulatedToolCalls.length > 0) {
        if (accumulatedThinking) {
          const thinkingMessage: ThinkingChatMessage = {
            role: "thinking",
            content: accumulatedThinking,
          };
          yield thinkingMessage;
        }

        const chatMessage: ChatMessage = {
          role: "assistant",
          content: accumulatedContent,
          toolCalls: accumulatedToolCalls.map((tc) => ({
            type: "function" as const,
            id: `tc_${uuidv4()}`,
            function: {
              name: tc.function.name,
              arguments: JSON.stringify(tc.function.arguments),
            },
          })),
        };
        yield chatMessage;
      } else if (hasToolCallsInStream && accumulatedContent) {
        // Stream had tool_calls markers but none parsed — try content-based fallback
        const { toolCalls: parsedToolCalls, remainingContent } =
          parseToolCallsFromOllamaContent(accumulatedContent);
        if (parsedToolCalls.length) {
          const chatMessage: ChatMessage = {
            role: "assistant",
            content: remainingContent,
            toolCalls: parsedToolCalls.map((tc) => ({
              type: "function" as const,
              id: `tc_${uuidv4()}`,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          };
          yield chatMessage;
        } else {
          yield { role: "assistant", content: accumulatedContent };
        }
      }
    }
  }

  supportsFim(): boolean {
    return this.fimSupported;
  }

  protected async *_streamFim(
    prefix: string,
    suffix: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    await this.ensureModelInfo();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const response = await this.fetch(this.getEndpoint("api/generate"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(this._getGenerateOptions(options, prefix, suffix)),
      signal,
    });

    let buffer = "";
    for await (const value of streamResponse(response)) {
      // Append the received chunk to the buffer
      buffer += value;
      // Split the buffer into individual JSON chunks
      const chunks = buffer.split("\n");
      buffer = chunks.pop() ?? "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim() !== "") {
          try {
            const j = JSON.parse(chunk);
            if ("response" in j) {
              yield j.response;
            } else if ("error" in j) {
              throw new Error(j.error);
            }
          } catch (e) {
            throw new Error(`Error parsing Ollama response: ${e} ${chunk}`);
          }
        }
      }
    }
  }

  async listModels(): Promise<string[]> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const response = await this.fetch(
      // localhost was causing fetch failed in pkg binary only for this Ollama endpoint
      this.getEndpoint("api/tags"),
      {
        method: "GET",
        headers: headers,
      },
    );
    const data = await response.json();
    if (response.ok) {
      return data.models.map((model: any) => model.name);
    } else {
      throw new Error(
        "Failed to list Ollama models. Make sure Ollama is running.",
      );
    }
  }

  protected async _embed(chunks: string[]): Promise<number[][]> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const resp = await this.fetch(new URL("api/embed", this.apiBase), {
      method: "POST",
      body: JSON.stringify({
        model: this.model,
        input: chunks,
      }),
      headers: headers,
    });

    if (!resp.ok) {
      throw new Error(`Failed to embed chunk: ${await resp.text()}`);
    }

    const data = await resp.json();
    const embedding: number[][] = data.embeddings;

    if (!embedding || embedding.length === 0) {
      throw new Error("Ollama generated empty embedding");
    }
    return embedding;
  }

  public async installModel(
    modelName: string,
    signal: AbortSignal,
    progressReporter?: (task: string, increment: number, total: number) => void,
  ): Promise<any> {
    const modelInfo = await getRemoteModelInfo(modelName, signal);
    if (!modelInfo) {
      throw new Error(`'${modelName}' not found in the Ollama registry!`);
    }

    const release = await Ollama.modelsBeingInstalledMutex.acquire();
    try {
      if (Ollama.modelsBeingInstalled.has(modelName)) {
        throw new Error(`Model '${modelName}' is already being installed.`);
      }
      Ollama.modelsBeingInstalled.add(modelName);
    } finally {
      release();
    }

    try {
      const response = await fetch(this.getEndpoint("api/pull"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ name: modelName }),
        signal,
      });

      const reader = response.body?.getReader();
      //TODO: generate proper progress based on modelInfo size
      while (true) {
        const { done, value } = (await reader?.read()) || {
          done: true,
          value: undefined,
        };
        if (done) {
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            progressReporter?.(data.status, data.completed, data.total);
          } catch (e) {
            console.warn(`Error parsing Ollama pull response: ${e}`);
          }
        }
      }
    } finally {
      const release = await Ollama.modelsBeingInstalledMutex.acquire();
      try {
        Ollama.modelsBeingInstalled.delete(modelName);
      } finally {
        release();
      }
    }
  }

  public async isInstallingModel(modelName: string): Promise<boolean> {
    const release = await Ollama.modelsBeingInstalledMutex.acquire();
    try {
      return Ollama.modelsBeingInstalled.has(modelName);
    } finally {
      release();
    }
  }
}

export default Ollama;
