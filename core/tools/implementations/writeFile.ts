import { inferResolvedUriFromRelativePath } from "../../util/ideUtils";
import { ToolImpl } from ".";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { getCleanUriPath, getUriPathBasename } from "../../util/uri";
import { getStringArg } from "../parseArgs";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

export const writeFileImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");
  const contents = getStringArg(args, "contents", true);

  const resolvedFileUri = await inferResolvedUriFromRelativePath(
    filepath,
    extras.ide,
  );
  if (resolvedFileUri) {
    throwIfFileIsSecurityConcern(getCleanUriPath(resolvedFileUri));
    await extras.ide.writeFile(resolvedFileUri, contents);
    await extras.ide.openFile(resolvedFileUri);
    await extras.ide.saveFile(resolvedFileUri);
    if (extras.codeBaseIndexer) {
      void extras.codeBaseIndexer?.refreshCodebaseIndexFiles([resolvedFileUri]);
    }
    return [
      {
        name: getUriPathBasename(resolvedFileUri),
        description: getCleanUriPath(resolvedFileUri),
        content: "File written successfully",
        uri: {
          type: "file",
          value: resolvedFileUri,
        },
      },
    ];
  } else {
    throw new ContinueError(
      ContinueErrorReason.PathResolutionFailed,
      "Failed to resolve path",
    );
  }
};
