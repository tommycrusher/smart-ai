import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const findModelFieldTool: Tool = {
  type: "function",
  displayTitle: "Find Model Field",
  wouldLikeTo: "find a model field",
  isCurrently: "finding a model field",
  hasAlready: "found a model field",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.FindModelField,
    description:
      "Search the codebase for field definitions in data models, schemas, or ORM models. Useful for understanding database structures or API payloads.",
    parameters: {
      type: "object",
      required: ["fieldName"],
      properties: {
        fieldName: {
          type: "string",
          description: "The field name to search for.",
        },
        modelName: {
          type: "string",
          description: "Optional model or class name to narrow the search.",
        },
        filePattern: {
          type: "string",
          description: "Optional file pattern (e.g. '*.model.ts', '*schema.py').",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To find a field definition in models or schemas, use the ${BuiltInToolNames.FindModelField} tool.`,
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
