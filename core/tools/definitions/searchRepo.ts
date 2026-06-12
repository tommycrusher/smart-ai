import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const searchRepoTool: Tool = {
  type: "function",
  displayTitle: "Search Repo",
  wouldLikeTo: "search the repository",
  isCurrently: "searching the repository",
  hasAlready: "searched the repository",
  group: BUILT_IN_GROUP_NAME,
  readonly: true,
  isInstant: true,
  function: {
    name: BuiltInToolNames.SearchRepo,
    description:
      "Search the repository for files matching a pattern and/or content matching a query. Returns both file paths and content matches.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query to find in file contents (e.g. 'function handleClick', 'class User').",
        },
        filePattern: {
          type: "string",
          description:
            "Optional glob pattern to filter files (e.g. '*.ts', 'src/**/*.tsx').",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return. Default is 20.",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `To search the repository for files or content, use the ${BuiltInToolNames.SearchRepo} tool.`,
  },
  toolCallIcon: "MagnifyingGlassIcon",
};
