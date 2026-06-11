jest.mock("@smartai/fetch", () => ({
  streamResponse: jest.fn(),
}));

import { ChatMessage } from "../../index.js";
import Ollama, { parseToolCallsFromOllamaContent } from "./Ollama.js";

function createOllama(): Ollama {
  // Create instance without triggering constructor's fetch call
  const instance = Object.create(Ollama.prototype);
  instance.model = "test-model";
  instance.completionOptions = {};
  instance.fetch = jest.fn();
  return instance;
}

describe("Ollama", () => {
  describe("_convertToOllamaMessage", () => {
    let ollama: Ollama;

    beforeEach(() => {
      ollama = createOllama();
    });

    it("should convert a basic user message", () => {
      const msg: ChatMessage = { role: "user", content: "hello" };
      const result = (ollama as any)._convertToOllamaMessage(msg);
      expect(result).toEqual({ role: "user", content: "hello" });
    });

    it("should convert assistant message with toolCalls, stripping index and other unsupported fields", () => {
      const msg: ChatMessage = {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tc_123",
            type: "function",
            index: 0, // This field causes errors on Gemma3
            function: {
              name: "get_weather",
              arguments: '{"city":"London"}',
            },
          } as any,
        ],
      };
      const result = (ollama as any)._convertToOllamaMessage(msg);

      expect(result.tool_calls).toBeDefined();
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0]).toEqual({
        function: {
          name: "get_weather",
          arguments: { city: "London" },
        },
      });
      // Verify no index, id, or type fields leaked through
      expect(result.tool_calls[0]).not.toHaveProperty("index");
      expect(result.tool_calls[0]).not.toHaveProperty("id");
      expect(result.tool_calls[0]).not.toHaveProperty("type");
    });

    it("should handle toolCalls with object arguments (not string)", () => {
      const msg: ChatMessage = {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tc_456",
            type: "function",
            function: {
              name: "search",
              arguments: { query: "test" } as any,
            },
          } as any,
        ],
      };
      const result = (ollama as any)._convertToOllamaMessage(msg);
      expect(result.tool_calls[0].function.arguments).toEqual({
        query: "test",
      });
    });

    it("should not add tool_calls for assistant messages without them", () => {
      const msg: ChatMessage = { role: "assistant", content: "Sure!" };
      const result = (ollama as any)._convertToOllamaMessage(msg);
      expect(result.tool_calls).toBeUndefined();
    });

    it("should convert tool result messages", () => {
      const msg: ChatMessage = {
        role: "tool",
        content: '{"temp": 20}',
        toolCallId: "tc_123",
      };
      const result = (ollama as any)._convertToOllamaMessage(msg);
      expect(result.role).toBe("tool");
      expect(result.content).toBe('{"temp": 20}');
    });

    it("should filter out toolCalls without a function name", () => {
      const msg: ChatMessage = {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tc_1",
            type: "function",
            function: {
              name: "valid_tool",
              arguments: "{}",
            },
          },
          {
            id: "tc_2",
            type: "function",
            function: {
              name: undefined as any,
              arguments: "{}",
            },
          },
        ],
      };
      const result = (ollama as any)._convertToOllamaMessage(msg);
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0].function.name).toBe("valid_tool");
    });
  });

  describe("_reorderMessagesForToolCompat", () => {
    let ollama: Ollama;

    beforeEach(() => {
      ollama = createOllama();
    });

    it("should move system message from after tool to before assistant+tool block", () => {
      const messages = [
        { role: "system" as const, content: "You are helpful" },
        { role: "user" as const, content: "What's the weather?" },
        {
          role: "assistant" as const,
          content: "",
          tool_calls: [{ function: { name: "get_weather", arguments: {} } }],
        },
        { role: "tool" as const, content: '{"temp": 20}' },
        { role: "system" as const, content: "Use metric units" },
        { role: "user" as const, content: "Thanks" },
      ];

      const result = (ollama as any)._reorderMessagesForToolCompat(messages);

      // No system message should follow a tool message
      for (let i = 1; i < result.length; i++) {
        if (result[i].role === "system") {
          expect(result[i - 1].role).not.toBe("tool");
        }
      }

      // The moved system message should appear before the assistant
      const sysIdx = result.findIndex(
        (m: any) => m.role === "system" && m.content === "Use metric units",
      );
      const assistantIdx = result.findIndex((m: any) => m.role === "assistant");
      expect(sysIdx).toBeLessThan(assistantIdx);
    });

    it("should not modify messages when no system follows tool", () => {
      const messages = [
        { role: "system" as const, content: "You are helpful" },
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there" },
      ];

      const result = (ollama as any)._reorderMessagesForToolCompat(messages);
      expect(result).toEqual(messages);
    });

    it("should handle multiple tool results before a system message", () => {
      const messages = [
        { role: "user" as const, content: "Do two things" },
        {
          role: "assistant" as const,
          content: "",
          tool_calls: [
            { function: { name: "tool1", arguments: {} } },
            { function: { name: "tool2", arguments: {} } },
          ],
        },
        { role: "tool" as const, content: "result1" },
        { role: "tool" as const, content: "result2" },
        { role: "system" as const, content: "extra instructions" },
      ];

      const result = (ollama as any)._reorderMessagesForToolCompat(messages);

      // System should come before the assistant message
      const sysIdx = result.findIndex(
        (m: any) => m.content === "extra instructions",
      );
      const assistantIdx = result.findIndex((m: any) => m.role === "assistant");
      expect(sysIdx).toBeLessThan(assistantIdx);

      // No system message should follow a tool message
      for (let i = 1; i < result.length; i++) {
        if (result[i].role === "system") {
          expect(result[i - 1].role).not.toBe("tool");
        }
      }
    });

    it("should handle system message after tool when no preceding assistant", () => {
      // Edge case: tool messages without a preceding assistant
      const messages = [
        { role: "tool" as const, content: "result" },
        { role: "system" as const, content: "instructions" },
      ];

      const result = (ollama as any)._reorderMessagesForToolCompat(messages);

      // System should be moved before tool
      expect(result[0].role).toBe("system");
      expect(result[1].role).toBe("tool");
    });
  });

  describe("parseToolCallsFromOllamaContent", () => {
    it("should parse a bare JSON tool call (qwen2.5-coder behavior)", () => {
      const content =
        '{"name": "read_file", "arguments": {"filepath": "README.md"}}';
      const { toolCalls, remainingContent } =
        parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe("read_file");
      expect(toolCalls[0].arguments).toEqual({ filepath: "README.md" });
      expect(remainingContent).toBe("");
    });

    it("should parse a multi-line/pretty-printed bare JSON tool call", () => {
      const content =
        '{\n  "name": "read_file",\n  "arguments": {\n    "filepath": "README.md"\n  }\n}';
      const { toolCalls } = parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe("read_file");
    });

    it("should parse <tool_call> wrapped JSON", () => {
      const content =
        'Sure!\n<tool_call>\n{"name": "read_file", "arguments": {"filepath": "a.py"}}\n</tool_call>';
      const { toolCalls, remainingContent } =
        parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe("read_file");
      expect(remainingContent).toBe("Sure!");
    });

    it("should parse multiple <tool_call> blocks", () => {
      const content =
        '<tool_call>{"name": "a", "arguments": {}}</tool_call><tool_call>{"name": "b", "arguments": {"x": 1}}</tool_call>';
      const { toolCalls } = parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls.map((t) => t.name)).toEqual(["a", "b"]);
    });

    it("should parse a fenced ```json code block tool call", () => {
      const content =
        '```json\n{"name": "search", "arguments": {"q": "hi"}}\n```';
      const { toolCalls } = parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe("search");
    });

    it("should NOT treat regular prose as a tool call", () => {
      const content = "Here is how you reverse a string in Python.";
      const { toolCalls, remainingContent } =
        parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(0);
      expect(remainingContent).toBe(content);
    });

    it("should NOT treat arbitrary JSON without name/arguments as a tool call", () => {
      const content = '{"foo": "bar", "baz": 1}';
      const { toolCalls } = parseToolCallsFromOllamaContent(content);
      expect(toolCalls).toHaveLength(0);
    });

    it("should handle empty content gracefully", () => {
      const { toolCalls, remainingContent } =
        parseToolCallsFromOllamaContent("");
      expect(toolCalls).toHaveLength(0);
      expect(remainingContent).toBe("");
    });
  });
});
