import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const readDiagnosticsTool: Tool = {
  type: "function",
  displayTitle: "Read Diagnostics",
  wouldLikeTo: "read diagnostics",
  isCurrently: "reading diagnostics",
  hasAlready: "read diagnostics",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.ReadDiagnostics,
    description:
      "Read the current IDE diagnostics (errors, warnings, hints) for a file or the entire workspace. Useful for identifying compilation errors or lint issues.",
    parameters: {
      type: "object",
      properties: {
        filepath: {
          type: "string",
          description:
            "Optional path to a specific file to get diagnostics for. If not provided, returns diagnostics for the entire workspace.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To read IDE diagnostics and see errors or warnings, use the ${BuiltInToolNames.ReadDiagnostics} tool.`,
  },
  toolCallIcon: "ExclamationTriangleIcon",
};
