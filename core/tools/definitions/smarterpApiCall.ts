import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const smarterpApiCallTool: Tool = {
  type: "function",
  displayTitle: "SmartERP API Call",
  wouldLikeTo: "call the SmartERP API",
  isCurrently: "calling the SmartERP API",
  hasAlready: "called the SmartERP API",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.SmarterpApiCall,
    description:
      "Make an HTTP API call to a SmartERP endpoint. Supports GET, POST, PUT, DELETE methods with optional headers and body.",
    parameters: {
      type: "object",
      required: ["url"],
      properties: {
        url: {
          type: "string",
          description: "The API endpoint URL.",
        },
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE). Defaults to GET.",
        },
        headers: {
          type: "object",
          description: "Optional headers as key-value pairs.",
        },
        body: {
          type: "string",
          description: "Optional request body (JSON string).",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To call a SmartERP API endpoint, use the ${BuiltInToolNames.SmarterpApiCall} tool.`,
  },
  toolCallIcon: "GlobeAltIcon",
};
