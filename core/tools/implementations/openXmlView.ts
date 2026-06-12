import { inferResolvedUriFromRelativePath } from "../../util/ideUtils";
import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

export const openXmlViewImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");

  const resolved = await inferResolvedUriFromRelativePath(filepath, extras.ide);
  if (!resolved) {
    throw new ContinueError(
      ContinueErrorReason.PathResolutionFailed,
      "Failed to resolve XML file path",
    );
  }

  const content = await extras.ide.readFile(resolved);

  return [
    {
      name: filepath,
      description: resolved,
      content,
      uri: { type: "file", value: resolved },
    },
  ];
};
