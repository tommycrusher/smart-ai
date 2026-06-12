import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const gitStatusTool: Tool = {
  type: "function",
  displayTitle: "Git Status",
  wouldLikeTo: "check git status",
  isCurrently: "checking git status",
  hasAlready: "checked git status",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.GitStatus,
    description:
      "Get the current git status of the repository, including modified, staged, and untracked files.",
    parameters: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description:
            "Optional directory to check git status in. Defaults to the workspace root.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To check the current git status, use the ${BuiltInToolNames.GitStatus} tool.`,
  },
  toolCallIcon: "CodeBracketIcon",
};
