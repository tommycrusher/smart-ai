import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const openXmlViewTool: Tool = {
  type: "function",
  displayTitle: "Open XML View",
  wouldLikeTo: "open an XML file",
  isCurrently: "opening an XML file",
  hasAlready: "opened an XML file",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.OpenXmlView,
    description:
      "Read and display the contents of an XML file. Useful for viewing configuration, manifest, or data XML files.",
    parameters: {
      type: "object",
      required: ["filepath"],
      properties: {
        filepath: {
          type: "string",
          description: "Path to the XML file to read.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To read an XML file, use the ${BuiltInToolNames.OpenXmlView} tool.`,
  },
  toolCallIcon: "DocumentIcon",
};
