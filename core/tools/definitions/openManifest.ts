import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const openManifestTool: Tool = {
  type: "function",
  displayTitle: "Open Manifest",
  wouldLikeTo: "open a manifest file",
  isCurrently: "opening a manifest file",
  hasAlready: "opened a manifest file",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.OpenManifest,
    description:
      "Read a manifest or configuration file such as package.json, tsconfig.json, pyproject.toml, Cargo.toml, or similar project-level config files.",
    parameters: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Name or path of the manifest file to open (e.g. 'package.json', 'tsconfig.json').",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To read a manifest or config file, use the ${BuiltInToolNames.OpenManifest} tool.`,
  },
  toolCallIcon: "DocumentIcon",
};
