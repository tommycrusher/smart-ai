import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const runTestsTool: Tool = {
  type: "function",
  displayTitle: "Run Tests",
  wouldLikeTo: "run tests",
  isCurrently: "running tests",
  hasAlready: "ran tests",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: false,
  function: {
    name: BuiltInToolNames.RunTests,
    description:
      "Run the test suite for the project. You can specify a test command or file pattern. Useful for verifying changes made to the codebase.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description:
            "Optional test command to run (e.g. 'npm test', 'pytest', 'cargo test'). If not provided, a default will be inferred.",
        },
        filePattern: {
          type: "string",
          description:
            "Optional file pattern to filter tests (e.g. 'src/utils.test.ts').",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To run tests, use the ${BuiltInToolNames.RunTests} tool. You can optionally specify a command or file pattern. For example:`,
    exampleArgs: [
      ["command", "npm test"],
    ],
  },
  toolCallIcon: "BeakerIcon",
};
