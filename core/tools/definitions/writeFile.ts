import { ToolPolicy } from "@smartai/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const writeFileTool: Tool = {
  type: "function",
  displayTitle: "Write File",
  wouldLikeTo: "write {{{ filepath }}}",
  isCurrently: "writing {{{ filepath }}}",
  hasAlready: "written {{{ filepath }}}",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: true,
  function: {
    name: BuiltInToolNames.WriteFile,
    description:
      "Write or overwrite a file with the given contents. This will create the file if it doesn't exist or overwrite it if it does. Use edit_existing_file for partial modifications instead.",
    parameters: {
      type: "object",
      required: ["filepath", "contents"],
      properties: {
        filepath: {
          type: "string",
          description:
            "The path of the file to write. Can be a relative path (from workspace root), absolute path, tilde path (~/...), or file:// URI.",
        },
        contents: {
          type: "string",
          description: "The full contents to write to the file",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  systemMessageDescription: {
    prefix: `To write or overwrite a file, use the ${BuiltInToolNames.WriteFile} tool with the relative filepath and contents. For example, to write a file located at 'path/to/file.txt', you would respond with:`,
    exampleArgs: [
      ["filepath", "path/to/the_file.txt"],
      ["contents", "Contents of the file"],
    ],
  },
  preprocessArgs: async (args, { ide }) => {
    const filepath = args.filepath as string;
    const resolvedPath = await resolveInputPath(ide, filepath);
    return {
      resolvedPath,
    };
  },
  evaluateToolCallPolicy: (
    basePolicy: ToolPolicy,
    _: Record<string, unknown>,
    processedArgs?: Record<string, unknown>,
  ): ToolPolicy => {
    const resolvedPath = processedArgs?.resolvedPath as
      | ResolvedPath
      | null
      | undefined;
    if (!resolvedPath) return basePolicy;

    return evaluateFileAccessPolicy(basePolicy, resolvedPath.isWithinWorkspace);
  },
};
