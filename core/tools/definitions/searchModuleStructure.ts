import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const searchModuleStructureTool: Tool = {
  type: "function",
  displayTitle: "Search Module Structure",
  wouldLikeTo: "search module structure",
  isCurrently: "searching module structure",
  hasAlready: "searched module structure",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.SearchModuleStructure,
    description:
      "Explore the module or directory structure of the project. Returns an overview of files, subdirectories, and key modules in a given path.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional root path to explore. Defaults to the workspace root.",
        },
        depth: {
          type: "number",
          description: "Maximum depth to traverse. Default is 3.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To explore the module or directory structure, use the ${BuiltInToolNames.SearchModuleStructure} tool.`,
  },
  toolCallIcon: "FolderIcon",
};
