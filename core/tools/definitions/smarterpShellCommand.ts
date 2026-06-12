import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const smarterpShellCommandTool: Tool = {
  type: "function",
  displayTitle: "SmartERP Shell Command",
  wouldLikeTo: "run a SmartERP shell command",
  isCurrently: "running a SmartERP shell command",
  hasAlready: "ran a SmartERP shell command",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: false,
  function: {
    name: BuiltInToolNames.SmarterpShellCommand,
    description:
      "Run a shell command in the SmartERP context. Useful for ERP-specific operations, migrations, or custom scripts.",
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute.",
        },
        cwd: {
          type: "string",
          description: "Optional working directory for the command.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To run a SmartERP shell command, use the ${BuiltInToolNames.SmarterpShellCommand} tool.`,
  },
  toolCallIcon: "CommandLineIcon",
};
