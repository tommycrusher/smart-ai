import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const findActionMenuRouteTool: Tool = {
  type: "function",
  displayTitle: "Find Action Menu Route",
  wouldLikeTo: "find an action or menu route",
  isCurrently: "finding an action or menu route",
  hasAlready: "found an action or menu route",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.FindActionMenuRoute,
    description:
      "Search the codebase for action handlers, menu definitions, or route declarations. Useful for finding where UI actions or API routes are defined.",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "The action name, route path, or menu label to search for.",
        },
        filePattern: {
          type: "string",
          description: "Optional file pattern (e.g. '*router*', '*controller*', '*menu*').",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To find an action handler, route, or menu definition, use the ${BuiltInToolNames.FindActionMenuRoute} tool.`,
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
